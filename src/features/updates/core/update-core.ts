// Pure helpers for the in-app updater (no React Native imports; unit-tested with `npm test`).
//
// Each Android test build on GitHub also publishes `latest.json` next to the APK on the
// "android-latest" release (see .github/workflows/android-build.yml):
//   { "sha": "<commit>", "builtAt": "<ISO time>", "branch": "<branch>", "apk": "<download URL>" }

export type BuildInfo = {
  /** Commit the build was made from. */
  sha: string;
  /** Milliseconds since 1970. */
  builtAt: number;
  branch: string;
};

export type LatestBuild = BuildInfo & { apk: string };

/** Reads latest.json; null if it's missing a field or not from GitHub (we only install from there). */
export function parseLatest(json: unknown): LatestBuild | null {
  if (!json || typeof json !== 'object') return null;
  const { sha, builtAt, branch, apk } = json as Record<string, unknown>;
  if (typeof sha !== 'string' || !/^[0-9a-f]{7,40}$/.test(sha)) return null;
  if (typeof apk !== 'string' || !apk.startsWith('https://github.com/')) return null;
  const time = typeof builtAt === 'string' ? Date.parse(builtAt) : NaN;
  if (!Number.isFinite(time)) return null;
  return { sha, builtAt: time, branch: typeof branch === 'string' ? branch : '', apk };
}

/** This app's own build, from values baked in by the build workflow. Null in local dev builds. */
export function parseCurrent(sha: string | undefined, builtAt: string | undefined): BuildInfo | null {
  if (!sha) return null;
  const time = builtAt ? Date.parse(builtAt) : NaN;
  return { sha, builtAt: Number.isFinite(time) ? time : 0, branch: '' };
}

/** A different build that was made after this one. */
export function isUpdate(current: BuildInfo | null, latest: LatestBuild | null): boolean {
  if (!latest) return false;
  if (!current) return true;
  return latest.sha !== current.sha && latest.builtAt > current.builtAt;
}

/** "a8ef1ce" */
export function shortSha(sha: string): string {
  return sha.slice(0, 7);
}

/** "12.3 / 21.2 MB" while downloading. */
export function formatProgress(bytes: number, total: number): string {
  const mb = (n: number) => (n / 1_048_576).toFixed(1);
  return total > 0 ? `${mb(bytes)} / ${mb(total)} MB` : `${mb(bytes)} MB`;
}
