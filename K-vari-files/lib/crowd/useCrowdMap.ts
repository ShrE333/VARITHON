'use client';

/** Polls the /map endpoint — cheap JSON, safe to refresh every couple seconds. */

import { useCallback, useEffect, useRef, useState } from 'react';
import { getMap } from './service';
import type { CrowdMap } from './types';

const POLL_MS = 2000;

export function useCrowdMap() {
  const [map, setMap] = useState<CrowdMap | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const refresh = useCallback(async () => {
    const result = await getMap();
    if (!mounted.current) return;
    if (result.ok) {
      setMap(result.data);
      setError(null);
    } else {
      setError(result.error);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();
    const id = setInterval(refresh, POLL_MS);
    return () => clearInterval(id);
  }, [refresh]);

  return { map, loading, error, refresh };
}
