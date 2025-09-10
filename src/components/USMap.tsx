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

// US State coordinates for positioning markers (spread 4% from center point 450, 250)
const stateCoordinates: { [key: string]: { x: number; y: number } } = {
  'AL': { x: 602, y: 312 },
  'AK': { x: 102, y: 396 }, // Alaska positioned bottom-left
  'AZ': { x: 268, y: 270 },
  'AR': { x: 519, y: 271 },
  'CA': { x: 142, y: 228 },
  'CO': { x: 390, y: 228 },
  'CT': { x: 748, y: 167 },
  'DE': { x: 727, y: 189 },
  'FL': { x: 685, y: 375 },
  'GA': { x: 643, y: 292 },
  'HI': { x: 223, y: 375 }, // Hawaii positioned in Pacific
  'ID': { x: 287, y: 146 },
  'IL': { x: 560, y: 188 },
  'IN': { x: 581, y: 177 },
  'IA': { x: 519, y: 168 },
  'KS': { x: 456, y: 228 },
  'KY': { x: 602, y: 207 },
  'LA': { x: 519, y: 335 },
  'ME': { x: 772, y: 106 },
  'MD': { x: 727, y: 177 },
  'MA': { x: 748, y: 146 },
  'MI': { x: 581, y: 146 },
  'MN': { x: 498, y: 126 },
  'MS': { x: 560, y: 312 },
  'MO': { x: 519, y: 207 },
  'MT': { x: 350, y: 126 },
  'NE': { x: 435, y: 188 },
  'NV': { x: 223, y: 188 },
  'NH': { x: 748, y: 126 },
  'NJ': { x: 727, y: 167 },
  'NM': { x: 350, y: 270 },
  'NY': { x: 706, y: 146 },
  'NC': { x: 664, y: 250 },
  'ND': { x: 435, y: 106 },
  'OH': { x: 623, y: 167 },
  'OK': { x: 456, y: 250 },
  'OR': { x: 184, y: 126 },
  'PA': { x: 685, y: 167 },
  'RI': { x: 758, y: 156 },
  'SC': { x: 664, y: 270 },
  'SD': { x: 435, y: 146 },
  'TN': { x: 602, y: 228 },
  'TX': { x: 435, y: 312 },
  'UT': { x: 309, y: 207 },
  'VT': { x: 727, y: 126 },
  'VA': { x: 685, y: 207 },
  'WA': { x: 204, y: 86 },
  'WV': { x: 664, y: 188 },
  'WI': { x: 539, y: 126 },
  'WY': { x: 350, y: 168 }
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