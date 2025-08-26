import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, ExternalLink, MapPin, Building2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface PublicOrganization {
  id: string;
  name: string;
  city?: string;
  state?: string;
  website?: string;
  membership_status: string;
}

export function PublicOrganizationDirectory() {
  const [organizations, setOrganizations] = useState<PublicOrganization[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchOrganizations = async () => {
    try {
      // This query will work without authentication since we're only selecting public info
      const { data, error } = await supabase
        .from('organizations')
        .select('id, name, city, state, website, membership_status')
        .eq('membership_status', 'active')
        .order('name');

      if (error) throw error;
      setOrganizations(data || []);
    } catch (error: any) {
      toast({
        title: 'Error loading organizations',
        description: error.message,
        variant: 'destructive'
      });
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

  const handleViewPublic = () => {
    // Open in new window without authentication
    const publicUrl = `${window.location.origin}/public/directory`;
    window.open(publicUrl, '_blank');
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-8">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-accent/10">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-primary">
                <Building2 className="h-5 w-5" />
                Organization Directory Preview
              </CardTitle>
              <p className="text-muted-foreground mt-1">
                This shows what visitors will see on your public directory
              </p>
            </div>
            <Button onClick={handleViewPublic} variant="outline" className="gap-2">
              <ExternalLink className="h-4 w-4" />
              View Public Page
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search organizations by name, city, or state..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          <div className="space-y-2">
            {filteredOrganizations.map((org) => (
              <div key={org.id} className="flex items-center justify-between p-4 border border-border rounded-lg hover:bg-accent/5 transition-colors">
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
            <div className="text-center py-8 text-muted-foreground">
              <Building2 className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>No organizations found matching your search.</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Directory Statistics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
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
  );
}