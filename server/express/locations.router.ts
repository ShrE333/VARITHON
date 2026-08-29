/**
 * Express adapter — for an admin panel built with Vite/CRA plus a Node API,
 * rather than Next.js.
 *
 *     import express from 'express';
 *     import { locationsRouter } from './server/express/locations.router';
 *
 *     const app = express();
 *     app.use(express.json());
 *     app.use('/api/v1/admin/locations', locationsRouter());
 *
 * Then point the client at it once, at app start:
 *
 *     configureLocationService({ baseUrl: '/api/v1/admin/locations' });
 *
 * Note this file and server/nextjs/ are alternatives — ship one, delete the
 * other. Both are ~60 lines of plumbing over the same ../handlers.ts.
 */

import { Router, type Request, type Response, type NextFunction } from 'express';
import {
  listLocations,
  getLocation,
  createLocation,
  updateLocation,
  deleteLocation,
  type LocationStore,
} from '../handlers';
import { createSupabaseClient, supabaseLocationStore } from '../store.supabase';

/**
 * Replace this with the panel's real session check — the same edit described
 * in src/admin-locations/auth.ts. It is duplicated here rather than imported
 * because that file's signature takes a WHATWG `Request`, and Express hands
 * you its own request object.
 *
 *     const isAdmin = (req: Request) => req.session?.user?.role === 'admin';
 */
function isAdmin(req: Request): boolean {
  const expected = process.env.ADMIN_API_TOKEN;
  if (!expected) return true; // dev convenience — see the warning in auth.ts
  const provided = String(req.headers.authorization ?? '').replace(/^Bearer\s+/i, '');
  return provided.length === expected.length && provided === expected;
}

function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (!isAdmin(req)) {
    res.status(401).json({ error: 'Not authorised' });
    return;
  }
  next();
}

/** Pass your own store to use a database other than Supabase. */
export function locationsRouter(store?: LocationStore): Router {
  const router = Router();

  const resolve = (): LocationStore | null => {
    if (store) return store;
    const client = createSupabaseClient();
    return client ? supabaseLocationStore(client) : null;
  };

  const send = (res: Response, result: { status: number; body?: unknown }) => {
    if (result.status === 204) {
      res.status(204).end();
      return;
    }
    res.status(result.status).json(result.body);
  };

  const withStore =
    (fn: (s: LocationStore, req: Request) => Promise<{ status: number; body?: unknown }>) =>
    async (req: Request, res: Response) => {
      const s = resolve();
      if (!s) {
        res.status(503).json({ error: 'Database is not configured' });
        return;
      }
      send(res, await fn(s, req));
    };

  router.get('/', withStore((s) => listLocations(s)));
  router.get('/:id', withStore((s, req) => getLocation(s, req.params.id)));
  router.post('/', requireAdmin, withStore((s, req) => createLocation(s, req.body)));
  router.patch('/:id', requireAdmin, withStore((s, req) => updateLocation(s, req.params.id, req.body)));
  router.delete('/:id', requireAdmin, withStore((s, req) => deleteLocation(s, req.params.id)));

  return router;
}
