import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Mail, RefreshCw, Save } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useSystemSetting, useUpdateSystemSetting } from '@/hooks/useSystemSettings';

interface PricingRequest {
  id: string;
  organization_name: string;
  contact_name: string;
  contact_email: string;
  contact_phone: string | null;
  city: string | null;
  state: string | null;
  notes: string | null;
  status: string;
  created_at: string;
}

export function ArcticPricingRequestsPanel() {
  const [requests, setRequests] = useState<PricingRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const { data: setting } = useSystemSetting('arctic_pricing_notification_emails');
  const updateSetting = useUpdateSystemSetting();
  const [emails, setEmails] = useState('');

  useEffect(() => {
    setEmails(setting?.setting_value ?? '');
  }, [setting?.setting_value]);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('arctic_pricing_requests')
      .select('id, organization_name, contact_name, contact_email, contact_phone, city, state, notes, status, created_at')
      .order('created_at', { ascending: false });
    if (error) toast.error('Failed to load pricing requests');
    setRequests((data as PricingRequest[]) ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const toggleStatus = async (r: PricingRequest) => {
    const next = r.status === 'contacted' ? 'new' : 'contacted';
    const { error } = await supabase
      .from('arctic_pricing_requests')
      .update({ status: next })
      .eq('id', r.id);
    if (error) return toast.error('Failed to update status');
    setRequests(prev => prev.map(x => (x.id === r.id ? { ...x, status: next } : x)));
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle className="text-base flex items-center gap-2">
            <Mail className="h-4 w-4 text-primary" />
            Arctic Security Pricing Requests
            <Badge variant="secondary">{requests.length}</Badge>
          </CardTitle>
          <p className="text-sm text-muted-foreground mt-1">
            Member submissions from the "Get Full Arctic Security Pricing" form.
          </p>
        </div>
        <Button variant="outline" size="sm" className="gap-2" onClick={load} disabled={loading}>
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-lg border p-3 bg-muted/30 space-y-2">
          <Label htmlFor="arctic-pricing-emails" className="text-sm">
            Notification email addresses (comma separated)
          </Label>
          <div className="flex gap-2">
            <Input
              id="arctic-pricing-emails"
              value={emails}
              onChange={(e) => setEmails(e.target.value)}
              placeholder="info@hessconsortium.org, sales@arcticsecurity.com"
            />
            <Button
              className="gap-2"
              onClick={() => updateSetting.mutate({
                settingKey: 'arctic_pricing_notification_emails',
                settingValue: emails.trim(),
                description: 'Emails notified when a member requests Arctic Security pricing',
              }, { onSuccess: () => toast.success('Notification recipients saved') })}
            >
              <Save className="h-4 w-4" />
              Save
            </Button>
          </div>
        </div>

        {requests.length === 0 ? (
          <p className="text-sm text-muted-foreground py-6 text-center">
            No pricing requests submitted yet.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Institution</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Notes</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {requests.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="whitespace-nowrap text-sm">
                      {new Date(r.created_at).toLocaleDateString('en-US')}
                    </TableCell>
                    <TableCell className="font-medium">{r.organization_name}</TableCell>
                    <TableCell>{r.contact_name}</TableCell>
                    <TableCell className="text-sm">{r.contact_email}</TableCell>
                    <TableCell className="text-sm">{r.contact_phone || '—'}</TableCell>
                    <TableCell className="text-sm">
                      {[r.city, r.state].filter(Boolean).join(', ') || '—'}
                    </TableCell>
                    <TableCell className="text-sm max-w-[240px] truncate" title={r.notes || ''}>
                      {r.notes || '—'}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={r.status === 'contacted' ? 'default' : 'secondary'}
                        className="cursor-pointer"
                        onClick={() => toggleStatus(r)}
                      >
                        {r.status === 'contacted' ? 'Contacted' : 'New'}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
