import { z } from "zod";
import { EngineTypeSchema } from "./config";

export const PromptOptionsSchema = z.object({
  engine: EngineTypeSchema.optional(),
  name: z.string().optional(),
  description: z.string().optional(),
  schema: z.record(z.string(), z.any()).optional(),
});

export type PromptOptions = z.infer<typeof PromptOptionsSchema>;

export const PromptSchema = z.object({
  data: PromptOptionsSchema.default({}),
  content: z.string().trim(),
});
