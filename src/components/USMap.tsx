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
                  {/* Accurate US Map outline based on reference */}
                  <g fill="#f8f9fa" stroke="#6B7280" strokeWidth="2">
                    {/* Continental United States - accurate outline */}
                    <path d="M 158 240
                             C 158 220, 170 200, 190 180
                             C 210 160, 240 150, 270 140
                             C 300 135, 340 130, 380 125
                             C 420 120, 460 115, 500 112
                             C 540 110, 580 115, 620 120
                             C 660 125, 700 135, 730 145
                             C 750 150, 770 160, 785 175
                             C 790 185, 785 195, 780 205
                             C 785 215, 790 225, 785 235
                             C 780 245, 775 255, 770 265
                             C 765 275, 760 285, 750 295
                             C 745 305, 735 310, 725 315
                             C 715 320, 705 325, 695 330
                             C 685 335, 675 340, 665 345
                             C 660 355, 665 365, 670 375
                             C 675 385, 680 395, 675 405
                             C 670 410, 660 415, 650 415
                             C 640 415, 630 410, 620 405
                             C 610 400, 600 395, 590 390
                             C 580 385, 570 380, 560 375
                             C 550 370, 540 375, 530 380
                             C 520 385, 510 390, 500 385
                             C 490 380, 485 370, 480 360
                             C 475 350, 470 340, 465 350
                             C 460 360, 450 370, 440 375
                             C 430 380, 420 385, 410 380
                             C 400 375, 390 370, 380 365
                             C 370 360, 360 355, 350 350
                             C 340 345, 330 340, 320 335
                             C 310 330, 300 325, 290 320
                             C 280 315, 270 310, 260 305
                             C 250 300, 240 295, 230 285
                             C 220 275, 215 265, 210 255
                             C 205 245, 200 235, 195 225
                             C 190 215, 185 205, 180 195
                             C 175 185, 170 175, 165 165
                             C 160 155, 158 145, 158 240
                             Z" />
                    
                    {/* Florida */}
                    <path d="M 665 345
                             C 675 350, 685 360, 690 370
                             C 695 380, 700 390, 705 400
                             C 710 410, 715 420, 710 425
                             C 705 430, 695 425, 685 420
                             C 675 415, 670 405, 665 395
                             C 660 385, 665 375, 665 345
                             Z" />
                    
                    {/* Texas distinctive shape */}
                    <path d="M 440 375
                             C 450 380, 460 385, 470 390
                             C 480 395, 490 400, 500 395
                             C 510 390, 520 385, 525 375
                             C 530 365, 525 355, 520 345
                             C 515 335, 510 325, 505 315
                             C 500 305, 495 295, 485 290
                             C 475 285, 465 290, 455 295
                             C 445 300, 440 310, 435 320
                             C 430 330, 435 340, 440 350
                             C 445 360, 440 370, 440 375
                             Z" />
                    
                    {/* Great Lakes region */}
                    <path d="M 580 115
                             C 590 120, 600 125, 610 130
                             C 620 135, 630 140, 635 150
                             C 640 160, 635 170, 630 175
                             C 625 180, 615 175, 605 170
                             C 595 165, 585 160, 580 150
                             C 575 140, 580 130, 580 115
                             Z" />
                    
                    {/* California coastline */}
                    <path d="M 158 240
                             C 160 250, 165 260, 170 270
                             C 175 280, 180 290, 185 300
                             C 190 310, 195 320, 200 330
                             C 205 340, 210 350, 215 360
                             C 220 370, 215 375, 210 370
                             C 205 365, 200 355, 195 345
                             C 190 335, 185 325, 180 315
                             C 175 305, 170 295, 165 285
                             C 160 275, 158 265, 158 240
                             Z" />
                    
                    {/* Alaska - realistic shape */}
                    <path d="M 80 380
                             C 90 375, 100 370, 115 375
                             C 130 380, 145 385, 155 395
                             C 160 405, 155 415, 150 425
                             C 145 435, 135 440, 125 438
                             C 115 436, 105 432, 95 428
                             C 85 424, 78 418, 75 408
                             C 72 398, 75 388, 80 380
                             Z" />
                    
                    {/* Hawaii - island chain */}
                    <circle cx="220" cy="400" r="8" />
                    <circle cx="235" cy="403" r="6" />
                    <circle cx="248" cy="398" r="5" />
                    <circle cx="260" cy="395" r="4" />
                    <circle cx="270" cy="392" r="3" />
                  </g>
                  
                  {/* State boundary lines - simplified */}
                  <g stroke="#D1D5DB" strokeWidth="1" fill="none" opacity="0.6">
                    {/* Major state divisions following the reference */}
                    <line x1="280" y1="140" x2="280" y2="335" />
                    <line x1="360" y1="130" x2="360" y2="365" />
                    <line x1="440" y1="125" x2="440" y2="375" />
                    <line x1="520" y1="115" x2="520" y2="385" />
                    <line x1="600" y1="120" x2="600" y2="330" />
                    <line x1="680" y1="135" x2="680" y2="315" />
                    <line x1="240" y1="180" x2="730" y2="145" />
                    <line x1="210" y1="220" x2="770" y2="185" />
                    <line x1="195" y1="260" x2="760" y2="225" />
                    <line x1="230" y1="300" x2="725" y2="265" />
                    <line x1="280" y1="335" x2="665" y2="305" />
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