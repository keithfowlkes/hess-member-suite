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
    const affiliateFee = systemSettings.find(s => s.setting_key === 'affiliate_member_fee')?.setting_value || '500';
    const additionalTiers = systemSettings.find(s => s.setting_key === 'additional_fee_tiers')?.setting_value;

    const tiers: FeeTier[] = [
      {
        id: 'full',
        name: 'Full Member',
        amount: parseFloat(fullFee)
      },
      {
        id: 'affiliate',
        name: 'Affiliate Member',
        amount: parseFloat(affiliateFee)
      }
    ];

    // Add additional custom tiers
    if (additionalTiers) {
      try {
        const additional = JSON.parse(additionalTiers) as Array<{id: string, name: string, amount: string}>;
        additional.forEach(tier => {
          tiers.push({
            id: tier.id,
            name: tier.name,
            amount: parseFloat(tier.amount)
          });
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