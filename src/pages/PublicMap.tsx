import { useState } from 'react';
import { PublicUSMap } from '@/components/PublicUSMap';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

export default function PublicMap() {
  const [isMapModalOpen, setIsMapModalOpen] = useState(false);

  return (
    <>
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8">
          <Card 
            className="mb-8 cursor-pointer hover:shadow-lg transition-shadow"
            onClick={() => {
              console.log('Public map card clicked, state:', isMapModalOpen);
              setIsMapModalOpen(true);
            }}
          >
            <CardHeader className="text-center">
              <CardTitle className="text-3xl">Member Organization Map</CardTitle>
              <CardDescription>
                Interactive map showing the geographic distribution of our member organizations (click to enlarge)
              </CardDescription>
            </CardHeader>
          </Card>
          
          <PublicUSMap />
        </div>
      </div>

      {/* Map Modal */}
      <Dialog open={isMapModalOpen} onOpenChange={setIsMapModalOpen}>
        <DialogContent className="max-w-[95vw] max-h-[95vh] w-full h-full p-6">
          <div className="w-full h-full overflow-auto">
            <PublicUSMap />
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}