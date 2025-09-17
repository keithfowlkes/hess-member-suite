import { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { ImageIcon, Upload, Trash2, Eye } from 'lucide-react';

interface HeaderGraphicManagerProps {
  className?: string;
}

export const HeaderGraphicManager = ({ className }: HeaderGraphicManagerProps) => {
  const [currentGraphic, setCurrentGraphic] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  // Load current header graphic on component mount
  useEffect(() => {
    loadCurrentGraphic();
  }, []);

  const loadCurrentGraphic = async () => {
    try {
      // Check if header graphic exists in storage
      const { data: files, error } = await supabase.storage
        .from('invoice-logos')
        .list('', {
          search: 'header-graphic'
        });

      if (error) {
        console.error('Error loading header graphic:', error);
        return;
      }

      if (files && files.length > 0) {
        const headerFile = files.find(file => file.name.startsWith('header-graphic'));
        if (headerFile) {
          const { data } = supabase.storage
            .from('invoice-logos')
            .getPublicUrl(headerFile.name);
          setCurrentGraphic(data.publicUrl);
        }
      }
    } catch (error) {
      console.error('Error loading header graphic:', error);
    }
  };

  const handleFileSelect = () => {
    fileInputRef.current?.click();
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: 'Invalid File Type',
        description: 'Please select an image file (JPG, PNG, GIF, etc.)',
        variant: 'destructive'
      });
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: 'File Too Large',
        description: 'Please select an image smaller than 5MB',
        variant: 'destructive'
      });
      return;
    }

    setUploading(true);

    try {
      // Delete existing header graphic if it exists
      if (currentGraphic) {
        await handleDeleteGraphic(false); // Don't show toast for intermediate delete
      }

      // Generate unique filename
      const fileExt = file.name.split('.').pop();
      const fileName = `header-graphic-${Date.now()}.${fileExt}`;

      // Upload to Supabase storage
      const { data, error } = await supabase.storage
        .from('invoice-logos')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: true
        });

      if (error) {
        throw error;
      }

      // Get public URL
      const { data: publicUrlData } = supabase.storage
        .from('invoice-logos')
        .getPublicUrl(fileName);

      setCurrentGraphic(publicUrlData.publicUrl);

      toast({
        title: 'Header Graphic Updated',
        description: 'The header graphic has been successfully uploaded and updated.',
      });

    } catch (error: any) {
      console.error('Upload error:', error);
      toast({
        title: 'Upload Failed',
        description: error.message || 'Failed to upload header graphic',
        variant: 'destructive'
      });
    } finally {
      setUploading(false);
      // Clear the input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleDeleteGraphic = async (showToast = true) => {
    if (!currentGraphic) return;

    setDeleting(true);

    try {
      // Extract filename from URL
      const urlParts = currentGraphic.split('/');
      const fileName = urlParts[urlParts.length - 1];

      // Delete from storage
      const { error } = await supabase.storage
        .from('invoice-logos')
        .remove([fileName]);

      if (error) {
        throw error;
      }

      setCurrentGraphic(null);

      if (showToast) {
        toast({
          title: 'Header Graphic Deleted',
          description: 'The header graphic has been successfully removed.',
        });
      }

    } catch (error: any) {
      console.error('Delete error:', error);
      if (showToast) {
        toast({
          title: 'Delete Failed',
          description: error.message || 'Failed to delete header graphic',
          variant: 'destructive'
        });
      }
    } finally {
      setDeleting(false);
    }
  };

  const handlePreviewGraphic = () => {
    if (currentGraphic) {
      window.open(currentGraphic, '_blank');
    }
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ImageIcon className="h-5 w-5" />
          Sign in / Update Header Update
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {currentGraphic ? (
          <div className="space-y-4">
            <div className="border rounded-lg overflow-hidden bg-muted/20">
              <div className="p-4 border-b bg-background">
                <p className="text-sm font-medium">Current Header Graphic</p>
              </div>
              <div className="p-4 flex justify-center">
                <img 
                  src={currentGraphic} 
                  alt="Header Graphic" 
                  className="max-h-32 max-w-full object-contain rounded"
                />
              </div>
            </div>
            
            <div className="flex gap-2">
              <Button
                onClick={handlePreviewGraphic}
                variant="outline"
                size="sm"
                className="flex items-center gap-2"
              >
                <Eye className="h-4 w-4" />
                Preview
              </Button>
              
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex items-center gap-2 text-destructive hover:text-destructive"
                    disabled={deleting}
                  >
                    <Trash2 className="h-4 w-4" />
                    Delete
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete Header Graphic</AlertDialogTitle>
                    <AlertDialogDescription>
                      Are you sure you want to delete the current header graphic? This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction 
                      onClick={() => handleDeleteGraphic(true)}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      Delete
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        ) : (
          <div className="text-center py-6 border-2 border-dashed rounded-lg">
            <ImageIcon className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground mb-2">No header graphic currently set</p>
          </div>
        )}

        <div className="pt-4 border-t">
          <Button
            onClick={handleFileSelect}
            disabled={uploading || deleting}
            className="w-full flex items-center gap-2"
          >
            {uploading ? (
              <>
                <div className="h-4 w-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                <Upload className="h-4 w-4" />
                {currentGraphic ? 'Update Header Graphic' : 'Upload Header Graphic'}
              </>
            )}
          </Button>
          
          <Input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileUpload}
            className="hidden"
          />
          
          <p className="text-xs text-muted-foreground mt-2 text-center">
            Supports JPG, PNG, GIF files up to 5MB
          </p>
        </div>
      </CardContent>
    </Card>
  );
};