import { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { Building2, LogOut, User, Users, FileText, Settings } from 'lucide-react';

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const { user, signOut, loading, isAdmin } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" state={{ from: location }} replace />;
  }

  const navigation = [
    { name: 'Dashboard', href: '/', icon: Building2, show: true },
    { name: 'Member Organizations', href: '/members', icon: Users, show: isAdmin },
    { name: 'Invoices', href: '/invoices', icon: FileText, show: true },
    { name: 'Profile', href: '/profile', icon: User, show: !isAdmin },
    { name: 'Organization', href: '/organization', icon: Building2, show: !isAdmin },
    { name: 'Settings', href: '/settings', icon: Settings, show: isAdmin },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation Header */}
      <header className="bg-primary shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Building2 className="h-8 w-8 text-primary-foreground mr-3" />
              <div>
                <h1 className="text-xl font-bold text-primary-foreground">
                  HESS Consortium
                </h1>
                <p className="text-sm text-primary-foreground/80">
                  {isAdmin ? 'Admin Portal' : 'Member Portal'}
                </p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <span className="text-sm text-primary-foreground">
                Welcome back!
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={signOut}
                className="border-primary-foreground/20 text-primary-foreground hover:bg-primary-foreground/10"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar Navigation */}
        <aside className="w-64 bg-card border-r min-h-[calc(100vh-4rem)] p-4">
          <nav className="space-y-2">
            {navigation.filter(item => item.show).map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.href;
              
              return (
                <a
                  key={item.name}
                  href={item.href}
                  className={`flex items-center px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                    isActive
                      ? 'bg-accent text-accent-foreground'
                      : 'text-muted-foreground hover:text-foreground hover:bg-accent/50'
                  }`}
                >
                  <Icon className="h-5 w-5 mr-3" />
                  {item.name}
                </a>
              );
            })}
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 pt-4 px-8 pb-8">
          {children}
        </main>
      </div>
      
      {/* Footer */}
      <div className="flex flex-col items-center justify-center py-8 border-t border-border">
        <img 
          src="/lovable-uploads/95b9e225-2202-4407-bdb2-f95edf683d93.png" 
          alt="DeusLogic Logo" 
          className="h-8 w-auto mb-2 opacity-70"
        />
        <p className="text-xs text-muted-foreground">
          Copyright 2025 DeusLogic, LLC.
        </p>
        <p className="text-xs text-muted-foreground text-center mt-4 max-w-2xl px-4">
          The member information on this website portal is confidential to HESS Consortium members. This information should not be shared with outside organizations without the written permission of the members.
        </p>
      </div>
    </div>
  );
}