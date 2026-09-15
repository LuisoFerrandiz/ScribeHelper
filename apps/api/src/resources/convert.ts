import { PDFParse } from 'pdf-parse';
import * as mammoth from 'mammoth';
import * as XLSX from 'xlsx';

// One internal format regardless of what arrives (CONTEXT.md section 7,
// DECISIONS.md D-009). No OCR (D-010) — a near-empty result here is what
// a scanned PDF looks like, surfaced to the caller as `empty` so review
// can warn instead of silently "loading" a blank rulebook.
export interface ConversionResult {
  markdown: string;
  empty: boolean;
}

function isEmpty(markdown: string): boolean {
  return markdown.trim().length < 20;
}

async function convertPdf(buffer: Buffer): Promise<string> {
  const parser = new PDFParse({ data: buffer });
  try {
    const result = await parser.getText();
    return result.text
      .split(/\n{2,}/)
      .map((p: string) => p.trim())
      .filter(Boolean)
      .join('\n\n');
  } finally {
    await parser.destroy();
  }
}

// mammoth's bundled .d.ts is stale and omits convertToMarkdown, though it
// exists at runtime (mammoth/lib/index.js) — cast narrowly for this call.
const mammothConvertToMarkdown = (
  mammoth as unknown as { convertToMarkdown: typeof mammoth.convertToHtml }
).convertToMarkdown;

async function convertDocx(buffer: Buffer): Promise<string> {
  const result = await mammothConvertToMarkdown({ buffer });
  return result.value;
}

function convertSpreadsheet(buffer: Buffer): string {
  const workbook = XLSX.read(buffer, { type: 'buffer' });
  return workbook.SheetNames.map((name) => {
    const sheet = workbook.Sheets[name];
    const table = XLSX.utils.sheet_to_html(sheet, { id: undefined });
    // sheet_to_html gives real <table> markup, which is valid inside a
    // Markdown file and round-trips through GFM renderers better than a
    // hand-rolled pipe table would for merged cells / ragged rows.
    return `## ${name}\n\n${table}`;
  }).join('\n\n');
}

export async function convertToMarkdown(buffer: Buffer, originalFilename: string): Promise<ConversionResult> {
  const ext = originalFilename.toLowerCase().split('.').pop() ?? '';

  let markdown: string;
  switch (ext) {
    case 'md':
    case 'markdown':
      markdown = buffer.toString('utf-8');
      break;
    case 'pdf':
      markdown = await convertPdf(buffer);
      break;
    case 'docx':
      markdown = await convertDocx(buffer);
      break;
    case 'xlsx':
    case 'xls':
      markdown = convertSpreadsheet(buffer);
      break;
    default:
      throw new Error(`Unsupported file type: .${ext}`);
  }

  return { markdown, empty: isEmpty(markdown) };
}
