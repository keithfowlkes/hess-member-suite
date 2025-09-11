import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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

// US State coordinates spread out by another 5% from center (450, 250)
const stateCoordinates: { [key: string]: { x: number; y: number } } = {
  'AL': { x: 642, y: 333 },
  'AK': { x: 31, y: 432 }, // Alaska positioned bottom-left
  'AZ': { x: 187, y: 290 },
  'AR': { x: 555, y: 298 },
  'CA': { x: 64, y: 188 },
  'CO': { x: 340, y: 249 },
  'CT': { x: 820, y: 180 },
  'DE': { x: 798, y: 200 },
  'FL': { x: 748, y: 415 },
  'GA': { x: 698, y: 316 },
  'HI': { x: 164, y: 415 }, // Hawaii positioned in Pacific
  'ID': { x: 217, y: 113 },
  'IL': { x: 605, y: 200 },
  'IN': { x: 633, y: 187 },
  'IA': { x: 555, y: 155 },
  'KS': { x: 472, y: 244 },
  'KY': { x: 655, y: 208 },
  'LA': { x: 555, y: 377 },
  'ME': { x: 859, y: 65 },
  'MD': { x: 798, y: 187 },
  'MA': { x: 830, y: 113 },
  'MI': { x: 633, y: 113 },
  'MN': { x: 533, y: 91 },
  'MS': { x: 605, y: 346 },
  'MO': { x: 555, y: 215 },
  'MT': { x: 289, y: 91 },
  'NE': { x: 453, y: 175 },
  'NV': { x: 144, y: 175 },
  'NH': { x: 830, y: 91 },
  'NJ': { x: 808, y: 180 },
  'NM': { x: 289, y: 290 },
  'NY': { x: 786, y: 113 },
  'NC': { x: 734, y: 261 },
  'ND': { x: 453, y: 65 },
  'OH': { x: 681, y: 180 },
  'OK': { x: 472, y: 272 },
  'OR': { x: 99, y: 91 },
  'PA': { x: 759, y: 168 },
  'RI': { x: 842, y: 130 },
  'SC': { x: 734, y: 290 },
  'SD': { x: 453, y: 113 },
  'TN': { x: 655, y: 244 },
  'TX': { x: 453, y: 346 },
  'UT': { x: 252, y: 215 },
  'VT': { x: 808, y: 91 },
  'VA': { x: 759, y: 208 },
  'WA': { x: 120, y: 51 },
  'WV': { x: 734, y: 187 },
  'WI': { x: 582, y: 91 },
  'WY': { x: 289, y: 157 }
};

export function PublicUSMap() {
  const [memberLocations, setMemberLocations] = useState<MemberLocation[]>([]);
  const [stateStats, setStateStats] = useState<{ [key: string]: StateData }>({});
  const [selectedState, setSelectedState] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMemberLocations();
    
    // Set up real-time subscription for organizations table
    const orgChannel = supabase
      .channel('public-map-organizations')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'organizations'
        },
        () => {
          fetchMemberLocations();
        }
      )
      .subscribe();

    // Set up real-time subscription for map coordinates
    const coordChannel = supabase
      .channel('public-map-coordinates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'map_coordinates'
        },
        () => {
          fetchMapCoordinates();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(orgChannel);
      supabase.removeChannel(coordChannel);
    };
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

  // Load coordinates from database
  const [displayCoordinates, setDisplayCoordinates] = useState(stateCoordinates);

  const fetchMapCoordinates = async () => {
    try {
      const { data, error } = await supabase
        .from('map_coordinates')
        .select('state_code, x_coordinate, y_coordinate');

      if (error) throw error;

      if (data && data.length > 0) {
        const coords: { [key: string]: { x: number; y: number } } = {};
        data.forEach(coord => {
          coords[coord.state_code] = {
            x: Number(coord.x_coordinate),
            y: Number(coord.y_coordinate)
          };
        });
        setDisplayCoordinates(coords);
      }
    } catch (error) {
      console.error('Error fetching map coordinates:', error);
    }
  };

  useEffect(() => {
    fetchMapCoordinates();
  }, []);

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
              <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  Click on a state marker to see organizations in that area
                </p>
                <div className="flex items-center gap-2">
                  <label className="text-sm font-medium">Select State:</label>
                  <Select value={selectedState ?? undefined} onValueChange={(value) => setSelectedState(value)}>
                    <SelectTrigger className="w-32">
                      <SelectValue placeholder="Choose..." />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.keys(stateStats).sort().map((state) => (
                        <SelectItem key={state} value={state}>
                          {state} ({stateStats[state].count})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
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
                  
                  {/* Use the US map as background */}
                  <image 
                    href="/lovable-uploads/e477a207-13fd-4e32-912f-3bfd45d9172e.png"
                    x="0" 
                    y="0" 
                    width="900" 
                    height="500"
                    preserveAspectRatio="xMidYMid meet"
                  />
                  
                  {/* State markers */}
                  {Object.entries(stateStats).map(([state, data]) => {
                    const coords = displayCoordinates[state];
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

                  <div className="grid grid-cols-1 gap-4">
                    <div className="text-center p-2 bg-primary/5 rounded">
                      <div className="text-lg font-bold text-primary">
                        {stateStats[selectedState].count}
                      </div>
                      <div className="text-xs text-muted-foreground">Organizations</div>
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