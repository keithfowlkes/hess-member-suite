import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const FixMissingOrganizationNames = () => {
  const [organizationName, setOrganizationName] = useState('DeusLogic, Inc.');
  const [isFixing, setIsFixing] = useState(false);

  const handleFix = async () => {
    if (!organizationName.trim()) {
      toast.error('Please enter an organization name');
      return;
    }

    setIsFixing(true);
    try {
      const { data, error } = await supabase.functions.invoke('fix-empty-organization-name', {
        body: {
          organizationId: '73f38496-2ca3-4397-9d6a-27ce4e684ee0',
          organizationName: organizationName.trim()
        }
      });

      if (error) {
        console.error('Failed to fix organization name:', error);
        toast.error(`Failed to fix organization name: ${error.message}`);
      } else {
        console.log('Organization name fixed:', data);
        toast.success('Organization name fixed successfully!');
        // Refresh the page to see changes
        window.location.reload();
      }
    } catch (error: any) {
      console.error('Error fixing organization name:', error);
      toast.error(`Error: ${error.message}`);
    } finally {
      setIsFixing(false);
    }
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Fix Missing Organization Name</CardTitle>
        <CardDescription>
          Fix the organization that was approved but has a missing name
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <label htmlFor="orgName" className="text-sm font-medium">
            Organization Name:
          </label>
          <Input
            id="orgName"
            value={organizationName}
            onChange={(e) => setOrganizationName(e.target.value)}
            placeholder="Enter organization name"
          />
        </div>
        <Button 
          onClick={handleFix} 
          disabled={isFixing}
          className="w-full"
        >
          {isFixing ? 'Fixing...' : 'Fix Organization Name'}
        </Button>
      </CardContent>
    </Card>
  );
};

export default FixMissingOrganizationNames;