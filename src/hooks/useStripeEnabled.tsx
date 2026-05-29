import { useMemo } from 'react';
import { useSystemSettings } from '@/hooks/useSystemSettings';

/**
 * Reads stripe_* system settings to determine if online payments are enabled.
 */
export function useStripeEnabled() {
  const { data: settings, isLoading } = useSystemSettings();

  return useMemo(() => {
    const get = (key: string) =>
      settings?.find((s) => s.setting_key === key)?.setting_value ?? '';

    const enabled = get('stripe_enabled') === 'true';
    const mode = (get('stripe_mode') || 'test') as 'test' | 'live';

    return { enabled, mode, isLoading };
  }, [settings, isLoading]);
}
