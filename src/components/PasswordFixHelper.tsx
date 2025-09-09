import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { fixUserPassword } from '@/utils/fixPassword';

export function PasswordFixHelper() {
  const [isFixing, setIsFixing] = useState(false);
  const { toast } = useToast();

  const handleFixPassword = async () => {
    setIsFixing(true);
    try {
      const result = await fixUserPassword();
      
      if (result.success) {
        toast({
          title: "Password Fixed Successfully",
          description: "fowlkes@thecoalition.us can now login with 'Tale2tell!!'"
        });
      } else {
        throw new Error(result.error);
      }
    } catch (error: any) {
      console.error('Error fixing password:', error);
      toast({
        title: "Password Fix Failed", 
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setIsFixing(false);
    }
  };

  return (
    <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
      <h3 className="text-lg font-semibold mb-2">Emergency Password Fix</h3>
      <p className="text-sm text-muted-foreground mb-4">
        Fix password for fowlkes@thecoalition.us
      </p>
      <Button 
        onClick={handleFixPassword} 
        disabled={isFixing}
        variant="outline"
      >
        {isFixing ? 'Fixing Password...' : 'Fix Password Now'}
      </Button>
    </div>
  );
}