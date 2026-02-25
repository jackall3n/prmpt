import { describe, expect, it } from "bun:test";
import { rm } from "node:fs/promises";
import { join, resolve } from "node:path";
import { build } from "./build";
import { generateContent } from "./codegen";
import { parsePrompt } from "./parser";
import type { Config } from "./schemas/config";

const FIXTURES = resolve(import.meta.dir, "../../../examples/prompts");
const TMP_OUT = resolve(import.meta.dir, "../.test-output");

describe("parser", () => {
  it("parses schema from frontmatter", async () => {
    const raw = `---
name: test
description: A test prompt
schema:
  name: string
  age:
    type: number
    optional: true
---
Hello {{name}}, you are {{age}} years old.`;

    const result = await parsePrompt(raw, "test.prompt.md", "handlebars");

    expect(result.name).toBe("test");
    expect(result.description).toBe("A test prompt");
    expect(result.schema.type).toBe("object");
    expect(result.schema.properties).toHaveProperty("name");
    expect(result.schema.properties).toHaveProperty("age");
    expect(result.content).toContain("Hello {{name}}");
  });

  it("infers string args from template vars when no schema", async () => {
    const raw = `---
name: simple
---
Hello {{user}}, welcome to {{place}}.`;

    const result = await parsePrompt(raw, "simple.prompt.md", "handlebars");

    expect(result.schema.properties).toEqual({
      user: { type: "string" },
      place: { type: "string" },
    });
  });

  it("infers array type from handlebars #each", async () => {
    const raw = `---
name: list
---
{{#each items}}
- {{this}}
{{/each}}`;

    const result = await parsePrompt(raw, "list.prompt.md", "handlebars");
    expect(result.schema.properties?.items).toBeDefined();
    expect(result.schema.properties?.items?.type).toBe("array");
  });

  it("infers boolean type from handlebars #if", async () => {
    const raw = `---
name: conditional
---
{{#if verbose}}
Extra details here.
{{/if}}
Hello {{name}}.`;

    const result = await parsePrompt(raw, "cond.prompt.md", "handlebars");
    expect(result.schema.properties?.verbose?.type).toBe("boolean");
    expect(result.schema.properties?.name?.type).toBe("string");
  });

  it("liquid engine infers all vars as string", async () => {
    const raw = "Hello {{ name }}, you have {{ count }} items.";
    const result = await parsePrompt(raw, "liq.prompt.md", "liquid");

    expect(result.schema.properties?.name).toEqual({ type: "string" });
    expect(result.schema.properties?.count).toEqual({ type: "string" });
  });

  it("handles files without frontmatter", async () => {
    const raw = "Just a plain prompt with {{name}}.";
    const result = await parsePrompt(raw, "plain.prompt.md", "handlebars");
    expect(result.name).toBe("plain.prompt");
    expect(result.schema.properties?.name).toEqual({ type: "string" });
  });

  it("derives name from filename", async () => {
    const raw = `---
description: no name field
---
Hello.`;
    const result = await parsePrompt(raw, "my-cool-prompt.prompt.md", "handlebars");
    expect(result.name).toBe("my-cool-prompt.prompt");
  });
});

describe("codegen", () => {
  it("generates typed interface from schema", async () => {
    const prompt = await parsePrompt(
      `---
name: welcome
schema:
  name: string
  role:
    type: string
---
Hello {{name}}, your role is {{role}}.`,
      "welcome.prompt.md",
      "handlebars",
    );

    const { output } = generateContent(prompt);
    expect(output).toContain("WelcomeArgs");
    expect(output).toContain("name");
    expect(output).toContain("role");
    expect(output).toContain("metadata");
    expect(output).toContain("source");
  });
});

describe("build", () => {
  it("builds all prompts in a directory", async () => {
    await rm(TMP_OUT, { recursive: true, force: true });

    const results = await build({ input: FIXTURES, output: TMP_OUT });

    expect(results.length).toBeGreaterThanOrEqual(2);

    const greetTs = Bun.file(join(TMP_OUT, "greet.ts"));
    expect(await greetTs.exists()).toBe(true);

    const greetContent = await greetTs.text();
    expect(greetContent).toContain("GreetArgs");

    await rm(TMP_OUT, { recursive: true, force: true });
  });
});
