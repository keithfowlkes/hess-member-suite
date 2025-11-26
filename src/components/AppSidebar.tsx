import { NavLink, useLocation } from 'react-router-dom';
import { Building2, Users, FileText, User, Settings, Home, LogOut, ToggleLeft, ToggleRight, Shield, BarChart3, Search, Map, MessageSquare, GraduationCap, FileQuestion } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useSystemSettings } from '@/hooks/useSystemSettings';
import { supabase } from '@/integrations/supabase/client';
import { useOrganizationApprovals } from '@/hooks/useOrganizationApprovals';
import { useOrganizationInvitations } from '@/hooks/useOrganizationInvitations';
import { useReassignmentRequests } from '@/hooks/useReassignmentRequests';
import { useOrganizationProfileEditRequests } from '@/hooks/useOrganizationProfileEditRequests';
import { usePendingRegistrations } from '@/hooks/usePendingRegistrations';
import { useMemberRegistrationUpdates } from '@/hooks/useMemberRegistrationUpdates';
import { useUnreadMessageCount } from '@/hooks/useUserMessages';
import { useSurveys } from '@/hooks/useSurveys';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useState, useEffect } from 'react';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarTrigger,
  SidebarFooter,
  SidebarHeader,
  useSidebar,
} from '@/components/ui/sidebar';

