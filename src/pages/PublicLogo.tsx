import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Image as ImageIcon, ExternalLink } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface SystemSetting {
  setting_key: string;
  setting_value: string | null;
}

export default function PublicLogo() {
  const [logoUrl, setLogoUrl] = useState<string>('');
  const [logoName, setLogoName] = useState<string>('HESS Consortium Logo');
  const [loading, setLoading] = useState(true);
  const [imageError, setImageError] = useState(false);

  useEffect(() => {
    fetchLogoSettings();
  }, []);

  const fetchLogoSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('system_settings')
        .select('setting_key, setting_value')
        .in('setting_key', ['public_logo_url', 'public_logo_name']);

      if (error) throw error;

      const settings = data as SystemSetting[];
      const logoUrlSetting = settings.find(s => s.setting_key === 'public_logo_url');
      const logoNameSetting = settings.find(s => s.setting_key === 'public_logo_name');

      setLogoUrl(logoUrlSetting?.setting_value || '');
      setLogoName(logoNameSetting?.setting_value || 'HESS Consortium Logo');
    } catch (error) {
      console.error('Error fetching logo settings:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-muted/20 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/20">
      {/* Header */}
      <header className="border-b bg-background/80 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ImageIcon className="h-6 w-6 text-primary" />
              <h1 className="text-xl font-semibold text-foreground">
                HESS Consortium
              </h1>
            </div>
            <a
              href="/"
              className="text-primary hover:text-primary/80 text-sm flex items-center gap-1"
            >
              <ExternalLink className="h-3 w-3" />
              Visit Main Site
            </a>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto">
          {logoUrl && !imageError ? (
            <Card className="border-2 border-primary/10 shadow-lg">
              <CardContent className="p-12">
                <div className="text-center space-y-8">
                  {/* Logo Display */}
                  <div className="bg-white p-8 rounded-xl shadow-sm border max-w-2xl mx-auto">
                    <img
                      src={logoUrl}
                      alt={logoName}
                      className="max-w-full max-h-96 mx-auto object-contain"
                      onError={() => setImageError(true)}
                    />
                  </div>

                  {/* Logo Name */}
                  <div className="space-y-4">
                    <h2 className="text-4xl font-bold text-foreground">
                      {logoName}
                    </h2>
                    <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                      Higher Education Software and Services Consortium
                    </p>
                  </div>

                  {/* Additional Info */}
                  <div className="pt-8 border-t border-border/50">
                    <p className="text-muted-foreground">
                      This logo is provided by the HESS Consortium for public use and reference.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            /* No Logo State */
            <Card className="border-2 border-dashed border-muted-foreground/25">
              <CardContent className="p-12">
                <div className="text-center space-y-6">
                  <div className="w-24 h-24 mx-auto bg-muted/50 rounded-full flex items-center justify-center">
                    <ImageIcon className="w-12 h-12 text-muted-foreground/50" />
                  </div>
                  
                  <div className="space-y-3">
                    <h2 className="text-3xl font-bold text-foreground">
                      {logoName}
                    </h2>
                    <p className="text-lg text-muted-foreground">
                      Higher Education Software and Services Consortium
                    </p>
                  </div>

                  <div className="pt-6 border-t border-border/50">
                    <p className="text-muted-foreground">
                      Logo not currently available. Please check back later.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Footer Info */}
          <div className="mt-12 text-center space-y-4">
            <div className="bg-primary/5 rounded-lg p-6 max-w-2xl mx-auto">
              <h3 className="font-semibold text-foreground mb-2">
                About HESS Consortium
              </h3>
              <p className="text-sm text-muted-foreground">
                The Higher Education Software and Services Consortium brings together institutions 
                to share resources, knowledge, and best practices in educational technology and services.
              </p>
            </div>
            
            <div className="text-xs text-muted-foreground">
              <p>© {new Date().getFullYear()} HESS Consortium. All rights reserved.</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}