#!/usr/bin/env bash
set -Eeuo pipefail

APP_NAME="kira-finance-superai"
AWS_REGION="${AWS_DEFAULT_REGION:-us-west-2}"
INSTANCE_TYPE="${INSTANCE_TYPE:-t3.small}"
STAMP="${STAMP:-$(date -u +%Y%m%d%H%M%S)}"
ARTIFACT="/tmp/${APP_NAME}-deploy-${STAMP}.tar.gz"
USER_DATA="/tmp/${APP_NAME}-user-data-${STAMP}.sh"
DEPLOY_ENV="/tmp/${APP_NAME}-ec2-${STAMP}.env"

require() {
  command -v "$1" >/dev/null 2>&1 || {
    echo "Missing required command: $1" >&2
    exit 1
  }
}

require aws
require tar
require curl

ACCOUNT_ID="$(aws sts get-caller-identity --query Account --output text)"
BUCKET="${BUCKET:-${APP_NAME}-${ACCOUNT_ID}-${STAMP}}"
OBJECT_KEY="${OBJECT_KEY:-releases/${APP_NAME}-${STAMP}.tar.gz}"
SG_NAME="${SG_NAME:-kira-finance-ec2-${STAMP}-sg}"
KEY_NAME="${KEY_NAME:-kira-finance-ec2-${STAMP}-key}"
KEY_PATH="${KEY_PATH:-/tmp/${KEY_NAME}.pem}"

PUBLIC_IP="${PUBLIC_IP:-$(curl -fsS https://checkip.amazonaws.com | tr -d '[:space:]')}"
SSH_CIDR="${SSH_CIDR:-${PUBLIC_IP}/32}"

echo "Packaging ${APP_NAME} -> ${ARTIFACT}"
COPYFILE_DISABLE=1 tar \
  --no-xattrs \
  --exclude='./node_modules' \
  --exclude='./.next' \
  --exclude='./.git' \
  --exclude='./.env' \
  --exclude='./.env.*' \
  --exclude='./.kira-data' \
  --exclude='./.gstack' \
  --exclude='./.claude' \
  --exclude='./.conductor' \
  --exclude='./work' \
  --exclude='./coverage' \
  --exclude='./tsconfig.tsbuildinfo' \
  --exclude='./.DS_Store' \
  --exclude='./._*' \
  --exclude='*/._*' \
  -czf "${ARTIFACT}" .

echo "Preparing private S3 artifact bucket: ${BUCKET}"
aws s3control put-public-access-block \
  --account-id "${ACCOUNT_ID}" \
  --public-access-block-configuration \
  BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true >/dev/null 2>&1 || true

if ! aws s3api head-bucket --bucket "${BUCKET}" >/dev/null 2>&1; then
  aws s3api create-bucket \
    --bucket "${BUCKET}" \
    --region "${AWS_REGION}" \
    --create-bucket-configuration "LocationConstraint=${AWS_REGION}" >/dev/null
fi

aws s3api put-public-access-block \
  --bucket "${BUCKET}" \
  --public-access-block-configuration \
  BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true >/dev/null

aws s3api put-bucket-ownership-controls \
  --bucket "${BUCKET}" \
  --ownership-controls 'Rules=[{ObjectOwnership=BucketOwnerEnforced}]' >/dev/null

aws s3api put-bucket-encryption \
  --bucket "${BUCKET}" \
  --server-side-encryption-configuration \
  '{"Rules":[{"ApplyServerSideEncryptionByDefault":{"SSEAlgorithm":"AES256"}}]}' >/dev/null

aws s3api put-bucket-versioning \
  --bucket "${BUCKET}" \
  --versioning-configuration Status=Enabled >/dev/null

POLICY_FILE="$(mktemp)"
cat > "${POLICY_FILE}" <<POLICY
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "DenyInsecureTransport",
      "Effect": "Deny",
      "Principal": "*",
      "Action": "s3:*",
      "Resource": [
        "arn:aws:s3:::${BUCKET}",
        "arn:aws:s3:::${BUCKET}/*"
      ],
      "Condition": {
        "Bool": {
          "aws:SecureTransport": "false"
        }
      }
    }
  ]
}
POLICY
aws s3api put-bucket-policy --bucket "${BUCKET}" --policy "file://${POLICY_FILE}" >/dev/null
rm -f "${POLICY_FILE}"

aws s3 cp "${ARTIFACT}" "s3://${BUCKET}/${OBJECT_KEY}" --sse AES256 >/dev/null
ARTIFACT_URL="$(aws s3 presign "s3://${BUCKET}/${OBJECT_KEY}" --expires-in 3600)"

echo "Preparing EC2 networking"
VPC_ID="$(aws ec2 describe-vpcs --filters Name=isDefault,Values=true --query 'Vpcs[0].VpcId' --output text)"
SUBNET_ID="$(aws ec2 describe-subnets --filters Name=vpc-id,Values="${VPC_ID}" --query 'Subnets[0].SubnetId' --output text)"

