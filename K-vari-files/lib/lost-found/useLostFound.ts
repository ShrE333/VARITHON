'use client';

/**
 * State for the Lost & Found admin UI. One hook covering cases, alerts and
 * cameras since they're small, single-machine datasets — polling all three
 * together every few seconds is cheap and keeps this simple.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  closeCase as apiCloseCase,
  confirmAlert as apiConfirmAlert,
  createCase as apiCreateCase,
  getAlerts,
  getCameras,
  getCases,
  getSightings,
  rejectAlert as apiRejectAlert,
} from './service';
import type {
  CreateCaseInput,
  LostFoundAlert,
  LostFoundCamera,
  LostFoundCase,
  ServiceResult,
  Sighting,
} from './types';

const POLL_MS = 4000;

export function useLostFound() {
  const [cases, setCases] = useState<LostFoundCase[]>([]);
  const [alerts, setAlerts] = useState<LostFoundAlert[]>([]);
  const [cameras, setCameras] = useState<LostFoundCamera[]>([]);
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
    const [casesRes, alertsRes, camerasRes] = await Promise.all([
      getCases(),
      getAlerts(),
      getCameras(),
    ]);
    if (!mounted.current) return;

    if (casesRes.ok) setCases(casesRes.data);
    if (alertsRes.ok) setAlerts(alertsRes.data);
    if (camerasRes.ok) setCameras(camerasRes.data);

    // Surface the service being unreachable, but only if every call failed —
    // one endpoint hiccuping shouldn't blank out data the others returned.
    if (!casesRes.ok && !alertsRes.ok && !camerasRes.ok) {
      setError(casesRes.error);
    } else {
      setError(null);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();
    const id = setInterval(refresh, POLL_MS);
    return () => clearInterval(id);
  }, [refresh]);

  const createCase = useCallback(
    async (input: CreateCaseInput): Promise<ServiceResult<LostFoundCase>> => {
      const result = await apiCreateCase(input);
      if (result.ok) setCases((prev) => [result.data, ...prev]);
      return result;
    },
    [],
  );

  const closeCase = useCallback(async (caseId: string) => {
    const result = await apiCloseCase(caseId);
    if (result.ok) {
      setCases((prev) => prev.map((c) => (c.case_id === caseId ? result.data : c)));
    }
    return result;
  }, []);

  const confirmAlert = useCallback(async (alertId: number) => {
    const result = await apiConfirmAlert(alertId);
    if (result.ok) {
      setAlerts((prev) => prev.map((a) => (a.alert_id === alertId ? result.data : a)));
    }
    return result;
  }, []);

  const rejectAlert = useCallback(async (alertId: number) => {
    const result = await apiRejectAlert(alertId);
    if (result.ok) {
      setAlerts((prev) => prev.map((a) => (a.alert_id === alertId ? result.data : a)));
    }
    return result;
  }, []);

  return {
    cases,
    alerts,
    cameras,
    loading,
    error,
    refresh,
    createCase,
    closeCase,
    confirmAlert,
    rejectAlert,
  };
}

/** Separate, on-demand hook: sightings are filtered by case and fetched only when that tab is open. */
export function useSightings(caseId?: string) {
  const [sightings, setSightings] = useState<Sighting[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    const result = await getSightings(caseId);
    if (result.ok) {
      setSightings(result.data);
      setError(null);
    } else {
      setError(result.error);
    }
    setLoading(false);
  }, [caseId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { sightings, loading, error, refresh };
}
