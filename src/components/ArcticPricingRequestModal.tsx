import { useEffect, useState } from 'react';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useUnifiedProfile } from '@/hooks/useUnifiedProfile';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ArcticPricingRequestModal({ open, onOpenChange }: Props) {
  const { data: profile } = useUnifiedProfile();
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    contact_name: '',
    contact_email: '',
    contact_phone: '',
    organization_name: '',
    address_line_1: '',
    address_line_2: '',
    city: '',
    state: '',
    zip_code: '',
    notes: '',
  });
  const [wantsInfo, setWantsInfo] = useState(true);

  useEffect(() => {
    if (!open || !profile) return;
    const p = profile.profile;
    const o = profile.organization;
    setForm({
      contact_name: `${p?.first_name ?? ''} ${p?.last_name ?? ''}`.trim(),
      contact_email: p?.email ?? '',
      contact_phone: p?.phone ?? o?.phone ?? '',
      organization_name: o?.name ?? p?.organization ?? '',
      address_line_1: o?.address_line_1 ?? '',
      address_line_2: o?.address_line_2 ?? '',
      city: o?.city ?? '',
      state: o?.state ?? '',
      zip_code: o?.zip_code ?? '',
      notes: '',
    });
    setWantsInfo(true);
  }, [open, profile]);

  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm(prev => ({ ...prev, [key]: e.target.value }));

  const handleSubmit = async () => {
    if (!form.contact_name.trim() || !form.organization_name.trim() || !form.contact_email.trim()) {
      toast.error('Name, institution and email are required');
      return;
    }
    if (!wantsInfo) {
      toast.error('Please check the box to request pricing information');
      return;
    }
    setSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke('submit-arctic-pricing-request', {
        body: {
          ...form,
          organization_id: profile?.organization?.id ?? null,
          wants_pricing_info: true,
        },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      toast.success('Request submitted — the HESS team will be in touch shortly.');
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e?.message || 'Failed to submit request');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Get Full Arctic Security Pricing</DialogTitle>
          <DialogDescription>
            Your contact and institution details are pre-filled. Review, adjust if needed, and submit.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="apr-name">Name</Label>
            <Input id="apr-name" value={form.contact_name} onChange={set('contact_name')} />
          </div>
          <div>
            <Label htmlFor="apr-email">Email</Label>
            <Input id="apr-email" type="email" value={form.contact_email} onChange={set('contact_email')} />
          </div>
          <div>
            <Label htmlFor="apr-phone">Phone</Label>
            <Input id="apr-phone" value={form.contact_phone} onChange={set('contact_phone')} />
          </div>
          <div>
             <Label htmlFor="apr-org">HESS Consortium Institution</Label>
            <Input id="apr-org" value={form.organization_name} onChange={set('organization_name')} />
          </div>
          <div className="md:col-span-2">
            <Label htmlFor="apr-a1">Address line 1</Label>
            <Input id="apr-a1" value={form.address_line_1} onChange={set('address_line_1')} />
          </div>
          <div className="md:col-span-2">
            <Label htmlFor="apr-a2">Address line 2</Label>
            <Input id="apr-a2" value={form.address_line_2} onChange={set('address_line_2')} />
          </div>
          <div>
            <Label htmlFor="apr-city">City</Label>
            <Input id="apr-city" value={form.city} onChange={set('city')} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="apr-state">State</Label>
              <Input id="apr-state" value={form.state} onChange={set('state')} />
            </div>
            <div>
              <Label htmlFor="apr-zip">ZIP</Label>
              <Input id="apr-zip" value={form.zip_code} onChange={set('zip_code')} />
            </div>
          </div>
          <div className="md:col-span-2">
            <Label htmlFor="apr-notes">Additional comments (optional)</Label>
            <Textarea id="apr-notes" rows={3} value={form.notes} onChange={set('notes')} maxLength={2000} />
          </div>
        </div>

        <div className="flex items-start gap-3 rounded-lg border p-3 bg-muted/30">
          <Checkbox
            id="apr-consent"
            checked={wantsInfo}
            onCheckedChange={(c) => setWantsInfo(c === true)}
            className="mt-0.5"
          />
          <Label htmlFor="apr-consent" className="text-sm font-normal cursor-pointer leading-snug">
            I would like more information on the HESS pricing for Arctic Security Services.
          </Label>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting ? 'Submitting…' : 'Submit request'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
