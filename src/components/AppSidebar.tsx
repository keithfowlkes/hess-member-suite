import { NavLink, useLocation } from 'react-router-dom';
import { Building2, Users, FileText, User, Settings, Home, Upload } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
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
  useSidebar,
} from '@/components/ui/sidebar';

export function AppSidebar() {
  const { state } = useSidebar();
  const { isAdmin } = useAuth();
  const location = useLocation();
  
  const adminItems = [
    { title: 'Dashboard', url: '/', icon: Home },
    { title: 'Member Organizations', url: '/members', icon: Users },
    { title: 'Import Members', url: '/import-members', icon: Upload },
    { title: 'Invoices', url: '/invoices', icon: FileText },
    { title: 'Settings', url: '/settings', icon: Settings },
  ];

  const memberItems = [
    { title: 'Dashboard', url: '/', icon: Home },
    { title: 'My Invoices', url: '/invoices', icon: FileText },
    { title: 'Profile', url: '/profile', icon: User },
    { title: 'Organization', url: '/organization', icon: Building2 },
  ];

  const items = isAdmin ? adminItems : memberItems;
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
          <SidebarGroupLabel>{isAdmin ? 'Admin Panel' : 'Member Portal'}</SidebarGroupLabel>
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
    </Sidebar>
  );
}