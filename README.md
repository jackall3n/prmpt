# prmpt

Build type-safe prompts from markdown. Generate TypeScript types from your AI prompts with schema validation and template engine support.

## Features

- 📝 **Markdown-based prompts** - Define prompts in simple markdown with YAML frontmatter
- 🎯 **Type-safe schemas** - Automatically generate TypeScript types from JSON schemas
- 🔄 **Multiple template engines** - Support for Handlebars and Liquid templates
- ⚡ **Zero-runtime overhead** - Compile-time type generation, no runtime cost
- 🔧 **CLI + Library** - Use as a command-line tool or import as a library
- 📦 **Monorepo ready** - Optimized for multi-package projects with Turbo and Bun
- 🚀 **Automated publishing** - GitHub Actions CI/CD with Bumpp for versioning

## Quick Start

### Installation

```bash
# Using bun (recommended)
bun add prmpt

# Using npm
npm install prmpt
```

### Create Your First Prompt

Create `prompts/greet.md`:

```markdown
---
name: greet
description: A friendly greeting prompt
model: gpt-4o
schema:
  name: string
  tone:
    type: string
    enum: [friendly, formal, casual]
---
You are a helpful assistant.
Greet {{name}} in a {{tone}} tone.
```

### Build & Use

```bash
# Build prompts to typed TypeScript
prmpt build ./prompts

# Now use the generated types
import type { greet } from './dist/prompts';

const input: greet = {
  name: 'Alice',
  tone: 'friendly'
};
```

## CLI Commands

```bash
# Build prompts to typed TypeScript
bun run build

# Start dev server with watch mode
prmpt dev ./prompts --port 3000

# Create a starter project
prmpt init ./my-project

# Options:
#   --output, -o <dir>    Output directory
#   --port, -p <port>     Dev server port (default: 3000)
```

## Project Structure

```
prmpt/
├── packages/
│   ├── core/              # @prmpt/core - Core library
│   │   └── src/
│   │       ├── build.ts   # Build and file operations
│   │       ├── parser.ts  # Prompt parsing
│   │       ├── codegen.ts # TypeScript generation
│   │       └── engines/   # Template engines (hbs, liquid)
│   │
│   ├── dev/               # @prmpt/dev - Dev utilities
│   │   └── src/
│   │       ├── codegen.ts # Code generation
│   │       └── ...
│   │
│   └── prmpt/             # prmpt CLI tool
│       └── src/
│           └── cli.ts     # Command-line interface
│
├── examples/              # Example prompts
│   ├── prompts/
│   │   ├── greet.md
│   │   ├── code-review.md
│   │   └── plain.md
│   └── prmpt.config.ts
│
├── turbo.jsonc            # Turbo build configuration
├── bumpp.config.ts        # Version bumping config
└── .github/workflows/     # GitHub Actions CI/CD
```

## Development

### Setup

```bash
# Install dependencies
bun install

# Build all packages
bun run build

# Run tests
bun run test

# Lint code
bun run lint

# Start dev environment
bun run dev
```

### Available Commands

| Command | Description |
|---------|-------------|
| `bun run build` | Build all packages with Turbo |
| `bun run test` | Run all tests |
| `bun run lint` | Type-check all packages |
| `bun run dev` | Start dev environments |
| `bun run release` | Bump versions and create git tags |

### File Organization

- `/src` - Source code files
- `/tests` - Test files
- `/docs` - Documentation
- `/config` - Configuration files
- `/scripts` - Utility scripts

## Monorepo Architecture

This monorepo uses:

- **[Bun](https://bun.sh)** - JavaScript runtime with native TypeScript support
- **[Turbo](https://turbo.build)** - Intelligent build system with caching
- **[Bumpp](https://github.com/antfu/bumpp)** - Automated versioning and changelog
- **[TypeScript](https://www.typescriptlang.org)** - Static type checking
- **[Biome](https://biomejs.dev)** - Fast formatter and linter

### Performance

Build performance is optimized:

| Metric | Result |
|--------|--------|
| First build | ~361ms |
| Cached rebuild | ~160ms |
| Package size (@prmpt/core) | 16 KB |
| Package size (@prmpt/dev) | 16 KB |
| Package size (prmpt) | 4 KB |

## Publishing

Automated publishing via GitHub Actions:

### 1. Local Release

```bash
# Bump version interactively (patch/minor/major)
bun run release

# This will:
# - Update all package.json versions
# - Run build & tests
# - Create git commit: "chore: release v0.0.2"
# - Create git tag: v0.0.2
# - Push to origin
```

### 2. GitHub Actions Automation

When a tag is pushed, GitHub Actions automatically:
- Runs tests and builds
- Publishes to npm
- Creates a GitHub release

**Required:** Set `NPM_TOKEN` secret in repository settings

## Packages

### @prmpt/core

Core library for parsing, building, and validating prompts.

**Size:** 16 KB

```typescript
import {
  parsePrompt,        // Parse markdown prompt files
  buildPrompt,        // Build individual prompts
  findPrompts,        // Discover prompt files
  generateContent,    // Generate TypeScript from schemas
  loadConfig,         // Load configuration
  defineConfig,       // Define configuration
} from '@prmpt/core';
```

### @prmpt/dev

Development utilities for template engines and code generation.

**Size:** 16 KB

```typescript
import {
  // Dev-only utilities for template rendering
} from '@prmpt/dev';
```

### prmpt

Command-line interface for building and developing prompts.

**Size:** 4 KB

```bash
prmpt build ./prompts
prmpt dev ./prompts
prmpt init ./my-project
```

## Configuration

Create `prmpt.config.ts`:

```typescript
import { defineConfig } from 'prmpt';

export default defineConfig({
  engine: 'handlebars',  // 'handlebars' | 'liquid'
  input: './prompts',
  output: './dist/prompts',
});
```

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Make your changes and run tests: `bun test`
4. Run linter: `bun run lint`
5. Commit: `git commit -m 'feat: add amazing feature'`
6. Push and open a Pull Request

## Resources

- 📖 [Package Documentation](#packages)
- 📝 [Prompt Format Guide](#prompt-format)
- 🚀 [Development Guide](#development)
- 🐛 [Issues](https://github.com/ruvnet/prmpt/issues)

## License

MIT

---

Built with ❤️ using Bun, Turbo, and TypeScript
