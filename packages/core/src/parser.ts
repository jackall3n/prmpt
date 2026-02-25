import { parse } from "node:path";
import matter from "gray-matter";
import { inferHandlebarsSchema } from "./engines/hbs";
import { inferRawSchema } from "./engines/raw";
import type { Engine } from "./schemas/config";
import { type PromptOptions, PromptSchema } from "./schemas/prompt-options";
import type { JSONSchema4 } from "json-schema";

/** Derive a name from a filename */
function nameFromPath(filePath: string): string {
  return parse(filePath).name;
}

/** Infer a JSON Schema from template content based on engine */
export async function extractSchema(content: string, options: PromptOptions): Promise<JSONSchema4> {
  if (options.schema) {
    return {
      type: "object",
      properties: options.schema,
      required: Object.keys(options.schema),
    };
  }

  switch (options.engine) {
    case "hbs":
    case "handlebars":
      return await inferHandlebarsSchema(content);
    case "liquid":
    default:
      return await inferRawSchema(content);
  }
}

export async function parsePrompt(raw: string, filePath: string, defaultEngine: Engine) {
  const result = matter(raw);
  const { data: options, content } = await PromptSchema.parseAsync(result);

  if (!options.engine) {
    // Default to the engine specified in the command line
    options.engine = defaultEngine;
  }

  const name = options.name ?? nameFromPath(filePath);
  const schema = await extractSchema(content, options);

  return {
    name,
    description: options.description,
    content,
    schema,
    filePath,
    options,
  };
}

/** Parse a prompt markdown file from disk */
export async function parsePromptFile(filePath: string, engine: Engine = "handlebars") {
  const file = Bun.file(filePath);
  const raw = await file.text();

  return await parsePrompt(raw, filePath, engine);
}

export type ParsedPrompt = Awaited<ReturnType<typeof parsePromptFile>>;
