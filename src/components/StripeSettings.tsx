import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { CreditCard, KeyRound, Save, Webhook, ShieldCheck, ExternalLink, Loader2, Info } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useQuery, useQueryClient } from '@tanstack/react-query';

/**
 * Stripe payments settings UI scaffold.
 *
 * Non-secret configuration is stored in the existing `system_settings` table
 * under keys prefixed with `stripe_`. Secret values (Stripe Secret Key,
 * Webhook Signing Secret) must be added separately as Supabase Edge Function
 * secrets — they are never persisted to the database.
 */

const SETTINGS_PREFIX = 'stripe_';

type StripeMode = 'test' | 'live';

interface StripeSettingsForm {
  enabled: boolean;
  mode: StripeMode;
  publishable_key_test: string;
  publishable_key_live: string;
  secret_key_test: string;
  secret_key_live: string;
  webhook_secret_test: string;
  webhook_secret_live: string;
  account_id: string;
  default_currency: string;
  statement_descriptor: string;
  receipt_email_from: string;
  success_url: string;
  cancel_url: string;
  allow_card: boolean;
  allow_ach: boolean;
  allow_apple_google_pay: boolean;
  auto_mark_invoice_paid: boolean;
  send_receipt_email: boolean;
  webhook_endpoint_url: string;
  notes: string;
}

const DEFAULTS: StripeSettingsForm = {
  enabled: false,
  mode: 'test',
  publishable_key_test: '',
  publishable_key_live: '',
  secret_key_test: '',
  secret_key_live: '',
  webhook_secret_test: '',
  webhook_secret_live: '',
  account_id: '',
  default_currency: 'usd',
  statement_descriptor: '',
  receipt_email_from: '',
  success_url: '',
  cancel_url: '',
  allow_card: true,
  allow_ach: false,
  allow_apple_google_pay: false,
  auto_mark_invoice_paid: true,
  send_receipt_email: true,
  webhook_endpoint_url: '',
  notes: '',
};

const KEYS = Object.keys(DEFAULTS) as (keyof StripeSettingsForm)[];

const SUPABASE_SECRETS_URL =
  'https://supabase.com/dashboard/project/tyovnvuluyosjnabrzjc/settings/functions';

