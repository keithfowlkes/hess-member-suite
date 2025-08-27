import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { usePublicPages, useCreatePublicPage, useUpdatePublicPage } from '@/hooks/usePublicPages';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';

interface PublicPageEditorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pageId?: string | null;
}

export const PublicPageEditor = ({ open, onOpenChange, pageId }: PublicPageEditorProps) => {
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [content, setContent] = useState('');
  const [metaDescription, setMetaDescription] = useState('');
  const [isPublished, setIsPublished] = useState(false);

  const { data: pages } = usePublicPages();
  const createPageMutation = useCreatePublicPage();
  const updatePageMutation = useUpdatePublicPage();

  const currentPage = pageId ? pages?.find(p => p.id === pageId) : null;
  const isEditing = !!pageId;

  useEffect(() => {
    if (currentPage) {
      setTitle(currentPage.title);
      setSlug(currentPage.slug);
      setContent(currentPage.content);
      setMetaDescription(currentPage.meta_description || '');
      setIsPublished(currentPage.is_published);
    } else {
      // Reset form for new page
      setTitle('');
      setSlug('');
      setContent('');
      setMetaDescription('');
      setIsPublished(false);
    }
  }, [currentPage, open]);

  // Auto-generate slug from title
  useEffect(() => {
    if (!isEditing && title) {
      const generatedSlug = title
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .trim();
      setSlug(generatedSlug);
    }
  }, [title, isEditing]);

  const handleSave = () => {
    if (!title.trim() || !slug.trim()) return;

    const pageData = {
      title: title.trim(),
      slug: slug.trim(),
      content,
      meta_description: metaDescription.trim() || undefined,
      is_published: isPublished,
    };

    if (isEditing && pageId) {
      updatePageMutation.mutate(
        { id: pageId, ...pageData },
        {
          onSuccess: () => {
            onOpenChange(false);
          },
        }
      );
    } else {
      createPageMutation.mutate(pageData, {
        onSuccess: () => {
          onOpenChange(false);
        },
      });
    }
  };

  const generatePreviewHtml = () => {
    return `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${title || 'Untitled Page'}</title>
        ${metaDescription ? `<meta name="description" content="${metaDescription}">` : ''}
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 800px; margin: 0 auto; padding: 2rem; }
          h1, h2, h3, h4, h5, h6 { color: #1a1a1a; }
          p { color: #4a4a4a; line-height: 1.6; }
          img { max-width: 100%; height: auto; }
        </style>
      </head>
      <body>
        <h1>${title || 'Untitled Page'}</h1>
        ${content}
      </body>
      </html>
    `;
  };

  const modules = {
    toolbar: [
      [{ 'header': [1, 2, 3, 4, 5, 6, false] }],
      ['bold', 'italic', 'underline', 'strike'],
      [{ 'list': 'ordered'}, { 'list': 'bullet' }],
      [{ 'script': 'sub'}, { 'script': 'super' }],
      [{ 'indent': '-1'}, { 'indent': '+1' }],
      [{ 'direction': 'rtl' }],
      [{ 'color': [] }, { 'background': [] }],
      [{ 'align': [] }],
      ['link', 'image', 'video'],
      ['clean']
    ],
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Edit Public Page' : 'Create New Public Page'}
          </DialogTitle>
          <DialogDescription>
            Create a custom public page with rich content using the WYSIWYG editor.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="editor" className="space-y-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="editor">Editor</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
            <TabsTrigger value="preview">Preview</TabsTrigger>
          </TabsList>

          <TabsContent value="editor" className="space-y-4">
            <div className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="title">Page Title</Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Enter page title..."
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="content">Content</Label>
                <div className="border rounded-md">
                  <ReactQuill
                    theme="snow"
                    value={content}
                    onChange={setContent}
                    modules={modules}
                    style={{ minHeight: '300px' }}
                    placeholder="Start writing your page content..."
                  />
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="settings" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Page Settings</CardTitle>
                <CardDescription>
                  Configure URL, SEO, and publication settings
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-2">
                  <Label htmlFor="slug">URL Slug</Label>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">/public/</span>
                    <Input
                      id="slug"
                      value={slug}
                      onChange={(e) => setSlug(e.target.value)}
                      placeholder="page-url-slug"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    This will be the URL where your page is accessible
                  </p>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="meta-description">Meta Description</Label>
                  <Textarea
                    id="meta-description"
                    value={metaDescription}
                    onChange={(e) => setMetaDescription(e.target.value)}
                    placeholder="Brief description for search engines (160 characters max)"
                    maxLength={160}
                  />
                  <p className="text-xs text-muted-foreground">
                    {metaDescription.length}/160 characters
                  </p>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="published"
                    checked={isPublished}
                    onCheckedChange={setIsPublished}
                  />
                  <Label htmlFor="published">Publish immediately</Label>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="preview" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Page Preview</CardTitle>
                <CardDescription>
                  See how your page will look to visitors
                </CardDescription>
              </CardHeader>
              <CardContent>
                <iframe
                  srcDoc={generatePreviewHtml()}
                  className="w-full h-96 border rounded-md"
                  title="Page Preview"
                />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleSave}
            disabled={!title.trim() || !slug.trim() || createPageMutation.isPending || updatePageMutation.isPending}
          >
            {createPageMutation.isPending || updatePageMutation.isPending 
              ? 'Saving...' 
              : isEditing ? 'Update Page' : 'Create Page'
            }
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};