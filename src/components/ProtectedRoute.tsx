import { Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useOrganizationStatus } from '@/hooks/useOrganizationStatus';
import { PendingApprovalMessage } from './PendingApprovalMessage';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { user, loading, isAdmin } = useAuth();
  const { data: orgStatus, isLoading: orgLoading } = useOrganizationStatus();

  if (loading || orgLoading) {
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