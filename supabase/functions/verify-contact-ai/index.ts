import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const fullName = `${firstName} ${lastName}`;
    const titleInfo = title ? ` (claimed title: "${title}")` : '';
    const websiteInfo = organizationWebsite ? `\nOrganization website: ${organizationWebsite}` : '';
    
    const prompt = `You are verifying a contact for the HESS Consortium, a group of private colleges and universities that share IT systems information.

PERSON TO VERIFY:
- Name: ${fullName}${titleInfo}
- Organization: ${organizationName}${websiteInfo}

VERIFICATION TASK:
Search for publicly available information to verify this person works at this institution. Focus on:
1. The institution's official staff directory or "About" pages
2. LinkedIn profiles matching this person at this organization
3. Conference speaker listings, publications, or press releases
4. IT/Technology department pages (since HESS focuses on higher education IT)

RESPOND WITH EXACTLY THIS FORMAT:
VERIFICATION_STATUS: [VERIFIED/LIKELY/UNVERIFIED/NOT_FOUND]
CONFIDENCE: [HIGH/MEDIUM/LOW]
FOUND_TITLE: [The actual title found, or "Not found"]
FOUND_DEPARTMENT: [Department if found, or "Not found"]
SUMMARY: [2-3 sentence summary of what you found]
LINKEDIN_URL: [LinkedIn profile URL if found, or "Not found"]
INSTITUTIONAL_URL: [URL where person is listed on institution site, or "Not found"]
NOTES: [Any additional relevant information or discrepancies between claimed and found information]

IMPORTANT GUIDELINES:
- VERIFIED = Found on official institutional sources with matching name and role
- LIKELY = Found on LinkedIn or other sources, appears legitimate but not on official site
- UNVERIFIED = Found some information but cannot confirm employment
- NOT_FOUND = No information found about this person at this organization
- Be specific about WHERE you found information
- If the claimed title differs from what you found, note the discrepancy
- Do NOT fabricate information - if unsure, say so`;

    console.log(`Verifying contact: ${fullName} at ${organizationName}`);

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
            content: "You are an expert research assistant specializing in verifying professional contacts at higher education institutions. You have access to search the web for information. Be thorough but accurate - never fabricate information. When you find information, cite your sources with URLs when possible." 
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
      rawResponse: rawResult
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
