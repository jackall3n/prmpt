import { camelCase, pascalCase } from "es-toolkit";
import type { JSONSchema4 } from "json-schema";
import ts from "typescript";
import type { BuildResult } from "./build";
import type { ParsedPrompt } from "./parser";

const factory = ts.factory;

function jsonSchemaToTypeNode(schema: JSONSchema4): ts.TypeNode {
  if (schema.anyOf) {
    return factory.createUnionTypeNode(schema.anyOf.map(jsonSchemaToTypeNode));
  }

  if (schema.allOf) {
    return factory.createIntersectionTypeNode(schema.allOf.map(jsonSchemaToTypeNode));
  }

  if (schema.enum) {
    return factory.createUnionTypeNode(
      schema.enum.map((v) => factory.createLiteralTypeNode(factory.createStringLiteral(v as string))),
    );
  }

  if (Array.isArray(schema.type)) {
    return factory.createUnionTypeNode(
      schema.type.map((t: string) => jsonSchemaToTypeNode({ ...schema, type: t as any })),
    );
  }

  switch (schema.type) {
    case "string":
      return factory.createKeywordTypeNode(ts.SyntaxKind.StringKeyword);
    case "number":
    case "integer":
      return factory.createKeywordTypeNode(ts.SyntaxKind.NumberKeyword);
    case "boolean":
      return factory.createKeywordTypeNode(ts.SyntaxKind.BooleanKeyword);
    case "null":
      return factory.createLiteralTypeNode(factory.createNull());
    case "array":
      return factory.createTypeReferenceNode("Array", [jsonSchemaToTypeNode(schema.items ?? {})]);
    case "object": {
      const props = schema.properties ?? {};
      const required = schema.required ?? [];
      const members = Object.entries(props).map(([key, value]) =>
        factory.createPropertySignature(
          undefined,
          key,
          Array.isArray(required) && required.includes(key)
            ? undefined
            : factory.createToken(ts.SyntaxKind.QuestionToken),
          jsonSchemaToTypeNode(value),
        ),
      );
      return factory.createTypeLiteralNode(members);
    }
    default:
      return factory.createKeywordTypeNode(ts.SyntaxKind.UnknownKeyword);
  }
}

function generateArgs(prompt: ParsedPrompt) {
  const name = `${pascalCase(prompt.name)}Args`;

  const props = prompt.schema.properties ?? {};
  const required = prompt.schema.required ?? [];

  const members = Object.entries(props).map(([key, value]) =>
    factory.createPropertySignature(
      undefined,
      key,
      Array.isArray(required) && required.includes(key) ? undefined : factory.createToken(ts.SyntaxKind.QuestionToken),
      jsonSchemaToTypeNode(value),
    ),
  );

  const statement = factory.createInterfaceDeclaration(
    [factory.createModifier(ts.SyntaxKind.ExportKeyword)],
    name,
    undefined,
    undefined,
    members,
  );

  return {
    statement,
    name,
  };
}

function generateMetadata(prompt: ParsedPrompt) {
  const modifiers = [factory.createModifier(ts.SyntaxKind.ExportKeyword)];

  const properties: ts.ObjectLiteralElementLike[] = [
    factory.createPropertyAssignment("name", factory.createStringLiteral(prompt.name)),
    factory.createPropertyAssignment("description", factory.createStringLiteral(prompt.description ?? "")),
  ];

  const object = factory.createObjectLiteralExpression(properties, true);

  const statement = factory.createVariableStatement(
    modifiers,
    factory.createVariableDeclarationList(
      [
        factory.createVariableDeclaration(
          "metadata",
          undefined,
          undefined,
          factory.createAsExpression(object, factory.createTypeReferenceNode("const")),
        ),
      ],
      ts.NodeFlags.Const,
    ),
  );

  return statement;
}

function generateSource(prompt: ParsedPrompt) {
  const modifiers = [factory.createModifier(ts.SyntaxKind.ExportKeyword)];

  const statement = factory.createVariableStatement(
    modifiers,
    factory.createVariableDeclarationList(
      [
        factory.createVariableDeclaration(
          "source",
          undefined,
          undefined,
          factory.createNoSubstitutionTemplateLiteral(prompt.content),
        ),
      ],
      ts.NodeFlags.Const,
    ),
  );

  return statement;
}

