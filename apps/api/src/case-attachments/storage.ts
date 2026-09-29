import { randomUUID } from 'node:crypto';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { config } from '../config.js';
import { convertToMarkdown } from '../resources/convert.js';

// Same directory shape as resources/storage.ts, own namespace — case
// attachments are not one of the three material stores (CONTEXT.md
// section 6) and must not be merged with rules/examples.
const ORIGINALS_DIR = path.join('case_attachments', 'originals');
const MARKDOWN_DIR = 'case_attachments';

export interface StoredAttachment {
  originalPath: string; // relative to dataDir
  markdownPath: string | null; // relative to dataDir, null when unsupported for conversion
  conversionEmpty: boolean;
}

export async function storeAttachment(
  originalFilename: string,
  fileBuffer: Buffer,
): Promise<StoredAttachment> {
  const id = randomUUID();
  const ext = path.extname(originalFilename) || '.bin';
  const base = path.basename(originalFilename, ext).replace(/[^a-zA-Z0-9_-]/g, '_');

  const originalRel = path.join(ORIGINALS_DIR, `${base}-${id}${ext}`);
  await mkdir(path.join(config.dataDir, ORIGINALS_DIR), { recursive: true });
  await writeFile(path.join(config.dataDir, originalRel), fileBuffer);

  let markdownPath: string | null = null;
  let conversionEmpty = false;
  try {
    const { markdown, empty } = await convertToMarkdown(fileBuffer, originalFilename);
    const markdownRel = path.join(MARKDOWN_DIR, `${base}-${id}.md`);
    await mkdir(path.join(config.dataDir, MARKDOWN_DIR), { recursive: true });
    await writeFile(path.join(config.dataDir, markdownRel), markdown, 'utf-8');
    markdownPath = markdownRel;
    conversionEmpty = empty;
  } catch (err) {
    // Unsupported file type (e.g. an image) is expected — any format is
    // allowed as an attachment, only some are convertible. Any other
    // error (a real conversion failure) still fails the whole upload.
    if (!(err instanceof Error) || !err.message.startsWith('Unsupported file type')) {
      await rm(path.join(config.dataDir, originalRel), { force: true });
      throw err;
    }
  }

  return { originalPath: originalRel, markdownPath, conversionEmpty };
}

export async function deleteAttachmentFiles(paths: {
  originalPath: string;
  markdownPath: string | null;
}) {
  await rm(path.join(config.dataDir, paths.originalPath), { force: true });
  if (paths.markdownPath) {
    await rm(path.join(config.dataDir, paths.markdownPath), { force: true });
  }
}
