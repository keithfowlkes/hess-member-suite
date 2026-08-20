import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, UserPlus } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface InvitationAcceptCardProps {
  token: string;
}

interface InvitationInfo {
  email: string;
  firstName: string;
  lastName: string;
  organizationName: string;
}

async function callAccept(payload: Record<string, unknown>) {
  const { data, error } = await supabase.functions.invoke('accept-organization-invitation', { body: payload });
  if (error) {
    let details = error.message;
    try {
      const ctx = (error as any)?.context;
      if (ctx?.text) details = await ctx.text();
    } catch {
      /* ignore */
    }
    try {
      details = JSON.parse(details)?.error || details;
    } catch {
      /* ignore */
    }
    throw new Error(details || 'Request failed');
  }
  if ((data as any)?.error) throw new Error((data as any).error);
  return data as any;
}

export function InvitationAcceptCard({ token }: InvitationAcceptCardProps) {
  const [info, setInfo] = useState<InvitationInfo | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const result = await callAccept({ action: 'lookup', token });
        if (!cancelled) setInfo(result.invitation);
      } catch (error: any) {
        if (!cancelled) setLoadError(error.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!info) return;
    if (password.length < 8) {
      toast({ title: 'Password too short', description: 'Use at least 8 characters.', variant: 'destructive' });
      return;
    }
    if (password !== confirmPassword) {
      toast({ title: 'Passwords do not match', variant: 'destructive' });
      return;
    }

    setSubmitting(true);
    try {
      await callAccept({ action: 'accept', token, password });
      const { error: signInError } = await supabase.auth.signInWithPassword({ email: info.email, password });
      if (signInError) throw signInError;
      toast({ title: 'Welcome to the HESS Member Portal', description: `Your account for ${info.organizationName} is ready.` });
      window.location.href = '/';
    } catch (error: any) {
      toast({ title: 'Could not create your account', description: error.message, variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="p-4 pt-8">
        <div className="w-full max-w-lg mx-auto bg-auth-form rounded-lg shadow-sm p-8">
          <div className="border-b border-gray-200 pb-4 mb-6 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-gray-800 flex items-center gap-2">
                <UserPlus className="h-5 w-5" />
                Create Your Account
              </h2>
              {info && <p className="text-gray-600 mt-1">{info.organizationName}</p>}
            </div>
            <img src="/lovable-uploads/c2026cbe-1547-4c12-ba1e-542841a78351.png" alt="HESS Consortium" className="h-14 w-auto" />
          </div>

          {loading ? (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Checking your invitation...
            </div>
          ) : loadError ? (
            <div className="space-y-4">
              <Alert variant="destructive">
                <AlertDescription>{loadError}</AlertDescription>
              </Alert>
              <Button variant="outline" className="w-full" onClick={() => (window.location.href = '/auth')}>
                Go to Sign In
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <Label>Name</Label>
                <Input value={`${info?.firstName ?? ''} ${info?.lastName ?? ''}`.trim()} disabled />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input value={info?.email ?? ''} disabled />
              </div>
              <div className="space-y-2">
                <Label htmlFor="invite-password">Create a password</Label>
                <Input
                  id="invite-password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 8 characters"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="invite-confirm">Confirm password</Label>
                <Input
                  id="invite-confirm"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                />
              </div>
              <Button type="submit" className="w-full" disabled={submitting}>
                {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Create Account &amp; Sign In
              </Button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
