import { activeReports, type Report } from '@/features/reports/core/reports-core';

import { aheadOnRoute, type OnRoute, placeOnRoute, type PreparedRoute } from './core/nav-core';

// Placing reports on the route searches the whole route, so it's done once per
// route + report list (reports refresh about once a minute), not on every GPS fix.
const cache = new WeakMap<PreparedRoute, { reports: readonly Report[]; placed: OnRoute<Report>[] }>();

function reportsOnRoute(p: PreparedRoute, reports: readonly Report[]): OnRoute<Report>[] {
  const hit = cache.get(p);
  if (hit && hit.reports === reports) return hit.placed;
  const placed = placeOnRoute(p, reports);
  cache.set(p, { reports, placed });
  return placed;
}

/** Active reports on the route ahead of you, nearest first, with their distance (m). */
export function reportsAhead(
  p: PreparedRoute,
  reports: readonly Report[],
  distanceAlong: number,
  now: number,
): { item: Report; distance: number }[] {
  const active = new Set(activeReports(reports, now).map((r) => r.id));
  return aheadOnRoute(reportsOnRoute(p, reports), distanceAlong).filter((x) => active.has(x.item.id));
}
