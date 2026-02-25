import { describe, expect, it } from "bun:test";
import { generateContent, generateIndex } from "./codegen";
import { parsePrompt } from "./parser";
import  { ConfigSchema } from "./schemas/config";

describe("codegen", () => {
  describe("generateContent", async () => {
    const content = `
---
name: test
description: A test prompt
engine: handlebars
---
Hello {{name}}, welcome to {{place}}!

{{#each points}}
- {{point.name}}
{{/each}}
    `.trim();

    const config = ConfigSchema.parse({})

    const prompt = await parsePrompt(content, "example-prompt.md", config.engine);

    it("should generate content", async () => {
      const { output} = generateContent(prompt)

      expect(output).toMatchInlineSnapshot(`
        "export interface TestArgs {
            name: string;
            place: string;
            points: Array<{
                point?: {
                    name?: string;
                };
            }>;
        }

        export const metadata = {
            name: "test",
            description: "A test prompt"
        } as const;

        export const source = \`Hello {{name}}, welcome to {{place}}!

        {{#each points}}
        - {{point.name}}
        {{/each}}\`;

        export async function render(args: TestArgs): Promise<string> {
            const Handlebars = await import("handlebars");
            const template = Handlebars.compile(source, { noEscape: true });
            return template(args);
        }"
      `);
    });
  });

  describe("generateIndex", async () => {
    const content = `
---
name: test
description: A test prompt
engine: handlebars
---
Hello {{name}}, welcome to {{place}}!

{{#each points}}
- {{point.name}}
{{/each}}
    `.trim();
    const config = ConfigSchema.parse({})
    const prompt = await parsePrompt(content, "example-prompt.md", config.engine);

    it("should generate an index", async () => {
      const {output, argsName} = generateContent(prompt);

      const index = generateIndex([{
        source: "test.prompt.md",
        outputFile: "test.ts",
        fileName: "test",
        prompt,
        output,
        argsName,
      }]);

      expect(index).toMatchInlineSnapshot(`
        "export * as test from "./test";
        export { type TestArgs } from "./test";"
      `);
    });
  });
});
