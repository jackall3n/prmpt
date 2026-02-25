import type { JSONSchema4, JSONSchema4Object } from "json-schema";

// ── Field inference ────────────────────────────────────────────

/** Type specificity ranking — higher value wins when merging */
const TYPE_PRIORITY: Record<string, number> = {
  string: 0,
  boolean: 1,
  number: 2,
  array: 3,
  object: 4,
};

function shouldReplace(existing: JSONSchema4Object, incoming: JSONSchema4Object): boolean {
  const incomingType = incoming.type as keyof typeof TYPE_PRIORITY;
  const existingType = existing.type as keyof typeof TYPE_PRIORITY;

  return (TYPE_PRIORITY[incomingType] ?? 0) > (TYPE_PRIORITY[existingType] ?? 0);
}

/**
 * Set a schema at a (possibly nested) dotted path.
 *
 *   mergePath(fields, ["user", "name"], {type:"string"})
 *   → fields["user"] = { type:"object", properties: { name: {type:"string"} } }
 */
function mergePath(fields: Map<string, JSONSchema4Object>, parts: string[], schema: JSONSchema4Object): void {
  if (parts.length === 0) return;

  if (parts.length === 1) {
    const key = parts[0]!;
    const existing = fields.get(key);
    if (!existing || shouldReplace(existing, schema)) {
      fields.set(key, schema);
    }
    return;
  }

  const [head, ...rest] = parts as [string, ...string[]];
  const existing = fields.get(head);

  let nested: Map<string, JSONSchema4Object>;
  if (existing && existing.type === "object") {
    nested = new Map(Object.entries(existing.properties as Record<string, JSONSchema4Object>));
  } else {
    nested = new Map<string, JSONSchema4Object>();
  }

  mergePath(nested, rest, schema);

  fields.set(head, {
    type: "object",
    properties: Object.fromEntries(nested),
  });
}

/** Merge source fields into target, respecting type priority */
function mergeInto(target: Map<string, JSONSchema4Object>, source: Map<string, JSONSchema4Object>): void {
  for (const [key, value] of source) {
    const existing = target.get(key);
    if (!existing || shouldReplace(existing, value)) {
      target.set(key, value);
    }
  }
}

// ── AST walkers ────────────────────────────────────────────────

function isPathExpression(node: hbs.AST.Expression): node is hbs.AST.PathExpression {
  return node.type === "PathExpression";
}

/**
 * Walk Handlebars AST statements and collect field → JsonSchema.
 *
 *   {{var}}          → string
 *   {{obj.prop}}     → nested object
 *   {{#each arr}}    → array (items inferred from body)
 *   {{#if cond}}     → boolean (body vars lifted to current scope)
 *   {{#unless cond}} → boolean
 *   {{#with obj}}    → object (properties inferred from body)
 *   {{@index}} etc.  → skipped
 *   {{../var}}       → skipped
 */
function collectFields(statements: hbs.AST.Statement[]): Map<string, JSONSchema4Object> {
  const fields = new Map<string, JSONSchema4Object>();

  for (const node of statements) {
    switch (node.type) {
      case "MustacheStatement": {
        const mustache = node as hbs.AST.MustacheStatement;
        const expr = mustache.path;
        if (!isPathExpression(expr)) continue;
        if (expr.data || expr.depth > 0) continue;
        if (expr.parts.length === 0) continue;

        mergePath(fields, expr.parts, { type: "string" });
        break;
      }

      case "BlockStatement": {
        const block = node as hbs.AST.BlockStatement;
        const helper = block.path.parts[0];

        if (helper === "each") {
          handleEach(block, fields);
        } else if (helper === "if" || helper === "unless") {
          handleConditional(block, fields);
        } else if (helper === "with") {
          handleWith(block, fields);
        } else {
          mergeInto(fields, collectFields(block.program.body));
          if (block.inverse) {
            mergeInto(fields, collectFields(block.inverse.body));
          }
        }
        break;
      }

      default:
        break;
    }
  }

  return fields;
}

function handleEach(node: hbs.AST.BlockStatement, fields: Map<string, JSONSchema4Object>): void {
  const param = node.params[0];
  if (!param || !isPathExpression(param) || param.depth > 0) return;

  const itemFields = collectFields(node.program.body);
  const itemSchema: JSONSchema4Object =
    itemFields.size > 0 ? { type: "object", properties: Object.fromEntries(itemFields) } : { type: "string" };

  mergePath(fields, param.parts, { type: "array", items: itemSchema });
}

function handleConditional(node: hbs.AST.BlockStatement, fields: Map<string, JSONSchema4Object>): void {
  const param = node.params[0];
  if (!param || !isPathExpression(param) || param.depth > 0) return;

  mergePath(fields, param.parts, { type: "boolean" });

  mergeInto(fields, collectFields(node.program.body));
  if (node.inverse) {
    mergeInto(fields, collectFields(node.inverse.body));
  }
}

function handleWith(node: hbs.AST.BlockStatement, fields: Map<string, JSONSchema4Object>): void {
  const param = node.params[0];
  if (!param || !isPathExpression(param) || param.depth > 0) return;

  const innerFields = collectFields(node.program.body);
  mergePath(fields, param.parts, {
    type: "object",
    properties: Object.fromEntries(innerFields),
  });
}

// ── Public API ─────────────────────────────────────────────────

/**
 * Infer a JSON Schema from a Handlebars template string.
 *
 * Parses the template AST and maps variables / block helpers
 * to a typed ObjectSchema describing the expected input.
 */

type JsonSchema = JSONSchema4 & { properties: NonNullable<JSONSchema4['properties']> }

export async function inferHandlebarsSchema(content: string): Promise<JsonSchema> {
  const handlebars = await import("handlebars");
  const ast: hbs.AST.Program = handlebars.parse(content);

  const fields = collectFields(ast.body);
  const required = [...fields.keys()];

  return {
    type: "object",
    properties: Object.fromEntries(fields),
    required,
  };
}
