// src/lib/matomo.ts
export function initMatomo(): void {
  if (
    globalThis.window === undefined ||
    !process.env.NEXT_PUBLIC_MATOMO_URL ||
    !process.env.NEXT_PUBLIC_MATOMO_SITE_ID
  ) {
    return;
  }

  // @socialgouv/matomo-next initializes via the init function in layout
}

export function trackEvent(
  category: string,
  action: string,
  name?: string,
  value?: number
): void {
  if (globalThis.window === undefined) return;

  // Push to matomo data layer
  const globalWindow = globalThis as unknown as Record<string, unknown>;
  if (!globalWindow._paq) globalWindow._paq = [];
  const paqArray = globalWindow._paq as unknown[];
  paqArray.push(["trackEvent", category, action, name, value]);
}

export const MATOMO_EVENTS = {
  skillDownloaded: (skillId: string) =>
    trackEvent("skill", "downloaded", skillId),
  skillReleased: (skillId: string) =>
    trackEvent("skill", "released", skillId),
  skillForked: (skillId: string) =>
    trackEvent("skill", "forked", skillId),
  changeRequestSubmitted: (skillId: string) =>
    trackEvent("skill", "change_request_submitted", skillId),
} as const;

