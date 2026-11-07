export type CacheOwner = number | null | undefined;

/**
 * Personal React Query data is one in-memory cache for the tab. Logout is a
 * client navigation, so the cache survives unless we clear it when the
 * signed-in user changes. The first observation only records the owner.
 */
export function nextCacheOwner(
  previous: CacheOwner,
  next: number | null
): { owner: number | null; clear: boolean } {
  if (previous === undefined) return { owner: next, clear: false };
  return { owner: next, clear: previous !== next };
}

let cacheOwner: CacheOwner = undefined;

export function syncPersonalCache(
  queryClient: { clear: () => void; cancelQueries?: () => Promise<unknown> },
  owner: number | null
): boolean {
  const step = nextCacheOwner(cacheOwner, owner);
  cacheOwner = step.owner;
  if (step.clear) {
    void queryClient.cancelQueries?.();
    queryClient.clear();
  }
  return step.clear;
}

export function resetPersonalCacheOwnerForTests(): void {
  cacheOwner = undefined;
}
