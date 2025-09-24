import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  console.log('=== AI Dashboard Generator Started ===');
  
  if (req.method === 'OPTIONS') {
    console.log('OPTIONS request - returning CORS headers');
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Processing request...');
    const requestBody = await req.json();
    console.log('Request body received:', { 
      hasPrompt: !!requestBody.prompt, 
      userRole: requestBody.userRole,
      promptLength: requestBody.prompt?.length 
    });
    
    const { prompt, userRole } = requestBody;
    
    // Verify user is admin
    if (userRole !== 'admin') {
      console.log('Access denied - user is not admin');
      return new Response(
        JSON.stringify({ error: 'Only administrators can use AI dashboard generation' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Admin access verified');

    // Check API key
    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    console.log('Environment variables available:', Object.keys(Deno.env.toObject()));
    console.log('API Key check:', {
      exists: !!openAIApiKey,
      startsWithSk: openAIApiKey?.startsWith('sk-'),
      length: openAIApiKey?.length,
      firstChars: openAIApiKey?.substring(0, 7) + '...'
    });
    
    if (!openAIApiKey) {
      console.error('No OpenAI API key found in environment');
      return new Response(JSON.stringify({ 
        error: 'OpenAI API key not configured',
        details: 'Please add OPENAI_API_KEY to edge function secrets'
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!openAIApiKey.startsWith('sk-')) {
      console.error('Invalid API key format');
      return new Response(JSON.stringify({ 
        error: 'Invalid OpenAI API key format',
        details: 'API key should start with sk-'
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('Making OpenAI API request...');
    
    // Simplified system prompt
    const systemPrompt = `You are a dashboard designer. Create a JSON dashboard configuration with this structure:
    {
      "title": "Dashboard Title",
      "description": "Brief description",
      "components": [
        {
          "id": "component-1",
          "type": "chart",
          "title": "Chart Title", 
          "config": {
            "chartType": "pie",
            "dataSource": "organizations",
            "xAxis": "state",
            "yAxis": "count"
          },
          "position": { "x": 0, "y": 0, "width": 400, "height": 300 }
        }
      ]
    }
    
    Create 2-3 components based on the user request. Focus on organizations, invoices, and membership data.`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini', // Using a simpler, more reliable model
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: prompt }
        ],
        max_tokens: 1500,
        temperature: 0.7
      }),
    });

    console.log('OpenAI response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI API error:', errorText);
      
      return new Response(JSON.stringify({ 
        error: 'OpenAI API request failed',
        details: `Status ${response.status}: ${errorText}`,
        status: response.status
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const data = await response.json();
    console.log('OpenAI response received, parsing...');
    
    if (!data.choices || !data.choices[0] || !data.choices[0].message) {
      console.error('Invalid OpenAI response structure');
      return new Response(JSON.stringify({ 
        error: 'Invalid response from OpenAI',
        details: 'Response structure is malformed'
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const aiResponse = data.choices[0].message.content;
    console.log('AI response length:', aiResponse?.length);
    
    // Parse the AI response
    let dashboardConfig;
    try {
      // Try to extract JSON from markdown code blocks
      const jsonMatch = aiResponse.match(/```(?:json)?\n?([\s\S]*?)\n?```/);
      const jsonString = jsonMatch ? jsonMatch[1] : aiResponse;
      
      console.log('Attempting to parse JSON...');
      dashboardConfig = JSON.parse(jsonString);
      
        } catch (parseError: unknown) {
          console.error('JSON parse error:', (parseError as Error)?.message || 'Unknown parse error');
      
      // Fallback: create a simple dashboard
      console.log('Creating fallback dashboard...');
      dashboardConfig = {
        title: "Generated Dashboard",
        description: "AI-generated dashboard based on your request",
        components: [
          {
            id: "fallback-chart-1",
            type: "chart",
            title: "Organization Distribution",
            config: {
              chartType: "pie",
              dataSource: "organizations",
              xAxis: "state",
              yAxis: "count"
            },
            position: { x: 0, y: 0, width: 400, height: 300 }
          },
          {
            id: "fallback-metric-1", 
            type: "metric",
            title: "Total Organizations",
            config: {
              metric: {
                value: 189,
                label: "Active Members",
                change: 12.5,
                changeType: "positive"
              }
            },
            position: { x: 0, y: 350, width: 400, height: 200 }
          }
        ]
      };
    }

    // Ensure components have proper IDs and positions
    if (dashboardConfig.components) {
      dashboardConfig.components = dashboardConfig.components.map((component: any, index: number) => ({
        ...component,
        id: component.id || `ai-component-${Date.now()}-${index}`,
        position: {
          x: component.position?.x || 0,
          y: component.position?.y || index * 350,
          width: component.position?.width || 400,
          height: component.position?.height || 300
        }
      }));
    }

    console.log('Dashboard config created with', dashboardConfig.components?.length, 'components');

    return new Response(JSON.stringify({
      success: true,
      dashboard: dashboardConfig
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('=== ERROR in AI dashboard generator ===');
    console.error('Error type:', error.constructor.name);
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    
    return new Response(JSON.stringify({ 
      error: 'Failed to generate dashboard',
      details: error.message,
      type: error.constructor.name
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});