/**
 * Re-exports the general-purpose server-only Supabase client — see
 * lib/supabase-admin.ts for what it is and why it's safe. This file exists
 * so lib/palki/store.ts's import path didn't need to change when the
 * facilities feature needed the same client and it got generalized out of
 * the palki/ folder.
 */

export { supabaseAdmin } from '../supabase-admin';
