'use client';

/**
 * Airplane mode: a demo-only simulation of losing connectivity.
 *
 * A web page cannot switch off the device's radio, so this is a flag the
 * fetch layer honours, not real disconnection. It is labelled as such on
 * screen. The reason it exists is practical: the offline behaviour IS the
 * feature, and reaching for phone settings mid-demo is how that moment gets
 * lost.
 *
 * Stored in localStorage so the toggle on /demo reaches the pilgrim view in
 * another tab, and survives the navigation between them.
 */

import { useCallback, useEffect, useState } from 'react';

const KEY = 'palki-airplane';
const EVENT = 'palki-airplane-change';

export function useAirplaneMode(): [boolean, (v: boolean) => void] {
  const [on, setOn] = useState(false);

  useEffect(() => {
    const read = () => setOn(window.localStorage.getItem(KEY) === '1');
    read();
    window.addEventListener('storage', read);
    window.addEventListener(EVENT, read);
    return () => {
      window.removeEventListener('storage', read);
      window.removeEventListener(EVENT, read);
    };
  }, []);

  const set = useCallback((v: boolean) => {
    window.localStorage.setItem(KEY, v ? '1' : '0');
    setOn(v);
    // 'storage' does not fire in the tab that made the change.
    window.dispatchEvent(new Event(EVENT));
  }, []);

  return [on, set];
}
