import { useEffect, useRef, useState } from 'react';
import { Loader2, Plus, Trash2, Upload, X } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { usePartnershipLevels } from '@/hooks/usePartnershipLevels';
import { useToast } from '@/hooks/use-toast';
import PartnerMicrositeEditor from './PartnerMicrositeEditor';
import {
  BusinessPartner,
  PartnerContact,
  slugify,
  uploadPartnerAsset,
  useAddPartnerFile,
  useDeletePartnerFile,
  usePartnerContacts,
  usePartnerFiles,
  usePartnerReferenceSummary,
  useSaveBusinessPartner,
  useSavePartnerContacts,
  useSavePartnerReferenceSummary,
} from '@/hooks/useBusinessPartners';

interface PartnerAdminDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  partner: BusinessPartner | null;
}

type ContactDraft = Pick<PartnerContact, 'name' | 'title' | 'email' | 'phone'>;

const emptyContact: ContactDraft = { name: '', title: '', email: '', phone: '' };

export function PartnerAdminDialog({ open, onOpenChange, partner }: PartnerAdminDialogProps) {
  const { toast } = useToast();
  const savePartner = useSaveBusinessPartner();
  const saveContacts = useSavePartnerContacts();
  const saveReferenceSummary = useSavePartnerReferenceSummary();
  const addFile = useAddPartnerFile();
  const deleteFile = useDeletePartnerFile();

  const { data: existingContacts = [] } = usePartnerContacts(partner?.id);
  const { data: referenceSummary } = usePartnerReferenceSummary(partner?.id);
  const { data: files = [] } = usePartnerFiles(partner?.id);
  const { data: levels = [] } = usePartnershipLevels();
  const [referencesText, setReferencesText] = useState('');

  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [shortDescription, setShortDescription] = useState('');
  const [descriptionHtml, setDescriptionHtml] = useState('');
  const [memberOfferHtml, setMemberOfferHtml] = useState('');
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [bannerUrl, setBannerUrl] = useState<string | null>(null);
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [categories, setCategories] = useState<string[]>([]);
  const [categoryInput, setCategoryInput] = useState('');
  const [isFeatured, setIsFeatured] = useState(false);
  const [partnershipLevelId, setPartnershipLevelId] = useState<string | null>(null);
  const [displayOrder, setDisplayOrder] = useState(0);
  const [isPublished, setIsPublished] = useState(false);
  const [contacts, setContacts] = useState<ContactDraft[]>([]);
  const [uploading, setUploading] = useState<'logo' | 'banner' | null>(null);

  const [fileTitle, setFileTitle] = useState('');
  const [fileDescription, setFileDescription] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    setName(partner?.name ?? '');
    setSlug(partner?.slug ?? '');
    setShortDescription(partner?.short_description ?? '');
    setDescriptionHtml(partner?.description_html ?? '');
    setMemberOfferHtml(partner?.member_offer_html ?? '');
    setLogoUrl(partner?.logo_url ?? null);
    setBannerUrl(partner?.banner_url ?? null);
    setWebsiteUrl(partner?.website_url ?? '');
    setCategories(partner?.categories ?? []);
    setIsFeatured(partner?.is_featured ?? false);
    setPartnershipLevelId(partner?.partnership_level_id ?? null);
    setDisplayOrder(partner?.display_order ?? 0);
    setIsPublished(partner?.is_published ?? false);
    setCategoryInput('');
    setFileTitle('');
    setFileDescription('');
  }, [open, partner]);

  useEffect(() => {
    if (!open) return;
    setContacts(
      existingContacts.map((c) => ({
        name: c.name,
        title: c.title ?? '',
        email: c.email ?? '',
        phone: c.phone ?? '',
      }))
    );
  }, [open, existingContacts]);

  useEffect(() => {
    if (!open) return;
    setReferencesText(referenceSummary?.summary ?? '');
  }, [open, referenceSummary]);

  const handleImageUpload = async (kind: 'logo' | 'banner', file?: File) => {
    if (!file) return;
    setUploading(kind);
    try {
      const url = await uploadPartnerAsset(file);
      if (kind === 'logo') setLogoUrl(url);
      else setBannerUrl(url);
    } catch (error: any) {
      toast({
        title: 'Upload failed',
        description: error?.message || 'Could not upload this image.',
        variant: 'destructive',
      });
    } finally {
      setUploading(null);
    }
  };

  const addCategory = () => {
    const value = categoryInput.trim();
    if (!value || categories.includes(value)) return;
    setCategories([...categories, value]);
    setCategoryInput('');
  };

  const handleSave = async () => {
    if (!name.trim()) {
      toast({ title: 'Name required', description: 'Enter a partner name.', variant: 'destructive' });
      return;
    }
    const finalSlug = slugify(slug || name);
    if (!finalSlug) {
      toast({ title: 'Web address required', description: 'Enter a valid page address.', variant: 'destructive' });
      return;
    }

    const saved = await savePartner.mutateAsync({
      id: partner?.id,
      name: name.trim().slice(0, 200),
      slug: finalSlug,
      short_description: shortDescription.trim().slice(0, 500) || null,
      description_html: descriptionHtml || null,
      member_offer_html: memberOfferHtml || null,
      logo_url: logoUrl,
      banner_url: bannerUrl,
      website_url: websiteUrl.trim() || null,
      categories,
      partnership_level_id: partnershipLevelId,
      is_featured: isFeatured,
      display_order: Number.isFinite(displayOrder) ? displayOrder : 0,
      is_published: isPublished,
    } as any);

    const cleanedContacts = contacts.filter((c) => c.name.trim());
    await saveContacts.mutateAsync({ partnerId: saved.id, contacts: cleanedContacts });
    await saveReferenceSummary.mutateAsync({ partnerId: saved.id, summary: referencesText });
    onOpenChange(false);
  };

  const handleFileUpload = async (file?: File) => {
    if (!file || !partner?.id) return;
    await addFile.mutateAsync({
      partnerId: partner.id,
      file,
      title: fileTitle.trim() || file.name,
      description: fileDescription.trim(),
      displayOrder: files.length,
    });
    setFileTitle('');
    setFileDescription('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const busy = savePartner.isPending || saveContacts.isPending || saveReferenceSummary.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{partner ? `Edit ${partner.name}` : 'New Business Partner'}</DialogTitle>
          <DialogDescription>
            Build the partner's microsite, contacts, documents and member-only offers.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="profile" className="space-y-4">
          <TabsList>
            <TabsTrigger value="profile">Profile</TabsTrigger>
            <TabsTrigger value="microsite">Microsite</TabsTrigger>
            <TabsTrigger value="contacts">Contacts</TabsTrigger>
            <TabsTrigger value="references">References</TabsTrigger>
            <TabsTrigger value="files" disabled={!partner}>Files</TabsTrigger>
            <TabsTrigger value="offers">Member Offers</TabsTrigger>
          </TabsList>

          {/* Profile */}
          <TabsContent value="profile" className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="partner-name">Partner name</Label>
                <Input
                  id="partner-name"
                  value={name}
                  maxLength={200}
                  onChange={(e) => {
                    setName(e.target.value);
                    if (!partner && !slug) setSlug(slugify(e.target.value));
                  }}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="partner-slug">Page address</Label>
                <Input
                  id="partner-slug"
                  value={slug}
                  maxLength={80}
                  onChange={(e) => setSlug(slugify(e.target.value))}
                  placeholder="acme-software"
                />
                <p className="text-xs text-muted-foreground">/partners/{slug || 'your-partner'}</p>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="partner-blurb">Short description</Label>
              <Textarea
                id="partner-blurb"
                value={shortDescription}
                maxLength={500}
                rows={2}
                onChange={(e) => setShortDescription(e.target.value)}
                placeholder="One or two lines shown on the directory card."
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="partner-website">Website</Label>
              <Input
                id="partner-website"
                value={websiteUrl}
                maxLength={300}
                onChange={(e) => setWebsiteUrl(e.target.value)}
                placeholder="https://example.com"
              />
            </div>

            <div className="space-y-2">
              <Label>Partnership level</Label>
              <Select
                value={partnershipLevelId ?? 'none'}
                onValueChange={(value) => setPartnershipLevelId(value === 'none' ? null : value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="No level" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No level</SelectItem>
                  {levels
                    .filter((level) => level.is_active || level.id === partnershipLevelId)
                    .map((level) => (
                      <SelectItem key={level.id} value={level.id}>
                        {level.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Shown as a badge on the directory card and the partner page.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Logo</Label>
                <div className="flex items-center gap-3">
                  {logoUrl && (
                    <img src={logoUrl} alt="Logo preview" className="h-14 w-24 object-contain border border-border rounded" />
                  )}
                  <Input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleImageUpload('logo', e.target.files?.[0])}
                  />
                  {uploading === 'logo' && <Loader2 className="h-4 w-4 animate-spin" />}
                </div>
              </div>
              <div className="space-y-2">
                <Label>Banner image</Label>
                <div className="flex items-center gap-3">
                  {bannerUrl && (
                    <img src={bannerUrl} alt="Banner preview" className="h-14 w-24 object-cover border border-border rounded" />
                  )}
                  <Input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleImageUpload('banner', e.target.files?.[0])}
                  />
                  {uploading === 'banner' && <Loader2 className="h-4 w-4 animate-spin" />}
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Categories</Label>
              <div className="flex gap-2">
                <Input
                  value={categoryInput}
                  maxLength={60}
                  onChange={(e) => setCategoryInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addCategory();
                    }
                  }}
                  placeholder="e.g. Cybersecurity"
                />
                <Button type="button" variant="outline" onClick={addCategory}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex flex-wrap gap-2 pt-1">
                {categories.map((category) => (
                  <Badge key={category} variant="secondary" className="gap-1">
                    {category}
                    <button
                      type="button"
                      onClick={() => setCategories(categories.filter((c) => c !== category))}
                      aria-label={`Remove ${category}`}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-3 items-end">
              <div className="flex items-center gap-3">
                <Switch id="featured" checked={isFeatured} onCheckedChange={setIsFeatured} />
                <Label htmlFor="featured">Featured partner</Label>
              </div>
              <div className="flex items-center gap-3">
                <Switch id="published" checked={isPublished} onCheckedChange={setIsPublished} />
                <Label htmlFor="published">Published</Label>
              </div>
              <div className="space-y-2">
                <Label htmlFor="order">Display order</Label>
                <Input
                  id="order"
                  type="number"
                  value={displayOrder}
                  onChange={(e) => setDisplayOrder(parseInt(e.target.value, 10) || 0)}
                />
              </div>
            </div>
          </TabsContent>

          {/* Microsite */}
          <TabsContent value="microsite" className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Use the toolbar to add images, then select an image and choose float left or float right so the
              text wraps around it.
            </p>
            <PartnerMicrositeEditor value={descriptionHtml} onChange={setDescriptionHtml} />
          </TabsContent>

          {/* Contacts */}
          <TabsContent value="contacts" className="space-y-4">
            {contacts.map((contact, index) => (
              <div key={index} className="grid gap-3 sm:grid-cols-5 items-end border border-border rounded-md p-3">
                <div className="space-y-1">
                  <Label className="text-xs">Name</Label>
                  <Input
                    value={contact.name}
                    maxLength={120}
                    onChange={(e) => {
                      const next = [...contacts];
                      next[index] = { ...contact, name: e.target.value };
                      setContacts(next);
                    }}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Title</Label>
                  <Input
                    value={contact.title ?? ''}
                    maxLength={120}
                    onChange={(e) => {
                      const next = [...contacts];
                      next[index] = { ...contact, title: e.target.value };
                      setContacts(next);
                    }}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Email</Label>
                  <Input
                    type="email"
                    value={contact.email ?? ''}
                    maxLength={255}
                    onChange={(e) => {
                      const next = [...contacts];
                      next[index] = { ...contact, email: e.target.value };
                      setContacts(next);
                    }}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Phone</Label>
                  <Input
                    value={contact.phone ?? ''}
                    maxLength={40}
                    onChange={(e) => {
                      const next = [...contacts];
                      next[index] = { ...contact, phone: e.target.value };
                      setContacts(next);
                    }}
                  />
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-destructive"
                  onClick={() => setContacts(contacts.filter((_, i) => i !== index))}
                >
                  <Trash2 className="h-4 w-4 mr-1" />
                  Remove
                </Button>
              </div>
            ))}
            <Button variant="outline" onClick={() => setContacts([...contacts, { ...emptyContact }])}>
              <Plus className="h-4 w-4 mr-2" />
              Add contact
            </Button>
            <p className="text-xs text-muted-foreground">
              Contacts are visible only to signed-in HESS members.
            </p>
          </TabsContent>

          {/* References */}
          <TabsContent value="references" className="space-y-4">
            <p className="text-sm text-muted-foreground">
              HESS member institutions that use this vendor and are willing to serve as a reference.
              Visible only to signed-in HESS members.
            </p>
            {references.map((reference, index) => (
              <div key={index} className="space-y-3 border border-border rounded-md p-3">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1">
                    <Label className="text-xs">HESS member institution</Label>
                    <Input
                      value={reference.institution_name}
                      maxLength={200}
                      placeholder="e.g. Wheaton College"
                      onChange={(e) => {
                        const next = [...references];
                        next[index] = { ...reference, institution_name: e.target.value };
                        setReferences(next);
                      }}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Reference contact name</Label>
                    <Input
                      value={reference.contact_name ?? ''}
                      maxLength={120}
                      onChange={(e) => {
                        const next = [...references];
                        next[index] = { ...reference, contact_name: e.target.value };
                        setReferences(next);
                      }}
                    />
                  </div>
                </div>
                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Title</Label>
                    <Input
                      value={reference.contact_title ?? ''}
                      maxLength={120}
                      onChange={(e) => {
                        const next = [...references];
                        next[index] = { ...reference, contact_title: e.target.value };
                        setReferences(next);
                      }}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Email</Label>
                    <Input
                      type="email"
                      value={reference.contact_email ?? ''}
                      maxLength={255}
                      onChange={(e) => {
                        const next = [...references];
                        next[index] = { ...reference, contact_email: e.target.value };
                        setReferences(next);
                      }}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Phone</Label>
                    <Input
                      value={reference.contact_phone ?? ''}
                      maxLength={40}
                      onChange={(e) => {
                        const next = [...references];
                        next[index] = { ...reference, contact_phone: e.target.value };
                        setReferences(next);
                      }}
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Notes</Label>
                  <Textarea
                    rows={2}
                    maxLength={1000}
                    value={reference.notes ?? ''}
                    placeholder="Products in use, implementation year, what they can speak to."
                    onChange={(e) => {
                      const next = [...references];
                      next[index] = { ...reference, notes: e.target.value };
                      setReferences(next);
                    }}
                  />
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-destructive"
                  onClick={() => setReferences(references.filter((_, i) => i !== index))}
                >
                  <Trash2 className="h-4 w-4 mr-1" />
                  Remove
                </Button>
              </div>
            ))}
            <Button variant="outline" onClick={() => setReferences([...references, { ...emptyReference }])}>
              <Plus className="h-4 w-4 mr-2" />
              Add reference
            </Button>
          </TabsContent>

          {/* Files */}
          <TabsContent value="files" className="space-y-4">
            {!partner ? (
              <p className="text-sm text-muted-foreground">Save the partner first, then add documents.</p>
            ) : (
              <>
                <div className="space-y-3 border border-border rounded-md p-4">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-1">
                      <Label className="text-xs">Document title</Label>
                      <Input value={fileTitle} maxLength={160} onChange={(e) => setFileTitle(e.target.value)} />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Description (optional)</Label>
                      <Input
                        value={fileDescription}
                        maxLength={300}
                        onChange={(e) => setFileDescription(e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Input
                      ref={fileInputRef}
                      type="file"
                      accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,image/*"
                      onChange={(e) => handleFileUpload(e.target.files?.[0])}
                    />
                    {addFile.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Upload className="h-4 w-4 text-muted-foreground" />
                    )}
                  </div>
                </div>

                {files.map((file) => (
                  <div key={file.id} className="flex items-center justify-between border border-border rounded-md p-3">
                    <div className="min-w-0">
                      <p className="font-medium text-sm truncate">{file.title}</p>
                      <p className="text-xs text-muted-foreground truncate">{file.file_name}</p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive"
                      onClick={() =>
                        deleteFile.mutate({ id: file.id, partnerId: partner.id, filePath: file.file_path })
                      }
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                <p className="text-xs text-muted-foreground">
                  Documents can be downloaded only by signed-in HESS members.
                </p>
              </>
            )}
          </TabsContent>

          {/* Member offers */}
          <TabsContent value="offers" className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Shown only to signed-in members. Public visitors see a sign-in prompt instead.
            </p>
            <PartnerMicrositeEditor
              value={memberOfferHtml}
              onChange={setMemberOfferHtml}
              height={380}
              placeholder="Describe HESS member pricing, discounts or special terms..."
            />
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={busy}>
            {busy && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Save partner
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
