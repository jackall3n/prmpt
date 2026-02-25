import { defineConfig } from 'bumpp'

export default defineConfig({
  files: [
    'package.json',
    'packages/core/package.json',
    'packages/prmpt/package.json',
    'packages/dev/package.json',
  ],
  commit: 'chore: release v{version}',
  tag: 'v{version}',
  all: true,
  execute: 'bun run build && bun test',
})
