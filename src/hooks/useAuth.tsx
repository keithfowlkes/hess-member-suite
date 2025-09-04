import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signUp: (email: string, password: string, userData: any) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  isAdmin: boolean;
  viewMode: 'admin' | 'member';
  toggleViewMode: () => void;
  isViewingAsAdmin: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [viewMode, setViewMode] = useState<'admin' | 'member'>('admin');

  useEffect(() => {
    let mounted = true;
    
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        console.log('Auth state changed:', event, session?.user?.email);
        
        if (!mounted) return;
        
        setSession(session);
        setUser(session?.user ?? null);
        
        // Check admin role asynchronously to prevent deadlock
        if (session?.user) {
          setTimeout(async () => {
            if (!mounted) return;
            
            try {
              const { data } = await supabase
                .from('user_roles')
                .select('role')
                .eq('user_id', session.user.id)
                .eq('role', 'admin')
                .single();
              
              if (mounted) {
                setIsAdmin(!!data);
              }
            } catch (error) {
              console.error('Error checking admin role:', error);
              if (mounted) {
                setIsAdmin(false);
              }
            }
          }, 0);
        } else {
          if (mounted) {
            setIsAdmin(false);
            setViewMode('admin'); // Reset view mode on sign out
          }
        }
        
        // Always set loading to false after processing session
        if (mounted) {
          setLoading(false);
        }
      }
    );

  // Check for existing session
  const initializeAuth = async () => {
    try {
      console.log('Initializing auth...');
      
      // Clear any corrupted session data first
      const clearSession = () => {
        localStorage.removeItem('sb-tyovnvuluyosjnabrzjc-auth-token');
        localStorage.removeItem('supabase.auth.token');
        console.log('Cleared potentially corrupted session data');
      };
      
      // Try to refresh the session first
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) {
        console.error('Session error:', sessionError);
        clearSession();
        if (mounted) {
          setLoading(false);
        }
        return;
      }
      
      console.log('Session retrieved:', session ? 'valid' : 'none');
      
      if (!mounted) return;
      
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        // Check if session is about to expire (within 5 minutes)
        const expiresAt = session.expires_at;
        const now = Math.floor(Date.now() / 1000);
        const timeUntilExpiry = expiresAt - now;
        
        console.log('Session expires in:', timeUntilExpiry, 'seconds');
        
        if (timeUntilExpiry < 300) { // Less than 5 minutes
          console.log('Session expiring soon, refreshing...');
          const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
          
          if (refreshError) {
            console.error('Session refresh failed:', refreshError);
            clearSession();
            if (mounted) {
              setLoading(false);
            }
            return;
          }
          
          if (refreshData.session && mounted) {
            setSession(refreshData.session);
            setUser(refreshData.session.user);
          }
        }
        
        // Check admin role for existing session
        try {
          const { data } = await supabase
            .from('user_roles')
            .select('role')
            .eq('user_id', session.user.id)
            .eq('role', 'admin')
            .single();
          
          if (mounted) {
            setIsAdmin(!!data);
          }
        } catch (error) {
          console.error('Error checking admin role:', error);
          if (mounted) {
            setIsAdmin(false);
          }
        }
      }
      
      if (mounted) {
        setLoading(false);
      }
    } catch (error) {
      console.error('Error initializing auth:', error);
      // Clear potentially corrupted session
      try {
        localStorage.removeItem('sb-tyovnvuluyosjnabrzjc-auth-token');
        localStorage.removeItem('supabase.auth.token');
        await supabase.auth.signOut();
      } catch (signOutError) {
        console.error('Error signing out during cleanup:', signOutError);
      }
      
      if (mounted) {
        setLoading(false);
      }
    }
  };

    initializeAuth();

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    
    if (error) {
      return { error };
    }
    
    // Check if user's organization is approved before allowing login
    if (data.user) {
      try {
        // Get user's profile and organization status
        const { data: profile } = await supabase
          .from('profiles')
          .select('id, organization')
          .eq('user_id', data.user.id)
          .maybeSingle();
        
        if (profile) {
          const { data: organization } = await supabase
            .from('organizations')
            .select('membership_status')
            .eq('contact_person_id', profile.id)
            .maybeSingle();
          
          // Check if user is admin (admins can always login)
          const { data: adminRole } = await supabase
            .from('user_roles')
            .select('role')
            .eq('user_id', data.user.id)
            .eq('role', 'admin')
            .maybeSingle();
          
          // If not admin and organization is not approved, sign them out and return error
          if (!adminRole && organization?.membership_status === 'pending') {
            await supabase.auth.signOut();
            return { 
              error: { 
                message: "Your organization registration is still pending approval. Please wait for admin approval before signing in." 
              } 
            };
          }
          
          if (!adminRole && organization?.membership_status === 'cancelled') {
            await supabase.auth.signOut();
            return { 
              error: { 
                message: "Your organization registration has been cancelled. Please contact support for assistance." 
              } 
            };
          }
        }
      } catch (orgError) {
        console.error('Error checking organization status:', orgError);
        // Don't block login on check error for existing users
      }
    }
    
    return { error: null };
  };

  const signUp = async (email: string, password: string, userData: any) => {
    // Set emailRedirectTo to current origin to ensure proper redirects
    const redirectUrl = `${window.location.origin}/auth?confirmed=true`;
    
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          first_name: userData.firstName,
          last_name: userData.lastName,
          organization: userData.organization,
          state_association: userData.stateAssociation,
          student_fte: userData.studentFte,
          address: userData.address,
          city: userData.city,
          state: userData.state,
          zip: userData.zip,
          primary_contact_title: userData.primaryContactTitle,
          secondary_first_name: userData.secondaryFirstName,
          secondary_last_name: userData.secondaryLastName,
          secondary_contact_title: userData.secondaryContactTitle,
          secondary_contact_email: userData.secondaryContactEmail,
          student_information_system: userData.studentInformationSystem,
          financial_system: userData.financialSystem,
          financial_aid: userData.financialAid,
          hcm_hr: userData.hcmHr,
          payroll_system: userData.payrollSystem,
          purchasing_system: userData.purchasingSystem,
          housing_management: userData.housingManagement,
          learning_management: userData.learningManagement,
          admissions_crm: userData.admissionsCrm,
          alumni_advancement_crm: userData.alumniAdvancementCrm,
          primary_office_apple: userData.primaryOfficeApple,
          primary_office_asus: userData.primaryOfficeAsus,
          primary_office_dell: userData.primaryOfficeDell,
          primary_office_hp: userData.primaryOfficeHp,
          primary_office_microsoft: userData.primaryOfficeMicrosoft,
          primary_office_other: userData.primaryOfficeOther,
          primary_office_other_details: userData.primaryOfficeOtherDetails,
          other_software_comments: userData.otherSoftwareComments,
          isPrivateNonProfit: userData.isPrivateNonProfit
        }
      }
    });
    
    // Only sign out if this is pending approval, otherwise let users sign in normally
    if (data.user && !error) {
      // Check if organization requires approval
      try {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('organization')
          .eq('user_id', data.user.id)
          .single();
          
        if (profileData?.organization) {
          const { data: orgData } = await supabase
            .from('organizations')
            .select('membership_status')
            .ilike('name', profileData.organization)
            .single();
            
          // Only sign out if org is pending/requires approval
          if (orgData?.membership_status === 'pending') {
            await supabase.auth.signOut();
          }
        }
      } catch (orgError) {
        console.log('Organization check failed, allowing normal signup flow');
      }
    }
    
    return { error };
  };

  const signOut = async () => {
    console.log('Sign out clicked');
    try {
      // Clear local state first
      setUser(null);
      setSession(null);
      setIsAdmin(false);
      setViewMode('admin');
      
      // Clear any stored session data
      localStorage.removeItem('sb-tyovnvuluyosjnabrzjc-auth-token');
      localStorage.removeItem('supabase.auth.token');
      
      // Sign out from Supabase (even if there's no session)
      await supabase.auth.signOut();
      
      console.log('Sign out successful');
      
      // Use a simple redirect without the parameter to avoid complexity
      window.location.replace('/auth');
    } catch (err) {
      console.error('Sign out exception:', err);
      // Clear local state as fallback
      setUser(null);
      setSession(null);
      setIsAdmin(false);
      setViewMode('admin');
      
      // Clear stored session data
      localStorage.removeItem('sb-tyovnvuluyosjnabrzjc-auth-token');
      localStorage.removeItem('supabase.auth.token');
      
      // Still redirect to auth page
      window.location.replace('/auth');
    }
  };

  const toggleViewMode = () => {
    setViewMode(prev => prev === 'admin' ? 'member' : 'admin');
  };

  const isViewingAsAdmin = isAdmin && viewMode === 'admin';

  return (
    <AuthContext.Provider value={{
      user,
      session,
      loading,
      signIn,
      signUp,
      signOut,
      isAdmin,
      viewMode,
      toggleViewMode,
      isViewingAsAdmin
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    console.error('useAuth must be used within an AuthProvider - Current location:', window.location.href);
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}