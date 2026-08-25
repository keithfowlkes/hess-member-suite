import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (inQuotes) {
      if (char === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += char;
      }
      continue;
    }
    if (char === '"') {
      inQuotes = true;
    } else if (char === ',') {
      row.push(field);
      field = '';
    } else if (char === '\n') {
      row.push(field);
      field = '';
      if (row.some((c) => c.trim() !== '')) rows.push(row);
      row = [];
    } else if (char !== '\r') {
      field += char;
    }
  }
  row.push(field);
  if (row.some((c) => c.trim() !== '')) rows.push(row);
  return rows;
}

function monthWindow(offset: number) {
  const now = new Date();
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - offset, 1, 0, 0, 0));
  const end = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + 1, 1, 0, 0, 0) - 1000);
  const label = `${start.getUTCFullYear()}-${String(start.getUTCMonth() + 1).padStart(2, '0')}`;
  return { label, start: start.toISOString().replace(/\.\d{3}Z$/, 'Z'), end: end.toISOString().replace(/\.\d{3}Z$/, 'Z') };
}

async function fetchPeriod(baseUrl: string, aggregateId: string, apiKey: string, start: string, end: string) {
  const url = new URL(`${baseUrl.replace(/\/$/, '')}/${aggregateId}`);
  url.searchParams.set('apikey', apiKey);
  url.searchParams.set('accept', 'application/csv');
  url.searchParams.set('start', start);
  url.searchParams.set('end', end);
  url.searchParams.set('granularity', 'month');
  url.searchParams.set('keys', 'organization,category,urgency,#');

  const res = await fetch(url.toString());
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`Arctic API responded ${res.status}: ${text.slice(0, 500)}`);
  }
  return text;
}

function toRows(csv: string, observationTime: string) {
  const parsed = parseCsv(csv);
  if (parsed.length < 2) return [];
  const header = parsed[0].map((h) => h.trim().toLowerCase());
  const idx = (name: string) => header.indexOf(name);
  const iOrg = idx('organization');
  const iCat = idx('category');
  const iUrg = idx('urgency');
  const iEvents = idx('# events');
  const iGroups = idx('# unique event group id');
  const iIps = idx('# unique ip');

  if (iOrg < 0 || iCat < 0 || iUrg < 0) {
    throw new Error(`Unexpected CSV header: ${parsed[0].join(',')}`);
  }

  const num = (v?: string) => {
    const n = parseInt((v ?? '').replace(/[^0-9-]/g, ''), 10);
    return Number.isFinite(n) ? n : 0;
  };

  const map = new Map<string, Record<string, unknown>>();
  for (const cols of parsed.slice(1)) {
    const organization = (cols[iOrg] ?? '').trim();
    const category = (cols[iCat] ?? '').trim();
    const urgency = (cols[iUrg] ?? '').trim();
    if (!organization || !category || !urgency) continue;
    const key = `${observationTime}|${organization}|${category}|${urgency}`;
    map.set(key, {
      observation_time: observationTime,
      organization,
      category,
      urgency,
      events: num(cols[iEvents]),
      unique_event_group_ids: num(cols[iGroups]),
      unique_ips: num(cols[iIps]),
      fetched_at: new Date().toISOString(),
    });
  }
  return Array.from(map.values());
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const admin = createClient(supabaseUrl, serviceKey);

  // Admins (valid JWT) may force a refresh at any time. Any other caller
  // (the scheduler) only triggers a refresh when the cached data is stale.
  const authHeader = req.headers.get('Authorization') ?? '';
  const token = authHeader.replace(/^Bearer\s+/i, '').trim();
  let isAdminCaller = token === serviceKey;

  if (!isAdminCaller && token) {
    const { data: userData } = await admin.auth.getUser(token);
    const userId = userData?.user?.id;
    if (userId) {
      const { data: isAdmin } = await admin.rpc('has_role', { _user_id: userId, _role: 'admin' });
      isAdminCaller = Boolean(isAdmin);
    }
  }

  if (!isAdminCaller) {
    const { data: lastSuccess } = await admin
      .from('arctic_scan_syncs')
      .select('finished_at')
      .eq('status', 'success')
      .order('finished_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    const lastAt = lastSuccess?.finished_at ? new Date(lastSuccess.finished_at).getTime() : 0;
    if (Date.now() - lastAt < 90 * 60 * 1000) {
      return json({ success: true, skipped: true, reason: 'Arctic scan data is still fresh' });
    }
  }


  const baseUrl = Deno.env.get('ARCTIC_API_BASE_URL');
  const aggregateId = Deno.env.get('ARCTIC_AGGREGATE_ID');
  const apiKey = Deno.env.get('ARCTIC_API_KEY');
  if (!baseUrl || !aggregateId || !apiKey) {
    return json({ error: 'Arctic API configuration is missing' }, 500);
  }

  const { data: syncRow } = await admin
    .from('arctic_scan_syncs')
    .insert({ status: 'running' })
    .select('id')
    .single();
  const syncId = syncRow?.id as string | undefined;

  try {
    // Refresh the current month and the previous month so a partial month
    // never wipes out the last complete scan period.
    const periods = [monthWindow(0), monthWindow(1)];
    let totalRows = 0;
    const loaded: string[] = [];

    for (const period of periods) {
      const csv = await fetchPeriod(baseUrl, aggregateId, apiKey, period.start, period.end);
      const rows = toRows(csv, period.label);
      if (rows.length === 0) {
        console.log(`No Arctic rows for ${period.label}; leaving existing data untouched.`);
        continue;
      }

      const { error: upsertError } = await admin
        .from('arctic_scan_rows')
        .upsert(rows, { onConflict: 'observation_time,organization,category,urgency' });
      if (upsertError) throw upsertError;

      // Remove rows for this period that were not part of the latest response.
      const cutoff = new Date(Date.now() - 60_000).toISOString();
      const { error: deleteError } = await admin
        .from('arctic_scan_rows')
        .delete()
        .eq('observation_time', period.label)
        .lt('fetched_at', cutoff);
      if (deleteError) throw deleteError;

      totalRows += rows.length;
      loaded.push(period.label);
    }

    if (syncId) {
      await admin
        .from('arctic_scan_syncs')
        .update({
          status: totalRows > 0 ? 'success' : 'empty',
          finished_at: new Date().toISOString(),
          row_count: totalRows,
          observation_time: loaded[0] ?? null,
        })
        .eq('id', syncId);
    }

    return json({ success: true, rows: totalRows, periods: loaded });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('Arctic sync failed:', message);
    if (syncId) {
      await admin
        .from('arctic_scan_syncs')
        .update({ status: 'failed', finished_at: new Date().toISOString(), error: message })
        .eq('id', syncId);
    }
    return json({ error: message }, 502);
  }
});
