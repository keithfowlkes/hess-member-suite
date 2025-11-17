import { useState, useEffect } from 'react';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/AppSidebar';
import { useAuth } from '@/hooks/useAuth';
import { Loader2 } from 'lucide-react';
import { useUnifiedProfile } from '@/hooks/useUnifiedProfile';
import { UnifiedProfileEditor } from '@/components/UnifiedProfileEditor';
import { MemberCohortSelector } from '@/components/MemberCohortSelector';
import { supabase } from '@/integrations/supabase/client';

const Profile = () => {
  const { user } = useAuth();
  const { data, loading, isAdmin, submitEditRequest, updateProfileDirect, canEditDirectly } = useUnifiedProfile();
  const [saving, setSaving] = useState(false);
  const [isCohortLeader, setIsCohortLeader] = useState(false);

  // Check if user is a cohort leader
  useEffect(() => {
    const checkCohortLeaderRole = async () => {
      if (!user) return;
      
      const { data: roleData } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .eq('role', 'cohort_leader')
        .single();
      
      setIsCohortLeader(!!roleData);
    };
    
    checkCohortLeaderRole();
  }, [user]);

  // Scroll to top when profile page loads
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const handleSave = async (updates: {
    profile?: Partial<any>;
    organization?: Partial<any>;
  }) => {
    console.log('🚀 Profile page: handleSave called with:', updates);
    setSaving(true);
    
    try {
      let success = false;
      
      if (canEditDirectly()) {
        // Admin can update directly
        success = await updateProfileDirect(updates);
      } else {
        // Regular users submit for approval
        success = await submitEditRequest(updates);
      }
      
      return success;
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <SidebarProvider>
        <div className="min-h-screen flex w-full">
          <AppSidebar />
          <main className="flex-1 p-8">
            <div className="flex items-center justify-center h-64">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          </main>
        </div>
      </SidebarProvider>
    );
  }

  if (!data) {
    return (
      <SidebarProvider>
        <div className="min-h-screen flex w-full">
          <AppSidebar />
          <main className="flex-1 p-8">
            <div className="text-center">
              <h1 className="text-2xl font-bold text-foreground mb-4">Profile Not Found</h1>
              <p className="text-muted-foreground">Unable to load your profile information.</p>
            </div>
          </main>
        </div>
      </SidebarProvider>
    );
  }

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <main className="flex-1 p-8">
          {/* Mobile menu button - always visible on mobile */}
          <div className="sticky top-0 z-50 flex items-center gap-2 -mx-8 -mt-8 mb-6 border-b bg-background p-4 lg:hidden">
            <SidebarTrigger />
            <h1 className="text-lg font-semibold">HESS Consortium</h1>
          </div>
          
          <div className="space-y-6">
            <UnifiedProfileEditor
              data={data}
              canEditDirectly={canEditDirectly()}
              onSave={handleSave}
              saving={saving}
            />
            
            {/* Show cohort selector for admins and cohort leaders */}
            {(isAdmin || isCohortLeader) && (
              <MemberCohortSelector 
                userId={user?.id}
                title="Your Cohort Memberships"
                description="Manage which cohort groups you belong to"
              />
            )}
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
};

export default Profile;