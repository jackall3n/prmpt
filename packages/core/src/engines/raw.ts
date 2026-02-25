import type { JSONSchema4Object } from "json-schema";

function extractRawVars(content: string): string[] {
  const pattern = /\{\{-?\s*(\w+)\s*-?\}\}/g;
  const vars = new Set<string>();
  let match: RegExpExecArray | null;

  // biome-ignore lint/suspicious/noAssignInExpressions: needed
  while ((match = pattern.exec(content)) !== null) {
    const m = match[1];

    if (m) {
      vars.add(m);
    }
  }

  return [...vars];
}

export async function inferRawSchema(content: string): Promise<JSONSchema4Object> {
  const vars = extractRawVars(content);

  return {
    type: "object",
    properties: Object.fromEntries(vars.map((v) => [v, { type: "string" }])),
    required: [...vars],
  };
}
