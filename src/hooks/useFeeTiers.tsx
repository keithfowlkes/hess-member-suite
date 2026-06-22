import { useMemo } from 'react';
import { useSystemSettings } from '@/hooks/useSystemSettings';

export interface FeeTier {
  id: string;
  name: string;
  amount: number;
}

export const useFeeTiers = () => {
  const { data: systemSettings, isLoading } = useSystemSettings();

  const feeTiers = useMemo(() => {
    if (!systemSettings) return [];

    const fullFee = systemSettings.find(s => s.setting_key === 'full_member_fee')?.setting_value || '1000';
    const affiliateFee = systemSettings.find(s => s.setting_key === 'affiliate_member_fee')?.setting_value || '0';
    const additionalTiers = systemSettings.find(s => s.setting_key === 'additional_fee_tiers')?.setting_value;

    const tiers: FeeTier[] = [
      {
        id: 'full',
        name: 'Full Member (includes Stripe processing fee)',
        amount: parseFloat(fullFee)
      }
    ];

    // Only surface the affiliate tier when an admin has actually set a non-zero amount
    const affiliateAmount = parseFloat(affiliateFee);
    if (Number.isFinite(affiliateAmount) && affiliateAmount > 0) {
      tiers.push({ id: 'affiliate', name: 'Affiliate Member', amount: affiliateAmount });
    }

    // Add additional custom tiers (only those with a positive amount)
    if (additionalTiers) {
      try {
        const additional = JSON.parse(additionalTiers) as Array<{id: string, name: string, amount: string}>;
        additional.forEach(tier => {
          const amt = parseFloat(tier.amount);
          if (Number.isFinite(amt) && amt > 0) {
            tiers.push({ id: tier.id, name: tier.name, amount: amt });
          }
        });
      } catch (error) {
        console.error('Error parsing additional fee tiers:', error);
      }
    }

    return tiers;
  }, [systemSettings]);

  return {
    feeTiers,
    isLoading
  };
};