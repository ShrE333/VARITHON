/** Base URL of the varimitra_crowd_v1 FastAPI service — local machine, own GPU. */
export function getCrowdBaseUrl(): string {
  return (process.env.CROWD_API_URL || 'http://localhost:8200').replace(/\/$/, '');
}
