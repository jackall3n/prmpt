import { resolve } from "node:path";
import { z } from "zod";

export const EngineTypeSchema = z.enum(["handlebars", "hbs", "liquid"]);

export type Engine = z.infer<typeof EngineTypeSchema>;

export const ConfigSchema = z.object({
  engine: EngineTypeSchema.default("handlebars"),
  input: z
    .string()
    .default("./prompts")
    .transform((arg) => resolve(arg)),
  output: z
    .string()
    .default("./dist")
    .transform((arg) => resolve(arg)),
  format: z.enum(["ts", "js"]).default("ts"),
  clean: z.boolean().default(false),
});

export type Config = z.infer<typeof ConfigSchema>;
export type Options = z.input<typeof ConfigSchema>;
