import { supabase } from '@/integrations/supabase/client';

const PRODUCTION_HOST_MATCH = 'hessconsortium.app';
const PRODUCTION_ORIGIN = 'https://members.hessconsortium.app';

function isAllowedHandoffOrigin(origin: string) {
  try {
    const url = new URL(origin);
    const host = url.hostname;
    return host.endsWith('.lovableproject.com') || host === 'members.hessconsortium.app';
  } catch {
    return false;
  }
}

let listenerInitialized = false;

export function initAuthHandoffListener() {
  if (listenerInitialized) return;
  listenerInitialized = true;

  window.addEventListener('message', (event) => {
    const data = event.data as any;
    if (!data || data.type !== 'HESS_AUTH_HANDOFF') return;

    // Only accept handoff on production host.
    if (!window.location.origin.includes(PRODUCTION_HOST_MATCH)) return;

    if (!isAllowedHandoffOrigin(event.origin)) return;

    const access_token = data.access_token as string | undefined;
    const refresh_token = data.refresh_token as string | undefined;
    const redirectTo = (data.redirectTo as string | undefined) || '/';

    if (!access_token || !refresh_token) return;

    void supabase.auth
      .setSession({ access_token, refresh_token })
      .then(({ error }) => {
        if (error) return;
        window.location.replace(redirectTo);
      });
  });
}

export const AUTH_HANDOFF = {
  PRODUCTION_ORIGIN,
} as const;
