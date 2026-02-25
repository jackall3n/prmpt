#!/usr/bin/env bun

import { resolve } from "node:path";

const args = process.argv.slice(2);
const command = args[0];

function flag(name: string): string | undefined {
  const idx = args.indexOf(`--${name}`);
  if (idx === -1) return undefined;
  return args[idx + 1];
}

function printHelp() {
  console.log(`
  prmpt - Build type-safe prompts from markdown

  Usage:
    prmpt build [dir]     Build .md files to typed TypeScript
    prmpt dev [dir]       Start dev server with watch mode
    prmpt init [dir]      Create a starter prompt + config

  Options:
    --output, -o <dir>    Output directory (default: from config or ./dist/prompts)
    --port, -p <port>     Dev server port (default: 3000)

  Config:
    Create a prmpt.config.ts in your project root:

      import { defineConfig } from "prmpt";
      export default defineConfig({
        engine: "handlebars",  // "handlebars" | "liquid"
        input: "./prompts",
        output: "./dist/prompts",
      });

  Examples:
    prmpt build
    prmpt dev --port 4000
    prmpt init
`);
}

async function main() {
  if (!command || command === "--help" || command === "-h") {
    printHelp();
    process.exit(0);
  }

  const { loadConfig } = await import("@tsprompt/core");
  const config = await loadConfig();

  // CLI flags override config values
  const dir = resolve(args[1] ?? config.input);
  const output = resolve(flag("output") ?? flag("o") ?? config.output);

  switch (command) {
    case "build": {
      const { build } = await import("@tsprompt/core");

      console.log(`\n  prmpt build\n`);
      console.log(`  engine: ${config.engine}`);
      console.log(`  input:  ${dir}`);
      console.log(`  output: ${output}\n`);
      const results = await build({
        input: dir,
        output,
        engine: config.engine,
      });
      for (const r of results) {
        console.log(`  ${r.prompt.name} → ${r.outputFile}`);
      }
      console.log(`\n  Built ${results.length} prompt(s)\n`);
      break;
    }

    case "dev": {
      const { dev } = await import("@tsprompt/dev");
      const port = Number(flag("port") ?? flag("p") ?? "3000");
      console.log(`\n  prmpt dev\n`);
      console.log(`  engine: ${config.engine}`);
      console.log(`  input:  ${dir}`);
      console.log(`  port:   ${port}\n`);
      await dev({ dir, output, port, engine: config.engine });
      break;
    }

    case "init": {
      const { mkdir } = await import("node:fs/promises");
      await mkdir(dir, { recursive: true });

      const sample = `---
name: greet
description: A friendly greeting prompt
model: gpt-4o
schema:
  name: string
  tone:
    type: string
    enum: [friendly, formal, casual]
    description: The tone of the greeting
  context:
    type: string
    optional: true
    description: Additional context about the user
---
You are a helpful assistant. Greet the user in a {{tone}} tone.

Hello {{name}}!

{{context}}

Please introduce yourself and ask how you can help today.
`;
      const configContent = `import { defineConfig } from "prmpt";

export default defineConfig({
  engine: "handlebars",
  input: "./prompts",
  output: "./dist/prompts",
});
`;
      const promptPath = resolve(dir, "greet.md");
      const configPath = resolve(process.cwd(), "prmpt.config.ts");

      await Bun.write(promptPath, sample);

      const configFile = Bun.file(configPath);
      if (!(await configFile.exists())) {
        await Bun.write(configPath, configContent);
        console.log(`\n  prmpt init\n`);
        console.log(`  Created ${configPath}`);
      } else {
        console.log(`\n  prmpt init\n`);
        console.log(`  Config already exists: ${configPath}`);
      }

      console.log(`  Created ${promptPath}\n`);
      console.log(`  Next steps:`);
      console.log(`    prmpt dev\n`);
      break;
    }

    default:
      console.error(`  Unknown command: ${command}`);
      printHelp();
      process.exit(1);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