SG_ID="$(aws ec2 describe-security-groups \
  --filters Name=group-name,Values="${SG_NAME}" Name=vpc-id,Values="${VPC_ID}" \
  --query 'SecurityGroups[0].GroupId' \
  --output text)"

if [[ "${SG_ID}" == "None" || -z "${SG_ID}" ]]; then
  SG_ID="$(aws ec2 create-security-group \
    --group-name "${SG_NAME}" \
    --description "Kira Finance SuperAI web host" \
    --vpc-id "${VPC_ID}" \
    --query GroupId \
    --output text)"
  aws ec2 create-tags --resources "${SG_ID}" --tags \
    Key=Name,Value="${SG_NAME}" \
    Key=Project,Value="${APP_NAME}" >/dev/null
fi

aws ec2 authorize-security-group-ingress \
  --group-id "${SG_ID}" \
  --ip-permissions "IpProtocol=tcp,FromPort=80,ToPort=80,IpRanges=[{CidrIp=0.0.0.0/0,Description='HTTP web'}]" >/dev/null 2>&1 || true

aws ec2 authorize-security-group-ingress \
  --group-id "${SG_ID}" \
  --ip-permissions "IpProtocol=tcp,FromPort=22,ToPort=22,IpRanges=[{CidrIp=${SSH_CIDR},Description='SSH from deployer'}]" >/dev/null 2>&1 || true

if ! aws ec2 describe-key-pairs --key-names "${KEY_NAME}" >/dev/null 2>&1; then
  aws ec2 create-key-pair --key-name "${KEY_NAME}" --query KeyMaterial --output text > "${KEY_PATH}"
  chmod 600 "${KEY_PATH}"
elif [[ ! -f "${KEY_PATH}" ]]; then
  echo "Key pair ${KEY_NAME} exists, but ${KEY_PATH} is missing. Choose a new STAMP or KEY_NAME." >&2
  exit 1
fi

AMI_ID="$(aws ssm get-parameter \
  --name /aws/service/ami-amazon-linux-latest/al2023-ami-kernel-default-x86_64 \
  --query Parameter.Value \
  --output text)"

cat > "${USER_DATA}" <<'USERDATA'
#!/bin/bash
set -Eeuo pipefail

APP_NAME="kira-finance-superai"
APP_USER="kira"
APP_ROOT="/opt/${APP_NAME}"
RELEASES_DIR="${APP_ROOT}/releases"
CURRENT_DIR="${APP_ROOT}/current"
ENV_DIR="/etc/${APP_NAME}"
ENV_FILE="${ENV_DIR}/env"
PORT="3000"
ARTIFACT_URL="__ARTIFACT_URL__"

exec > >(tee -a "/var/log/${APP_NAME}-bootstrap.log" | logger -t "${APP_NAME}-bootstrap") 2>&1

dnf update -y
dnf install -y nginx tar gzip shadow-utils
dnf install -y nodejs20 nodejs20-npm || dnf install -y nodejs npm

NPM_BIN="$(command -v npm-20 || command -v npm)"

if [[ ! -f /swapfile ]]; then
  fallocate -l 2G /swapfile
  chmod 600 /swapfile
  mkswap /swapfile
  swapon /swapfile
  echo '/swapfile none swap sw 0 0' >> /etc/fstab
fi

id -u "${APP_USER}" >/dev/null 2>&1 || useradd --system --home-dir "${APP_ROOT}" --shell /sbin/nologin "${APP_USER}"

install -d -m 0755 -o "${APP_USER}" -g "${APP_USER}" "${APP_ROOT}" "${RELEASES_DIR}"
install -d -m 0750 -o root -g "${APP_USER}" "${ENV_DIR}"

if [[ ! -f "${ENV_FILE}" ]]; then
  cat > "${ENV_FILE}" <<ENV
NODE_ENV=production
PORT=${PORT}
KIRA_PROVIDER_RATE_LIMIT_PER_MINUTE=20
KIRA_PROVIDER_MAX_PAYLOAD_BYTES=16384
KIRA_PROVIDER_MAX_STRING_LENGTH=2000
KIRA_PROVIDER_MAX_COLLECTION_ITEMS=60
ENV
  chown root:"${APP_USER}" "${ENV_FILE}"
  chmod 0640 "${ENV_FILE}"
fi

RELEASE_ID="$(date -u +%Y%m%d%H%M%S)"
RELEASE_DIR="${RELEASES_DIR}/${RELEASE_ID}"
TMP_TARBALL="/tmp/${APP_NAME}.tar.gz"

install -d -m 0755 -o "${APP_USER}" -g "${APP_USER}" "${RELEASE_DIR}"
curl --fail --location --retry 5 --retry-delay 3 --output "${TMP_TARBALL}" "${ARTIFACT_URL}"
tar -xzf "${TMP_TARBALL}" -C "${RELEASE_DIR}"
chown -R "${APP_USER}:${APP_USER}" "${RELEASE_DIR}"

sudo -u "${APP_USER}" bash -lc "
  set -euo pipefail
  cd '${RELEASE_DIR}'
  '${NPM_BIN}' ci
  '${NPM_BIN}' run build
  '${NPM_BIN}' prune --omit=dev
  mkdir -p .kira-data
