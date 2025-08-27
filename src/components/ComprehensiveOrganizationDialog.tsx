import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { useMembers, Organization, CreateOrganizationData } from '@/hooks/useMembers';
import { CalendarIcon, User, Building2, Mail, Phone, MapPin, Database, Monitor, Trash2, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';

const organizationSchema = z.object({
  name: z.string().min(2, 'Organization name must be at least 2 characters'),
  email: z.string().email('Invalid email address').optional().or(z.literal('')),
  phone: z.string().optional(),
  website: z.string().optional(),
  address_line_1: z.string().optional(),
  address_line_2: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zip_code: z.string().optional(),
  country: z.string().min(1, 'Country is required'),
  membership_status: z.enum(['active', 'pending', 'expired', 'cancelled']),
  membership_start_date: z.date().optional(),
  membership_end_date: z.date().optional(),
  notes: z.string().optional(),
});

const profileSchema = z.object({
  first_name: z.string().min(1, 'First name is required'),
  last_name: z.string().min(1, 'Last name is required'),
  email: z.string().email('Invalid email address'),
  phone: z.string().optional(),
  organization: z.string().optional(),
  state_association: z.string().optional(),
  student_fte: z.number().min(0).optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zip: z.string().optional(),
  primary_contact_title: z.string().optional(),
  secondary_first_name: z.string().optional(),
  secondary_last_name: z.string().optional(),
  secondary_contact_title: z.string().optional(),
  secondary_contact_email: z.string().email('Invalid email').optional().or(z.literal('')),
  student_information_system: z.string().optional(),
  financial_system: z.string().optional(),
  financial_aid: z.string().optional(),
  hcm_hr: z.string().optional(),
  payroll_system: z.string().optional(),
  purchasing_system: z.string().optional(),
  housing_management: z.string().optional(),
  learning_management: z.string().optional(),
  admissions_crm: z.string().optional(),
  alumni_advancement_crm: z.string().optional(),
  primary_office_apple: z.boolean().optional(),
  primary_office_asus: z.boolean().optional(),
  primary_office_dell: z.boolean().optional(),
  primary_office_hp: z.boolean().optional(),
  primary_office_microsoft: z.boolean().optional(),
  primary_office_other: z.boolean().optional(),
  primary_office_other_details: z.string().optional(),
  other_software_comments: z.string().optional(),
});

type OrganizationFormData = z.infer<typeof organizationSchema>;
type ProfileFormData = z.infer<typeof profileSchema>;

interface OrganizationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organization?: Organization | null;
}

