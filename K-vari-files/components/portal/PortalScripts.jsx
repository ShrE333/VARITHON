'use client';

/**
 * Bridges the portal's vanilla-JS layer to the Next router.
 *
 * The VariMitra portal is a set of hand-written pages driven by four scripts
 * in public/assets/: a translation dictionary, a feature dictionary, the i18n
 * engine, and (per page) the click layer that turns [data-modal] into either a
 * popup or a navigation. They were written for full page loads, which is what
 * this component has to make up for:
 *
 *  1. Load order is a hard dependency — features.js reads window.VariMitraFeatures,
 *     i18n.js reads both dictionaries — so they are chained, not fired in
 *     parallel the way four <Script> tags would be.
 *
 *  2. They run once. Under client-side routing the next page's markup arrives
 *     without a reload, so translations are re-applied on every pathname
 *     change or the new page renders in English with raw data-i18n keys.
 *
 *  3. features.js navigates by assigning location.href, which would throw away
 *     the SPA. It already checks for window.reactNavigate first, so setting
 *     that to router.push is all it takes to keep navigation client-side.
 */

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';

// Order matters: each depends on the globals the previous one defines.
const SHARED_SCRIPTS = [
  '/assets/translations.js',
  '/assets/feature-translations.js',
  '/assets/features-data.js',
  '/assets/i18n.js',
];

function loadInOrder(sources) {
  return sources.reduce(
    (chain, src) =>
      chain.then(
        () =>
          new Promise((resolve) => {
            const existing = document.querySelector(`script[data-portal="${src}"]`);
            if (existing) return resolve();
            const script = document.createElement('script');
            script.src = src;
            script.dataset.portal = src;
            // Resolve on error too: a missing optional script should not
            // stall the rest of the chain and leave the page inert.
            script.onload = resolve;
            script.onerror = resolve;
            document.body.appendChild(script);
          }),
      ),
    Promise.resolve(),
  );
}

export function PortalScripts() {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    window.reactNavigate = (href) => router.push(href);
    return () => {
      delete window.reactNavigate;
    };
  }, [router]);

  useEffect(() => {
    let cancelled = false;
    loadInOrder(SHARED_SCRIPTS).then(() => {
      if (!cancelled) window.VariMitraI18n?.boot?.();
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // Re-translate whatever the router just rendered.
  useEffect(() => {
    window.VariMitraI18n?.boot?.();
  }, [pathname]);

  return null;
}

/**
 * Page-scoped scripts (features.js, hero-slider.js, …). Kept separate from the
 * shared four because they attach per-page behaviour and must run after the
 * page's markup is in the DOM.
 */
export function PageScripts({ sources }) {
  const pathname = usePathname();

  useEffect(() => {
    let cancelled = false;
    loadInOrder(sources).then(() => {
      if (!cancelled) window.VariMitraI18n?.boot?.();
    });
    return () => {
      cancelled = true;
    };
    // `sources` is a literal array at every call site; pathname is the real
    // trigger for re-running page setup after a client-side navigation.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  return null;
}
