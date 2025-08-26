import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Search, ExternalLink, MapPin, Building2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';

interface PublicOrganization {
  id: string;
  name: string;
  city?: string;
  state?: string;
  website?: string;
  membership_status: string;
}

export default function PublicDirectory() {
  const [organizations, setOrganizations] = useState<PublicOrganization[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchOrganizations = async () => {
    try {
      // Public access to organization data
      const { data, error } = await supabase
        .from('organizations')
        .select('id, name, city, state, website, membership_status')
        .eq('membership_status', 'active')
        .order('name');

      if (error) {
        console.error('Error fetching organizations:', error);
        setOrganizations([]);
      } else {
        setOrganizations(data || []);
      }
    } catch (error) {
      console.error('Error:', error);
      setOrganizations([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrganizations();
  }, []);

  const filteredOrganizations = organizations.filter(org =>
    org.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    org.city?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    org.state?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto p-6">
          <Card>
            <CardContent className="p-8">
              <div className="flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-accent/5">
      <div className="container mx-auto p-6 space-y-8">
        {/* Header */}
        <div className="text-center space-y-4 py-8">
          <h1 className="text-4xl font-bold text-foreground">
            Member Organizations Directory
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Discover our active member organizations from across the region
          </p>
        </div>

        <Card className="border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-accent/10 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-primary">
              <Building2 className="h-5 w-5" />
              Organization Directory
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Search */}
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search organizations..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Organizations List */}
            <div className="space-y-2">
              {filteredOrganizations.map((org) => (
                <div key={org.id} className="flex items-center justify-between p-4 border border-border rounded-lg hover:bg-accent/5 transition-colors bg-background/50 backdrop-blur-sm">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-4">
                      <h3 className="font-semibold text-foreground text-lg">
                        {org.name}
                      </h3>
                      {(org.city || org.state) && (
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <MapPin className="h-4 w-4" />
                          <span>
                            {[org.city, org.state].filter(Boolean).join(', ')}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {org.website && (
                    <Button
                      variant="ghost" 
                      size="sm"
                      onClick={() => window.open(org.website, '_blank')}
                      className="flex-shrink-0 ml-4 text-primary hover:text-primary/80"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>

            {filteredOrganizations.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                <Building2 className="h-16 w-16 mx-auto mb-4 opacity-50" />
                <h3 className="text-lg font-medium mb-2">No Organizations Found</h3>
                <p>No organizations match your search criteria.</p>
              </div>
            )}

            {/* Statistics */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-6 border-t border-border">
              <div className="text-center p-4 bg-primary/5 rounded-lg">
                <div className="text-2xl font-bold text-primary">{organizations.length}</div>
                <div className="text-sm text-muted-foreground">Active Organizations</div>
              </div>
              <div className="text-center p-4 bg-accent/10 rounded-lg">
                <div className="text-2xl font-bold text-foreground">
                  {new Set(organizations.map(org => org.state).filter(Boolean)).size}
                </div>
                <div className="text-sm text-muted-foreground">States Represented</div>
              </div>
              <div className="text-center p-4 bg-secondary/10 rounded-lg">
                <div className="text-2xl font-bold text-foreground">
                  {organizations.filter(org => org.website).length}
                </div>
                <div className="text-sm text-muted-foreground">With Websites</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}