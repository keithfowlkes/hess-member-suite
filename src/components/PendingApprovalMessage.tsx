import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { Clock, Building, Mail } from 'lucide-react';

interface PendingApprovalMessageProps {
  organizationName: string | null;
}

export function PendingApprovalMessage({ organizationName }: PendingApprovalMessageProps) {
  const { signOut } = useAuth();

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-orange-100 flex items-center justify-center">
            <Clock className="h-6 w-6 text-orange-600" />
          </div>
          <CardTitle>Pending Approval</CardTitle>
          <CardDescription>
            Your organization registration is awaiting admin approval
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {organizationName && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Building className="h-4 w-4" />
              <span>{organizationName}</span>
            </div>
          )}
          
          <div className="bg-muted/50 p-4 rounded-lg space-y-2">
            <p className="text-sm text-muted-foreground">
              <strong>What happens next?</strong>
            </p>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• An administrator will review your registration</li>
              <li>• You'll receive an email notification once approved</li>
              <li>• Access to the dashboard will be granted automatically</li>
            </ul>
          </div>
          
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Mail className="h-3 w-3" />
            <span>You'll be notified by email once your organization is approved</span>
          </div>
          
          <div className="pt-4 border-t">
            <Button 
              variant="outline" 
              onClick={signOut}
              className="w-full"
            >
              Sign Out
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}