export function StripeSettings() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [form, setForm] = useState<StripeSettingsForm>(DEFAULTS);
  const [saving, setSaving] = useState(false);

  const { data: rawSettings, isLoading } = useQuery({
    queryKey: ['system-settings', 'stripe'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('system_settings')
        .select('setting_key, setting_value')
        .like('setting_key', `${SETTINGS_PREFIX}%`);
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    if (!rawSettings) return;
    const next: StripeSettingsForm = { ...DEFAULTS };
    for (const row of rawSettings) {
      const key = row.setting_key.replace(SETTINGS_PREFIX, '') as keyof StripeSettingsForm;
      if (!(key in DEFAULTS)) continue;
      const defaultVal = DEFAULTS[key];
      if (typeof defaultVal === 'boolean') {
        (next as any)[key] = row.setting_value === 'true';
      } else {
        (next as any)[key] = row.setting_value ?? '';
      }
    }
    setForm(next);
  }, [rawSettings]);

  const update = <K extends keyof StripeSettingsForm>(key: K, value: StripeSettingsForm[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const rows = KEYS.map((key) => ({
        setting_key: `${SETTINGS_PREFIX}${key}`,
        setting_value:
          typeof form[key] === 'boolean' ? String(form[key]) : (form[key] as string) ?? '',
        description: `Stripe payments setting: ${key}`,
      }));

      const { error } = await supabase
        .from('system_settings')
        .upsert(rows, { onConflict: 'setting_key' });

      if (error) throw error;

      toast({
        title: 'Stripe settings saved',
        description: 'Configuration has been stored. Secret values must still be set in Supabase.',
      });
      queryClient.invalidateQueries({ queryKey: ['system-settings'] });
      queryClient.invalidateQueries({ queryKey: ['system-settings', 'stripe'] });
    } catch (err: any) {
      toast({
        title: 'Failed to save Stripe settings',
        description: err.message ?? 'Unknown error',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin mr-2" />
        Loading Stripe settings…
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Master toggle + mode */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            General
          </CardTitle>
          <CardDescription>
            Enable Stripe payments and choose between test and live mode.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between rounded-lg border p-4">
            <div className="space-y-0.5">
              <Label className="text-base">Enable online payments</Label>
              <p className="text-sm text-muted-foreground">
                Master switch — when off, members will not see Pay-with-Stripe options.
              </p>
            </div>
            <Switch
              checked={form.enabled}
              onCheckedChange={(v) => update('enabled', v)}
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="stripe-mode">Mode</Label>
              <Select value={form.mode} onValueChange={(v) => update('mode', v as StripeMode)}>
                <SelectTrigger id="stripe-mode">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="test">Test (sandbox)</SelectItem>
                  <SelectItem value="live">Live (production)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="stripe-account">Stripe account ID (optional)</Label>
              <Input
                id="stripe-account"
                placeholder="acct_..."
                value={form.account_id}
                onChange={(e) => update('account_id', e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* API keys */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <KeyRound className="h-5 w-5" />
            API Keys
          </CardTitle>
          <CardDescription>
            Publishable keys are safe to store here. Secret keys must be added as Supabase secrets.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="pk-test">Publishable key (test)</Label>
              <Input
                id="pk-test"
                placeholder="pk_test_..."
                value={form.publishable_key_test}
                onChange={(e) => update('publishable_key_test', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pk-live">Publishable key (live)</Label>
              <Input
                id="pk-live"
                placeholder="pk_live_..."
                value={form.publishable_key_live}
                onChange={(e) => update('publishable_key_live', e.target.value)}
              />
            </div>
          </div>

          <Separator />

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="sk-test">Secret key (test)</Label>
              <Input
                id="sk-test"
                type="password"
                autoComplete="off"
                placeholder="sk_test_..."
                value={form.secret_key_test}
                onChange={(e) => update('secret_key_test', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sk-live">Secret key (live)</Label>
              <Input
                id="sk-live"
                type="password"
                autoComplete="off"
                placeholder="sk_live_..."
                value={form.secret_key_live}
                onChange={(e) => update('secret_key_live', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="whsec-test">Webhook signing secret (test)</Label>
              <Input
                id="whsec-test"
                type="password"
                autoComplete="off"
                placeholder="whsec_..."
                value={form.webhook_secret_test}
                onChange={(e) => update('webhook_secret_test', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="whsec-live">Webhook signing secret (live)</Label>
              <Input
                id="whsec-live"
                type="password"
                autoComplete="off"
                placeholder="whsec_..."
                value={form.webhook_secret_live}
                onChange={(e) => update('webhook_secret_live', e.target.value)}
              />
            </div>
          </div>

          <Alert>
            <ShieldCheck className="h-4 w-4" />
            <AlertTitle>Where to find these</AlertTitle>
            <AlertDescription className="space-y-1 text-sm">
              <p>
                Secret keys: Stripe Dashboard → Developers → API keys. Webhook signing secrets:
                Stripe Dashboard → Developers → Webhooks → your endpoint.
              </p>
              <p>
                Values are stored encrypted at rest and only read by the payment edge functions —
                they are never exposed to the browser.
              </p>
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      {/* Checkout / payment options */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Checkout Options
          </CardTitle>
          <CardDescription>
            Configure currency, accepted methods, and the URLs Stripe should redirect to.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="currency">Default currency</Label>
              <Select
                value={form.default_currency}
                onValueChange={(v) => update('default_currency', v)}
              >
                <SelectTrigger id="currency">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="usd">USD — US Dollar</SelectItem>
                  <SelectItem value="cad">CAD — Canadian Dollar</SelectItem>
                  <SelectItem value="eur">EUR — Euro</SelectItem>
                  <SelectItem value="gbp">GBP — British Pound</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="descriptor">Statement descriptor</Label>
              <Input
                id="descriptor"
                maxLength={22}
                placeholder="HESS CONSORTIUM DUES"
                value={form.statement_descriptor}
                onChange={(e) => update('statement_descriptor', e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Up to 22 characters shown on the cardholder's statement.
              </p>
            </div>
          </div>

          <Separator />

          <div className="space-y-3">
            <Label className="text-base">Accepted payment methods</Label>
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <p className="font-medium">Cards</p>
                <p className="text-sm text-muted-foreground">Visa, Mastercard, Amex, etc.</p>
              </div>
              <Switch checked={form.allow_card} onCheckedChange={(v) => update('allow_card', v)} />
            </div>
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <p className="font-medium">ACH / US bank transfer</p>
                <p className="text-sm text-muted-foreground">Lower fees, slower settlement.</p>
              </div>
              <Switch checked={form.allow_ach} onCheckedChange={(v) => update('allow_ach', v)} />
            </div>
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <p className="font-medium">Apple Pay / Google Pay</p>
                <p className="text-sm text-muted-foreground">Mobile wallets at checkout.</p>
              </div>
              <Switch
                checked={form.allow_apple_google_pay}
                onCheckedChange={(v) => update('allow_apple_google_pay', v)}
              />
            </div>
          </div>

          <Separator />

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="success-url">Success redirect URL</Label>
              <Input
                id="success-url"
                placeholder="https://members.hessconsortium.app/payment/success"
                value={form.success_url}
                onChange={(e) => update('success_url', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cancel-url">Cancel redirect URL</Label>
              <Input
                id="cancel-url"
                placeholder="https://members.hessconsortium.app/payment/cancelled"
                value={form.cancel_url}
                onChange={(e) => update('cancel_url', e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Receipts + behavior */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Info className="h-5 w-5" />
            Behavior
          </CardTitle>
          <CardDescription>
            How successful payments should affect invoices and notifications.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="receipt-from">Receipt sender email</Label>
            <Input
              id="receipt-from"
              type="email"
              placeholder="billing@hessconsortium.org"
              value={form.receipt_email_from}
              onChange={(e) => update('receipt_email_from', e.target.value)}
            />
          </div>

          <div className="flex items-center justify-between rounded-lg border p-3">
            <div>
              <p className="font-medium">Send Stripe receipt to payer</p>
              <p className="text-sm text-muted-foreground">
                Stripe will email a receipt to the paying contact on success.
              </p>
            </div>
            <Switch
              checked={form.send_receipt_email}
              onCheckedChange={(v) => update('send_receipt_email', v)}
            />
          </div>

          <div className="flex items-center justify-between rounded-lg border p-3">
            <div>
              <p className="font-medium">Auto-mark invoice as paid</p>
              <p className="text-sm text-muted-foreground">
                On a successful payment webhook, set the matched invoice to paid automatically.
              </p>
            </div>
            <Switch
              checked={form.auto_mark_invoice_paid}
              onCheckedChange={(v) => update('auto_mark_invoice_paid', v)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Webhooks */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Webhook className="h-5 w-5" />
            Webhooks
          </CardTitle>
          <CardDescription>
            Stripe will POST payment events to this endpoint. The signing secret lives in Supabase.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="webhook-url">Webhook endpoint URL</Label>
            <Input
              id="webhook-url"
              placeholder="https://tyovnvuluyosjnabrzjc.supabase.co/functions/v1/stripe-webhook"
              value={form.webhook_endpoint_url}
              onChange={(e) => update('webhook_endpoint_url', e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Paste this URL into the Stripe Dashboard → Developers → Webhooks.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Notes */}
      <Card>
        <CardHeader>
          <CardTitle>Internal Notes</CardTitle>
          <CardDescription>Reference notes for admins (not shown to members).</CardDescription>
        </CardHeader>
        <CardContent>
          <Textarea
            rows={4}
            placeholder="e.g. account owner, support contact at Stripe, billing schedule..."
            value={form.notes}
            onChange={(e) => update('notes', e.target.value)}
          />
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving} size="lg">
          {saving ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Saving…
            </>
          ) : (
            <>
              <Save className="h-4 w-4 mr-2" />
              Save Stripe Settings
            </>
          )}
        </Button>
      </div>
    </div>
  );
}

export default StripeSettings;