export function generateRenderBody(prompt: ParsedPrompt) {
  if (prompt.options.engine === "handlebars") {
    const hbsImport = factory.createVariableStatement(
      undefined,
      factory.createVariableDeclarationList(
        [
          factory.createVariableDeclaration(
            "Handlebars",
            undefined,
            undefined,
            factory.createAwaitExpression(
              factory.createCallExpression(factory.createIdentifier("import"), undefined, [
                factory.createStringLiteral("handlebars"),
              ]),
            ),
          ),
        ],
        ts.NodeFlags.Const,
      ),
    );

    const template = "template";

    const compile = factory.createVariableStatement(
      undefined,
      factory.createVariableDeclarationList(
        [
          factory.createVariableDeclaration(
            template,
            undefined,
            undefined,
            factory.createCallExpression(factory.createIdentifier("Handlebars.compile"), undefined, [
              factory.createIdentifier("source"),
              factory.createObjectLiteralExpression(
                [factory.createPropertyAssignment("noEscape", factory.createTrue())],
                false,
              ),
            ]),
          ),
        ],
        ts.NodeFlags.Const,
      ),
    );

    const ret = factory.createReturnStatement(
      factory.createCallExpression(factory.createIdentifier(template), undefined, [factory.createIdentifier("args")]),
    );

    return factory.createBlock([hbsImport, compile, ret], true);
  }

  const err = factory.createThrowStatement(
    factory.createNewExpression(factory.createIdentifier("Error"), undefined, [
      factory.createStringLiteral(`Unsupported engine: ${prompt.options.engine}`),
    ]),
  );

  return factory.createBlock([err], true);
}

export function generateRender(prompt: ParsedPrompt, argsInterface: ts.InterfaceDeclaration) {
  const modifiers = [
    factory.createModifier(ts.SyntaxKind.ExportKeyword),
    factory.createModifier(ts.SyntaxKind.AsyncKeyword),
  ];

  const args = factory.createParameterDeclaration(
    undefined,
    undefined,
    "args",
    undefined,
    factory.createTypeReferenceNode(argsInterface.name),
  );

  const returns = factory.createTypeReferenceNode("Promise", [factory.createTypeReferenceNode("string")]);

  const body = generateRenderBody(prompt);

  const statement = factory.createFunctionDeclaration(modifiers, undefined, "render", undefined, [args], returns, body);

  return statement;
}

export function generateContent(prompt: ParsedPrompt) {
  const args = generateArgs(prompt);
  const metadata = generateMetadata(prompt);
  const source = generateSource(prompt);
  const render = generateRender(prompt, args.statement);

  const statements = [args.statement, metadata, source, render];

  const tempFile = ts.createSourceFile("test.ts", "", ts.ScriptTarget.Latest);

  const printer = ts.createPrinter({ newLine: ts.NewLineKind.LineFeed });
  const output = statements.map((s) => printer.printNode(ts.EmitHint.Unspecified, s, tempFile)).join("\n\n");

  return {
    output,
    argsName: args.name,
  };
}

export function generateIndex(prompts: BuildResult[]) {
  const statements = [];

  for (const prompt of prompts) {
    const importLiteral = factory.createStringLiteral(`./${prompt.fileName}`);

    statements.push(
      factory.createExportDeclaration(
        undefined,
        false,
        factory.createNamespaceExport(factory.createIdentifier(camelCase(prompt.fileName))),
        importLiteral,
      ),
    );

    statements.push(
      factory.createExportDeclaration(
        undefined,
        false,
        factory.createNamedExports([
          factory.createExportSpecifier(true, undefined, factory.createIdentifier(prompt.argsName)),
        ]),
        importLiteral,
      ),
    );
  }

  const tempFile = ts.createSourceFile("test.ts", "", ts.ScriptTarget.Latest);

  const printer = ts.createPrinter({ newLine: ts.NewLineKind.LineFeed });
  const output = statements.map((s) => printer.printNode(ts.EmitHint.Unspecified, s, tempFile)).join("\n");

  return output;
}
