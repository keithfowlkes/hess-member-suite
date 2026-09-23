import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export interface BoardRevenueOrganization {
  id: string;
  name: string;
  membership_status?: string;
  annual_fee_amount?: number;
  city?: string;
  state?: string;
  has_paid_invoice?: boolean;
}

interface BoardRevenueSummary {
  totalBilled: number;
  paidRevenue: number;
  organizations: BoardRevenueOrganization[];
}

const emptySummary: BoardRevenueSummary = {
  totalBilled: 0,
  paidRevenue: 0,
  organizations: [],
};

export function useBoardMemberRevenue() {
  const { user } = useAuth();
  const [isBoardMember, setIsBoardMember] = useState(false);
  const [summary, setSummary] = useState<BoardRevenueSummary>(emptySummary);
  const [loading, setLoading] = useState(true);

  const fetchSummary = useCallback(async () => {
    if (!user) {
      setIsBoardMember(false);
      setSummary(emptySummary);
      setLoading(false);
      return;
    }

    setLoading(true);
    const { data: roles, error: roleError } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'board_member');

    const hasBoardRole = !roleError && Boolean(roles?.length);
    setIsBoardMember(hasBoardRole);

    if (!hasBoardRole) {
      setSummary(emptySummary);
      setLoading(false);
      return;
    }

    const { data, error } = await supabase.rpc('get_board_member_revenue_summary');
    if (error || !data || typeof data !== 'object' || Array.isArray(data)) {
      console.error('Unable to load board member revenue summary:', error);
      setSummary(emptySummary);
      setLoading(false);
      return;
    }

    const payload = data as Record<string, unknown>;
    const organizations = Array.isArray(payload.organizations)
      ? payload.organizations.filter(
          (organization): organization is BoardRevenueOrganization =>
            Boolean(organization) &&
            typeof organization === 'object' &&
            typeof (organization as BoardRevenueOrganization).id === 'string' &&
            typeof (organization as BoardRevenueOrganization).name === 'string',
        )
      : [];

    setSummary({
      totalBilled: Number(payload.total_billed || 0),
      paidRevenue: Number(payload.paid_revenue || 0),
      organizations,
    });
    setLoading(false);
  }, [user]);

  useEffect(() => {
    void fetchSummary();
  }, [fetchSummary]);

  useEffect(() => {
    if (!isBoardMember) return;

    let refreshTimer: ReturnType<typeof setTimeout> | undefined;
    const scheduleRefresh = () => {
      if (refreshTimer) clearTimeout(refreshTimer);
      refreshTimer = setTimeout(() => void fetchSummary(), 400);
    };

    const channel = supabase
      .channel(`board_revenue_${user?.id || 'unknown'}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'organizations' }, scheduleRefresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'invoices' }, scheduleRefresh)
      .subscribe();

    return () => {
      if (refreshTimer) clearTimeout(refreshTimer);
      void supabase.removeChannel(channel);
    };
  }, [fetchSummary, isBoardMember, user?.id]);

  return { isBoardMember, summary, loading };
}