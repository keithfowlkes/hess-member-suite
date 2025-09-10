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

// US State coordinates refined to match the blue map underlay proportions
const stateCoordinates: { [key: string]: { x: number; y: number } } = {
  'AL': { x: 615, y: 320 },
  'AK': { x: 75, y: 410 }, // Alaska positioned bottom-left
  'AZ': { x: 245, y: 275 },
  'AR': { x: 535, y: 285 },
  'CA': { x: 110, y: 220 },
  'CO': { x: 370, y: 240 },
  'CT': { x: 775, y: 170 },
  'DE': { x: 755, y: 190 },
  'FL': { x: 710, y: 390 },
  'GA': { x: 665, y: 305 },
  'HI': { x: 200, y: 390 }, // Hawaii positioned in Pacific
  'ID': { x: 265, y: 135 },
  'IL': { x: 580, y: 190 },
  'IN': { x: 605, y: 180 },
  'IA': { x: 535, y: 165 },
  'KS': { x: 460, y: 235 },
  'KY': { x: 625, y: 200 },
  'LA': { x: 535, y: 355 },
  'ME': { x: 810, y: 95 },
  'MD': { x: 755, y: 180 },
  'MA': { x: 785, y: 135 },
  'MI': { x: 605, y: 135 },
  'MN': { x: 515, y: 115 },
  'MS': { x: 580, y: 325 },
  'MO': { x: 535, y: 205 },
  'MT': { x: 330, y: 115 },
  'NE': { x: 440, y: 185 },
  'NV': { x: 185, y: 185 },
  'NH': { x: 785, y: 115 },
  'NJ': { x: 765, y: 170 },
  'NM': { x: 330, y: 275 },
  'NY': { x: 745, y: 135 },
  'NC': { x: 695, y: 255 },
  'ND': { x: 440, y: 95 },
  'OH': { x: 650, y: 170 },
  'OK': { x: 460, y: 260 },
  'OR': { x: 145, y: 115 },
  'PA': { x: 720, y: 165 },
  'RI': { x: 795, y: 145 },
  'SC': { x: 695, y: 280 },
  'SD': { x: 440, y: 135 },
  'TN': { x: 625, y: 235 },
  'TX': { x: 440, y: 325 },
  'UT': { x: 290, y: 205 },
  'VT': { x: 765, y: 115 },
  'VA': { x: 720, y: 200 },
  'WA': { x: 165, y: 75 },
  'WV': { x: 695, y: 185 },
  'WI': { x: 560, y: 115 },
  'WY': { x: 330, y: 165 }
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
                  className="w-full h-[600px] border border-border rounded-lg"
                  preserveAspectRatio="xMidYMid meet"
                >
                  {/* White background to remove checkerboard pattern */}
                  <rect x="0" y="0" width="900" height="500" fill="white" />
                  
                  {/* Use the new blue US map as background */}
                  <image 
                    href="/lovable-uploads/51a715af-5bba-45b3-91d7-cc25cff59cea.png"
                    x="0" 
                    y="0" 
                    width="900" 
                    height="500"
                    preserveAspectRatio="xMidYMid meet"
                  />
                  
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