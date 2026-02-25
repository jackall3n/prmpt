import { describe, expect, it } from "bun:test";
import { extractSchema } from "./parser";

describe("parser", () => {
  describe("extractSchema", () => {
    const content = "Hello {{name}}, welcome to {{place}}!";

    it("should infer a schema from a handlebars template", async () => {
      const schema = await extractSchema(content, {
        engine: "handlebars",
      });

      expect(schema).toEqual({
        type: "object",
        properties: {
          name: { type: "string" },
          place: { type: "string" },
        },
        required: ["name", "place"],
      });
    });

    it("should infer a schema from a hbs template", async () => {
      const schema = await extractSchema(content, {
        engine: "hbs",
      });

      expect(schema).toEqual({
        type: "object",
        properties: {
          name: { type: "string" },
          place: { type: "string" },
        },
        required: ["name", "place"],
      });
    });

    it("should return the schema if it is explicitly provided", async () => {
      const schema = await extractSchema(content, {
        engine: "handlebars",
        schema: {
          name: { type: "string" },
          place: { type: "string" },
        },
      });

      expect(schema).toEqual({
        type: "object",
        properties: {
          name: { type: "string" },
          place: { type: "string" },
        },
        required: ["name", "place"],
      });
    });

    it("should fallback to regex extraction if the engine is not supported", async () => {
      const schema = await extractSchema(content, {
        engine: "liquid",
      });

      expect(schema).toEqual({
        type: "object",
        properties: {
          name: { type: "string" },
          place: { type: "string" },
        },
        required: ["name", "place"],
      });
    });
  });
});
