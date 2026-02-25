import type { Engine, ParsedPrompt } from "@prmpt/core";
import { findPrompts, parsePromptFile } from "@prmpt/core";
import Handlebars from "handlebars";
import { Liquid } from "liquidjs";

const liquidEngine = new Liquid();

export interface DevServerOptions {
  port: number;
  dir: string;
  engine?: Engine;
}

/** All connected SSE clients for live reload */
const clients = new Set<ReadableStreamDefaultController>();

/** Notify all connected clients to reload */
export function notifyClients() {
  for (const controller of clients) {
    try {
      controller.enqueue("data: reload\n\n");
    } catch {
      clients.delete(controller);
    }
  }
}

/** Load and parse all prompts from the directory */
async function loadPrompts(dir: string, engine: Engine = "handlebars"): Promise<ParsedPrompt[]> {
  const files = await findPrompts(dir);
  const prompts: ParsedPrompt[] = [];
  for (const file of files) {
    try {
      prompts.push(await parsePromptFile(file, engine));
    } catch (e) {
      console.error(`  Error parsing ${file}:`, e);
    }
  }
  return prompts;
}

/** Render a prompt template with the given args using the configured engine */
async function renderTemplate(prompt: ParsedPrompt, args: Record<string, string>, engine: Engine): Promise<string> {
  switch (engine) {
    case "hbs":
    case "handlebars": {
      const template = Handlebars.compile(prompt.content);
      return template(args);
    }
    case "liquid": {
      return liquidEngine.parseAndRender(prompt.content, args);
    }
  }
}

function escapeHtml(str: string): string {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

/** Extract flat field entries from the schema's properties */
function schemaFields(schema: ParsedPrompt["schema"]): { name: string; type: string; required: boolean; description?: string }[] {
  const props = (schema.properties ?? {}) as Record<string, { type?: string; description?: string }>;
  const req = Array.isArray(schema.required) ? schema.required as string[] : [];

  return Object.entries(props).map(([name, value]) => ({
    name,
    type: typeof value === "string" ? value : (value.type ?? "string"),
    required: req.includes(name),
    description: typeof value === "string" ? undefined : value.description,
  }));
}

function renderPage(prompts: ParsedPrompt[], selected?: string): string {
  const current = selected ? prompts.find((p) => p.name === selected) : prompts[0];

  const sidebar = prompts
    .map((p) => {
      const active = p.name === current?.name ? ' class="active"' : "";
      return `<a href="/?prompt=${p.name}"${active}>${p.name}</a>`;
    })
    .join("\n        ");

  let main = "";
  if (current) {
    const fields = schemaFields(current.schema);

    const argsTable = fields.length
      ? `<table>
          <thead><tr><th>Arg</th><th>Type</th><th>Required</th><th>Description</th></tr></thead>
          <tbody>
            ${fields
              .map(
                (f) =>
                  `<tr><td><code>${f.name}</code></td><td><code>${f.type}</code></td><td>${f.required ? "Yes" : "No"}</td><td>${f.description ?? "-"}</td></tr>`,
              )
              .join("\n            ")}
          </tbody>
        </table>`
      : `<p class="muted">No arguments defined.</p>`;

    const argInputs = fields
      .map((f) => {
        const placeholder = f.description ?? f.name;
        const req = f.required ? " required" : "";
        return `<div class="field">
          <label for="arg-${f.name}">${f.name}${f.required ? " *" : ""}</label>
          <textarea id="arg-${f.name}" name="${f.name}" data-arg="${f.name}" placeholder="${escapeHtml(placeholder)}" rows="1"${req}></textarea>
        </div>`;
      })
      .join("\n        ");

    main = `
      <div class="prompt-header">
        <h2>${current.name}</h2>
        ${current.description ? `<p class="description">${current.description}</p>` : ""}
      </div>

      <section>
        <h3>Args Schema</h3>
        ${argsTable}
      </section>

      <section>
        <h3>Template</h3>
        <pre><code>${escapeHtml(current.content)}</code></pre>
      </section>

      <section>
        <h3>Preview</h3>
        <div id="preview-form" data-prompt="${current.name}">
          ${fields.length ? argInputs : '<p class="muted">No arguments — preview shows the raw template.</p>'}
        </div>
        <div id="preview-output">
          <pre><code id="preview-text">${escapeHtml(current.content)}</code></pre>
        </div>
      </section>
    `;
  } else {
    main = `<p class="muted">No prompts found. Create a <code>.md</code> file to get started.</p>`;
  }

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>prmpt</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif;
      color: #e4e4e7;
      background: #0c0c0e;
      display: flex;
      height: 100vh;
    }
    aside {
      width: 240px;
      border-right: 1px solid #27272a;
      padding: 16px 0;
      flex-shrink: 0;
      overflow-y: auto;
    }
    aside .logo {
      padding: 0 16px 16px;
      font-size: 18px;
      font-weight: 700;
      letter-spacing: -0.5px;
      color: #fafafa;
    }
    aside a {
      display: block;
      padding: 8px 16px;
      color: #a1a1aa;
      text-decoration: none;
      font-size: 14px;
      font-family: "SF Mono", "Fira Code", monospace;
    }
    aside a:hover { color: #e4e4e7; background: #18181b; }
    aside a.active { color: #fafafa; background: #27272a; }
    main {
      flex: 1;
      overflow-y: auto;
      padding: 32px 40px;
    }
    .prompt-header { margin-bottom: 24px; }
    h2 {
      font-size: 24px;
      font-weight: 600;
      color: #fafafa;
      font-family: "SF Mono", "Fira Code", monospace;
    }
    .description { color: #a1a1aa; margin-top: 4px; }
    h3 {
      font-size: 14px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: #71717a;
      margin-bottom: 12px;
    }
    section { margin-bottom: 32px; }
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 14px;
    }
    th {
      text-align: left;
      padding: 8px 12px;
      border-bottom: 1px solid #27272a;
      color: #71717a;
      font-weight: 500;
    }
    td {
      padding: 8px 12px;
      border-bottom: 1px solid #18181b;
    }
    code {
      font-family: "SF Mono", "Fira Code", monospace;
      font-size: 13px;
    }
    pre {
      background: #18181b;
      border: 1px solid #27272a;
      border-radius: 8px;
      padding: 16px;
      overflow-x: auto;
      font-size: 13px;
      line-height: 1.6;
    }
    pre code { color: #e4e4e7; white-space: pre-wrap; }
    .muted { color: #52525b; }

    /* Form styles */
    #preview-form {
      display: flex;
      flex-direction: column;
      gap: 12px;
      margin-bottom: 16px;
    }
    .field {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    .field label {
      font-size: 12px;
      color: #a1a1aa;
      font-family: "SF Mono", "Fira Code", monospace;
    }
    .field textarea,
    .field select {
      background: #18181b;
      border: 1px solid #27272a;
      border-radius: 6px;
      padding: 8px 12px;
      color: #e4e4e7;
      font-family: "SF Mono", "Fira Code", monospace;
      font-size: 13px;
      resize: vertical;
      outline: none;
    }
    .field textarea:focus,
    .field select:focus {
      border-color: #52525b;
    }
    #preview-output {
      position: relative;
    }
    #preview-output .copy-btn {
      position: absolute;
      top: 8px;
      right: 8px;
      background: #27272a;
      border: 1px solid #3f3f46;
      border-radius: 4px;
      color: #a1a1aa;
      padding: 4px 10px;
      font-size: 11px;
      cursor: pointer;
      font-family: "SF Mono", "Fira Code", monospace;
    }
    #preview-output .copy-btn:hover { color: #fafafa; border-color: #52525b; }
  </style>
</head>
<body>
  <aside>
    <div class="logo">prmpt</div>
    ${sidebar}
  </aside>
  <main>
    ${main}
  </main>
  <script>
    const es = new EventSource("/__sse");
    es.onmessage = () => location.reload();

    const form = document.getElementById("preview-form");
    const output = document.getElementById("preview-text");
    if (form && output) {
      const promptName = form.dataset.prompt;
      const inputs = form.querySelectorAll("[data-arg]");
      let debounce = null;

      // Add copy button
      const copyBtn = document.createElement("button");
      copyBtn.className = "copy-btn";
      copyBtn.textContent = "copy";
      copyBtn.onclick = () => {
        navigator.clipboard.writeText(output.textContent || "");
        copyBtn.textContent = "copied";
        setTimeout(() => copyBtn.textContent = "copy", 1500);
      };
      document.getElementById("preview-output")?.prepend(copyBtn);

      function update() {
        const args = {};
        inputs.forEach(el => {
          const val = el.value.trim();
          if (val) args[el.dataset.arg] = val;
        });

        fetch("/api/render", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ prompt: promptName, args }),
        })
          .then(r => r.json())
          .then(data => {
            if (data.result != null) {
              output.textContent = data.result;
            } else if (data.error) {
              output.textContent = "Error: " + data.error;
            }
          })
          .catch(() => {});
      }

      inputs.forEach(el => {
        el.addEventListener("input", () => {
          clearTimeout(debounce);
          debounce = setTimeout(update, 150);
        });
        el.addEventListener("change", update);
      });

      // Render the initial template on load
      update();
    }
  </script>
