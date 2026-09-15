import { randomUUID } from 'node:crypto';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { config } from '../config.js';

export type ResourceKind = 'rule' | 'example';
export type RuleLayer = 'rrs' | 'class' | 'event';
export type ExampleScope = 'base' | 'own';

// Mirrors CONTEXT.md section 8's directory layout. Relative to dataDir
// only (RULES.md R-13/R-15 — no absolute paths baked into the database).
function markdownDir(kind: ResourceKind, layerOrScope: RuleLayer | ExampleScope): string {
  return kind === 'rule' ? path.join('rules', layerOrScope) : path.join('examples', layerOrScope);
}

export interface StoredPaths {
  originalPath: string; // relative to dataDir
  markdownPath: string; // relative to dataDir
}

export async function storeUpload(
  kind: ResourceKind,
  layerOrScope: RuleLayer | ExampleScope,
  originalFilename: string,
  fileBuffer: Buffer,
  markdown: string,
): Promise<StoredPaths> {
  const id = randomUUID();
  const ext = path.extname(originalFilename) || '.bin';
  const base = path.basename(originalFilename, ext).replace(/[^a-zA-Z0-9_-]/g, '_');

  const originalRelDir = 'originals';
  const markdownRelDir = markdownDir(kind, layerOrScope);

  const originalRel = path.join(originalRelDir, `${base}-${id}${ext}`);
  const markdownRel = path.join(markdownRelDir, `${base}-${id}.md`);

  await mkdir(path.join(config.dataDir, originalRelDir), { recursive: true });
  await mkdir(path.join(config.dataDir, markdownRelDir), { recursive: true });

  await writeFile(path.join(config.dataDir, originalRel), fileBuffer);
  await writeFile(path.join(config.dataDir, markdownRel), markdown, 'utf-8');

  return { originalPath: originalRel, markdownPath: markdownRel };
}

export async function readMarkdown(markdownPath: string): Promise<string> {
  return readFile(path.join(config.dataDir, markdownPath), 'utf-8');
}

// Reject deletes both files, no orphans (CONTEXT.md section 7).
export async function deleteStoredFiles(paths: { originalPath: string; markdownPath: string | null }) {
  await rm(path.join(config.dataDir, paths.originalPath), { force: true });
  if (paths.markdownPath) {
    await rm(path.join(config.dataDir, paths.markdownPath), { force: true });
  }
}
