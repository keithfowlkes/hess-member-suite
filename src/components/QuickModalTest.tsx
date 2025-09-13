import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { UnifiedComparisonModal } from '@/components/UnifiedComparisonModal';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export const QuickModalTest = () => {
  const [showModal, setShowModal] = useState(false);

  return (
    <>
      <Card className="mb-4">
        <CardHeader>
          <CardTitle>Review Button Test</CardTitle>
        </CardHeader>
        <CardContent>
          <Button onClick={() => setShowModal(true)}>Test Review Changes</Button>
        </CardContent>
      </Card>

      <UnifiedComparisonModal
        open={showModal}
        onOpenChange={setShowModal}
        title="Test Review"
        data={{
          originalData: { name: "Test Org" },
          updatedData: { name: "Updated Org" },
          organizationChanges: [],
          profileChanges: []
        }}
        showActions={true}
        onApprove={() => setShowModal(false)}
        onReject={() => setShowModal(false)}
      />
    </>
  );
};