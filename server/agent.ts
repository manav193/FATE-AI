import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";

const ignoredDirectories = new Set([".git", "node_modules", "dist", "coverage", ".next", ".vite"]);
const allowedExtensions = new Set([".ts", ".tsx", ".js", ".jsx", ".json", ".md", ".css", ".html", ".yml", ".yaml"]);
const ignoredFiles = new Set(["package-lock.json", "yarn.lock", "pnpm-lock.yaml"]);

async function collectFiles(root: string, directory: string, output: string[]): Promise<void> {
  if (output.length >= 40) return;
  const entries = await readdir(directory, { withFileTypes: true });
  for (const entry of entries) {
    if (output.length >= 40) break;
    if (entry.name.startsWith(".env") || ignoredFiles.has(entry.name)) continue;
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      if (!ignoredDirectories.has(entry.name)) await collectFiles(root, absolute, output);
      continue;
    }
    if (entry.isFile() && allowedExtensions.has(path.extname(entry.name).toLowerCase())) {
      output.push(path.relative(root, absolute).replaceAll(path.sep, "/"));
    }
  }
}

export async function repositorySnapshot(): Promise<{ rootName: string; files: string[]; context: string }> {
  const root = path.resolve(process.env.FATE_AGENT_WORKSPACE || process.cwd());
  const info = await stat(root);
  if (!info.isDirectory()) throw new Error("FATE_AGENT_WORKSPACE is not a directory");
  const files: string[] = [];
  await collectFiles(root, root, files);
  let remaining = 110_000;
  const sections: string[] = [];
  const included: string[] = [];
  for (const relative of files) {
    if (remaining <= 0) break;
    const value = await readFile(path.join(root, relative), "utf8");
    const safe = value.slice(0, Math.min(14_000, remaining));
    sections.push(`\n--- FILE: ${relative} ---\n${safe}`);
    included.push(relative);
    remaining -= safe.length;
  }
  return { rootName: path.basename(root), files: included, context: sections.join("\n") };
}

export function codingAgentPrompt(task: string, snapshot: Awaited<ReturnType<typeof repositorySnapshot>>) {
  return {
    messages: [
      {
        role: "system" as const,
        content: "You are FATE Coding Agent in read-only analysis mode. Inspect the supplied repository snapshot. Give a concrete implementation plan, name exact files, identify risks, and include focused code snippets or a unified diff when useful. Never claim you executed commands, edited files, or ran tests. Do not request or reveal secrets.",
      },
      {
        role: "user" as const,
        content: `Repository: ${snapshot.rootName}\nTask: ${task}\n\nRepository snapshot (${snapshot.files.length} files):${snapshot.context}`,
      },
    ],
    temperature: 0.2,
  };
}
