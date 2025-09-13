import React from 'react';
import { TestModal } from '@/components/TestModal';
import { DebugRequestsComponent } from '@/components/DebugRequestsComponent';

export const ModalTest = () => {
  return (
    <div className="container mx-auto p-6 space-y-6">
      <h1 className="text-3xl font-bold">Modal Functionality Test</h1>
      
      <div className="space-y-4">
        <TestModal />
        <DebugRequestsComponent />
      </div>
    </div>
  );
};

export default ModalTest;