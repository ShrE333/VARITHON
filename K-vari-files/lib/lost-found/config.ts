/**
 * Base URL of the varimitra_lost_person_v6 FastAPI service.
 *
 * This whole integration runs on one local machine (the Python service on
 * its own GPU, Next.js talking to it over localhost), so a hardcoded
 * default is enough — the env var only exists for the day someone wants to
 * point at a different port without touching code.
 */
export function getLostFoundBaseUrl(): string {
  return (process.env.LOST_FOUND_API_URL || 'http://localhost:8000').replace(/\/$/, '');
}
