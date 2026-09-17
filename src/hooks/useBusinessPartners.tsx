import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';

export interface BusinessPartner {
  id: string;
  name: string;
  slug: string;
  short_description: string | null;
  description_html: string | null;
  member_offer_html?: string | null;
  logo_url: string | null;
  banner_url: string | null;
  website_url: string | null;
  categories: string[];
  partnership_level_id?: string | null;
  is_featured: boolean;
  display_order: number;
  is_published?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface PartnerContact {
  id: string;
  partner_id: string;
  name: string;
  title: string | null;
  email: string | null;
  phone: string | null;
  display_order: number;
}

export interface PartnerFile {
  id: string;
  partner_id: string;
  title: string;
  description: string | null;
  file_path: string;
  file_name: string;
  mime_type: string | null;
  size_bytes: number | null;
  display_order: number;
}

// Private buckets: anonymous visitors may read partner-assets, so we mint a very
// long-lived signed URL once at upload time and store it with the record.
const LONG_LIVED_SECONDS = 60 * 60 * 24 * 365 * 10;

const randomName = (file: File) => {
  const ext = file.name.includes('.') ? file.name.split('.').pop() : 'bin';
  return `${crypto.randomUUID()}.${ext}`;
};

export async function uploadPartnerAsset(file: File): Promise<string> {
  const path = randomName(file);
  const { error } = await supabase.storage
    .from('partner-assets')
    .upload(path, file, { contentType: file.type || undefined });
  if (error) throw error;

  const { data, error: signError } = await supabase.storage
    .from('partner-assets')
    .createSignedUrl(path, LONG_LIVED_SECONDS);
  if (signError || !data?.signedUrl) throw signError ?? new Error('Could not build image URL');
  return data.signedUrl;
}

export async function uploadPartnerDocument(file: File): Promise<{
  file_path: string;
  file_name: string;
  mime_type: string | null;
  size_bytes: number;
}> {
  const path = randomName(file);
  const { error } = await supabase.storage
    .from('partner-files')
    .upload(path, file, { contentType: file.type || undefined });
  if (error) throw error;
  return {
    file_path: path,
    file_name: file.name,
    mime_type: file.type || null,
    size_bytes: file.size,
  };
}

export async function getPartnerFileUrl(filePath: string): Promise<string> {
  const { data, error } = await supabase.storage
    .from('partner-files')
    .createSignedUrl(filePath, 60 * 10);
  if (error || !data?.signedUrl) throw error ?? new Error('Could not prepare download');
  return data.signedUrl;
}

/** Directory listing. Signed-out visitors read the restricted public view. */
export const useBusinessPartners = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['business-partners', user ? 'auth' : 'public'],
    queryFn: async () => {
      if (!user) {
        const { data, error } = await supabase
          .from('public_business_partner_directory')
          .select('*')
          .order('is_featured', { ascending: false })
          .order('display_order', { ascending: true })
          .order('name', { ascending: true });
        if (error) throw error;
        return (data ?? []) as unknown as BusinessPartner[];
      }

      const { data, error } = await supabase
        .from('business_partners')
        .select('*')
        .eq('is_published', true)
        .order('is_featured', { ascending: false })
        .order('display_order', { ascending: true })
        .order('name', { ascending: true });
      if (error) throw error;
      return (data ?? []) as unknown as BusinessPartner[];
    },
  });
};

/** Every partner including drafts — admin management screen. */
export const useAllBusinessPartners = () =>
  useQuery({
    queryKey: ['business-partners', 'all'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('business_partners')
        .select('*')
        .order('display_order', { ascending: true })
        .order('name', { ascending: true });
      if (error) throw error;
      return (data ?? []) as unknown as BusinessPartner[];
    },
  });

