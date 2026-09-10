import { copyFile, mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const packageDirectory = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const source = resolve(packageDirectory, "../skill/skills/good-ai/SKILL.md");
const destination = resolve(packageDirectory, "assets/good-ai/SKILL.md");

await mkdir(dirname(destination), { recursive: true });
await copyFile(source, destination);
