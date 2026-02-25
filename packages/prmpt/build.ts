import { build } from "bun";

const result = await build({
  entrypoints: ["./src/cli.ts"],
  outdir: "./dist",
  target: "node",
  external: ["@prmpt/core", "@prmpt/dev"],
  naming: {
    entry: "prmpt",
  },
});

if (!result.success) {
  console.error("Build failed");
  process.exit(1);
}

console.log("✓ prmpt CLI built successfully");
