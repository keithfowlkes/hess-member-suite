import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { UserPlus, Loader2 } from 'lucide-react';

interface AddExternalUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUserCreated: () => void;
}

export function AddExternalUserDialog({ open, onOpenChange, onUserCreated }: AddExternalUserDialogProps) {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    role: 'member' as 'admin' | 'member',
    password: ''
  });
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.firstName || !formData.lastName || !formData.email || !formData.password) {
      toast({ title: 'Missing Information', description: 'Please fill in all required fields.', variant: 'destructive' });
      return;
    }

    setLoading(true);

    try {
      // 1) Compute next Administrator #N organization name (admin can read all orgs)
      const { data: orgs, error: orgErr } = await supabase
        .from('organizations')
        .select('name')
        .ilike('name', 'Administrator%');
      if (orgErr) throw orgErr;

      let nextIndex = 1;
      let hasBase = false;
      for (const o of orgs || []) {
        if (o.name === 'Administrator') { hasBase = true; nextIndex = Math.max(nextIndex, 2); }
        else {
          const m = o.name.match(/^Administrator\s*#(\d+)$/i);
          if (m) { const n = parseInt(m[1], 10); if (!isNaN(n)) nextIndex = Math.max(nextIndex, n + 1); }
        }
      }
      const adminOrgName = hasBase ? `Administrator #${nextIndex}` : 'Administrator';

      // 2) Create a pending registration using provided fields
      const { data: pending, error: insertErr } = await supabase
        .from('pending_registrations')
        .insert({
          email: formData.email,
          password_hash: formData.password, // stored as plaintext by convention in this table
          first_name: formData.firstName,
          last_name: formData.lastName,
          organization_name: adminOrgName,
          approval_status: 'pending',
          priority_level: 'normal'
        })
        .select('id')
        .single();
      if (insertErr) throw insertErr;

      // 3) Approve it via existing approval flow (same as new registrations)
      const { data: sessionRes } = await supabase.auth.getSession();
      const adminUserId = sessionRes?.session?.user?.id;
      if (!adminUserId) throw new Error('Missing admin session');

      const { error: approveErr } = await supabase.functions.invoke('approve-pending-registration', {
        body: { registrationId: pending.id, adminUserId }
      });
      if (approveErr) {
        // Fallback to direct functions URL
        const url = `https://tyovnvuluyosjnabrzjc.functions.supabase.co/approve-pending-registration`;
        const { data: sess } = await supabase.auth.getSession();
        const accessToken = sess?.session?.access_token;
        const anonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR5b3ZudnVsdXlvc2puYWJyempjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYyMjE0MzIsImV4cCI6MjA3MTc5NzQzMn0.G3HlqGeyLS_39jxbrKtttcsE93A9WvFSEByJow--470';
        const res = await fetch(url, {
          method: 'POST',
          mode: 'cors',
          headers: {
            'Content-Type': 'application/json',
            'apikey': anonKey,
            ...(accessToken ? { 'Authorization': `Bearer ${accessToken}` } : {})
          },
          body: JSON.stringify({ registrationId: pending.id, adminUserId })
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({} as any));
          throw new Error(err?.error || `HTTP ${res.status}`);
        }
      }

      // 4) Apply selected role (with better error handling)
      try {
        // Wait a moment for profile to be created by trigger
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        const { data: prof, error: profErr } = await supabase
          .from('profiles')
          .select('user_id')
          .eq('email', formData.email)
          .maybeSingle();
        
        if (profErr) {
          console.warn('Profile lookup failed (non-critical):', profErr);
        } else if (prof?.user_id) {
          // Clear any existing roles and set the new one
          await supabase.from('user_roles').delete().eq('user_id', prof.user_id);
          const { error: roleErr } = await supabase.from('user_roles').insert({ user_id: prof.user_id, role: formData.role });
          if (roleErr) {
            console.warn('Role assignment failed (non-critical):', roleErr);
          } else {
            console.log('Role assigned successfully');
          }
        }
      } catch (roleError) {
        console.warn('Role assignment error (non-critical):', roleError);
      }

      toast({ title: 'External User Created', description: `Created external user under ${adminOrgName}` });

      // Reset
      setFormData({ firstName: '', lastName: '', email: '', role: 'member', password: '' });
      onUserCreated();
      onOpenChange(false);
    } catch (error: any) {
      console.error('External user creation via registration flow failed:', error);
      toast({ title: 'Creation Failed', description: error.message || 'Failed to create external user.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const generatePassword = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789@#$%';
    let password = '';
    for (let i = 0; i < 12; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setFormData(prev => ({ ...prev, password }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Add External User
          </DialogTitle>
          <DialogDescription>
            Create a new external user account tied to the administrator organization. 
            These users won't appear in Member Organizations listings.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="firstName">First Name *</Label>
              <Input
                id="firstName"
                value={formData.firstName}
                onChange={(e) => setFormData(prev => ({ ...prev, firstName: e.target.value }))}
                placeholder="John"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastName">Last Name *</Label>
              <Input
                id="lastName"
                value={formData.lastName}
                onChange={(e) => setFormData(prev => ({ ...prev, lastName: e.target.value }))}
                placeholder="Doe"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email Address *</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
              placeholder="john.doe@example.com"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="role">User Role</Label>
            <Select value={formData.role} onValueChange={(value: 'admin' | 'member') => setFormData(prev => ({ ...prev, role: value }))}>
              <SelectTrigger>
                <SelectValue placeholder="Select role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="member">Member</SelectItem>
                <SelectItem value="admin">Administrator</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="password">Password *</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={generatePassword}
                className="h-8 text-xs"
              >
                Generate
              </Button>
            </div>
            <Input
              id="password"
              type="password"
              value={formData.password}
              onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
              placeholder="Enter password"
              required
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create User
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}