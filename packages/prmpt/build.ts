import { build } from "bun";

const result = await build({
  entrypoints: ["./src/cli.ts"],
  outdir: "./dist",
  target: "node",
  external: ["@tsprompt/core", "@tsprompt/dev"],
  naming: {
    entry: "prmpt",
  },
});

if (!result.success) {
  console.error("Build failed");
  process.exit(1);
}

console.log("✓ tsprompt CLI (prmpt binary) built successfully");
