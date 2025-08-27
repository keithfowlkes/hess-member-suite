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
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!mounted) return;
        
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
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
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { error };
  };

  const signUp = async (email: string, password: string, userData: any) => {
    const redirectUrl = `${window.location.origin}/`;
    
    const { error } = await supabase.auth.signUp({
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
          other_software_comments: userData.otherSoftwareComments
        }
      }
    });
    return { error };
  };

  const signOut = async () => {
    console.log('Sign out clicked');
    try {
      // Sign out from Supabase first - this will trigger the auth state change
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error('Sign out error:', error);
        // Still clear local state on error to ensure user is logged out
        setUser(null);
        setSession(null);
        setIsAdmin(false);
        setViewMode('admin');
      } else {
        console.log('Sign out successful');
      }
      
      // Navigate to auth page after sign out
      window.location.href = '/auth';
    } catch (err) {
      console.error('Sign out exception:', err);
      // Clear local state as fallback
      setUser(null);
      setSession(null);
      setIsAdmin(false);
      setViewMode('admin');
      // Still redirect to auth page
      window.location.href = '/auth';
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
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}