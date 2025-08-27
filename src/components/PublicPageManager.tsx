import { useState } from 'react';
import { Plus, Edit2, Trash2, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { usePublicPages, useDeletePublicPage, useUpdatePublicPage } from '@/hooks/usePublicPages';
import { PublicPageEditor } from './PublicPageEditor';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

export const PublicPageManager = () => {
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingPage, setEditingPage] = useState<string | null>(null);
  
  const { data: pages, isLoading } = usePublicPages();
  const deletePageMutation = useDeletePublicPage();
  const updatePageMutation = useUpdatePublicPage();

  const handleCreateNew = () => {
    setEditingPage(null);
    setIsEditorOpen(true);
  };

  const handleEdit = (pageId: string) => {
    setEditingPage(pageId);
    setIsEditorOpen(true);
  };

  const handleDelete = (pageId: string) => {
    deletePageMutation.mutate(pageId);
  };

  const handleTogglePublished = (pageId: string, currentStatus: boolean) => {
    updatePageMutation.mutate({
      id: pageId,
      is_published: !currentStatus
    });
  };

  if (isLoading) {
    return <div className="text-muted-foreground">Loading pages...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-foreground">Custom Public Pages</h3>
          <p className="text-sm text-muted-foreground">
            Create and manage custom public pages with rich content
          </p>
        </div>
        <Button onClick={handleCreateNew} className="gap-2">
          <Plus className="h-4 w-4" />
          Create New Page
        </Button>
      </div>

      <div className="grid gap-4">
        {pages?.map((page) => (
          <Card key={page.id} className="relative">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-base">{page.title}</CardTitle>
                    <Badge variant={page.is_published ? "default" : "secondary"}>
                      {page.is_published ? "Published" : "Draft"}
                    </Badge>
                  </div>
                  <CardDescription>
                    /{page.slug}
                    {page.meta_description && (
                      <span className="block mt-1">{page.meta_description}</span>
                    )}
                  </CardDescription>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleTogglePublished(page.id, page.is_published)}
                    className="gap-1"
                  >
                    {page.is_published ? (
                      <>
                        <EyeOff className="h-3 w-3" />
                        Unpublish
                      </>
                    ) : (
                      <>
                        <Eye className="h-3 w-3" />
                        Publish
                      </>
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleEdit(page.id)}
                    className="gap-1"
                  >
                    <Edit2 className="h-3 w-3" />
                    Edit
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="sm" className="gap-1 text-destructive hover:text-destructive">
                        <Trash2 className="h-3 w-3" />
                        Delete
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete Page</AlertDialogTitle>
                        <AlertDialogDescription>
                          Are you sure you want to delete "{page.title}"? This action cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => handleDelete(page.id)}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div 
                className="text-sm text-muted-foreground line-clamp-2"
                dangerouslySetInnerHTML={{ 
                  __html: page.content.replace(/<[^>]*>/g, '').substring(0, 150) + '...' 
                }}
              />
            </CardContent>
          </Card>
        ))}

        {(!pages || pages.length === 0) && (
          <Card className="text-center py-8">
            <CardContent>
              <p className="text-muted-foreground mb-4">No custom pages created yet</p>
              <Button onClick={handleCreateNew} className="gap-2">
                <Plus className="h-4 w-4" />
                Create Your First Page
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      <PublicPageEditor
        open={isEditorOpen}
        onOpenChange={setIsEditorOpen}
        pageId={editingPage}
      />
    </div>
  );
};