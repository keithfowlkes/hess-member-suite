import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { UnifiedComparisonModal } from '@/components/UnifiedComparisonModal';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export const TestModal = () => {
  const [showTestModal, setShowTestModal] = useState(false);

  const testData = {
    originalData: { name: "Original Organization", email: "old@example.com" },
    updatedData: { name: "Updated Organization", email: "new@example.com" },
    organizationChanges: [
      { field: 'Name', oldValue: 'Original Organization', newValue: 'Updated Organization' },
      { field: 'Email', oldValue: 'old@example.com', newValue: 'new@example.com' }
    ],
    profileChanges: []
  };

  return (
    <>
      <Card className="mb-4">
        <CardHeader>
          <CardTitle>Modal Test</CardTitle>
        </CardHeader>
        <CardContent>
          <Button 
            onClick={() => {
              console.log('Test button clicked');
              setShowTestModal(true);
            }}
            className="bg-blue-600 hover:bg-blue-700"
          >
            Test Review Modal
          </Button>
        </CardContent>
      </Card>

      <UnifiedComparisonModal
        open={showTestModal}
        onOpenChange={(open) => {
          console.log('Test modal open change:', open);
          setShowTestModal(open);
        }}
        title="Test Review"
        data={testData}
        showActions={true}
        onApprove={() => {
          console.log('Test approve clicked');
          setShowTestModal(false);
        }}
        onReject={() => {
          console.log('Test reject clicked');
          setShowTestModal(false);
        }}
        isSubmitting={false}
      />
    </>
  );
};