export function ComprehensiveOrganizationDialog({ open, onOpenChange, organization }: OrganizationDialogProps) {
  const { createOrganization, updateOrganization, fetchOrganizations, deleteOrganization } = useMembers();
  const { isAdmin } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const handleDelete = async () => {
    if (!organization) return;
    
    try {
      await deleteOrganization(organization.id);
      onOpenChange(false);
      toast({
        title: "Organization Deleted",
        description: "Organization has been removed from membership.",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to delete organization",
        variant: "destructive"
      });
    }
  };

  const orgForm = useForm<OrganizationFormData>({
    resolver: zodResolver(organizationSchema),
    defaultValues: {
      name: '',
      email: '',
      phone: '',
      website: '',
      address_line_1: '',
      address_line_2: '',
      city: '',
      state: '',
      zip_code: '',
      country: 'United States',
      membership_status: 'pending',
      notes: '',
    },
  });

  const profileForm = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      first_name: '',
      last_name: '',
      email: '',
      phone: '',
      organization: '',
      state_association: '',
      student_fte: 0,
      address: '',
      city: '',
      state: '',
      zip: '',
      primary_contact_title: '',
      secondary_first_name: '',
      secondary_last_name: '',
      secondary_contact_title: '',
      secondary_contact_email: '',
      student_information_system: '',
      financial_system: '',
      financial_aid: '',
      hcm_hr: '',
      payroll_system: '',
      purchasing_system: '',
      housing_management: '',
      learning_management: '',
      admissions_crm: '',
      alumni_advancement_crm: '',
      primary_office_apple: false,
      primary_office_asus: false,
      primary_office_dell: false,
      primary_office_hp: false,
      primary_office_microsoft: false,
      primary_office_other: false,
      primary_office_other_details: '',
      other_software_comments: '',
    },
  });

  useEffect(() => {
    if (organization) {
      // Set organization form data
      orgForm.reset({
        name: organization.name,
        email: organization.email || '',
        phone: organization.phone || '',
        website: organization.website || '',
        address_line_1: organization.address_line_1 || '',
        address_line_2: organization.address_line_2 || '',
        city: organization.city || '',
        state: organization.state || '',
        zip_code: organization.zip_code || '',
        country: organization.country,
        membership_status: organization.membership_status,
        membership_start_date: organization.membership_start_date ? new Date(organization.membership_start_date) : undefined,
        membership_end_date: organization.membership_end_date ? new Date(organization.membership_end_date) : undefined,
        notes: organization.notes || '',
      });

      // Set profile form data if profile exists
      if (organization.profiles) {
        const profile = organization.profiles;
        profileForm.reset({
          first_name: profile.first_name || '',
          last_name: profile.last_name || '',
          email: profile.email || '',
          phone: profile.phone || '',
          organization: profile.organization || '',
          state_association: profile.state_association || '',
          student_fte: organization?.student_fte || 0,
          address: profile.address || '',
          city: profile.city || '',
          state: profile.state || '',
          zip: profile.zip || '',
          primary_contact_title: profile.primary_contact_title || '',
          secondary_first_name: profile.secondary_first_name || '',
          secondary_last_name: profile.secondary_last_name || '',
          secondary_contact_title: profile.secondary_contact_title || '',
          secondary_contact_email: profile.secondary_contact_email || '',
          student_information_system: profile.student_information_system || '',
          financial_system: profile.financial_system || '',
          financial_aid: profile.financial_aid || '',
          hcm_hr: profile.hcm_hr || '',
          payroll_system: profile.payroll_system || '',
          purchasing_system: profile.purchasing_system || '',
          housing_management: profile.housing_management || '',
          learning_management: profile.learning_management || '',
          admissions_crm: profile.admissions_crm || '',
          alumni_advancement_crm: profile.alumni_advancement_crm || '',
          primary_office_apple: profile.primary_office_apple || false,
          primary_office_asus: profile.primary_office_asus || false,
          primary_office_dell: profile.primary_office_dell || false,
          primary_office_hp: profile.primary_office_hp || false,
          primary_office_microsoft: profile.primary_office_microsoft || false,
          primary_office_other: profile.primary_office_other || false,
          primary_office_other_details: profile.primary_office_other_details || '',
          other_software_comments: profile.other_software_comments || '',
        });
      }
    } else {
      orgForm.reset();
      profileForm.reset();
    }
  }, [organization, orgForm, profileForm]);

  const onSubmit = async () => {
    console.log('=== Form Submission Debug ===');
    
    const orgValid = await orgForm.trigger();
    const profileValid = organization?.profiles ? await profileForm.trigger() : true;
    
    console.log('Organization form valid:', orgValid);
    console.log('Profile form valid:', profileValid);

    if (!orgValid || !profileValid) {
      console.log('Form validation failed, stopping submission');
      return;
    }

    const orgData = orgForm.getValues();
    const profileData = profileForm.getValues();
    
    console.log('Organization data:', orgData);
    console.log('Profile data:', profileData);
    console.log('Student FTE from profile data:', profileData.student_fte);

    setIsSubmitting(true);
    try {
      if (organization) {
        console.log('Updating existing organization...');
        
        const profileData = profileForm.getValues();
        
        // Use the updateOrganization hook method instead of direct Supabase calls
        const orgUpdateData = {
          name: orgData.name,
          email: orgData.email || null,
          phone: orgData.phone || null,
          website: orgData.website || null,
          address_line_1: orgData.address_line_1 || null,
          address_line_2: orgData.address_line_2 || null,
          city: orgData.city || null,
          state: orgData.state || null,
          zip_code: orgData.zip_code || null,
          country: orgData.country,
          membership_status: orgData.membership_status,
          membership_start_date: orgData.membership_start_date?.toISOString().split('T')[0] || null,
          membership_end_date: orgData.membership_end_date?.toISOString().split('T')[0] || null,
          student_fte: profileData.student_fte || null,
          notes: orgData.notes || null,
        };

        console.log('Updating organization with data:', orgUpdateData);
        
        // This automatically calls fetchOrganizations() after update
        await updateOrganization(organization.id, orgUpdateData);

        // Then update the profile if it exists
        if (organization.contact_person_id) {
          const profileUpdateData = {
            first_name: profileData.first_name || '',
            last_name: profileData.last_name || '',
            email: profileData.email || '',
            phone: profileData.phone || null,
            organization: profileData.organization || '',
            state_association: profileData.state_association || null,
            address: profileData.address || null,
            city: profileData.city || null,
            state: profileData.state || null,
            zip: profileData.zip || null,
            primary_contact_title: profileData.primary_contact_title || null,
            secondary_first_name: profileData.secondary_first_name || null,
            secondary_last_name: profileData.secondary_last_name || null,
            secondary_contact_title: profileData.secondary_contact_title || null,
            secondary_contact_email: profileData.secondary_contact_email || null,
            student_information_system: profileData.student_information_system || null,
            financial_system: profileData.financial_system || null,
            financial_aid: profileData.financial_aid || null,
            hcm_hr: profileData.hcm_hr || null,
            payroll_system: profileData.payroll_system || null,
            purchasing_system: profileData.purchasing_system || null,
            housing_management: profileData.housing_management || null,
            learning_management: profileData.learning_management || null,
            admissions_crm: profileData.admissions_crm || null,
            alumni_advancement_crm: profileData.alumni_advancement_crm || null,
            primary_office_apple: profileData.primary_office_apple || false,
            primary_office_asus: profileData.primary_office_asus || false,
            primary_office_dell: profileData.primary_office_dell || false,
            primary_office_hp: profileData.primary_office_hp || false,
            primary_office_microsoft: profileData.primary_office_microsoft || false,
            primary_office_other: profileData.primary_office_other || false,
            primary_office_other_details: profileData.primary_office_other_details || null,
            other_software_comments: profileData.other_software_comments || null,
          };
          
          console.log('Profile update data:', profileUpdateData);
          console.log('Updating profile with ID:', organization.contact_person_id);
          
          const { data: updatedProfile, error } = await supabase
            .from('profiles')
            .update(profileUpdateData)
            .eq('id', organization.contact_person_id)
            .select();

          if (error) {
            console.error('Profile update error:', error);
            throw error;
          }

          console.log('Profile updated successfully, result:', updatedProfile);
          
          // Refresh data once more after profile update to ensure UI is current
          await fetchOrganizations();

          toast({
            title: 'Success',
            description: 'Organization and profile updated successfully'
          });
          
        } else {
          toast({
            title: 'Success', 
            description: 'Organization updated successfully'
          });
        }
        
        // Close dialog immediately since data is already refreshed
        onOpenChange(false);
      } else {
        // Create new organization
        const createData: CreateOrganizationData = {
          name: orgData.name,
          country: orgData.country,
          membership_status: orgData.membership_status,
          annual_fee_amount: 1000,
          membership_start_date: orgData.membership_start_date?.toISOString().split('T')[0] || null,
          membership_end_date: orgData.membership_end_date?.toISOString().split('T')[0] || null,
          email: orgData.email || null,
          phone: orgData.phone || null,
          website: orgData.website || null,
          address_line_1: orgData.address_line_1 || null,
          address_line_2: orgData.address_line_2 || null,
          city: orgData.city || null,
          state: orgData.state || null,
          zip_code: orgData.zip_code || null,
          notes: orgData.notes || null,
        };
        await createOrganization(createData);
        onOpenChange(false);
      }
      
    } catch (error: any) {
      console.error('Form submission error:', error);
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive'
      });
      onOpenChange(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[95vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            {organization ? 'Organization & Member Details' : 'Add New Organization'}
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="organization" className="w-full">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="organization">Organization</TabsTrigger>
            <TabsTrigger value="contact" disabled={!organization?.profiles}>Primary Contact</TabsTrigger>
            <TabsTrigger value="secondary" disabled={!organization?.profiles}>Secondary Contact</TabsTrigger>
            <TabsTrigger value="systems" disabled={!organization?.profiles}>Systems</TabsTrigger>
            <TabsTrigger value="hardware" disabled={!organization?.profiles}>Hardware</TabsTrigger>
          </TabsList>

          <TabsContent value="organization" className="space-y-4">
            <Form {...orgForm}>
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={orgForm.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Organization Name *</FormLabel>
                      <FormControl>
                        <Input placeholder="ACME Corporation" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={orgForm.control}
                  name="membership_status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Membership Status</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select status" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="active">Active</SelectItem>
                          <SelectItem value="pending">Pending</SelectItem>
                          <SelectItem value="expired">Expired</SelectItem>
                          <SelectItem value="cancelled">Cancelled</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={orgForm.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Organization Email</FormLabel>
                      <FormControl>
                        <Input type="email" placeholder="contact@acme.com" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={orgForm.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Phone</FormLabel>
                      <FormControl>
                        <Input placeholder="(555) 123-4567" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={orgForm.control}
                  name="website"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Website</FormLabel>
                      <FormControl>
                        <Input placeholder="https://www.acme.com" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={profileForm.control}
                  name="student_fte"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Student FTE</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          placeholder="1000" 
                          {...field}
                          onChange={(e) => field.onChange(Number(e.target.value))}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <Separator />
              <h3 className="text-lg font-medium">Address</h3>
              
              <FormField
                control={orgForm.control}
                name="address_line_1"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Address Line 1</FormLabel>
                    <FormControl>
                      <Input placeholder="123 Main Street" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={orgForm.control}
                name="address_line_2"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Address Line 2</FormLabel>
                    <FormControl>
                      <Input placeholder="Suite 456" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-3 gap-4">
                <FormField
                  control={orgForm.control}
                  name="city"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>City</FormLabel>
                      <FormControl>
                        <Input placeholder="New York" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={orgForm.control}
                  name="state"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>State</FormLabel>
                      <FormControl>
                        <Input placeholder="NY" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={orgForm.control}
                  name="zip_code"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>ZIP Code</FormLabel>
                      <FormControl>
                        <Input placeholder="10001" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={orgForm.control}
                name="country"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Country</FormLabel>
                    <FormControl>
                      <Input placeholder="United States" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Separator />
              <h3 className="text-lg font-medium">Membership Details</h3>
              
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={orgForm.control}
                  name="membership_start_date"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Start Date</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant="outline"
                              className={cn(
                                "pl-3 text-left font-normal",
                                !field.value && "text-muted-foreground"
                              )}
                            >
                              {field.value ? (
                                format(field.value, "PPP")
                              ) : (
                                <span>Pick a date</span>
                              )}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={field.onChange}
                            initialFocus
                            className="p-3 pointer-events-auto"
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={orgForm.control}
                  name="membership_end_date"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>End Date</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant="outline"
                              className={cn(
                                "pl-3 text-left font-normal",
                                !field.value && "text-muted-foreground"
                              )}
                            >
                              {field.value ? (
                                format(field.value, "PPP")
                              ) : (
                                <span>Pick a date</span>
                              )}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={field.onChange}
                            initialFocus
                            className="p-3 pointer-events-auto"
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={orgForm.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Additional notes about this organization..."
                        rows={3}
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </Form>
          </TabsContent>

          {organization?.profiles && (
            <>
              <TabsContent value="contact" className="space-y-4">
                <Form {...profileForm}>
                  <h3 className="text-lg font-medium flex items-center gap-2">
                    <User className="h-5 w-5" />
                    Primary Contact Information
                  </h3>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={profileForm.control}
                      name="first_name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>First Name *</FormLabel>
                          <FormControl>
                            <Input placeholder="John" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={profileForm.control}
                      name="last_name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Last Name *</FormLabel>
                          <FormControl>
                            <Input placeholder="Doe" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={profileForm.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email *</FormLabel>
                          <FormControl>
                            <Input type="email" placeholder="john.doe@example.com" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={profileForm.control}
                      name="phone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Phone</FormLabel>
                          <FormControl>
                            <Input placeholder="(555) 123-4567" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={profileForm.control}
                      name="primary_contact_title"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Job Title</FormLabel>
                          <FormControl>
                            <Input placeholder="IT Director" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={profileForm.control}
                      name="state_association"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>State Association</FormLabel>
                          <FormControl>
                            <Input placeholder="State IT Association" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </Form>
              </TabsContent>

              <TabsContent value="secondary" className="space-y-4">
                <Form {...profileForm}>
                  <h3 className="text-lg font-medium flex items-center gap-2">
                    <User className="h-5 w-5" />
                    Secondary Contact Information
                  </h3>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={profileForm.control}
                      name="secondary_first_name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>First Name</FormLabel>
                          <FormControl>
                            <Input placeholder="Jane" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={profileForm.control}
                      name="secondary_last_name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Last Name</FormLabel>
                          <FormControl>
                            <Input placeholder="Smith" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={profileForm.control}
                      name="secondary_contact_email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email</FormLabel>
                          <FormControl>
                            <Input type="email" placeholder="jane.smith@example.com" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={profileForm.control}
                      name="secondary_contact_title"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Job Title</FormLabel>
                          <FormControl>
                            <Input placeholder="IT Manager" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </Form>
              </TabsContent>

              <TabsContent value="systems" className="space-y-4">
                <Form {...profileForm}>
                  <h3 className="text-lg font-medium flex items-center gap-2">
                    <Database className="h-5 w-5" />
                    Systems & Software Information
                  </h3>
                  
                  <div className="grid grid-cols-2 gap-4">
                    {[
                      { key: 'student_information_system', label: 'Student Information System', type: 'text' },
                      { key: 'financial_system', label: 'Financial System', type: 'text' },
                      { key: 'financial_aid', label: 'Financial Aid System', type: 'text' },
                      { key: 'hcm_hr', label: 'HCM/HR System', type: 'text' },
                      { key: 'payroll_system', label: 'Payroll System', type: 'text' },
                      { key: 'purchasing_system', label: 'Purchasing System', type: 'text' },
                      { key: 'housing_management', label: 'Housing Management', type: 'text' },
                      { key: 'learning_management', label: 'Learning Management System', type: 'text' },
                      { key: 'admissions_crm', label: 'Admissions CRM', type: 'text' },
                      { key: 'alumni_advancement_crm', label: 'Alumni/Advancement CRM', type: 'text' },
                    ].map(({ key, label }) => (
                      <FormField
                        key={key}
                        control={profileForm.control}
                        name={key as keyof ProfileFormData}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{label}</FormLabel>
                            <FormControl>
                              <Input placeholder={`Enter ${label.toLowerCase()}`} {...field} value={field.value as string || ''} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    ))}
                  </div>

                  <FormField
                    control={profileForm.control}
                    name="other_software_comments"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Additional Software Comments</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Any additional software or system information..."
                            rows={4}
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </Form>
              </TabsContent>

              <TabsContent value="hardware" className="space-y-4">
                <Form {...profileForm}>
                  <h3 className="text-lg font-medium flex items-center gap-2">
                    <Monitor className="h-5 w-5" />
                    Hardware Information
                  </h3>
                  
                  <Card>
                    <CardHeader>
                      <CardTitle>Primary Office Hardware</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 gap-4">
                        {[
                          { key: 'primary_office_apple', label: 'Apple' },
                          { key: 'primary_office_asus', label: 'ASUS' },
                          { key: 'primary_office_dell', label: 'Dell' },
                          { key: 'primary_office_hp', label: 'HP' },
                          { key: 'primary_office_microsoft', label: 'Microsoft' },
                          { key: 'primary_office_other', label: 'Other' },
                        ].map(({ key, label }) => (
                          <FormField
                            key={key}
                            control={profileForm.control}
                            name={key as keyof ProfileFormData}
                            render={({ field }) => (
                              <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                                <div className="space-y-0.5">
                                  <FormLabel>{label}</FormLabel>
                                </div>
                                <FormControl>
                                  <Switch
                                    checked={field.value as boolean}
                                    onCheckedChange={field.onChange}
                                  />
                                </FormControl>
                              </FormItem>
                            )}
                          />
                        ))}
                      </div>

                      <FormField
                        control={profileForm.control}
                        name="primary_office_other_details"
                        render={({ field }) => (
                          <FormItem className="mt-4">
                            <FormLabel>Other Hardware Details</FormLabel>
                            <FormControl>
                              <Textarea 
                                placeholder="Describe other hardware used..."
                                rows={3}
                                {...field} 
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </CardContent>
                  </Card>
                </Form>
              </TabsContent>
            </>
          )}
        </Tabs>

        <div className="flex justify-between gap-2 pt-4 border-t">
          <div>
            {organization && isAdmin && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" size="sm">
                    <Trash2 className="h-4 w-4 mr-1" />
                    Delete Organization
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="h-5 w-5 text-destructive" />
                      <AlertDialogTitle>Delete Organization</AlertDialogTitle>
                    </div>
                    <AlertDialogDescription>
                      Are you sure you want to remove "{organization.name}" from organizational membership? 
                      This action cannot be undone and will permanently delete all organization data.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleDelete}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      Delete Organization
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={onSubmit} disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : organization ? 'Update' : 'Create'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}