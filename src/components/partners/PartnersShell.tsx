import { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { SidebarProvider } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/AppSidebar';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';

interface PartnersShellProps {
  children: ReactNode;
}

/**
 * Renders the partners area inside the member portal shell when signed in,
 * and inside a light public header/footer for anonymous visitors.
 */
export function PartnersShell({ children }: PartnersShellProps) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary" />
      </div>
    );
  }

  if (user) {
    return (
      <SidebarProvider>
        <div className="min-h-screen flex w-full">
          <AppSidebar />
          <main className="min-w-0 flex-1 p-6 lg:p-8">
            <div className="container mx-auto max-w-6xl">{children}</div>
          </main>
        </div>
      </SidebarProvider>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="border-b border-border bg-card">
        <div className="container mx-auto max-w-6xl flex items-center justify-between px-4 py-4">
          <Link to="/partners" className="flex items-center gap-3">
            <img
              src="/lovable-uploads/06437c29-40c8-489a-b779-616d8fc6ab04.png"
              alt="HESS Consortium"
              className="h-10 w-auto object-contain"
            />
          </Link>
          <Button asChild variant="outline" size="sm">
            <Link to="/auth">Member sign in</Link>
          </Button>
        </div>
      </header>

      <main className="flex-1">
        <div className="container mx-auto max-w-6xl px-4 py-8">{children}</div>
      </main>

      <footer className="border-t border-border py-6">
        <p className="text-center text-xs text-muted-foreground">
          Copyright {new Date().getFullYear()} HESS Consortium. Business partner listings are provided for
          informational purposes.
        </p>
      </footer>
    </div>
  );
}
