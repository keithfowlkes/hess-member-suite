import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MapPin, Building2, Users } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface MemberLocation {
  id: string;
  name: string;
  city?: string;
  state?: string;
  student_fte?: number;
  profiles?: {
    first_name?: string;
    last_name?: string;
    student_fte?: number;
  };
}

interface StateData {
  count: number;
  totalFTE: number;
  organizations: MemberLocation[];
}

// US State coordinates for positioning markers (updated for accurate positioning)
const stateCoordinates: { [key: string]: { x: number; y: number } } = {
  'AL': { x: 600, y: 320 },
  'AK': { x: 120, y: 400 }, // Alaska positioned bottom-left
  'AZ': { x: 280, y: 280 },
  'AR': { x: 520, y: 280 },
  'CA': { x: 160, y: 240 },
  'CO': { x: 400, y: 240 },
  'CT': { x: 740, y: 180 },
  'DE': { x: 720, y: 200 },
  'FL': { x: 680, y: 380 },
  'GA': { x: 640, y: 300 },
  'HI': { x: 240, y: 380 }, // Hawaii positioned in Pacific
  'ID': { x: 300, y: 160 },
  'IL': { x: 560, y: 200 },
  'IN': { x: 580, y: 190 },
  'IA': { x: 520, y: 180 },
  'KS': { x: 460, y: 240 },
  'KY': { x: 600, y: 220 },
  'LA': { x: 520, y: 340 },
  'ME': { x: 760, y: 120 },
  'MD': { x: 720, y: 190 },
  'MA': { x: 740, y: 160 },
  'MI': { x: 580, y: 160 },
  'MN': { x: 500, y: 140 },
  'MS': { x: 560, y: 320 },
  'MO': { x: 520, y: 220 },
  'MT': { x: 360, y: 140 },
  'NE': { x: 440, y: 200 },
  'NV': { x: 240, y: 200 },
  'NH': { x: 740, y: 140 },
  'NJ': { x: 720, y: 180 },
  'NM': { x: 360, y: 280 },
  'NY': { x: 700, y: 160 },
  'NC': { x: 660, y: 260 },
  'ND': { x: 440, y: 120 },
  'OH': { x: 620, y: 180 },
  'OK': { x: 460, y: 260 },
  'OR': { x: 200, y: 140 },
  'PA': { x: 680, y: 180 },
  'RI': { x: 750, y: 170 },
  'SC': { x: 660, y: 280 },
  'SD': { x: 440, y: 160 },
  'TN': { x: 600, y: 240 },
  'TX': { x: 440, y: 320 },
  'UT': { x: 320, y: 220 },
  'VT': { x: 720, y: 140 },
  'VA': { x: 680, y: 220 },
  'WA': { x: 220, y: 100 },
  'WV': { x: 660, y: 200 },
  'WI': { x: 540, y: 140 },
  'WY': { x: 360, y: 180 }
};

