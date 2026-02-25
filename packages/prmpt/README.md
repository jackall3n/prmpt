# prmpt

Command-line tool for building type-safe prompts from markdown.

**npm package:** `@tsprompt/cli`
**Binary:** `prmpt`

## Installation

```bash
npm install -g @tsprompt/cli
bun add @tsprompt/cli
```

## Quick Start

```bash
# Build prompts
prmpt build ./prompts

# Start dev server with watch mode
prmpt dev ./prompts --port 3000

# Create a starter project
prmpt init ./my-project
```

## Commands

- `prmpt build [dir]` - Build prompts to typed TypeScript
- `prmpt dev [dir]` - Start dev server with watch mode
- `prmpt init [dir]` - Create a starter project

## Configuration

Create `prmpt.config.ts`:

```typescript
import { defineConfig } from '@tsprompt/core';

export default defineConfig({
  engine: 'handlebars',  // 'handlebars' | 'liquid'
  input: './prompts',
  output: './dist/prompts',
});
```

## Documentation

For full documentation, see https://github.com/jackall3n/prmpt
