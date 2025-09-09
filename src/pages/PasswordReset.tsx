import React, { useState, useEffect } from 'react';
import { useSearchParams, Navigate, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Eye, EyeOff } from 'lucide-react';

export default function PasswordReset() {
  const { user, loading } = useAuth();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isValidToken, setIsValidToken] = useState<boolean | null>(null);

  // Get token parameters from URL
  const token = searchParams.get('token');
  const type = searchParams.get('type');
  const tokenHash = searchParams.get('token_hash');

  // Verify token on component mount
  useEffect(() => {
    const verifyToken = async () => {
      console.log('🔐 Password Reset Debug Info:');
      console.log('Token from URL:', token);
      console.log('Token Hash from URL:', tokenHash);
      console.log('Type from URL:', type);
      console.log('Full URL search params:', window.location.search);
      
      if (!token || type !== 'recovery') {
        console.log('❌ Invalid token parameters');
        setIsValidToken(false);
        return;
      }

      if (!tokenHash) {
        console.log('❌ Missing token_hash parameter');
        setIsValidToken(false);
        return;
      }

      try {
        console.log('✅ Token parameters look valid, proceeding...');
        // For recovery tokens, we can proceed directly to password reset
        // The token will be validated when the password is actually updated
        setIsValidToken(true);
      } catch (error) {
        console.error('Token verification error:', error);
        setIsValidToken(false);
      }
    };

    verifyToken();
  }, [token, type, tokenHash, toast]);

  if (loading || isValidToken === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  // If token is invalid, show error page
  if (isValidToken === false) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold text-destructive">
              Invalid Reset Link
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-center">
            <p className="text-muted-foreground">
              This password reset link is invalid or has expired.
            </p>
            <a href="https://members.hessconsortium.app/auth">
              <Button className="w-full">
                Back to Sign In
              </Button>
            </a>
          </CardContent>
        </Card>
      </div>
    );
  }

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (newPassword !== confirmPassword) {
      toast({
        title: "Passwords don't match",
        description: "Please make sure both passwords are identical.",
        variant: "destructive"
      });
      return;
    }

    if (newPassword.length < 6) {
      toast({
        title: "Password too short",
        description: "Password must be at least 6 characters long.",
        variant: "destructive"
      });
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      console.log('🔄 Starting password reset process...');
      console.log('Using token_hash:', tokenHash);
      
      // For recovery tokens, use verifyOtp with the token_hash
      const { error: verifyError } = await supabase.auth.verifyOtp({
        token_hash: tokenHash!,
        type: 'recovery'
      });

      if (verifyError) {
        console.error('❌ Token verification error:', verifyError);
        toast({
          title: "Invalid or expired token",
          description: `Token verification failed: ${verifyError.message}`,
          variant: "destructive"
        });
        return;
      }

      console.log('✅ Token verified successfully, updating password...');

      // Now update the password
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });
      
      if (error) {
        console.error('❌ Password update error:', error);
        toast({
          title: "Password update failed",
          description: error.message,
          variant: "destructive"
        });
      } else {
        console.log('✅ Password updated successfully');
        toast({
          title: "Password updated successfully",
          description: "Your password has been reset. You can now sign in with your new password.",
        });
        
        // Redirect to production auth page after successful reset
        setTimeout(() => {
          window.location.href = 'https://members.hessconsortium.app/auth';
        }, 2000);
      }
    } catch (error: any) {
      console.error('❌ Password reset error:', error);
      toast({
        title: "Password update failed",
        description: error.message || "An unexpected error occurred.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center gap-4">
            <h1 className="text-2xl font-bold tracking-tight">Reset Your Password</h1>
            <img 
              src="/lovable-uploads/c2026cbe-1547-4c12-ba1e-542841a78351.png" 
              alt="HESS Consortium" 
              className="h-8 w-auto"
            />
          </div>
          <p className="text-muted-foreground">
            Enter your new password below
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-xl">New Password</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handlePasswordReset} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="newPassword">New Password</Label>
                <div className="relative">
                  <Input
                    id="newPassword"
                    type={showPassword ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter your new password"
                    required
                    disabled={isSubmitting}
                    className="pr-10"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowPassword(!showPassword)}
                    disabled={isSubmitting}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <Eye className="h-4 w-4 text-muted-foreground" />
                    )}
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm New Password</Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm your new password"
                    required
                    disabled={isSubmitting}
                    className="pr-10"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    disabled={isSubmitting}
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <Eye className="h-4 w-4 text-muted-foreground" />
                    )}
                  </Button>
                </div>
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={isSubmitting || !newPassword || !confirmPassword}
              >
                {isSubmitting ? "Updating Password..." : "Update Password"}
              </Button>
            </form>

            <div className="mt-4 text-center">
              <a href="https://members.hessconsortium.app/auth" className="text-sm text-muted-foreground hover:text-primary">
                Back to Sign In
              </a>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}