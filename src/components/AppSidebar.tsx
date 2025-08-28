import { NavLink, useLocation } from 'react-router-dom';
import { Building2, Users, FileText, User, Settings, Home, LogOut, ToggleLeft, ToggleRight, Shield, BarChart3, Search } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useOrganizationApprovals } from '@/hooks/useOrganizationApprovals';
import { useOrganizationInvitations } from '@/hooks/useOrganizationInvitations';
import { useReassignmentRequests } from '@/hooks/useReassignmentRequests';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
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
  const { isAdmin, isViewingAsAdmin, toggleViewMode, signOut } = useAuth();
  const location = useLocation();
  
  // Fetch pending action counts for admin
  const { pendingOrganizations } = useOrganizationApprovals();
  const { invitations } = useOrganizationInvitations();
  const { data: reassignmentRequests = [] } = useReassignmentRequests();
  
  // Calculate total pending actions
  const activeInvitations = invitations?.filter(inv => !inv.used_at && new Date(inv.expires_at) > new Date()) || [];
  const totalPendingActions = (pendingOrganizations?.length || 0) + activeInvitations.length + reassignmentRequests.length;
  
  console.log('Sidebar render - isAdmin:', isAdmin, 'isViewingAsAdmin:', isViewingAsAdmin);
  
  const adminItems = [
    { title: 'Master Dashboard', url: '/dashboard', icon: Home },
    { title: 'Member Organizations', url: '/members', icon: Users },
    { title: 'Dashboards', url: '/dashboards', icon: BarChart3 },
    { title: 'Membership Fees', url: '/membership-fees', icon: Building2 },
    { title: 'Organization Profile', url: '/profile', icon: User },
    { title: 'Settings', url: '/settings', icon: Settings },
  ];

  const memberItems = [
    { title: 'Dashboard', url: '/', icon: Home },
    { title: 'HESS Member Information', url: '/research-dashboard', icon: Search },
    { title: 'My Invoices', url: '/invoices', icon: FileText },
    { title: 'Organization Profile', url: '/profile', icon: User },
  ];

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
                
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild>
                      <NavLink 
                        to={item.url} 
                        end 
                        className={({ isActive }) => getNavCls({ isActive })}
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