export const useBusinessPartner = (slug?: string) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['business-partner', slug, user ? 'auth' : 'public'],
    enabled: !!slug,
    queryFn: async () => {
      if (!user) {
        const { data, error } = await supabase
          .from('public_business_partner_directory')
          .select('*')
          .eq('slug', slug!)
          .maybeSingle();
        if (error) throw error;
        return (data as unknown as BusinessPartner) ?? null;
      }

      const { data, error } = await supabase
        .from('business_partners')
        .select('*')
        .eq('slug', slug!)
        .maybeSingle();
      if (error) throw error;
      return (data as unknown as BusinessPartner) ?? null;
    },
  });
};

export const usePartnerContacts = (partnerId?: string) => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['business-partner-contacts', partnerId],
    enabled: !!partnerId && !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('business_partner_contacts')
        .select('*')
        .eq('partner_id', partnerId!)
        .order('display_order', { ascending: true });
      if (error) throw error;
      return (data ?? []) as unknown as PartnerContact[];
    },
  });
};

export const usePartnerFiles = (partnerId?: string) => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['business-partner-files', partnerId],
    enabled: !!partnerId && !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('business_partner_files')
        .select('*')
        .eq('partner_id', partnerId!)
        .order('display_order', { ascending: true });
      if (error) throw error;
      return (data ?? []) as unknown as PartnerFile[];
    },
  });
};

const invalidateAll = (qc: ReturnType<typeof useQueryClient>) => {
  qc.invalidateQueries({ queryKey: ['business-partners'] });
  qc.invalidateQueries({ queryKey: ['business-partner'] });
};

export const useSaveBusinessPartner = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (partner: Partial<BusinessPartner> & { name: string; slug: string }) => {
      const { id, created_at, updated_at, ...fields } = partner as any;

      if (id) {
        const { data, error } = await supabase
          .from('business_partners')
          .update(fields)
          .eq('id', id)
          .select()
          .single();
        if (error) throw error;
        return data as unknown as BusinessPartner;
      }

      const { data: userData } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from('business_partners')
        .insert({ ...fields, created_by: userData.user?.id })
        .select()
        .single();
      if (error) throw error;
      return data as unknown as BusinessPartner;
    },
    onSuccess: () => {
      invalidateAll(queryClient);
      toast({ title: 'Saved', description: 'Business partner saved successfully.' });
    },
    onError: (error: any) =>
      toast({
        title: 'Error',
        description: error.message || 'Could not save this partner.',
        variant: 'destructive',
      }),
  });
};

export const useDeleteBusinessPartner = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('business_partners').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidateAll(queryClient);
      toast({ title: 'Deleted', description: 'Business partner removed.' });
    },
    onError: (error: any) =>
      toast({
        title: 'Error',
        description: error.message || 'Could not delete this partner.',
        variant: 'destructive',
      }),
  });
};

export const useSavePartnerContacts = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      partnerId,
      contacts,
    }: {
      partnerId: string;
      contacts: Array<Partial<PartnerContact> & { name: string }>;
    }) => {
      const { error: delError } = await supabase
        .from('business_partner_contacts')
        .delete()
        .eq('partner_id', partnerId);
      if (delError) throw delError;

      if (contacts.length === 0) return;

      const rows = contacts.map((c, index) => ({
        partner_id: partnerId,
        name: c.name,
        title: c.title || null,
        email: c.email || null,
        phone: c.phone || null,
        display_order: index,
      }));
      const { error } = await supabase.from('business_partner_contacts').insert(rows);
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      queryClient.invalidateQueries({ queryKey: ['business-partner-contacts', vars.partnerId] });
    },
    onError: (error: any) =>
      toast({
        title: 'Error',
        description: error.message || 'Could not save contacts.',
        variant: 'destructive',
      }),
  });
};

export const useAddPartnerFile = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      partnerId,
      file,
      title,
      description,
      displayOrder,
    }: {
      partnerId: string;
      file: File;
      title: string;
      description?: string;
      displayOrder: number;
    }) => {
      const uploaded = await uploadPartnerDocument(file);
      const { error } = await supabase.from('business_partner_files').insert({
        partner_id: partnerId,
        title,
        description: description || null,
        display_order: displayOrder,
        ...uploaded,
      });
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      queryClient.invalidateQueries({ queryKey: ['business-partner-files', vars.partnerId] });
      toast({ title: 'Uploaded', description: 'File added to this partner.' });
    },
    onError: (error: any) =>
      toast({
        title: 'Error',
        description: error.message || 'Could not upload this file.',
        variant: 'destructive',
      }),
  });
};

