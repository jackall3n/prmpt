import { resolve } from "node:path";
import type { Engine } from "@prmpt/core";
import { build } from "@prmpt/core";
import { notifyClients, startServer } from "./server";
import { watchPrompts } from "./watcher";

export { startServer } from "./server";
export { watchPrompts } from "./watcher";

export interface DevOptions {
  /** Directory containing .md prompt files */
  dir: string;
  /** Output directory for generated files */
  output: string;
  /** Dev server port (default: 3000) */
  port?: number;
  /** Template engine (default: "handlebars") */
  engine?: Engine;
}

/** Run the dev server with file watching and auto-rebuild */
export async function dev(options: DevOptions) {
  const dir = resolve(options.dir);
  const output = resolve(options.output);
  const port = options.port ?? 3000;
  const engine = options.engine ?? "handlebars";

  // Initial build
  console.log("  Building prompts...");
  const results = await build({ input: dir, output, engine });
  console.log(`  Built ${results.length} prompt(s)`);

  // Start dev server
  const server = startServer({ port, dir, engine });

  // Watch for changes
  console.log(`  Watching ${dir} for changes...`);
  const watcher = watchPrompts(dir, async (_event, filename) => {
    console.log(`  Changed: ${filename}`);
    try {
      await build({ input: dir, output, engine });
      console.log("  Rebuilt.");
      notifyClients();
    } catch (e) {
      console.error("  Build error:", e);
    }
  });

  // Graceful shutdown
  process.on("SIGINT", () => {
    console.log("\n  Shutting down...");
    watcher.close();
    server.stop();
    process.exit(0);
  });

  return { server, watcher };
}
