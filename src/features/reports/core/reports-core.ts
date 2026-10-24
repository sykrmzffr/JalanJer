// Pure helpers for reports (no React Native imports; unit-tested with `npm test`).

/** [longitude, latitude] */
export type LngLatTuple = [number, number];

export const REPORT_KINDS = ['traffic', 'police', 'accident', 'hazard', 'closure'] as const;
export type ReportKind = (typeof REPORT_KINDS)[number];

/** A report as the app sees it (who made it is never sent by the server). */
export type Report = {
  id: string;
  kind: ReportKind;
  coordinate: LngLatTuple;
  /** Milliseconds since 1970. */
  createdAt: number;
  expiresAt: number;
  stillThere: number;
  notThere: number;
};

/** Row shape returned by Supabase (see supabase/migrations/0002_reports.sql). */
export type ReportRow = {
  id: string;
  kind: string;
  lng: number;
  lat: number;
  created_at: string;
  expires_at: string;
  still_there: number;
  not_there: number;
};

export function isReportKind(kind: string): kind is ReportKind {
  return (REPORT_KINDS as readonly string[]).includes(kind);
}

/** Server rows → reports, dropping unknown kinds and broken rows. */
export function parseReportRows(rows: readonly ReportRow[]): Report[] {
  const out: Report[] = [];
  for (const r of rows) {
    if (!isReportKind(r.kind) || !Number.isFinite(r.lng) || !Number.isFinite(r.lat)) continue;
    const createdAt = Date.parse(r.created_at);
    const expiresAt = Date.parse(r.expires_at);
    if (!Number.isFinite(createdAt) || !Number.isFinite(expiresAt)) continue;
    out.push({
      id: r.id,
      kind: r.kind,
      coordinate: [r.lng, r.lat],
      createdAt,
      expiresAt,
      stillThere: r.still_there ?? 0,
      notThere: r.not_there ?? 0,
    });
  }
  return out;
}

/** Reports that still count at `now` (the server filters too; this covers time passing on the phone). */
export function activeReports(reports: readonly Report[], now: number): Report[] {
  return reports.filter((r) => r.expiresAt > now && r.notThere < 2);
}

/** "just now", "5 min ago", "2 h ago". */
export function reportAge(createdAt: number, now: number): string {
  const minutes = Math.floor((now - createdAt) / 60_000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes} min ago`;
  return `${Math.floor(minutes / 60)} h ago`;
}

/** Box around a point, about `km` kilometres each way, as [west, south, east, north]. */
export function boxAround([lng, lat]: LngLatTuple, km: number): [number, number, number, number] {
  const dLat = km / 110.574;
  const dLng = km / (111.32 * Math.max(0.1, Math.cos((lat * Math.PI) / 180)));
  return [lng - dLng, lat - dLat, lng + dLng, lat + dLat];
}

function distanceMeters(a: LngLatTuple, b: LngLatTuple): number {
  const cosLat = Math.cos((((a[1] + b[1]) / 2) * Math.PI) / 180);
  const dx = (b[0] - a[0]) * 111_320 * cosLat;
  const dy = (b[1] - a[1]) * 110_574;
  return Math.hypot(dx, dy);
}

/**
 * The report to ask "Still there?" about: the nearest one within `radius`
 * metres that you didn't make and haven't answered yet. Null if none.
 */
export function stillTherePrompt(
  reports: readonly Report[],
  position: LngLatTuple,
  options: { answered: ReadonlySet<string>; mine: ReadonlySet<string>; radius?: number; now: number },
): Report | null {
  const radius = options.radius ?? 150;
  let best: Report | null = null;
  let bestDistance = Infinity;
  for (const r of activeReports(reports, options.now)) {
    if (options.answered.has(r.id) || options.mine.has(r.id)) continue;
    const d = distanceMeters(position, r.coordinate);
    if (d <= radius && d < bestDistance) {
      best = r;
      bestDistance = d;
    }
  }
  return best;
}
