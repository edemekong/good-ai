import { copyFile, mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const packageDirectory = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const source = resolve(packageDirectory, "../skill/GOOD_AI.md");
const destination = resolve(packageDirectory, "assets/GOOD_AI.md");

await mkdir(dirname(destination), { recursive: true });
await copyFile(source, destination);
