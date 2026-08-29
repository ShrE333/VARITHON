import '@/styles/portal/portal-base.css';
import '@/styles/portal/modal.css';
import '@/styles/portal/login.css';
import '@/styles/portal/varimitra.css';
import '@/styles/portal/command-dashboard.css';
import '@/styles/portal/feature.css';
import '@/styles/portal/darshan-booking.css';
import { PortalScripts } from '@/components/portal/PortalScripts';

/**
 * The VariMitra portal — sign-in, pilgrim home, Temple Command Dashboard,
 * feature pages, darshan booking.
 *
 * Every stylesheet is imported here rather than page by page because Next
 * hoists route CSS into one document anyway; importing them together makes
 * the shared cascade explicit instead of dependent on which page a visitor
 * happened to land on first. They can coexist because each file's selectors
 * are prefixed with that page's scope class (.vm-pilgrim, .vm-admin, …) —
 * before that, all three defined a different --cream on :root and the last
 * one loaded won.
 *
 * The .vm-portal wrapper carries the rules the portal used to hang off
 * <body>, and scopes the shared modal styles.
 */
export default function PortalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="vm-portal">
      <PortalScripts />
      {children}
    </div>
  );
}