export const useDeletePartnerFile = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, partnerId, filePath }: { id: string; partnerId: string; filePath: string }) => {
      const { error } = await supabase.from('business_partner_files').delete().eq('id', id);
      if (error) throw error;
      await supabase.storage.from('partner-files').remove([filePath]);
    },
    onSuccess: (_d, vars) => {
      queryClient.invalidateQueries({ queryKey: ['business-partner-files', vars.partnerId] });
      toast({ title: 'Removed', description: 'File deleted.' });
    },
    onError: (error: any) =>
      toast({
        title: 'Error',
        description: error.message || 'Could not delete this file.',
        variant: 'destructive',
      }),
  });
};

export const slugify = (value: string) =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);

export interface PartnerReferenceSummary {
  id: string;
  partner_id: string;
  summary: string;
}

/** Single-paragraph HESS member institution references for a partner — members only. */
export const usePartnerReferenceSummary = (partnerId?: string) => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['business-partner-reference-summary', partnerId],
    enabled: !!partnerId && !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('business_partner_reference_summaries' as any)
        .select('*')
        .eq('partner_id', partnerId!)
        .maybeSingle();
      if (error) throw error;
      return (data as unknown as PartnerReferenceSummary | null) ?? null;
    },
  });
};

export const useSavePartnerReferenceSummary = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ partnerId, summary }: { partnerId: string; summary: string }) => {
      const trimmed = summary.trim();
      const { error } = await supabase
        .from('business_partner_reference_summaries' as any)
        .upsert({ partner_id: partnerId, summary: trimmed } as any, { onConflict: 'partner_id' });
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      queryClient.invalidateQueries({ queryKey: ['business-partner-reference-summary', vars.partnerId] });
    },
    onError: (error: any) =>
      toast({
        title: 'Error',
        description: error.message || 'Could not save references.',
        variant: 'destructive',
      }),
  });
};

export interface PartnerReference {
  id: string;
  partner_id: string;
  organization_id: string | null;
  institution_name: string;
  contact_name: string | null;
  contact_title: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  notes: string | null;
  display_order: number;
}

/** HESS member institution references for a partner — members only. */
export const usePartnerReferences = (partnerId?: string) => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['business-partner-references', partnerId],
    enabled: !!partnerId && !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('business_partner_references')
        .select('*')
        .eq('partner_id', partnerId!)
        .order('display_order', { ascending: true });
      if (error) throw error;
      return (data ?? []) as unknown as PartnerReference[];
    },
  });
};

export const useSavePartnerReferences = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      partnerId,
      references,
    }: {
      partnerId: string;
      references: Array<Partial<PartnerReference> & { institution_name: string }>;
    }) => {
      const { error: delError } = await supabase
        .from('business_partner_references')
        .delete()
        .eq('partner_id', partnerId);
      if (delError) throw delError;

      if (references.length === 0) return;

      const rows = references.map((r, index) => ({
        partner_id: partnerId,
        organization_id: r.organization_id || null,
        institution_name: r.institution_name,
        contact_name: r.contact_name || null,
        contact_title: r.contact_title || null,
        contact_email: r.contact_email || null,
        contact_phone: r.contact_phone || null,
        notes: r.notes || null,
        display_order: index,
      }));
      const { error } = await supabase.from('business_partner_references').insert(rows);
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      queryClient.invalidateQueries({ queryKey: ['business-partner-references', vars.partnerId] });
    },
    onError: (error: any) =>
      toast({
        title: 'Error',
        description: error.message || 'Could not save references.',
        variant: 'destructive',
      }),
  });
};
