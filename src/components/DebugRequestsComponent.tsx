import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useReassignmentRequests } from '@/hooks/useReassignmentRequests';
import { useOrganizationProfileEditRequests } from '@/hooks/useOrganizationProfileEditRequests';

export const DebugRequestsComponent = () => {
  const { data: memberInfoUpdateRequests } = useReassignmentRequests();
  const { requests: profileEditRequests } = useOrganizationProfileEditRequests();

  console.log('Debug - Member Info Updates:', memberInfoUpdateRequests);
  console.log('Debug - Profile Edit Requests:', profileEditRequests);

  return (
    <Card className="mb-4">
      <CardHeader>
        <CardTitle>Debug: Available Requests</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <div>
            <Badge variant="outline">Member Info Updates</Badge>
            <span className="ml-2">Count: {memberInfoUpdateRequests?.length || 0}</span>
          </div>
          <div>
            <Badge variant="outline">Profile Edit Requests</Badge>
            <span className="ml-2">Count: {profileEditRequests?.length || 0}</span>
          </div>
          
          {memberInfoUpdateRequests?.length > 0 && (
            <div className="mt-4">
              <h4 className="font-semibold">Member Info Updates:</h4>
              {memberInfoUpdateRequests.map((req, index) => (
                <div key={index} className="text-sm bg-gray-50 p-2 rounded">
                  ID: {req.id}, Status: {req.status}, Email: {req.new_contact_email}
                </div>
              ))}
            </div>
          )}
          
          {profileEditRequests?.length > 0 && (
            <div className="mt-4">
              <h4 className="font-semibold">Profile Edit Requests:</h4>
              {profileEditRequests.map((req, index) => (
                <div key={index} className="text-sm bg-gray-50 p-2 rounded">
                  ID: {req.id}, Status: {req.status}
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};