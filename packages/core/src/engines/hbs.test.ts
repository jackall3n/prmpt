import { describe, expect, it } from "bun:test";
import { inferHandlebarsSchema } from "./hbs";

describe("inferHandlebarsSchema", () => {
  it("infers simple variables as strings", async () => {
    const schema = await inferHandlebarsSchema("Hello {{name}}, welcome to {{place}}!");

    expect(schema).toEqual({
      type: "object",
      properties: {
        name: { type: "string" },
        place: { type: "string" },
      },
      required: ["name", "place"],
    });
  });

  it("returns empty properties for plain content", async () => {
    const schema = await inferHandlebarsSchema("No variables here.");

    expect(schema).toEqual({
      type: "object",
      properties: {},
      required: [],
    });
  });

  it("deduplicates repeated variables", async () => {
    const schema = await inferHandlebarsSchema("{{name}} said hello to {{name}}");

    expect(schema.required).toEqual(["name"]);
    expect(Object.keys(schema.properties ?? {})).toEqual(["name"]);
  });

  it("infers #each as array with item shape", async () => {
    const schema = await inferHandlebarsSchema("{{#each items}}- {{title}}: {{description}}\n{{/each}}");

    expect(schema.properties?.items).toEqual({
      type: "array",
      items: {
        type: "object",
        properties: {
          title: { type: "string" },
          description: { type: "string" },
        },
      },
    });
  });

  it("infers #each with no inner vars as array of strings", async () => {
    const schema = await inferHandlebarsSchema("{{#each tags}}{{this}}{{/each}}");

    expect(schema.properties.tags).toEqual({
      type: "array",
      items: { type: "string" },
    });
  });

  it("infers #if as boolean", async () => {
    const schema = await inferHandlebarsSchema("{{#if active}}Active{{/if}}");

    expect(schema.properties.active).toEqual({ type: "boolean" });
  });

  it("infers #unless as boolean", async () => {
    const schema = await inferHandlebarsSchema("{{#unless disabled}}Enabled{{/unless}}");

    expect(schema.properties.disabled).toEqual({ type: "boolean" });
  });

  it("lifts variables inside #if to the parent scope", async () => {
    const schema = await inferHandlebarsSchema("{{#if showFooter}}{{footerText}}{{/if}}");

    expect(schema.properties.showFooter).toEqual({ type: "boolean" });
    expect(schema.properties.footerText).toEqual({ type: "string" });
    expect(schema.required).toContain("showFooter");
    expect(schema.required).toContain("footerText");
  });

  it("lifts variables from #if else branch", async () => {
    const schema = await inferHandlebarsSchema("{{#if premium}}{{welcomeMsg}}{{else}}{{defaultMsg}}{{/if}}");

    expect(schema.properties.premium).toEqual({ type: "boolean" });
    expect(schema.properties.welcomeMsg).toEqual({ type: "string" });
    expect(schema.properties.defaultMsg).toEqual({ type: "string" });
  });

  it("infers #with as object with inner properties", async () => {
    const schema = await inferHandlebarsSchema("{{#with author}}{{firstName}} {{lastName}}{{/with}}");

    expect(schema.properties.author).toEqual({
      type: "object",
      properties: {
        firstName: { type: "string" },
        lastName: { type: "string" },
      },
    });
  });

  it("infers dotted paths as nested objects", async () => {
    const schema = await inferHandlebarsSchema("{{user.email}}");

    expect(schema.properties.user).toEqual({
      type: "object",
      properties: {
        email: { type: "string" },
      },
    });
  });

  it("merges multiple dotted paths into the same object", async () => {
    const schema = await inferHandlebarsSchema("{{user.name}} — {{user.email}}");

    expect(schema.properties.user).toEqual({
      type: "object",
      properties: {
        name: { type: "string" },
        email: { type: "string" },
      },
    });
  });

  it("handles deeply nested dotted paths", async () => {
    const schema = await inferHandlebarsSchema("{{a.b.c}}");

    expect(schema.properties.a).toEqual({
      type: "object",
      properties: {
        b: {
          type: "object",
          properties: {
            c: { type: "string" },
          },
        },
      },
    });
  });

  it("skips @data variables", async () => {
    const schema = await inferHandlebarsSchema("{{#each items}}{{@index}}: {{name}}{{/each}}");

    expect(schema.properties.items).toEqual({
      type: "array",
      items: {
        type: "object",
        properties: {
          name: { type: "string" },
        },
      },
    });
  });

  it("skips parent scope references (../)", async () => {
    const schema = await inferHandlebarsSchema("{{#each items}}{{../title}} — {{name}}{{/each}}");

    const items = schema.properties.items;
    
    expect(items?.type).toBe("array");

    if (items?.type === "array" && items.items && typeof items.items === "object" && "properties" in items.items) {
      expect(items.items.properties?.name).toEqual({ type: "string" });
      expect(items.items.properties).not.toHaveProperty("title");
    }
  });

  it("prefers array over boolean when same var uses #each and #if", async () => {
    const schema = await inferHandlebarsSchema("{{#if items}}Has items{{/if}}{{#each items}}{{name}}{{/each}}");

    expect(schema.properties.items?.type).toBe("array");
  });

  it("prefers object over string for #with after plain usage", async () => {
    const schema = await inferHandlebarsSchema("{{author}}{{#with author}}{{name}}{{/with}}");

    expect(schema.properties.author?.type).toBe("object");
  });

  it("handles a complex mixed template", async () => {
    const schema = await inferHandlebarsSchema(`Dear {{recipient}},

{{#with sender}}
From: {{name}} ({{email}})
{{/with}}

{{#if urgent}}URGENT: {{/if}}{{subject}}

{{#each attachments}}
- {{filename}} ({{size}} bytes)
{{/each}}
`);

    expect(schema.properties.recipient).toEqual({ type: "string" });
    expect(schema.properties.subject).toEqual({ type: "string" });
    expect(schema.properties.urgent).toEqual({ type: "boolean" });
    expect(schema.properties.sender).toEqual({
      type: "object",
      properties: {
        name: { type: "string" },
        email: { type: "string" },
      },
    });
    expect(schema.properties.attachments).toEqual({
      type: "array",
      items: {
        type: "object",
        properties: {
          filename: { type: "string" },
          size: { type: "string" },
        },
      },
    });
    expect(schema.required).toEqual(["recipient", "sender", "urgent", "subject", "attachments"]);
  });

  it("ignores comments", async () => {
    const schema = await inferHandlebarsSchema("{{! this is a comment }}{{name}}");

    expect(schema).toEqual({
      type: "object",
      properties: { name: { type: "string" } },
      required: ["name"],
    });
  });

  it("handles triple-stash (unescaped) variables", async () => {
    const schema = await inferHandlebarsSchema("{{{html}}}");

    expect(schema.properties.html).toEqual({ type: "string" });
  });
});
