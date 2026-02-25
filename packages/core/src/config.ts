import { join, resolve } from "node:path";
import { type Config, type Options, ConfigSchema } from "./schemas/config";

const CONFIG_FILES = ["prmpt.config.ts", "prmpt.config.js", "prmpt.config.mjs"];

/** Load prmpt.config.ts from a directory, returning defaults if not found */
export async function loadConfig(cwd?: string): Promise<Config> {
  const dir = resolve(cwd ?? process.cwd());

  const config: Partial<Config> = {};

  for (const filename of CONFIG_FILES) {
    const configPath = join(dir, filename);
    const file = Bun.file(configPath);

    if (await file.exists()) {
      try {
        const mod = await import(configPath);
        const userConfig: Config = mod.default ?? mod;

        Object.assign(config, userConfig);
      } catch (e) {
        console.error(`  Error loading ${filename}:`, e);
      }
    }
  }

  return await validateConfig(config);
}

export async function validateConfig(config: Options): Promise<Config> {
  const result = await ConfigSchema.safeParseAsync(config);

  if (!result.success) {
    throw new Error(result.error.message);
  }

  return result.data;
}

/** Helper to define config with type checking */
export function defineConfig(config: Options): Options {
  return config;
}

export type { Config };
