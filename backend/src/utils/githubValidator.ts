const GITHUB_REPO_REGEX =
  /^https?:\/\/(www\.)?github\.com\/[a-zA-Z0-9](?:[a-zA-Z0-9]|-(?=[a-zA-Z0-9])){0,38}\/[a-zA-Z0-9._-]+\/?$/;

export function isValidGitHubUrl(url: string): boolean {
  try {
    const parsed = new URL(url.trim());
    if (!['http:', 'https:'].includes(parsed.protocol)) return false;
    return GITHUB_REPO_REGEX.test(parsed.href.replace(/\/$/, '') + '/');
  } catch {
    return false;
  }
}

export function normalizeGitHubUrl(url: string): string {
  const trimmed = url.trim().replace(/\/$/, '');
  return trimmed.startsWith('http') ? trimmed : `https://${trimmed}`;
}
