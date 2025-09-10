import { Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useOrganizationStatus } from '@/hooks/useOrganizationStatus';
import { PendingApprovalMessage } from './PendingApprovalMessage';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { user, loading, isAdmin } = useAuth();
  const { data: orgStatus, isLoading: orgLoading, error: orgError } = useOrganizationStatus();

  // If organization status fails to load after multiple attempts, allow access
  // This prevents the app from being completely blocked by database issues
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  // Allow admins to access regardless of organization status
  if (isAdmin) {
    return <>{children}</>;
  }

  // If org loading is taking too long or failed, show a fallback to prevent blocking
  if (orgLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading organization status...</p>
        </div>
      </div>
    );
  }

  // If there's an error loading org status, allow access but log the error
  if (orgError) {
    console.error('Organization status error:', orgError);
    return <>{children}</>; // Allow access if we can't check status
  }

  // Check if user's organization is approved
  if (orgStatus?.hasOrganization && orgStatus.membershipStatus === 'pending') {
    return <PendingApprovalMessage organizationName={orgStatus.organizationName} />;
  }

  // If organization is cancelled, redirect to auth with message
  if (orgStatus?.membershipStatus === 'cancelled') {
    return <Navigate to="/auth" replace />;
  }

  return <>{children}</>;
}