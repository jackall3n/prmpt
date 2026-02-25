# @tsprompt/core

Core library for parsing, building, and validating type-safe prompts.

## Installation

```bash
npm install @tsprompt/core
bun add @tsprompt/core
```

## Usage

```typescript
import {
  parsePrompt,
  buildPrompt,
  findPrompts,
  generateContent,
  loadConfig,
  defineConfig,
} from '@tsprompt/core';
```

## Features

- Parse markdown prompts with YAML frontmatter
- Build individual prompts with validation
- Generate TypeScript types from JSON schemas
- Support for multiple template engines (Handlebars, Liquid)
- Load and validate configuration files

## Documentation

For full documentation, see https://github.com/jackall3n/prmpt
