/** College lab record layout — shared by DOCX, PDF HTML, and preview API */

export const PAGE = {
  widthIn: 8.27, // A4 width in inches (for reference)
  heightIn: 11.69,
  marginTopIn: 0.45,
  marginBottomIn: 0.45,
  marginLeftIn: 0.5,
  marginRightIn: 0.5,
} as const;

export const BANNER = {
  widthIn: 7.4,
  heightIn: 1.65,
  marginBottomIn: 0.18,
} as const;

export const COURSE_TITLE = {
  font: 'Times New Roman',
  sizePt: 20,
  spacingTopIn: 0.1,
  spacingBottomIn: 0.18,
} as const;

export const SUBTITLE = {
  text: 'Table of content',
  font: 'Times New Roman',
  sizePt: 16,
  spacingBottomIn: 0.22,
} as const;

/** Column widths in inches (total ≈ 7.5") */
export const COLUMNS = {
  exp: 0.7,
  date: 1.0,
  name: 3.15,
  qr: 1.05,
  mark: 0.65,
  signature: 0.95,
} as const;

export const TABLE = {
  headerHeightIn: 0.52,
  bodyMinHeightIn: 1.42,
  cellPaddingIn: 0.08,
  borderPt: 1,
  headerFontPt: 13,
  bodyFontPt: 13,
  linkFontPt: 11,
} as const;

export const QR = {
  sizeIn: 0.72,
} as const;

export const FOOTER = {
  declaration:
    'I confirm that the experiments and GitHub links provided are entirely my own work.',
  fontPt: 11,
  spacingTopIn: 0.18,
} as const;

export const TWIP_PER_INCH = 1440;
export const DXA_PER_INCH = 1440;
export const EMU_PER_INCH = 914400;

export function inchesToTwip(inches: number): number {
  return Math.round(inches * TWIP_PER_INCH);
}

export function inchesToDxa(inches: number): number {
  return Math.round(inches * DXA_PER_INCH);
}

export function inchesToEmu(inches: number): number {
  return Math.round(inches * EMU_PER_INCH);
}

export function ptToHalfPoints(pt: number): number {
  return pt * 2;
}

export function padExpNo(n: number): string {
  return String(n).padStart(2, '0');
}

export function formatTableDate(date: Date | string): string {
  const d = new Date(date);
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}-${month}-${year}`;
}

export function buildCourseTitleLine(
  subjectCode: string,
  subjectName: string,
  subjectCodeAlt?: string
): string {
  const code = subjectCodeAlt ? `${subjectCode}/${subjectCodeAlt}` : subjectCode;
  return `${code}- ${subjectName}`;
}
