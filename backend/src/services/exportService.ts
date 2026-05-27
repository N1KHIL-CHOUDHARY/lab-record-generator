import path from 'path';
import fs from 'fs/promises';
import puppeteer from 'puppeteer';
import { buildLabRecordDocx } from './docxBuilder.js';
import { buildLabRecordHtml, type LabRecordData } from '../templates/labRecordHtml.js';
import { PAGE } from '../templates/documentSpec.js';
export type ExportData = LabRecordData;

const EXPORTS_DIR = path.join(process.cwd(), 'uploads', 'exports');

async function ensureExportDir(): Promise<void> {
  await fs.mkdir(EXPORTS_DIR, { recursive: true });
}

export async function exportDocx(data: ExportData, fileName: string): Promise<string> {
  await ensureExportDir();
  const buffer = await buildLabRecordDocx(data);
  const filePath = path.join(EXPORTS_DIR, `${fileName}.docx`);
  await fs.writeFile(filePath, buffer);
  return `/uploads/exports/${fileName}.docx`;
}

export async function exportPdf(data: ExportData, fileName: string): Promise<string> {
  await ensureExportDir();

  const html = buildLabRecordHtml(data);
  const filePath = path.join(EXPORTS_DIR, `${fileName}.pdf`);

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'load', timeout: 60000 });
    await page.pdf({
      path: filePath,
      format: 'A4',
      printBackground: true,
      preferCSSPageSize: true,
      margin: {
        top: `${PAGE.marginTopIn}in`,
        bottom: `${PAGE.marginBottomIn}in`,
        left: `${PAGE.marginLeftIn}in`,
        right: `${PAGE.marginRightIn}in`,
      },
    });
  } finally {
    await browser.close();
  }

  return `/uploads/exports/${fileName}.pdf`;
}
