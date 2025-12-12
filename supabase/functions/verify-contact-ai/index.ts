import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Search the web using Tavily
async function searchWeb(query: string, apiKey: string): Promise<{ results: string[], authError: boolean }> {
  console.log(`Searching web with Tavily for: ${query}`);
  
  try {
    const response = await fetch('https://api.tavily.com/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        api_key: apiKey,
        query,
        search_depth: "basic",
        include_raw_content: false,
        max_results: 5
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Tavily search error:', response.status, errorText);
      
      // Check for authentication errors specifically
      if (response.status === 401 || response.status === 403) {
        console.warn('Tavily API key is invalid or unauthorized - will fall back to AI-only verification');
        return { results: [], authError: true };
      }
      
      return { results: [], authError: false };
    }

    const data = await response.json();
    console.log(`Tavily returned ${data.results?.length || 0} results`);
    
    // Extract content from Tavily search results
    const results: string[] = [];
    if (data.results && Array.isArray(data.results)) {
      for (const result of data.results) {
        const content = [
          `URL: ${result.url}`,
          `Title: ${result.title || 'N/A'}`,
          result.content ? `Content: ${result.content.substring(0, 2000)}` : ''
        ].filter(Boolean).join('\n');
        results.push(content);
      }
    }
    
    return { results, authError: false };
  } catch (error) {
    console.error('Tavily search failed:', error);
    return { results: [], authError: false };
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { organizationName, firstName, lastName, title, organizationWebsite } = await req.json();
    
    if (!organizationName || !firstName || !lastName) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: organizationName, firstName, lastName' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const TAVILY_API_KEY = Deno.env.get("TAVILY_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const fullName = `${firstName} ${lastName}`;
    const titleInfo = title ? ` ${title}` : '';
    
    console.log(`Verifying contact: ${fullName} at ${organizationName}`);
    
    // Build search queries for real web search
    const searchQueries = [
      `"${fullName}" "${organizationName}" ${titleInfo}`.trim(),
      `"${fullName}" "${organizationName}" IT technology director`,
      `${organizationName} IT department staff directory`
    ];
    
    let webSearchResults: string[] = [];
    let tavilyAuthError = false;
    
    // Use Tavily for real web search if API key is available
    if (TAVILY_API_KEY) {
      console.log('Using Tavily for real-time web search...');
      
      for (const query of searchQueries) {
        const { results, authError } = await searchWeb(query, TAVILY_API_KEY);
        
        if (authError) {
          tavilyAuthError = true;
          console.warn('Tavily authentication failed - stopping web search attempts');
          break; // Stop trying if auth fails
        }
        
        webSearchResults.push(...results);
        
        // Rate limit between searches
        if (results.length > 0) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }
      
      if (tavilyAuthError) {
        console.log('Continuing with AI-only verification due to Tavily auth error');
      } else {
        console.log(`Total web search results: ${webSearchResults.length}`);
      }
    } else {
      console.log('TAVILY_API_KEY not configured - falling back to AI training data only');
    }

    // Build the prompt with real web search results
    const websiteInfo = organizationWebsite ? `\nOrganization website: ${organizationWebsite}` : '';
    const searchResultsSection = webSearchResults.length > 0 
      ? `\n\nREAL-TIME WEB SEARCH RESULTS:\n${webSearchResults.map((r, i) => `--- Result ${i + 1} ---\n${r}`).join('\n\n')}`
      : '\n\n(No web search results available - using training data only)';
    
    const prompt = `You are verifying a contact for the HESS Consortium, a group of private colleges and universities that share IT systems information.

PERSON TO VERIFY:
- Name: ${fullName}${title ? ` (claimed title: "${title}")` : ''}
- Organization: ${organizationName}${websiteInfo}
${searchResultsSection}

VERIFICATION TASK:
Verify this person currently works at this institution in an IT/technology leadership role. 

SOURCE RELIABILITY (MOST to LEAST trustworthy):
1. OFFICIAL INSTITUTIONAL SOURCES (.edu domains, official university websites) - HIGHEST trust
2. LinkedIn profiles showing CURRENT employment - HIGH trust
3. Recent news articles or press releases from the institution - HIGH trust
4. Professional directories listing current employment - MEDIUM trust
5. Data aggregators like Equilar, RocketReach, ZoomInfo - LOW trust (often outdated, may show "former" incorrectly)
6. Generic people search sites - VERY LOW trust

CRITICAL: Sites like Equilar often show outdated "former" designations even for current employees because they haven't updated their records. If Equilar says "Former" but there's no other evidence of departure (no new CIO announcement, person not found at another organization), treat it as UNCONFIRMED rather than UNVERIFIED.

RESPOND WITH EXACTLY THIS FORMAT:
VERIFICATION_STATUS: [VERIFIED/LIKELY/UNVERIFIED/NOT_FOUND]
CONFIDENCE: [HIGH/MEDIUM/LOW]
FOUND_TITLE: [The actual title found from reliable sources, or "Not found"]
FOUND_DEPARTMENT: [Department if found, or "Not found"]
SUMMARY: [2-3 sentence summary of what you found, noting source reliability]
LINKEDIN_URL: [LinkedIn profile URL if found in results, or "Not found"]
INSTITUTIONAL_URL: [URL where person is listed on institution site, or "Not found"]
NOTES: [Any additional relevant information or discrepancies. Note if data comes from potentially outdated aggregators]

VERIFICATION CRITERIA:
- VERIFIED = Found on official institutional website (.edu) OR current LinkedIn + no contradicting info
- LIKELY = Not on institutional site, but LinkedIn shows current employment OR person is well-known at institution
- UNVERIFIED = Conflicting information OR only found on low-trust aggregators showing outdated info
- NOT_FOUND = No information found about this person at this organization

IMPORTANT:
- Higher education IT staff often aren't listed on public directories - don't penalize for this
- Prioritize absence of evidence that they LEFT over presence of "former" tags from aggregators
- If the person is submitting a member update for HESS, they likely still work there
- Be specific about WHERE you found information and its reliability`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { 
            role: "system", 
            content: "You are an expert research assistant specializing in verifying professional contacts at higher education institutions. Analyze the provided web search results carefully to verify contacts. Be thorough but accurate - never fabricate information. When you find information, cite your sources with URLs." 
          },
          { role: "user", content: prompt }
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI service quota exceeded. Please contact support." }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const rawResult = data.choices?.[0]?.message?.content || "";
    
    console.log("Raw AI response:", rawResult);

    // Parse the structured response
    const parseField = (text: string, field: string): string => {
      const regex = new RegExp(`${field}:\\s*(.+?)(?=\\n[A-Z_]+:|$)`, 's');
      const match = text.match(regex);
      return match ? match[1].trim() : '';
    };

    const verificationStatus = parseField(rawResult, 'VERIFICATION_STATUS') || 'UNKNOWN';
    const confidence = parseField(rawResult, 'CONFIDENCE') || 'LOW';
    const foundTitle = parseField(rawResult, 'FOUND_TITLE') || 'Not found';
    const foundDepartment = parseField(rawResult, 'FOUND_DEPARTMENT') || 'Not found';
    const summary = parseField(rawResult, 'SUMMARY') || 'No summary available';
    const linkedinUrl = parseField(rawResult, 'LINKEDIN_URL');
    const institutionalUrl = parseField(rawResult, 'INSTITUTIONAL_URL');
    const notes = parseField(rawResult, 'NOTES');

    const structuredResult = {
      verificationStatus,
      confidence,
      foundTitle,
      foundDepartment,
      summary,
      linkedinUrl: linkedinUrl && linkedinUrl !== 'Not found' ? linkedinUrl : null,
      institutionalUrl: institutionalUrl && institutionalUrl !== 'Not found' ? institutionalUrl : null,
      notes: notes && notes !== 'Not found' ? notes : null,
      rawResponse: rawResult,
      webSearchUsed: !!TAVILY_API_KEY && webSearchResults.length > 0 && !tavilyAuthError,
      searchResultsCount: webSearchResults.length,
      tavilyAuthError
    };

    console.log("Verification completed successfully:", structuredResult);

    return new Response(
      JSON.stringify({ 
        success: true,
        result: rawResult,
        structured: structuredResult,
        searchedFor: {
          name: fullName,
          title: title || null,
          organization: organizationName,
          website: organizationWebsite || null
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in verify-contact-ai function:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error occurred' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
