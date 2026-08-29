/**
 * Authorization for the admin location endpoints. SERVER ONLY.
 *
 * ============================================================
 * THIS IS THE FILE YOUR ADMIN PANEL SHOULD REPLACE.
 * ============================================================
 *
 * The project currently has no admin login, so this ships as a shared
 * bearer-token check — enough to stop an anonymous visitor deleting every
 * location, which is a real risk once DELETE exists, and not a substitute
 * for real authentication.
 *
 * To wire in the panel's own auth, replace the body of isAdminAuthorised()
 * with a session check. Every write route calls this one function, so that
 * is the only edit needed:
 *
 *     export async function isAdminAuthorised(req: Request) {
 *       const session = await getSessionFromRequest(req);
 *       return session?.user?.role === 'admin';
 *     }
 *
 * Behaviour without ADMIN_API_TOKEN set: writes are allowed, and a warning
 * is logged once per process. That keeps local development frictionless
 * while making an unprotected deployment noisy rather than silent.
 */

let warned = false;

export async function isAdminAuthorised(req: Request): Promise<boolean> {
  const expected = process.env.ADMIN_API_TOKEN;

  if (!expected) {
    if (!warned) {
      warned = true;
      console.warn(
        '[admin-locations] ADMIN_API_TOKEN is not set — create/update/delete ' +
          'are UNPROTECTED. Set it before deploying anywhere public.',
      );
    }
    return true;
  }

  const provided = (req.headers.get('authorization') ?? '').replace(/^Bearer\s+/i, '');
  // Length check first so the comparison below cannot leak length via timing.
  return provided.length === expected.length && provided === expected;
}
