import { Glob } from "bun";
import { join } from "node:path";
import { generateContent, generateIndex } from "./codegen";
import { validateConfig } from "./config";
import { parsePromptFile } from "./parser";
import type { Config, Options } from "./schemas/config";

export async function findPrompts(dir: string): Promise<string[]> {
  const glob = new Glob("**/*.md");
  const files: string[] = [];
  for await (const path of glob.scan({ cwd: dir, absolute: true })) {
    files.push(path);
  }
  return files.sort();
}

async function ensureOutputDir(dir: string) {
  const { mkdir } = await import("node:fs/promises");

  await mkdir(dir, { recursive: true });
}

/** Build a single prompt file, writing output to disk */
export async function buildPrompt(filePath: string, config: Config) {
  const prompt = await parsePromptFile(filePath, config.engine);
  const ext = config.format === "ts" ? ".ts" : ".js";
  const fileName = prompt.name;
  const outputFile = join(config.output, fileName + ext);

  const { output, argsName } = generateContent(prompt);

  await Bun.write(outputFile, output);

  return {
    source: filePath,
    fileName,
    outputFile,
    prompt,
    output,
    argsName,
  };
}

export type BuildResult = Awaited<ReturnType<typeof buildPrompt>>;

export async function build(options: Options) {
  // Validate config
  const config = await validateConfig(options);

  // Find prompts
  const files = await findPrompts(config.input);

  // Ensure output dir
  await ensureOutputDir(config.output);

  // Build prompts
  const results = await Promise.all(files.map((file) => buildPrompt(file, config)));

  const index = generateIndex(results);
  const indexFile = join(config.output, "index.ts");

  await Bun.write(indexFile, index);

  return results;
}
