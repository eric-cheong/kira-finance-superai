import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { loadEnvConfig } = require("@next/env") as typeof import("@next/env");

loadEnvConfig(process.cwd());

async function main() {
  const { seedCloseMemories } = await import("@/lib/backend/memory");
  const result = await seedCloseMemories();
  console.log(JSON.stringify(result, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
