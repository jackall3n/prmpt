import { defineConfig } from "prmpt";

export default defineConfig({
  engine: "handlebars",
  input: "./prompts",
  output: "./src/generated",
});
