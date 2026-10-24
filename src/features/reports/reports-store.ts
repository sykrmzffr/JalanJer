import * as Location from 'expo-location';
import { useEffect } from 'react';
import { AppState } from 'react-native';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { zustandStorage } from '@/lib/storage';
import { supabase } from '@/lib/supabase';

import {
  boxAround,
  type LngLatTuple,
  parseReportRows,
  type Report,
  type ReportKind,
  type ReportRow,
} from './core/reports-core';

const COLUMNS = 'id,kind,lng,lat,created_at,expires_at,still_there,not_there';
// Load reports within this distance of you (km each way).
const AREA_KM = 25;
const REFRESH_MS = 60_000;
// Remembered "my reports" / "answered" ids are dropped after a day (reports expire long before).
const MEMORY_MS = 24 * 3_600_000;

type ReportsState = {
  reports: Report[];
  /** Ids of reports made on this phone (no "Still there?" for your own). */
  mine: Record<string, number>;
  /** Ids already answered (Still there? yes/no). */
  answered: Record<string, number>;
  setReports: (reports: Report[]) => void;
  addMine: (report: Report) => void;
  markAnswered: (id: string) => void;
};

export const useReportsStore = create<ReportsState>()(
  persist(
    (set) => ({
      reports: [],
      mine: {},
      answered: {},
      setReports: (reports) => set({ reports }),
      addMine: (report) =>
        set((s) => ({ reports: [report, ...s.reports], mine: prune({ ...s.mine, [report.id]: Date.now() }) })),
      markAnswered: (id) => set((s) => ({ answered: prune({ ...s.answered, [id]: Date.now() }) })),
    }),
    {
      name: 'reports',
      storage: createJSONStorage(() => zustandStorage),
      // Only the ids are kept between app starts; reports are always loaded fresh.
      partialize: ({ mine, answered }) => ({ mine, answered }),
    },
  ),
);

function prune(ids: Record<string, number>): Record<string, number> {
  const cutoff = Date.now() - MEMORY_MS;
  return Object.fromEntries(Object.entries(ids).filter(([, t]) => t > cutoff));
}

export class ReportError extends Error {}

function friendly(message: string): string {
  if (/too many reports/i.test(message)) return 'You have sent a lot of reports. Try again later.';
  if (/sign in/i.test(message) || /jwt|auth/i.test(message)) return 'Sign in to report.';
  if (/network|fetch/i.test(message)) return "Can't reach the server. Check your internet.";
  return "Couldn't send the report. Try again.";
}

/** Loads active reports around a point. */
export async function loadReports(around: LngLatTuple): Promise<void> {
  const [west, south, east, north] = boxAround(around, AREA_KM);
  const { data, error } = await supabase
    .from('reports')
    .select(COLUMNS)
    .gte('lng', west)
    .lte('lng', east)
    .gte('lat', south)
    .lte('lat', north)
    .order('created_at', { ascending: false })
    .limit(300);
  if (error) throw new ReportError(friendly(error.message));
  useReportsStore.getState().setReports(parseReportRows((data ?? []) as ReportRow[]));
}

/** Reports something at `at` (your current position). Needs sign-in. */
export async function createReport(kind: ReportKind, at: LngLatTuple): Promise<Report> {
  const { data, error } = await supabase
    .from('reports')
    .insert({ kind, lng: at[0], lat: at[1] })
    .select(COLUMNS)
    .single();
  if (error) throw new ReportError(friendly(error.message));
  const [report] = parseReportRows([data as ReportRow]);
  if (!report) throw new ReportError("Couldn't send the report. Try again.");
  useReportsStore.getState().addMine(report);
  return report;
}

/** Answers "Still there?". Needs sign-in. */
export async function voteReport(id: string, stillThere: boolean): Promise<void> {
  useReportsStore.getState().markAnswered(id);
  const { error } = await supabase.rpc('vote_report', { p_report: id, p_still_there: stillThere });
  if (error) throw new ReportError(friendly(error.message));
}

async function currentPosition(): Promise<LngLatTuple | null> {
  const permission = await Location.getForegroundPermissionsAsync();
  if (!permission.granted) return null;
  const last = await Location.getLastKnownPositionAsync({ maxAge: 5 * 60_000 });
  return last ? [last.coords.longitude, last.coords.latitude] : null;
}

/** Keeps reports around you fresh: on start, every minute, and when the app comes back. */
export function useReportsRefresh() {
  useEffect(() => {
    let cancelled = false;
    const refresh = async () => {
      const at = await currentPosition();
      if (!at || cancelled) return;
      await loadReports(at).catch(() => {
        // Offline or server paused: keep what we have; try again next time.
      });
    };
    refresh();
    const timer = setInterval(refresh, REFRESH_MS);
    const appState = AppState.addEventListener('change', (s) => {
      if (s === 'active') refresh();
    });
    return () => {
      cancelled = true;
      clearInterval(timer);
      appState.remove();
    };
  }, []);
}