</body>
</html>`;
}

export function startServer(options: DevServerOptions): { stop(): void } {
  const { port, dir, engine = "handlebars" } = options;

  const server = Bun.serve({
    port,
    async fetch(req) {
      const url = new URL(req.url);

      // SSE endpoint for live reload
      if (url.pathname === "/__sse") {
        const stream = new ReadableStream({
          start(controller) {
            clients.add(controller);
          },
          cancel(controller) {
            clients.delete(controller);
          },
        });
        return new Response(stream, {
          headers: {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache",
            Connection: "keep-alive",
          },
        });
      }

      // API: render a prompt with args
      if (url.pathname === "/api/render" && req.method === "POST") {
        try {
          const body = (await req.json()) as {
            prompt: string;
            args: Record<string, string>;
          };
          const prompts = await loadPrompts(dir, engine);
          const prompt = prompts.find((p) => p.name === body.prompt);
          if (!prompt) {
            return Response.json({ error: "Prompt not found" }, { status: 404 });
          }
          const result = await renderTemplate(prompt, body.args ?? {}, engine);
          return Response.json({ result });
        } catch (e) {
          const msg = e instanceof Error ? e.message : String(e);
          return Response.json({ error: msg }, { status: 400 });
        }
      }

      // API: get prompts as JSON
      if (url.pathname === "/api/prompts") {
        const prompts = await loadPrompts(dir, engine);
        return Response.json(
          prompts.map((p) => ({
            name: p.name,
            description: p.description,
            schema: p.schema,
            content: p.content,
          })),
        );
      }

      // Main page
      const prompts = await loadPrompts(dir, engine);
      const selected = url.searchParams.get("prompt") ?? undefined;
      const html = renderPage(prompts, selected);
      return new Response(html, {
        headers: { "Content-Type": "text/html" },
      });
    },
  });

  console.log(`  Server running at http://localhost:${port}`);

  return {
    stop() {
      server.stop();
    },
  };
}
