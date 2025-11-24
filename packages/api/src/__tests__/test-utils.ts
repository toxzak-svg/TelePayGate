// Local test helpers for packages/api tests
export function extractTokenFromUrl(url: string): string | null {
  try {
    const u = new URL(url);
    return u.searchParams.get('token');
  } catch (e) {
    return null;
  }
}

export default { extractTokenFromUrl };
