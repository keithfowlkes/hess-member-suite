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

// US State coordinates further refined to precisely match the blue map underlay
const stateCoordinates: { [key: string]: { x: number; y: number } } = {
  'AL': { x: 625, y: 325 },
  'AK': { x: 70, y: 415 }, // Alaska positioned bottom-left
  'AZ': { x: 230, y: 285 },
  'AR': { x: 545, y: 290 },
  'CA': { x: 95, y: 210 },
  'CO': { x: 355, y: 245 },
  'CT': { x: 785, y: 175 },
  'DE': { x: 765, y: 195 },
  'FL': { x: 720, y: 400 },
  'GA': { x: 675, y: 310 },
  'HI': { x: 190, y: 400 }, // Hawaii positioned in Pacific
  'ID': { x: 250, y: 125 },
  'IL': { x: 590, y: 195 },
  'IN': { x: 615, y: 185 },
  'IA': { x: 545, y: 160 },
  'KS': { x: 470, y: 240 },
  'KY': { x: 635, y: 205 },
  'LA': { x: 545, y: 365 },
  'ME': { x: 820, y: 85 },
  'MD': { x: 765, y: 185 },
  'MA': { x: 795, y: 125 },
  'MI': { x: 615, y: 125 },
  'MN': { x: 525, y: 105 },
  'MS': { x: 590, y: 335 },
  'MO': { x: 545, y: 210 },
  'MT': { x: 315, y: 105 },
  'NE': { x: 450, y: 180 },
  'NV': { x: 170, y: 180 },
  'NH': { x: 795, y: 105 },
  'NJ': { x: 775, y: 175 },
  'NM': { x: 315, y: 285 },
  'NY': { x: 755, y: 125 },
  'NC': { x: 705, y: 260 },
  'ND': { x: 450, y: 85 },
  'OH': { x: 660, y: 175 },
  'OK': { x: 470, y: 270 },
  'OR': { x: 130, y: 105 },
  'PA': { x: 730, y: 170 },
  'RI': { x: 805, y: 140 },
  'SC': { x: 705, y: 285 },
  'SD': { x: 450, y: 125 },
  'TN': { x: 635, y: 240 },
  'TX': { x: 450, y: 335 },
  'UT': { x: 275, y: 210 },
  'VT': { x: 775, y: 105 },
  'VA': { x: 730, y: 205 },
  'WA': { x: 150, y: 65 },
  'WV': { x: 705, y: 190 },
  'WI': { x: 570, y: 105 },
  'WY': { x: 315, y: 160 }
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