import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};
const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

async function searchWeb(query: string, apiKey: string): Promise<string[]> {
  try {
    const r = await fetch('https://api.tavily.com/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ api_key: apiKey, query, search_depth: 'basic', max_results: 5 }),
    });
    if (!r.ok) return [];
    const d = await r.json();
    return (d.results || []).map((x: any) =>
      `URL: ${x.url}\nTitle: ${x.title || ''}\nContent: ${(x.content || '').slice(0, 1500)}`);
  } catch { return []; }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  try {
    const url = Deno.env.get('SUPABASE_URL')!;
    const authHeader = req.headers.get('Authorization') || '';
    const userClient = createClient(url, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: authHeader } } });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return json({ error: 'Unauthorized' }, 401);
    const admin = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    const { data: isAdmin } = await admin.rpc('has_role', { _user_id: user.id, _role: 'admin' });
    if (!isAdmin) return json({ error: 'Admins only' }, 403);

    const { organizationId, organizationName, contactName, contactTitle, organizationWebsite } = await req.json();
    if (!organizationId || !organizationName) return json({ error: 'Missing organization' }, 400);

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    const TAVILY = Deno.env.get('TAVILY_API_KEY');
    if (!LOVABLE_API_KEY) throw new Error('LOVABLE_API_KEY is not configured');

    const role = contactTitle || 'Chief Information Officer';
    const queries = [
      `"${organizationName}" ${role}`,
      `"${organizationName}" CIO OR "chief information officer" OR "director of information technology"`,
      `"${organizationName}" information technology leadership staff directory`,
    ];
    const results: string[] = [];
    if (TAVILY) for (const q of queries) results.push(...await searchWeb(q, TAVILY));

    const prompt = `The HESS Consortium's listed primary contact at ${organizationName} is "${contactName || 'unknown'}" (${contactTitle || 'title unknown'}), but this contact could not be verified as still in that role.
${organizationWebsite ? `Organization website: ${organizationWebsite}\n` : ''}
Using ONLY the web results below, identify who CURRENTLY holds the same position (or the closest equivalent IT leadership role, e.g. CIO, VP/Director of IT) at ${organizationName}. Prefer .edu and LinkedIn sources. Treat "former" or past-tense mentions as NOT current. Never invent people, emails or phones.

Return JSON only:
{"candidates":[{"name":"","title":"","email":null,"phone":null,"source_url":"","confidence":"HIGH|MEDIUM|LOW","reason":""}],
 "original_contact_status":"STILL_THERE|LEFT|UNKNOWN",
 "summary":""}
List up to 3 candidates, best first. Use an empty list if none found.

WEB RESULTS:
${results.map((r, i) => `--- ${i + 1} ---\n${r}`).join('\n\n') || '(none)'}`;

    const ai = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'openai/gpt-6-astra',
        messages: [
          { role: 'system', content: 'You research higher-education IT staff. Be accurate and cite sources. Output valid JSON only.' },
          { role: 'user', content: prompt },
        ],
        response_format: { type: 'json_object' },
      }),
    });
    if (ai.status === 429) return json({ error: 'AI rate limit reached. Try again shortly.' }, 429);
    if (ai.status === 402) return json({ error: 'AI credits exhausted. Please add credits.' }, 402);
    if (!ai.ok) throw new Error(`AI error ${ai.status}: ${await ai.text()}`);
    const d = await ai.json();
    let report: any;
    try {
      const raw = (d.choices?.[0]?.message?.content || '{}').replace(/^```json\s*|```$/g, '');
      report = JSON.parse(raw);
    } catch { report = { candidates: [], summary: 'Could not parse AI response.' }; }
    report.searched_role = role;
    report.web_results = results.length;

    const checkedAt = new Date().toISOString();
    await admin.from('contact_verifications')
      .update({ replacement_report: report, replacement_checked_at: checkedAt })
      .eq('organization_id', organizationId);

    return json({ report, checkedAt });
  } catch (e) {
    console.error(e);
    return json({ error: e instanceof Error ? e.message : 'Unknown error' }, 500);
  }
});
