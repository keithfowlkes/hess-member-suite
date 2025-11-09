import { useState } from 'react';
import { PublicUSMap } from '@/components/PublicUSMap';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

export default function PublicMap() {
  const [isMapModalOpen, setIsMapModalOpen] = useState(false);

  const handleCardClick = () => {
    console.log('Card clicked! Current state:', isMapModalOpen);
    setIsMapModalOpen(true);
    console.log('State should now be true');
  };

  return (
    <>
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8">
          <div 
            onClick={handleCardClick}
            className="mb-8 cursor-pointer"
          >
            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader className="text-center">
                <CardTitle className="text-3xl">Member Organization Map</CardTitle>
                <CardDescription>
                  Interactive map showing the geographic distribution of our member organizations (click to enlarge)
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
          
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