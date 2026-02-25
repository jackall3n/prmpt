/** JSON Schema subset used to describe prompt argument types */

export interface StringSchema {
  type: "string";
  description?: string;
}

export interface NumberSchema {
  type: "number";
  description?: string;
}

export interface BooleanSchema {
  type: "boolean";
  description?: string;
}

export interface ArraySchema {
  type: "array";
  items: JsonSchema;
  description?: string;
}

export interface ObjectSchema {
  type: "object";
  properties: Record<string, JsonSchema>;
  required?: string[];
  description?: string;
}

export type JsonSchema = StringSchema | NumberSchema | BooleanSchema | ArraySchema | ObjectSchema;

/** Create a fresh empty object schema */
export function objectSchema(props?: Record<string, JsonSchema>, required?: string[]): ObjectSchema {
  return {
    type: "object",
    properties: props ?? {},
    required: required ?? [],
  };
}

/** Type guard: is this schema an ObjectSchema? */
export function isObjectSchema(s: JsonSchema): s is ObjectSchema {
  return s.type === "object";
}

/** Type guard: is this schema an ArraySchema? */
export function isArraySchema(s: JsonSchema): s is ArraySchema {
  return s.type === "array";
}
