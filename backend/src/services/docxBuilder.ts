import path from 'path';
import fs from 'fs/promises';
import {
  File,
  Packer,
  Paragraph,
  Table,
  TableRow,
  TableCell,
  WidthType,
  AlignmentType,
  BorderStyle,
  ImageRun,
  TextRun,
  ExternalHyperlink,
  VerticalAlign,
  HeightRule,
} from 'docx';
import {
  BANNER,
  COLUMNS,
  COURSE_TITLE,
  FOOTER,
  PAGE,
  QR,
  SUBTITLE,
  TABLE,
  buildCourseTitleLine,
  formatTableDate,
  inchesToDxa,
  inchesToEmu,
  inchesToTwip,
  padExpNo,
  ptToHalfPoints,
} from '../templates/documentSpec.js';
import type { LabRecordData } from '../templates/labRecordHtml.js';

const TIMES = 'Times New Roman';
const BLACK_BORDER = {
  style: BorderStyle.SINGLE,
  size: 8,
  color: '000000',
};
const NO_BORDER = {
  style: BorderStyle.NONE,
  size: 0,
  color: 'FFFFFF',
};
const TABLE_BORDERS = {
  top: BLACK_BORDER,
  bottom: BLACK_BORDER,
  left: BLACK_BORDER,
  right: BLACK_BORDER,
  insideHorizontal: BLACK_BORDER,
  insideVertical: BLACK_BORDER,
};
const FOOTER_TABLE_BORDERS = {
  top: NO_BORDER,
  bottom: NO_BORDER,
  left: NO_BORDER,
  right: NO_BORDER,
  insideHorizontal: NO_BORDER,
  insideVertical: NO_BORDER,
};

function timesRun(text: string, opts?: { bold?: boolean; sizePt?: number; color?: string; underline?: boolean }) {
  return new TextRun({
    text,
    font: TIMES,
    bold: opts?.bold,
    size: ptToHalfPoints(opts?.sizePt ?? TABLE.bodyFontPt),
    color: opts?.color,
    underline: opts?.underline ? {} : undefined,
  });
}

function cellBorders() {
  return TABLE_BORDERS;
}

function columnWidths(): number[] {
  return [
    inchesToDxa(COLUMNS.exp),
    inchesToDxa(COLUMNS.date),
    inchesToDxa(COLUMNS.name),
    inchesToDxa(COLUMNS.qr),
    inchesToDxa(COLUMNS.mark),
    inchesToDxa(COLUMNS.signature),
  ];
}

async function loadBannerBuffer(): Promise<Buffer | null> {
  const pngPath = path.join(process.cwd(), 'assets', 'college-banner.png');
  const tryPaths = [pngPath];
  for (const p of tryPaths) {
    try {
      return await fs.readFile(p);
    } catch {}
  }
  return null;
}

async function readQrBuffer(qrImagePath?: string): Promise<Buffer | null> {
  if (!qrImagePath) return null;
  try {
    const relativePath = qrImagePath.startsWith('/') ? qrImagePath.slice(1) : qrImagePath;
    const fullPath = path.join(process.cwd(), relativePath);
    return await fs.readFile(fullPath);
  } catch {
    return null;
  }
}

function headerRow(): TableRow {
  const headers = ['Exp', 'Date', 'Name of The Experiment', 'QR Code', 'Mark', 'Signature'];
  const widths = columnWidths();

  return new TableRow({
    height: { value: inchesToTwip(TABLE.headerHeightIn), rule: HeightRule.ATLEAST },
    tableHeader: true,
    cantSplit: true,
    children: headers.map(
      (text, i) =>
        new TableCell({
          width: { size: widths[i], type: WidthType.DXA },
          verticalAlign: VerticalAlign.CENTER,
          borders: cellBorders(),
          children: [
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [timesRun(text, { bold: true, sizePt: TABLE.headerFontPt })],
            }),
          ],
        })
    ),
  });
}

function experimentRow(
  exp: LabRecordData['experiments'][0],
  qrBuffer: Buffer | null,
  widths: number[]
): TableRow {
  const nameParagraphs: Paragraph[] = [
    new Paragraph({
      spacing: { after: inchesToTwip(0.08) },
      children: [timesRun(exp.experimentName, { sizePt: TABLE.bodyFontPt })],
    }),
    new Paragraph({
      children: [
        new ExternalHyperlink({
          link: exp.githubLink,
          children: [
            timesRun(exp.githubLink, {
              sizePt: TABLE.linkFontPt,
              color: '0563C1',
              underline: true,
            }),
          ],
        }),
      ],
    }),
  ];

  const qrParagraphs: Paragraph[] = qrBuffer
    ? [
        new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [
            new ImageRun({
              data: qrBuffer,
              transformation: {
                width: inchesToEmu(QR.sizeIn),
                height: inchesToEmu(QR.sizeIn),
              },
              type: 'png',
            }),
          ],
        }),
      ]
    : [new Paragraph({ alignment: AlignmentType.CENTER, children: [timesRun('—')] })];

  const cells = [
    new TableCell({
      width: { size: widths[0], type: WidthType.DXA },
      verticalAlign: VerticalAlign.CENTER,
      borders: cellBorders(),
      children: [
        new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [timesRun(padExpNo(exp.experimentNo), { sizePt: TABLE.bodyFontPt })],
        }),
      ],
    }),
    new TableCell({
      width: { size: widths[1], type: WidthType.DXA },
      verticalAlign: VerticalAlign.TOP,
      borders: cellBorders(),
      children: [
        new Paragraph({
          children: [timesRun(formatTableDate(exp.experimentDate), { sizePt: TABLE.bodyFontPt })],
        }),
      ],
    }),
    new TableCell({
      width: { size: widths[2], type: WidthType.DXA },
      verticalAlign: VerticalAlign.TOP,
      borders: cellBorders(),
      children: nameParagraphs,
    }),
    new TableCell({
      width: { size: widths[3], type: WidthType.DXA },
      verticalAlign: VerticalAlign.CENTER,
      borders: cellBorders(),
      children: qrParagraphs,
    }),
    new TableCell({
      width: { size: widths[4], type: WidthType.DXA },
      verticalAlign: VerticalAlign.TOP,
      borders: cellBorders(),
      children: [new Paragraph({ children: [timesRun('')] })],
    }),
    new TableCell({
      width: { size: widths[5], type: WidthType.DXA },
      verticalAlign: VerticalAlign.TOP,
      borders: cellBorders(),
      children: [new Paragraph({ children: [timesRun('')] })],
    }),
  ];

  return new TableRow({
    height: { value: inchesToTwip(TABLE.bodyMinHeightIn), rule: HeightRule.ATLEAST },
    cantSplit: true,
    children: cells,
  });
}

