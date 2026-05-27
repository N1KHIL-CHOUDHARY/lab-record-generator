export const SUBTITLE_TEXT = 'Table of content';

export function padExpNo(n: number): string {
  return String(n).padStart(2, '0');
}

export function formatTableDate(date: string | Date): string {
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

export const FOOTER_DECLARATION =
  'I confirm that the experiments and GitHub links provided are entirely my own work.';
