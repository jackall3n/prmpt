import { build } from "bun";

const result = await build({
  entrypoints: ["./src/index.ts"],
  outdir: "./dist",
  target: "node",
  external: [
    "typescript",
    "json-schema-to-typescript",
    "gray-matter",
    "glob",
    "es-toolkit",
    "zod",
    "handlebars",
    "liquidjs",
  ],
});

if (!result.success) {
  console.error("Build failed");
  process.exit(1);
}

console.log("✓ @prmpt/core built successfully");