"

ln -sfn "${RELEASE_DIR}" "${CURRENT_DIR}"
chown -h "${APP_USER}:${APP_USER}" "${CURRENT_DIR}"

cat > "/etc/systemd/system/${APP_NAME}.service" <<SERVICE
[Unit]
Description=Kira Finance SuperAI Next.js app
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
User=${APP_USER}
Group=${APP_USER}
WorkingDirectory=${CURRENT_DIR}
EnvironmentFile=${ENV_FILE}
ExecStart=${NPM_BIN} run start -- -p ${PORT} -H 127.0.0.1
Restart=always
RestartSec=5
TimeoutStopSec=30
KillSignal=SIGTERM
SyslogIdentifier=${APP_NAME}
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=full
ProtectHome=true
ReadWritePaths=${APP_ROOT}

[Install]
WantedBy=multi-user.target
SERVICE

cat > "/etc/nginx/conf.d/${APP_NAME}.conf" <<NGINX
server_tokens off;

server {
    listen 80 default_server;
    server_name "";

    client_max_body_size 20m;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-Frame-Options "DENY" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    location = /api/admin/reset {
        return 404;
    }

    location / {
        proxy_pass http://127.0.0.1:${PORT};
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_read_timeout 300;
        proxy_send_timeout 300;
    }
}
NGINX

rm -f /etc/nginx/conf.d/default.conf

systemctl daemon-reload
systemctl enable --now "${APP_NAME}"
nginx -t
systemctl enable --now nginx
systemctl reload nginx

for attempt in $(seq 1 30); do
  if curl --fail --silent --show-error "http://127.0.0.1:${PORT}/api/health" >/dev/null; then
    break
  fi
  if [[ "${attempt}" == "30" ]]; then
    systemctl status "${APP_NAME}" --no-pager -l
    exit 1
  fi
  sleep 2
done

for attempt in $(seq 1 15); do
  if curl --fail --silent --show-error "http://127.0.0.1/api/health" >/dev/null; then
    break
  fi
  if [[ "${attempt}" == "15" ]]; then
    systemctl status nginx --no-pager -l
    exit 1
  fi
  sleep 2
done

echo "Bootstrap complete: ${APP_NAME} release ${RELEASE_ID}"
USERDATA

perl -0pi -e "s#__ARTIFACT_URL__#${ARTIFACT_URL}#g" "${USER_DATA}"

echo "Launching EC2 instance"
INSTANCE_ID="$(aws ec2 run-instances \
  --image-id "${AMI_ID}" \
  --instance-type "${INSTANCE_TYPE}" \
  --key-name "${KEY_NAME}" \
  --security-group-ids "${SG_ID}" \
  --subnet-id "${SUBNET_ID}" \
  --associate-public-ip-address \
  --metadata-options HttpEndpoint=enabled,HttpTokens=required,HttpPutResponseHopLimit=1 \
  --block-device-mappings '[{"DeviceName":"/dev/xvda","Ebs":{"VolumeSize":16,"VolumeType":"gp3","Encrypted":true,"DeleteOnTermination":true}}]' \
  --tag-specifications "ResourceType=instance,Tags=[{Key=Name,Value=${APP_NAME}-${STAMP}},{Key=Project,Value=${APP_NAME}}]" "ResourceType=volume,Tags=[{Key=Name,Value=${APP_NAME}-${STAMP}-root},{Key=Project,Value=${APP_NAME}}]" \
  --user-data "file://${USER_DATA}" \
  --query 'Instances[0].InstanceId' \
  --output text)"

echo "Waiting for ${INSTANCE_ID} to run"
aws ec2 wait instance-running --instance-ids "${INSTANCE_ID}"

PUBLIC_DNS="$(aws ec2 describe-instances --instance-ids "${INSTANCE_ID}" --query 'Reservations[0].Instances[0].PublicDnsName' --output text)"
PUBLIC_ADDR="$(aws ec2 describe-instances --instance-ids "${INSTANCE_ID}" --query 'Reservations[0].Instances[0].PublicIpAddress' --output text)"

cat > "${DEPLOY_ENV}" <<INFO
APP_NAME=${APP_NAME}
AWS_REGION=${AWS_REGION}
INSTANCE_ID=${INSTANCE_ID}
PUBLIC_DNS=${PUBLIC_DNS}
PUBLIC_IP=${PUBLIC_ADDR}
URL=http://${PUBLIC_DNS}
BUCKET=${BUCKET}
OBJECT_KEY=${OBJECT_KEY}
SECURITY_GROUP_ID=${SG_ID}
KEY_NAME=${KEY_NAME}
KEY_PATH=${KEY_PATH}
USER_DATA=${USER_DATA}
INFO

echo "Instance launched:"
echo "  id: ${INSTANCE_ID}"
echo "  url: http://${PUBLIC_DNS}"
echo "  ssh: ssh -i ${KEY_PATH} ec2-user@${PUBLIC_DNS}"
echo "  metadata: ${DEPLOY_ENV}"
