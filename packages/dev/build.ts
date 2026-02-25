import { build } from "bun";

const result = await build({
  entrypoints: ["./src/index.ts"],
  outdir: "./dist",
  target: "node",
  external: [
    "@tsprompt/core",
    "handlebars",
    "liquidjs",
    "zod",
    "gray-matter",
    "json-schema-to-typescript",
  ],
});

if (!result.success) {
  console.error("Build failed");
  process.exit(1);
}

console.log("✓ @prmpt/dev built successfully");