export function USMap() {
  const [memberLocations, setMemberLocations] = useState<MemberLocation[]>([]);
  const [stateStats, setStateStats] = useState<{ [key: string]: StateData }>({});
  const [selectedState, setSelectedState] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMemberLocations();
  }, []);

  const fetchMemberLocations = async () => {
    try {
      const { data, error } = await supabase
        .from('organizations')
        .select(`
          id,
          name,
          city,
          state,
          student_fte,
          profiles:contact_person_id (
            first_name,
            last_name,
            student_fte
          )
        `)
        .eq('membership_status', 'active')
        .neq('name', 'Administrator')
        .not('state', 'is', null);

      if (error) throw error;

      setMemberLocations(data || []);

      // Calculate state statistics
      const stats: { [key: string]: StateData } = {};
      
      (data || []).forEach((org) => {
        const state = org.state;
        if (state) {
          if (!stats[state]) {
            stats[state] = { count: 0, totalFTE: 0, organizations: [] };
          }
          stats[state].count++;
          const fte = org.profiles?.student_fte || org.student_fte || 0;
          stats[state].totalFTE += fte;
          stats[state].organizations.push(org);
        }
      });

      setStateStats(stats);
    } catch (error) {
      console.error('Error fetching member locations:', error);
    } finally {
      setLoading(false);
    }
  };

  const getMarkerSize = (count: number) => {
    if (count === 1) return 12;
    if (count <= 3) return 16;
    if (count <= 5) return 20;
    return 24;
  };

  const getMarkerColor = (count: number) => {
    if (count === 1) return '#22c55e'; // green-500
    if (count <= 3) return '#3b82f6'; // blue-500
    if (count <= 5) return '#f59e0b'; // amber-500
    return '#ef4444'; // red-500
  };

  // No longer need coordinate conversion - using direct SVG coordinates
  const latLngToSVG = (lat: number, lng: number) => {
    return { x: lng, y: lat };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              Total Organizations
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              {memberLocations.length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              States Represented
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              {Object.keys(stateStats).length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Users className="h-4 w-4" />
              Total Student FTE
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              {Object.values(stateStats)
                .reduce((total, state) => total + state.totalFTE, 0)
                .toLocaleString()}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Map */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                Member Organization Locations
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Click on a state marker to see organizations in that area
              </p>
            </CardHeader>
            <CardContent>
              <div className="relative w-full">
                <svg 
                  viewBox="0 0 900 500" 
                  className="w-full h-[600px] border border-border rounded-lg bg-white"
                  preserveAspectRatio="xMidYMid meet"
                >
                  {/* Accurate US Map outline */}
                  <g fill="#f8f9fa" stroke="#9CA3AF" strokeWidth="1.5">
                    {/* Continental United States outline */}
                    <path d="M 200 180 
                             L 220 160 
                             L 250 140 
                             L 280 130
                             L 320 125
                             L 360 120
                             L 400 115
                             L 450 110
                             L 500 105
                             L 550 110
                             L 600 120
                             L 650 130
                             L 700 140
                             L 750 150
                             L 780 170
                             L 790 190
                             L 780 210
                             L 770 230
                             L 760 250
                             L 750 270
                             L 740 290
                             L 720 310
                             L 700 330
                             L 680 350
                             L 670 370
                             L 680 390
                             L 700 400
                             L 650 410
                             L 600 400
                             L 550 390
                             L 500 380
                             L 480 360
                             L 460 340
                             L 440 360
                             L 420 380
                             L 400 390
                             L 380 380
                             L 360 370
                             L 340 360
                             L 320 350
                             L 300 340
                             L 280 330
                             L 260 320
                             L 240 310
                             L 220 290
                             L 210 270
                             L 200 250
                             L 190 230
                             L 185 210
                             L 190 190
                             Z" 
                          fill="#f8f9fa" 
                          stroke="#6B7280" 
                          strokeWidth="2"/>
                    
                    {/* State boundary lines - simplified grid */}
                    <g stroke="#D1D5DB" strokeWidth="1" opacity="0.7">
                      {/* Major vertical divisions */}
                      <line x1="280" y1="130" x2="280" y2="340" />
                      <line x1="360" y1="120" x2="360" y2="370" />
                      <line x1="440" y1="115" x2="440" y2="380" />
                      <line x1="520" y1="110" x2="520" y2="380" />
                      <line x1="600" y1="120" x2="600" y2="330" />
                      <line x1="680" y1="140" x2="680" y2="310" />
                      
                      {/* Major horizontal divisions */}
                      <line x1="220" y1="160" x2="750" y2="150" />
                      <line x1="200" y1="200" x2="770" y2="190" />
                      <line x1="210" y1="240" x2="760" y2="230" />
                      <line x1="240" y1="280" x2="740" y2="270" />
                      <line x1="280" y1="320" x2="700" y2="310" />
                    </g>
                    
                    {/* Alaska */}
                    <path d="M 70 380 
                             L 140 380 
                             L 150 390 
                             L 145 410 
                             L 140 430 
                             L 120 440 
                             L 100 435 
                             L 80 430 
                             L 70 420 
                             L 65 400 
                             Z" 
                          fill="#f8f9fa" 
                          stroke="#6B7280" 
                          strokeWidth="2"/>
                    
                    {/* Hawaii - chain of islands */}
                    <g>
                      <circle cx="220" cy="400" r="6" fill="#f8f9fa" stroke="#6B7280" strokeWidth="1.5"/>
                      <circle cx="235" cy="405" r="5" fill="#f8f9fa" stroke="#6B7280" strokeWidth="1.5"/>
                      <circle cx="248" cy="402" r="4" fill="#f8f9fa" stroke="#6B7280" strokeWidth="1.5"/>
                      <circle cx="258" cy="398" r="3" fill="#f8f9fa" stroke="#6B7280" strokeWidth="1.5"/>
                    </g>
                  </g>
                  
                  {/* State markers */}
                  {Object.entries(stateStats).map(([state, data]) => {
                    const coords = stateCoordinates[state];
                    if (!coords) return null;
                    
                    return (
                      <g key={state}>
                        <circle
                          cx={coords.x}
                          cy={coords.y}
                          r={getMarkerSize(data.count)}
                          fill={getMarkerColor(data.count)}
                          stroke="white"
                          strokeWidth="2"
                          className="cursor-pointer hover:opacity-80 transition-opacity drop-shadow-sm"
                          onClick={() => setSelectedState(selectedState === state ? null : state)}
                        />
                        <text
                          x={coords.x}
                          y={coords.y + 3}
                          textAnchor="middle"
                          className="text-xs font-bold fill-white pointer-events-none"
                        >
                          {data.count}
                        </text>
                        <text
                          x={coords.x}
                          y={coords.y - getMarkerSize(data.count) - 6}
                          textAnchor="middle"
                          className="text-xs font-medium fill-gray-700 pointer-events-none"
                        >
                          {state}
                        </text>
                      </g>
                    );
                  })}
                </svg>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* State Details Panel */}
        <div>
          <Card>
            <CardHeader>
              <CardTitle>State Details</CardTitle>
            </CardHeader>
            <CardContent>
              {selectedState && stateStats[selectedState] ? (
                <div className="space-y-4">
                  <div>
                    <h3 className="font-semibold text-lg">{selectedState}</h3>
                    <p className="text-sm text-muted-foreground">
                      {stateStats[selectedState].count} organization(s)
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center p-2 bg-primary/5 rounded">
                      <div className="text-lg font-bold text-primary">
                        {stateStats[selectedState].count}
                      </div>
                      <div className="text-xs text-muted-foreground">Organizations</div>
                    </div>
                    <div className="text-center p-2 bg-accent/10 rounded">
                      <div className="text-lg font-bold text-foreground">
                        {stateStats[selectedState].totalFTE.toLocaleString()}
                      </div>
                      <div className="text-xs text-muted-foreground">Student FTE</div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <h4 className="font-medium">Organizations:</h4>
                    {stateStats[selectedState].organizations.map((org) => (
                      <div key={org.id} className="p-2 bg-muted/50 rounded text-sm">
                        <div className="font-medium">{org.name}</div>
                        {org.city && (
                          <div className="text-muted-foreground text-xs">{org.city}</div>
                        )}
                        {(org.profiles?.student_fte || org.student_fte) && (
                          <div className="text-xs">
                            FTE: {(org.profiles?.student_fte || org.student_fte || 0).toLocaleString()}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-center text-muted-foreground py-8">
                  <MapPin className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>Click on a state marker to see details</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}