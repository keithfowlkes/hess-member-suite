import { NavLink, useLocation } from 'react-router-dom';
import { Building2, Users, FileText, User, Settings, Home, FormInput, Eye, LogOut, ToggleLeft, ToggleRight } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
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
  useSidebar,
} from '@/components/ui/sidebar';

export function AppSidebar() {
  const { state } = useSidebar();
  const { isAdmin, isViewingAsAdmin, toggleViewMode, signOut } = useAuth();
  const location = useLocation();
  
  const adminItems = [
    { title: 'Dashboard', url: '/', icon: Home },
    { title: 'Member Organizations', url: '/members', icon: Users },
    { title: 'Membership Fees', url: '/membership-fees', icon: Building2 },
    { title: 'Registration Forms', url: '/form-fields', icon: FormInput },
    { title: 'Invoices', url: '/invoices', icon: FileText },
    { title: 'Public Views', url: '/public-views', icon: Eye },
    { title: 'Profile', url: '/profile', icon: User },
    { title: 'Settings', url: '/settings', icon: Settings },
  ];

  const memberItems = [
    { title: 'Dashboard', url: '/', icon: Home },
    { title: 'My Invoices', url: '/invoices', icon: FileText },
    { title: 'Profile', url: '/profile', icon: User },
    { title: 'Organization', url: '/organization', icon: Building2 },
  ];

  const items = isViewingAsAdmin ? adminItems : memberItems;
  const isCollapsed = state === 'collapsed';
  
  const isActive = (path: string) => location.pathname === path;
  const getNavCls = ({ isActive }: { isActive: boolean }) =>
    isActive ? 'bg-accent text-accent-foreground font-medium' : 'hover:bg-accent/50';

  return (
    <Sidebar className={isCollapsed ? 'w-14' : 'w-60'} collapsible="icon">
      <div className="p-2">
        <SidebarTrigger />
      </div>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>{isViewingAsAdmin ? 'Admin Panel' : 'Member Portal'}</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => {
                const Icon = item.icon;
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild>
                      <NavLink 
                        to={item.url} 
                        end 
                        className={({ isActive }) => getNavCls({ isActive })}
                      >
                        <Icon className="h-4 w-4" />
                        {!isCollapsed && <span>{item.title}</span>}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      
      <SidebarFooter>
        <SidebarMenu>
          {isAdmin && (
            <SidebarMenuItem>
              <SidebarMenuButton asChild>
                <Button
                  variant="ghost"
                  onClick={toggleViewMode}
                  className="w-full justify-start text-muted-foreground hover:text-foreground"
                >
                  {isViewingAsAdmin ? 
                    <ToggleRight className="h-4 w-4" /> : 
                    <ToggleLeft className="h-4 w-4" />
                  }
                  {!isCollapsed && (
                    <span>{isViewingAsAdmin ? 'Switch to Member View' : 'Switch to Admin View'}</span>
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
                className="w-full justify-start text-muted-foreground hover:text-foreground"
              >
                <LogOut className="h-4 w-4" />
                {!isCollapsed && <span>Sign Out</span>}
              </Button>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}