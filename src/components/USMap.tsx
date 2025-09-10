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

// US State coordinates for positioning markers (approximate center points)
const stateCoordinates: { [key: string]: { x: number; y: number } } = {
  'AL': { x: 86.79, y: 32.77 },
  'AK': { x: 64.06, y: 64.00 },
  'AZ': { x: 112.07, y: 34.05 },
  'AR': { x: 92.19, y: 34.89 },
  'CA': { x: 119.76, y: 36.77 },
  'CO': { x: 105.31, y: 39.05 },
  'CT': { x: 72.72, y: 41.76 },
  'DE': { x: 75.50, y: 39.16 },
  'FL': { x: 81.68, y: 27.76 },
  'GA': { x: 83.44, y: 33.24 },
  'HI': { x: 157.82, y: 21.30 },
  'ID': { x: 114.74, y: 44.06 },
  'IL': { x: 89.39, y: 40.63 },
  'IN': { x: 86.14, y: 39.79 },
  'IA': { x: 93.62, y: 42.03 },
  'KS': { x: 98.48, y: 38.50 },
  'KY': { x: 84.86, y: 37.83 },
  'LA': { x: 91.96, y: 31.24 },
  'ME': { x: 69.76, y: 45.36 },
  'MD': { x: 76.64, y: 39.05 },
  'MA': { x: 71.10, y: 42.40 },
  'MI': { x: 84.54, y: 44.18 },
  'MN': { x: 94.63, y: 46.39 },
  'MS': { x: 89.39, y: 32.35 },
  'MO': { x: 92.60, y: 38.57 },
  'MT': { x: 110.36, y: 47.05 },
  'NE': { x: 99.90, y: 41.49 },
  'NV': { x: 117.22, y: 38.80 },
  'NH': { x: 71.54, y: 43.68 },
  'NJ': { x: 74.75, y: 40.22 },
  'NM': { x: 106.24, y: 34.30 },
  'NY': { x: 74.75, y: 42.65 },
  'NC': { x: 79.80, y: 35.77 },
  'ND': { x: 100.78, y: 47.41 },
  'OH': { x: 82.99, y: 40.41 },
  'OK': { x: 97.53, y: 35.58 },
  'OR': { x: 120.55, y: 43.80 },
  'PA': { x: 77.19, y: 40.87 },
  'RI': { x: 71.42, y: 41.82 },
  'SC': { x: 80.90, y: 33.83 },
  'SD': { x: 100.34, y: 44.50 },
  'TN': { x: 86.35, y: 35.86 },
  'TX': { x: 97.75, y: 31.25 },
  'UT': { x: 111.89, y: 39.32 },
  'VT': { x: 72.58, y: 44.26 },
  'VA': { x: 78.17, y: 37.77 },
  'WA': { x: 121.49, y: 47.75 },
  'WV': { x: 80.45, y: 38.60 },
  'WI': { x: 89.63, y: 44.27 },
  'WY': { x: 107.30, y: 42.75 }
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
    if (count === 1) return 8;
    if (count <= 3) return 12;
    if (count <= 5) return 16;
    return 20;
  };

  const getMarkerColor = (count: number) => {
    if (count === 1) return '#22c55e'; // green-500
    if (count <= 3) return '#3b82f6'; // blue-500
    if (count <= 5) return '#f59e0b'; // amber-500
    return '#ef4444'; // red-500
  };

  // Convert lat/lng to SVG coordinates (simplified projection)
  const latLngToSVG = (lat: number, lng: number) => {
    const x = (lng + 180) * (800 / 360);
    const y = (90 - lat) * (500 / 180);
    return { x, y };
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
              <div className="relative">
                <svg 
                  viewBox="0 0 900 500" 
                  className="w-full h-auto border border-border rounded-lg bg-muted/30"
                >
                  {/* US Map outline - simplified */}
                  <rect x="0" y="0" width="900" height="500" fill="#f8f9fa" stroke="#e5e7eb" />
                  
                  {/* State markers */}
                  {Object.entries(stateStats).map(([state, data]) => {
                    const coords = stateCoordinates[state];
                    if (!coords) return null;
                    
                    // Convert coordinates to SVG space
                    const svgCoords = latLngToSVG(coords.y, -coords.x);
                    
                    return (
                      <g key={state}>
                        <circle
                          cx={svgCoords.x}
                          cy={svgCoords.y}
                          r={getMarkerSize(data.count)}
                          fill={getMarkerColor(data.count)}
                          stroke="white"
                          strokeWidth="2"
                          className="cursor-pointer hover:opacity-80 transition-opacity"
                          onClick={() => setSelectedState(selectedState === state ? null : state)}
                        />
                        <text
                          x={svgCoords.x}
                          y={svgCoords.y + 4}
                          textAnchor="middle"
                          className="text-xs font-bold fill-white pointer-events-none"
                        >
                          {data.count}
                        </text>
                        <text
                          x={svgCoords.x}
                          y={svgCoords.y - getMarkerSize(data.count) - 8}
                          textAnchor="middle"
                          className="text-xs font-medium fill-foreground pointer-events-none"
                        >
                          {state}
                        </text>
                      </g>
                    );
                  })}
                </svg>
                
                {/* Legend */}
                <div className="absolute bottom-4 left-4 bg-background/95 p-3 rounded-lg border border-border shadow-lg">
                  <h4 className="text-sm font-medium mb-2">Organizations per State</h4>
                  <div className="space-y-1 text-xs">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-green-500"></div>
                      <span>1 organization</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 rounded-full bg-blue-500"></div>
                      <span>2-3 organizations</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-5 h-5 rounded-full bg-amber-500"></div>
                      <span>4-5 organizations</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-red-500"></div>
                      <span>6+ organizations</span>
                    </div>
                  </div>
                </div>
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