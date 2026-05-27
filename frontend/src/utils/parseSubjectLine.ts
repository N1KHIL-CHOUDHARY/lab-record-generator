export function formatSubjectLine(
  subjectCode: string,
  subjectName: string,
  subjectCodeAlt?: string
): string {
  const code = subjectCodeAlt ? `${subjectCode}/${subjectCodeAlt}` : subjectCode;
  return `${code} - ${subjectName}`;
}

export function parseSubjectLine(line: string): {
  subjectCode: string;
  subjectCodeAlt?: string;
  subjectName: string;
} {
  const trimmed = line.trim();
  if (!trimmed) {
    throw new Error('Subject is required');
  }

  let codePart: string;
  let subjectName: string;

  const spaced = trimmed.indexOf(' - ');
  if (spaced !== -1) {
    codePart = trimmed.slice(0, spaced).trim();
    subjectName = trimmed.slice(spaced + 3).trim();
  } else {
    const dash = trimmed.indexOf('-');
    if (dash === -1) {
      throw new Error('Use format: Subject Code - Subject Name');
    }
    codePart = trimmed.slice(0, dash).trim();
    subjectName = trimmed.slice(dash + 1).trim();
  }

  if (!codePart || !subjectName) {
    throw new Error('Use format: Subject Code - Subject Name');
  }

  const slash = codePart.indexOf('/');
  if (slash !== -1) {
    return {
      subjectCode: codePart.slice(0, slash).trim(),
      subjectCodeAlt: codePart.slice(slash + 1).trim(),
      subjectName,
    };
  }

  return { subjectCode: codePart, subjectName };
}
