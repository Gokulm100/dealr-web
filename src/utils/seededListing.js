/** Marker appended to seeded ad descriptions so the client can flag demo data. */
export const SEEDED_MARKER = '[dealr-seeded]';

export function isSeededDescription(description) {
  return /\[dealr-seeded\]/i.test(String(description || ''));
}

export function stripSeededMarker(description) {
  return String(description || '')
    .replace(/\[dealr-seeded\]/gi, '')
    .replace(/\s*\[Demo\]\s*$/i, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export function withSeededMarker(description) {
  const base = stripSeededMarker(description);
  if (!base) return SEEDED_MARKER;
  return `${base}\n\n${SEEDED_MARKER}`;
}
