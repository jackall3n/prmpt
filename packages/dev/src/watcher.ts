import { type FSWatcher, watch } from "node:fs";
import { resolve } from "node:path";

export type WatchCallback = (event: string, filename: string) => void;

export interface Watcher {
  close(): void;
}

/** Watch a directory for .prompt.md file changes, debounced */
export function watchPrompts(dir: string, onChange: WatchCallback): Watcher {
  const absDir = resolve(dir);
  let debounceTimer: ReturnType<typeof setTimeout> | null = null;

  const fsWatcher: FSWatcher = watch(absDir, { recursive: true }, (event, filename) => {
    if (!filename || !filename.endsWith(".md")) return;

    // Debounce rapid changes
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      onChange(event, filename);
    }, 100);
  });

  return {
    close() {
      fsWatcher.close();
      if (debounceTimer) clearTimeout(debounceTimer);
    },
  };
}
