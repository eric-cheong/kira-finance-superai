import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import type { IntakeSourceChannel } from "@/lib/types";

export interface StoredDocument {
  storageRef: string;
  sha256: string;
  sizeBytes: number;
  contentType: string;
  originalFilename?: string;
}

export interface DocumentStorageMetadata {
  clientId: string;
  source: IntakeSourceChannel;
  filename?: string;
  contentType: string;
  receivedAt?: string;
}

export interface LocalPutOptions extends DocumentStorageMetadata {
  rootDir?: string;
}

const DEFAULT_LOCAL_DOCUMENT_ROOT = path.join(process.cwd(), ".kira-data", "documents");

export function sha256(buffer: Buffer) {
  return crypto.createHash("sha256").update(buffer).digest("hex");
}

function safeSegment(value: string) {
  return value.replace(/[^a-zA-Z0-9._=-]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 96) || "unknown";
}

function extensionFor(filename: string | undefined, contentType: string) {
  const fromName = filename ? path.extname(filename).toLowerCase().replace(/[^.a-z0-9]/g, "") : "";
  if (fromName) return fromName;
  if (contentType === "application/pdf") return ".pdf";
  if (contentType === "image/jpeg") return ".jpg";
  if (contentType === "image/png") return ".png";
  if (contentType === "text/plain") return ".txt";
  return ".bin";
}

export function documentStorageKey(buffer: Buffer, metadata: DocumentStorageMetadata) {
  const digest = sha256(buffer);
  const date = (metadata.receivedAt ?? new Date().toISOString()).slice(0, 10);
  const ext = extensionFor(metadata.filename, metadata.contentType);
  return [
    safeSegment(metadata.clientId),
    safeSegment(metadata.source),
    date,
    `${digest}${ext}`,
  ].join("/");
}

export async function putDocumentLocal(buffer: Buffer, options: LocalPutOptions): Promise<StoredDocument> {
  const root = options.rootDir ?? DEFAULT_LOCAL_DOCUMENT_ROOT;
  const key = documentStorageKey(buffer, options);
  const absolutePath = path.join(root, key);
  const normalizedRoot = path.resolve(root);
  const normalizedPath = path.resolve(absolutePath);
  if (!normalizedPath.startsWith(`${normalizedRoot}${path.sep}`)) {
    throw new Error("Document storage path escaped the configured root.");
  }
  await fs.mkdir(path.dirname(normalizedPath), { recursive: true });
  await fs.writeFile(normalizedPath, buffer);
  return {
    storageRef: `file://${normalizedPath}`,
    sha256: sha256(buffer),
    sizeBytes: buffer.length,
    contentType: options.contentType,
    originalFilename: options.filename,
  };
}

export interface S3PutOptions extends DocumentStorageMetadata {
  bucket?: string;
  region?: string;
  endpoint?: string;
  forcePathStyle?: boolean;
}

export async function putDocumentS3(buffer: Buffer, options: S3PutOptions): Promise<StoredDocument> {
  const bucket = options.bucket ?? process.env.KIRA_DOCUMENTS_S3_BUCKET;
  if (!bucket) throw new Error("KIRA_DOCUMENTS_S3_BUCKET is required for S3 document storage.");
  const key = documentStorageKey(buffer, options);
  const client = new S3Client({
    region: options.region ?? process.env.AWS_REGION ?? process.env.AWS_DEFAULT_REGION ?? "ap-southeast-1",
    endpoint: options.endpoint ?? process.env.KIRA_DOCUMENTS_S3_ENDPOINT,
    forcePathStyle: options.forcePathStyle ?? Boolean(process.env.KIRA_DOCUMENTS_S3_ENDPOINT),
  });
  await client.send(new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    Body: buffer,
    ContentType: options.contentType,
    Metadata: {
      clientId: options.clientId,
      source: options.source,
      sha256: sha256(buffer),
      originalFilename: options.filename ?? "",
    },
  }));
  return {
    storageRef: `s3://${bucket}/${key}`,
    sha256: sha256(buffer),
    sizeBytes: buffer.length,
    contentType: options.contentType,
    originalFilename: options.filename,
  };
}

export async function putDocument(buffer: Buffer, metadata: DocumentStorageMetadata): Promise<StoredDocument> {
  const driver = process.env.KIRA_DOCUMENT_STORAGE_DRIVER ?? (process.env.KIRA_DOCUMENTS_S3_BUCKET ? "s3" : "local");
  if (driver === "s3") return putDocumentS3(buffer, metadata);
  if (driver !== "local") throw new Error(`Unsupported document storage driver: ${driver}`);
  return putDocumentLocal(buffer, metadata);
}
