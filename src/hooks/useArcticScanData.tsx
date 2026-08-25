import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { ArcticScanRow } from '@/data/arcticScanData';

export interface ArcticScanData {
  rows: ArcticScanRow[];
  observationTime: string | null;
  lastUpdated: string | null;
}

const PAGE_SIZE = 1000;

async function fetchArcticRows(): Promise<ArcticScanData> {
  // Determine the most recent observation period that has data the user can see.
  const { data: latest, error: latestError } = await supabase
    .from('arctic_scan_rows')
    .select('observation_time, fetched_at')
    .order('observation_time', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (latestError) throw latestError;
  if (!latest) return { rows: [], observationTime: null, lastUpdated: null };

  const observationTime = latest.observation_time as string;
  const collected: ArcticScanRow[] = [];
  let lastUpdated: string | null = null;

  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await supabase
      .from('arctic_scan_rows')
      .select('observation_time, organization, category, urgency, events, unique_event_group_ids, unique_ips, fetched_at')
      .eq('observation_time', observationTime)
      .order('organization', { ascending: true })
      .range(from, from + PAGE_SIZE - 1);

    if (error) throw error;
    if (!data || data.length === 0) break;

    for (const row of data) {
      if (!lastUpdated || (row.fetched_at && row.fetched_at > lastUpdated)) {
        lastUpdated = row.fetched_at as string;
      }
      collected.push({
        'observation time': row.observation_time,
        organization: row.organization,
        category: row.category,
        urgency: row.urgency,
        '# events': String(row.events ?? 0),
        '# unique event group id': String(row.unique_event_group_ids ?? 0),
        '# unique ip': String(row.unique_ips ?? 0),
      });
    }

    if (data.length < PAGE_SIZE) break;
  }

  return { rows: collected, observationTime, lastUpdated };
}

export const useArcticScanData = () => {
  return useQuery({
    queryKey: ['arctic-scan-data'],
    queryFn: fetchArcticRows,
    staleTime: 2 * 60 * 60 * 1000,
  });
};

export const useRefreshArcticScanData = () => {
  const queryClient = useQueryClient();

  return async () => {
    const { data, error } = await supabase.functions.invoke('sync-arctic-scan', { body: {} });
    if (error) throw error;
    await queryClient.invalidateQueries({ queryKey: ['arctic-scan-data'] });
    return data as { success?: boolean; rows?: number; skipped?: boolean } | null;
  };
};
