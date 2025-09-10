import { PublicUSMap } from '@/components/PublicUSMap';

export default function PublicMap() {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Member Organization Map
          </h1>
          <p className="text-muted-foreground">
            Interactive map showing the geographic distribution of our member organizations
          </p>
        </div>
        
        <PublicUSMap />
      </div>
    </div>
  );
}