import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface DashboardComponent {
  id: string;
  type: 'chart' | 'table' | 'metric' | 'text';
  title: string;
  config: any;
  position: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { prompt, userRole } = await req.json();
    
    // Verify user is admin
    if (userRole !== 'admin') {
      return new Response(
        JSON.stringify({ error: 'Only administrators can use AI dashboard generation' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openAIApiKey) {
      throw new Error('OpenAI API key not found');
    }

    // Database schema and context for AI
    const databaseContext = `
    Available Database Tables for Dashboard Generation:
    
    1. ORGANIZATIONS - Main entity with membership data
       - membership_status (active, pending, inactive)
       - student_fte (number of students)
       - city, state (geographic data)
       - annual_fee_amount (financial data)
       - Various software systems used (SIS, financial, etc.)
       - Primary office hardware preferences
    
    2. INVOICES - Financial tracking
       - amount, prorated_amount (financial metrics)
       - status (draft, sent, paid, overdue)
       - invoice_date, due_date, paid_date (time series data)
       - organization_id (links to organizations)
    
    3. PROFILES - User information
       - user contact information
       - organization affiliations
       - system preferences
    
    4. USER_ROLES - Access control
       - role types (admin, member)
       - user assignments
    
    5. AUDIT_LOG - Activity tracking
       - user actions and changes
       - timestamps for activity analysis
    
    6. SYSTEM_SETTINGS - Configuration data
       - Various system configuration options
    
    Available Chart Types:
    - bar: For comparing categories (membership status, states, software usage)
    - line: For time series data (revenue over time, membership growth)
    - pie: For distribution data (membership status breakdown, geographic distribution)
    - area: For cumulative data over time
    
    Available Component Types:
    - chart: Visual data representation
    - table: Detailed data listings
    - metric: Key performance indicators (KPIs)
    - text: Contextual information and insights
    `;

    const systemPrompt = `You are an expert dashboard designer for a membership management system. Based on the user's request and the available database schema, generate a comprehensive dashboard configuration.

    ${databaseContext}

    Return a JSON object with this exact structure:
    {
      "title": "Dashboard Title",
      "description": "Brief description of the dashboard purpose",
      "components": [
        {
          "id": "unique-id",
          "type": "chart|table|metric|text",
          "title": "Component Title",
          "config": {
            // For charts:
            "chartType": "bar|line|pie|area",
            "dataSource": "organizations|invoices|profiles|audit_log",
            "xAxis": "field_name",
            "yAxis": "field_name",
            "aggregation": "count|sum|avg|max|min",
            "filters": {} // optional filters
            
            // For tables:
            "dataSource": "table_name",
            "columns": ["column1", "column2", "column3"],
            "limit": 10,
            "sortBy": "column_name",
            "sortOrder": "asc|desc"
            
            // For metrics:
            "metric": {
              "value": "calculated_value",
              "label": "Metric Label",
              "dataSource": "table_name",
              "aggregation": "count|sum|avg",
              "field": "field_name",
              "change": "percentage_change",
              "changeType": "positive|negative|neutral"
            }
            
            // For text:
            "content": "Markdown content with insights"
          },
          "position": {
            "x": 0,
            "y": 0,
            "width": 400,
            "height": 300
          }
        }
      ]
    }

    Guidelines:
    - Create 4-8 components for a comprehensive dashboard
    - Include a mix of charts, tables, and metrics
    - Position components in a logical grid layout
    - Focus on actionable insights for administrators
    - Use realistic field names from the database schema
    - Provide meaningful titles and descriptions
    - Consider the relationships between data entities`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-5-2025-08-07',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Create a dashboard for: ${prompt}` }
        ],
        max_completion_tokens: 2000,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('OpenAI API error:', errorData);
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const aiResponse = data.choices[0].message.content;
    
    console.log('AI Response:', aiResponse);

    // Parse the AI response
    let dashboardConfig;
    try {
      // Extract JSON from the response if it's wrapped in markdown
      const jsonMatch = aiResponse.match(/```json\n?([\s\S]*?)\n?```/) || aiResponse.match(/```\n?([\s\S]*?)\n?```/);
      const jsonString = jsonMatch ? jsonMatch[1] : aiResponse;
      dashboardConfig = JSON.parse(jsonString);
    } catch (parseError) {
      console.error('Failed to parse AI response:', parseError);
      throw new Error('Failed to parse AI-generated dashboard configuration');
    }

    // Validate and enhance the configuration
    if (!dashboardConfig.components || !Array.isArray(dashboardConfig.components)) {
      throw new Error('Invalid dashboard configuration: missing components array');
    }

    // Add unique IDs and ensure proper positioning
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

    return new Response(JSON.stringify({
      success: true,
      dashboard: dashboardConfig
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in AI dashboard generator:', error);
    return new Response(JSON.stringify({ 
      error: 'Failed to generate dashboard',
      details: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});