export function AppSidebar() {
  const { state } = useSidebar();
  const { isAdmin, isViewingAsAdmin, toggleViewMode, signOut, user } = useAuth();
  const { data: systemSettings } = useSystemSettings();
  const location = useLocation();
  
  // State for user role
  const [userRole, setUserRole] = useState<string>('member');

  // Fetch user role
  useEffect(() => {
    const fetchUserRole = async () => {
      if (!user) {
        console.log('AppSidebar: No user found, defaulting to member role');
        return;
      }
      
      try {
        const { data: roleData, error } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id);
          
        console.log('AppSidebar: User roles fetched:', roleData, 'for user:', user.email);
        
        if (error) {
          console.error('AppSidebar: Error fetching user roles:', error);
          return;
        }
        
        if (roleData && roleData.length > 0) {
          // Check if user has admin role first, then cohort_leader, then default to member
          const roles = roleData.map(r => r.role);
          console.log('AppSidebar: Extracted roles array:', roles);
          
          if (roles.includes('admin')) {
            console.log('AppSidebar: Setting userRole to admin');
            setUserRole('admin');
          } else if (roles.includes('cohort_leader')) {
            console.log('AppSidebar: Setting userRole to cohort_leader');
            setUserRole('cohort_leader');
          } else {
            console.log('AppSidebar: No admin or cohort_leader role found, defaulting to member');
            setUserRole('member');
          }
        } else {
          console.log('AppSidebar: No roles found in database, defaulting to member');
          setUserRole('member');
        }
      } catch (error) {
        console.error('AppSidebar: Error fetching user role:', error);
        setUserRole('member');
      }
    };
    
    fetchUserRole();
  }, [user]);
  
  // Check if user can access cohort information
  const canAccessCohortInfo = userRole === 'admin' || userRole === 'cohort_leader';
  
  // Check if member fee information should be shown in member view (controls both blocks and menu)
  const showMemberFeeInfo = systemSettings?.find(s => s.setting_key === 'show_member_view_items')?.setting_value === 'true';
  
  console.log('AppSidebar: RENDER - userRole:', userRole, 'canAccessCohortInfo:', canAccessCohortInfo);
  console.log('AppSidebar: RENDER - current user:', user?.email, 'isViewingAsAdmin:', isViewingAsAdmin);
  console.log('AppSidebar: RENDER - will show cohort menu?', !isViewingAsAdmin && canAccessCohortInfo);
  
  // Fetch pending action counts for admin
  const { pendingOrganizations } = useOrganizationApprovals();
  const { invitations } = useOrganizationInvitations();
  const { data: memberInfoUpdateRequests = [] } = useReassignmentRequests();
  const { requests: profileEditRequests = [] } = useOrganizationProfileEditRequests();
  const { pendingRegistrations } = usePendingRegistrations();
  const { registrationUpdates } = useMemberRegistrationUpdates();
  const { data: unreadMessageCount = 0 } = useUnreadMessageCount();
  
  // Fetch surveys and user's responses to calculate unanswered surveys count
  const { data: surveys = [] } = useSurveys();
  const [unansweredSurveysCount, setUnansweredSurveysCount] = useState(0);
  
  // Calculate unanswered surveys count for members
  useEffect(() => {
    const fetchUnansweredCount = async () => {
      if (!user || isViewingAsAdmin) {
        setUnansweredSurveysCount(0);
        return;
      }
      
      try {
        const activeSurveys = surveys.filter(s => s.is_active);
        
        if (activeSurveys.length === 0) {
          setUnansweredSurveysCount(0);
          return;
        }
        
        const { data: responses, error } = await supabase
          .from('survey_responses')
          .select('survey_id')
          .eq('user_id', user.id);
        
        if (error) {
          console.error('Error fetching survey responses:', error);
          return;
        }
        
        const answeredSurveyIds = new Set(responses?.map(r => r.survey_id) || []);
        const unansweredCount = activeSurveys.filter(s => !answeredSurveyIds.has(s.id)).length;
        
        setUnansweredSurveysCount(unansweredCount);
      } catch (error) {
        console.error('Error calculating unanswered surveys:', error);
      }
    };
    
    fetchUnansweredCount();
  }, [user, surveys, isViewingAsAdmin]);
  
  // Calculate total pending actions including all types of pending requests
  const activeInvitations = invitations?.filter(inv => !inv.used_at && new Date(inv.expires_at) > new Date()) || [];
  const pendingRegistrationUpdatesCount = registrationUpdates?.filter(r => r.status === 'pending').length || 0;
  const totalPendingActions = (pendingOrganizations?.length || 0) + 
                             activeInvitations.length + 
                             memberInfoUpdateRequests.length + 
                             profileEditRequests.length +
                             (pendingRegistrations?.length || 0) +
                             pendingRegistrationUpdatesCount;
  
  console.log('Sidebar render - isAdmin:', isAdmin, 'isViewingAsAdmin:', isViewingAsAdmin);
  
  const adminItems = [
    { title: 'Master Dashboard', url: '/dashboard', icon: Home },
    { title: 'Member Organizations', url: '/members', icon: Users },
    { title: 'User Messages', url: '/user-messages', icon: MessageSquare, badge: unreadMessageCount },
    { title: 'Cohort Information', url: '/cohort-information', icon: GraduationCap },
    { title: 'Member Analytics', url: '/dashboards', icon: BarChart3 },
    { title: 'Surveys', url: '/admin/surveys', icon: FileQuestion },
    { title: 'Membership Fees', url: '/membership-fees', icon: Building2 },
    { title: 'Organization Profile', url: '/profile', icon: User },
    { title: 'Settings', url: '/settings', icon: Settings },
  ];

  const memberItems = [
    { title: 'Dashboard', url: '/', icon: Home },
    { title: 'HESS Member Information', url: '/research-dashboard', icon: Search },
    { title: 'Member Analytics', url: '/member-analytics', icon: BarChart3 },
    { title: 'Member Map', url: '/public-map', icon: Map },
    { title: 'Surveys', url: '/surveys', icon: FileQuestion },
  ];

  // Add conditional menu items
  if (showMemberFeeInfo) {
    memberItems.push({ title: 'My Invoices', url: '/invoices', icon: FileText });
  }
  
  memberItems.push({ title: 'Organization Profile', url: '/profile', icon: User });
  
  // Add cohort information for cohort leaders and admins viewing as members
  if (!isViewingAsAdmin && canAccessCohortInfo) {
    console.log('✅ AppSidebar: Adding "Your Cohort Information" menu item for user with role:', userRole);
    memberItems.push({ title: 'Your Cohort Information', url: '/cohort-information', icon: GraduationCap });
  } else {
    console.log('❌ AppSidebar: NOT adding cohort menu. isViewingAsAdmin:', isViewingAsAdmin, 'canAccessCohortInfo:', canAccessCohortInfo, 'userRole:', userRole);
  }

  const items = isViewingAsAdmin ? adminItems : memberItems;
  const isCollapsed = state === 'collapsed';
  
  const isActive = (path: string) => location.pathname === path;
  const getNavCls = ({ isActive }: { isActive: boolean }) =>
    isActive ? 'bg-accent text-accent-foreground font-medium' : 'hover:bg-accent/50';

  return (
    <Sidebar className={cn(
      "flex flex-col h-full",
      isCollapsed ? 'w-14' : 'w-60'
    )} collapsible="icon">
      <SidebarHeader className="border-b border-sidebar-border">
        <div className="flex items-center justify-between p-4">
          <div className={cn("flex items-center transition-all duration-300", isCollapsed ? "justify-center" : "")}>
            <img 
              src="/lovable-uploads/06437c29-40c8-489a-b779-616d8fc6ab04.png" 
              alt="HESS Consortium Logo" 
              className={cn(
                "object-contain transition-all duration-300 animate-fade-in",
                isCollapsed ? "h-8 w-8" : "h-12 w-auto max-w-[180px]"
              )}
            />
          </div>
          <SidebarTrigger className="ml-auto" />
        </div>
      </SidebarHeader>

      <SidebarContent className="flex-1">
        <SidebarGroup>
          <div className="flex items-center justify-between px-3 py-2">
            <SidebarGroupLabel>{isViewingAsAdmin ? 'Admin Panel' : 'Member Portal'}</SidebarGroupLabel>
          </div>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => {
                const Icon = item.icon;
                const showMasterDashboardBadge = isViewingAsAdmin && item.title === 'Master Dashboard' && totalPendingActions > 0;
                const showUserMessagesBadge = isViewingAsAdmin && item.title === 'User Messages' && (item as any).badge > 0;
                const showSurveysBadge = !isViewingAsAdmin && item.title === 'Surveys' && unansweredSurveysCount > 0;
                
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild>
                       <NavLink 
                         to={item.url} 
                         end 
                         className={({ isActive }) => getNavCls({ isActive })}
                         onClick={() => console.log('Navigating to:', item.url)}
                       >
                        <Icon className="h-4 w-4" />
                        {!isCollapsed && (
                          <div className="flex items-center justify-between w-full">
                            <span>{item.title}</span>
                            {showMasterDashboardBadge && (
                              <Badge 
                                variant="destructive" 
                                className="h-4 w-4 p-0 flex items-center justify-center text-xs ml-auto"
                              >
                                {totalPendingActions}
                              </Badge>
                            )}
                            {showUserMessagesBadge && (
                              <Badge 
                                variant="destructive" 
                                className="h-4 w-4 p-0 flex items-center justify-center text-xs ml-auto"
                              >
                                {(item as any).badge}
                              </Badge>
                            )}
                            {showSurveysBadge && (
                              <Badge 
                                variant="destructive" 
                                className="h-4 w-4 p-0 flex items-center justify-center text-xs ml-auto"
                              >
                                {unansweredSurveysCount}
                              </Badge>
                            )}
                          </div>
                        )}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      
      <SidebarFooter className="mt-auto border-t">
        <SidebarMenu>
          {isAdmin && (
            <>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <Button
                    variant="ghost"
                    onClick={toggleViewMode}
                    className="w-full justify-start text-muted-foreground hover:text-foreground hover:bg-accent"
                  >
                    {isViewingAsAdmin ? 
                      <ToggleRight className="h-4 w-4 text-green-500" /> : 
                      <ToggleLeft className="h-4 w-4 text-blue-500" />
                    }
                    {!isCollapsed && (
                      <span className="ml-2">{isViewingAsAdmin ? 'Switch to Member View' : 'Switch to Admin View'}</span>
                    )}
                  </Button>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </>
          )}
          <SidebarMenuItem>
            <SidebarMenuButton asChild>
              <Button
                variant="ghost"
                onClick={signOut}
                className="w-full justify-start text-muted-foreground hover:text-foreground hover:bg-accent"
              >
                <LogOut className="h-4 w-4" />
                {!isCollapsed && <span className="ml-2">Sign Out</span>}
              </Button>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}