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
    const { organizationName, firstName, lastName, title } = await req.json();
    
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
    const titleInfo = title ? ` with the title "${title}"` : '';
    
    const prompt = `Search for and verify information about ${fullName}${titleInfo} at ${organizationName}. 

This is for a higher education consortium membership verification. Please provide:
1. Whether this person appears to work at this organization (Yes/No/Unable to verify)
2. Their verified title/position if found
3. A brief professional bio (2-3 sentences) if available
4. Any LinkedIn or official institutional page where they are listed
5. Confidence level in this verification (High/Medium/Low)

If you cannot find information, please state that clearly. Do not make up information.

Format your response as:
**Verification Status:** [Yes/No/Unable to verify]
**Confidence Level:** [High/Medium/Low]
**Verified Title:** [Title if found, or "Not found"]
**Bio:** [Brief bio or "No public information available"]
**Sources:** [Any relevant URLs or "No sources found"]`;

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
            content: "You are a research assistant that helps verify professional contacts at educational institutions. You search for publicly available information about individuals and their roles at organizations. Be accurate and honest - if you cannot find information, say so clearly. Do not fabricate details." 
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
    const verificationResult = data.choices?.[0]?.message?.content || "Unable to process verification request.";

    console.log("Verification completed successfully");

    return new Response(
      JSON.stringify({ 
        success: true,
        result: verificationResult,
        searchedFor: {
          name: fullName,
          title: title || null,
          organization: organizationName
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