export async function buildLabRecordDocx(data: LabRecordData): Promise<Buffer> {
  const courseTitle = buildCourseTitleLine(
    data.subjectCode,
    data.subjectName,
    data.subjectCodeAlt
  );
  const bannerBuffer = await loadBannerBuffer();
  const widths = columnWidths();
  const totalWidth = widths.reduce((a, b) => a + b, 0);

  const children: (Paragraph | Table)[] = [];

  if (bannerBuffer) {
    children.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: inchesToTwip(BANNER.marginBottomIn) },
        children: [
          new ImageRun({
            data: bannerBuffer,
            transformation: {
              width: inchesToEmu(BANNER.widthIn),
              height: inchesToEmu(BANNER.heightIn),
            },
            type: 'png',
          }),
        ],
      })
    );
  } else {
    children.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: inchesToTwip(BANNER.marginBottomIn) },
        children: [timesRun('COLLEGE BANNER — add assets/college-banner.png', { bold: true, sizePt: 14 })],
      })
    );
  }

  children.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: {
        before: inchesToTwip(COURSE_TITLE.spacingTopIn),
        after: inchesToTwip(COURSE_TITLE.spacingBottomIn),
      },
      children: [timesRun(courseTitle, { bold: true, sizePt: COURSE_TITLE.sizePt })],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: inchesToTwip(SUBTITLE.spacingBottomIn) },
      children: [timesRun(SUBTITLE.text, { bold: true, sizePt: SUBTITLE.sizePt })],
    })
  );

  const bodyRows: TableRow[] = [headerRow()];
  for (const exp of data.experiments) {
    const qrBuf = await readQrBuffer(exp.qrImage);
    bodyRows.push(experimentRow(exp, qrBuf, widths));
  }

  children.push(
    new Table({
      width: { size: totalWidth, type: WidthType.DXA },
      columnWidths: widths,
      borders: TABLE_BORDERS,
      rows: bodyRows,
    })
  );

  const directColumnWidth = Math.floor(totalWidth / 2);

  children.push(
    new Paragraph({
      spacing: { before: inchesToTwip(FOOTER.spacingTopIn) },
      children: [timesRun(FOOTER.declaration, { sizePt: FOOTER.fontPt })],
    }),
    new Table({
      width: { size: totalWidth, type: WidthType.DXA },
      columnWidths: [directColumnWidth, directColumnWidth],
      borders: FOOTER_TABLE_BORDERS,
      rows: [
        new TableRow({
          cantSplit: true,
          children: [
            new TableCell({
              width: { size: directColumnWidth, type: WidthType.DXA },
              borders: FOOTER_TABLE_BORDERS,
              children: [
                new Paragraph({
                  spacing: { before: inchesToTwip(0.28) },
                  children: [timesRun(`Name : ${data.studentName}`, { sizePt: FOOTER.fontPt })],
                }),
              ],
            }),
            new TableCell({
              width: { size: directColumnWidth, type: WidthType.DXA },
              borders: FOOTER_TABLE_BORDERS,
              children: [
                new Paragraph({
                  alignment: AlignmentType.RIGHT,
                  spacing: { before: inchesToTwip(0.28) },
                  children: [
                    timesRun(`Register Number : ${data.registerNumber}`, { sizePt: FOOTER.fontPt }),
                  ],
                }),
              ],
            }),
          ],
        }),
        new TableRow({
          cantSplit: true,
          children: [
            new TableCell({
              width: { size: directColumnWidth, type: WidthType.DXA },
              borders: FOOTER_TABLE_BORDERS,
              children: [
                new Paragraph({
                  spacing: { before: inchesToTwip(0.22) },
                  children: [timesRun('Date :', { sizePt: FOOTER.fontPt })],
                }),
              ],
            }),
            new TableCell({
              width: { size: directColumnWidth, type: WidthType.DXA },
              borders: FOOTER_TABLE_BORDERS,
              children: [
                new Paragraph({
                  alignment: AlignmentType.RIGHT,
                  spacing: { before: inchesToTwip(0.22) },
                  children: [timesRun("Learner's Signature", { sizePt: FOOTER.fontPt })],
                }),
              ],
            }),
          ],
        }),
      ],
    })
  );

  const doc = new File({
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: inchesToTwip(PAGE.marginTopIn),
              bottom: inchesToTwip(PAGE.marginBottomIn),
              left: inchesToTwip(PAGE.marginLeftIn),
              right: inchesToTwip(PAGE.marginRightIn),
            },
          },
        },
        children,
      },
    ],
  });

  return Packer.toBuffer(doc);
}