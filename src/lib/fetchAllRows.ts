// Supabase returns at most 1000 rows per request. Dashboards that sum totals
// must page through every row, otherwise totals are silently truncated.
const PAGE_SIZE = 1000;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function fetchAllRows<T = any>(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  build: () => any,
): Promise<{ data: T[]; error: unknown }> {
  const all: T[] = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await build().order('id', { ascending: true }).range(from, from + PAGE_SIZE - 1);
    if (error) return { data: all, error };
    all.push(...((data ?? []) as T[]));
    if (!data || data.length < PAGE_SIZE) break;
  }
  return { data: all, error: null };
}
