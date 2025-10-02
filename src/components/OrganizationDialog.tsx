import { useState, useEffect } from 'react';
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
import { useMembers, Organization, CreateOrganizationData } from '@/hooks/useMembers';
import { supabase } from '@/integrations/supabase/client';
import { CalendarIcon, User, Building2 } from 'lucide-react';
import { format } from 'date-fns';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown } from 'lucide-react';

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
  annual_fee_amount: z.number().min(0, 'Annual fee must be positive'),
  notes: z.string().optional(),
  // Systems & Software fields
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
  payment_platform: z.string().optional(),
  meal_plan_management: z.string().optional(),
  identity_management: z.string().optional(),
  door_access: z.string().optional(),
  document_management: z.string().optional(),
  primary_office_apple: z.boolean().optional(),
  primary_office_lenovo: z.boolean().optional(),
  primary_office_dell: z.boolean().optional(),
  primary_office_hp: z.boolean().optional(),
  primary_office_microsoft: z.boolean().optional(),
  primary_office_other: z.boolean().optional(),
  primary_office_other_details: z.string().optional(),
  other_software_comments: z.string().optional(),
  voip: z.string().optional(),
  network_infrastructure: z.string().optional(),
});

type OrganizationFormData = z.infer<typeof organizationSchema>;

interface OrganizationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organization?: Organization | null;
}

export function OrganizationDialog({ open, onOpenChange, organization }: OrganizationDialogProps) {
  const { createOrganization, updateOrganization } = useMembers();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [systemsExpanded, setSystemsExpanded] = useState(false);

  const form = useForm<OrganizationFormData>({
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
      annual_fee_amount: 1000,
      notes: '',
      // Systems & Software defaults
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
      payment_platform: '',
      meal_plan_management: '',
      identity_management: '',
      door_access: '',
      document_management: '',
      primary_office_apple: false,
      primary_office_lenovo: false,
      primary_office_dell: false,
      primary_office_hp: false,
      primary_office_microsoft: false,
      primary_office_other: false,
      primary_office_other_details: '',
      other_software_comments: '',
      voip: '',
      network_infrastructure: '',
    },
  });

  useEffect(() => {
    if (organization) {
      const profile = organization.profiles;
      form.reset({
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
        annual_fee_amount: organization.annual_fee_amount,
        notes: organization.notes || '',
        // Systems & Software from organization
        student_information_system: organization.student_information_system || '',
        financial_system: organization.financial_system || '',
        financial_aid: organization.financial_aid || '',
        hcm_hr: organization.hcm_hr || '',
        payroll_system: organization.payroll_system || '',
        purchasing_system: organization.purchasing_system || '',
        housing_management: organization.housing_management || '',
        learning_management: organization.learning_management || '',
        admissions_crm: organization.admissions_crm || '',
        alumni_advancement_crm: organization.alumni_advancement_crm || '',
        payment_platform: organization.payment_platform || '',
        meal_plan_management: organization.meal_plan_management || '',
        identity_management: organization.identity_management || '',
        door_access: organization.door_access || '',
        document_management: organization.document_management || '',
        primary_office_apple: organization.primary_office_apple || false,
        primary_office_lenovo: organization.primary_office_lenovo || false,
        primary_office_dell: organization.primary_office_dell || false,
        primary_office_hp: organization.primary_office_hp || false,
        primary_office_microsoft: organization.primary_office_microsoft || false,
        primary_office_other: organization.primary_office_other || false,
        primary_office_other_details: organization.primary_office_other_details || '',
        other_software_comments: organization.other_software_comments || '',
        voip: organization.voip || '',
        network_infrastructure: organization.network_infrastructure || '',
      });
    } else {
      form.reset({
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
        annual_fee_amount: 1000,
        notes: '',
        // Systems & Software defaults
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
        payment_platform: '',
        meal_plan_management: '',
        identity_management: '',
        door_access: '',
        document_management: '',
        primary_office_apple: false,
        primary_office_lenovo: false,
        primary_office_dell: false,
        primary_office_hp: false,
        primary_office_microsoft: false,
        primary_office_other: false,
        primary_office_other_details: '',
        other_software_comments: '',
        voip: '',
        network_infrastructure: '',
      });
    }
  }, [organization, form]);

  const onSubmit = async (data: OrganizationFormData) => {
    setIsSubmitting(true);
    try {
      if (organization) {
        // For updates, update both organization and profile data
        const orgUpdateData = {
          name: data.name,
          email: data.email || null,
          phone: data.phone || null,
          website: data.website || null,
          address_line_1: data.address_line_1 || null,
          address_line_2: data.address_line_2 || null,
          city: data.city || null,
          state: data.state || null,
          zip_code: data.zip_code || null,
          country: data.country,
          membership_status: data.membership_status,
          membership_start_date: data.membership_start_date?.toISOString().split('T')[0],
          membership_end_date: data.membership_end_date?.toISOString().split('T')[0],
          annual_fee_amount: data.annual_fee_amount,
          notes: data.notes || null,
        };
        await updateOrganization(organization.id, orgUpdateData);
      } else {
        // For creates, ensure we have all required data
        const createData: CreateOrganizationData = {
          name: data.name,
          country: data.country,
          membership_status: data.membership_status,
          annual_fee_amount: data.annual_fee_amount,
          membership_start_date: data.membership_start_date?.toISOString().split('T')[0] || null,
          membership_end_date: data.membership_end_date?.toISOString().split('T')[0] || null,
          email: data.email || null,
          phone: data.phone || null,
          website: data.website || null,
          address_line_1: data.address_line_1 || null,
          address_line_2: data.address_line_2 || null,
          city: data.city || null,
          state: data.state || null,
          zip_code: data.zip_code || null,
          notes: data.notes || null,
        };
        await createOrganization(createData);
      }
      
      onOpenChange(false);
    } catch (error) {
      // Error is handled in the hook
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            {organization ? 'Organization Details' : 'Add New Organization'}
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Organization Form */}
          <div className="lg:col-span-2">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
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
                    control={form.control}
                    name="membership_status"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Membership Status</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
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
                    control={form.control}
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
                    control={form.control}
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

                <FormField
                  control={form.control}
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

                <div className="space-y-4">
                  <h3 className="text-lg font-medium">Address</h3>
                  
                  <FormField
                    control={form.control}
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
                    control={form.control}
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
                      control={form.control}
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
                      control={form.control}
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
                      control={form.control}
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
                    control={form.control}
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
                </div>

                <div className="space-y-4">
                  <h3 className="text-lg font-medium">Membership Details</h3>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
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
                      control={form.control}
                      name="annual_fee_amount"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Annual Fee</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              min="0" 
                              step="0.01"
                              placeholder="1000.00" 
                              {...field}
                              onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Notes</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Additional notes about this organization..." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Systems & Software Information Section */}
                {organization && (
                  <Collapsible open={systemsExpanded} onOpenChange={setSystemsExpanded}>
                    <CollapsibleTrigger asChild>
                      <Button variant="outline" type="button" className="w-full justify-between">
                        Systems & Software Information
                        <ChevronDown className={cn("h-4 w-4 transition-transform", systemsExpanded && "rotate-180")} />
                      </Button>
                    </CollapsibleTrigger>
                    <CollapsibleContent className="space-y-4 mt-4">
                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="student_information_system"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Student Information System</FormLabel>
                              <FormControl>
                                <Input placeholder="e.g., Banner, PowerSchool" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="financial_system"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Financial System</FormLabel>
                              <FormControl>
                                <Input placeholder="e.g., Banner Finance" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="financial_aid"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Financial Aid System</FormLabel>
                              <FormControl>
                                <Input placeholder="e.g., PowerFAIDS" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="hcm_hr"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>HCM/HR System</FormLabel>
                              <FormControl>
                                <Input placeholder="e.g., Workday, PeopleSoft" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="payroll_system"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Payroll System</FormLabel>
                              <FormControl>
                                <Input placeholder="e.g., ADP, Paychex" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="purchasing_system"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Purchasing System</FormLabel>
                              <FormControl>
                                <Input placeholder="e.g., Colleague Procurement" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="housing_management"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Housing Management System</FormLabel>
                              <FormControl>
                                <Input placeholder="e.g., StarRez, RoomKey" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="learning_management"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Learning Management System</FormLabel>
                              <FormControl>
                                <Input placeholder="e.g., Canvas, Blackboard" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="admissions_crm"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Admissions CRM</FormLabel>
                              <FormControl>
                                <Input placeholder="e.g., SLATE, Element451" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="alumni_advancement_crm"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Alumni/Advancement CRM</FormLabel>
                              <FormControl>
                                <Input placeholder="e.g., Raiser's Edge, Ellucian CRM" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="voip"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>VoIP</FormLabel>
                              <FormControl>
                                <Input placeholder="e.g., Cisco, RingCentral" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="network_infrastructure"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Network Infrastructure</FormLabel>
                              <FormControl>
                                <Input placeholder="e.g., Cisco, Aruba" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <div className="space-y-4">
                        <h4 className="text-sm font-medium">Primary Office Equipment</h4>
                        <div className="grid grid-cols-3 gap-4">
                          <FormField
                            control={form.control}
                            name="primary_office_apple"
                            render={({ field }) => (
                              <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                                <FormControl>
                                  <Checkbox
                                    checked={field.value}
                                    onCheckedChange={field.onChange}
                                  />
                                </FormControl>
                                <FormLabel className="text-sm">Apple</FormLabel>
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="primary_office_lenovo"
                            render={({ field }) => (
                              <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                                <FormControl>
                                  <Checkbox
                                    checked={field.value}
                                    onCheckedChange={field.onChange}
                                  />
                                </FormControl>
                                <FormLabel className="text-sm">Lenovo</FormLabel>
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="primary_office_dell"
                            render={({ field }) => (
                              <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                                <FormControl>
                                  <Checkbox
                                    checked={field.value}
                                    onCheckedChange={field.onChange}
                                  />
                                </FormControl>
                                <FormLabel className="text-sm">Dell</FormLabel>
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="primary_office_hp"
                            render={({ field }) => (
                              <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                                <FormControl>
                                  <Checkbox
                                    checked={field.value}
                                    onCheckedChange={field.onChange}
                                  />
                                </FormControl>
                                <FormLabel className="text-sm">HP</FormLabel>
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="primary_office_microsoft"
                            render={({ field }) => (
                              <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                                <FormControl>
                                  <Checkbox
                                    checked={field.value}
                                    onCheckedChange={field.onChange}
                                  />
                                </FormControl>
                                <FormLabel className="text-sm">Microsoft</FormLabel>
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="primary_office_other"
                            render={({ field }) => (
                              <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                                <FormControl>
                                  <Checkbox
                                    checked={field.value}
                                    onCheckedChange={field.onChange}
                                  />
                                </FormControl>
                                <FormLabel className="text-sm">Other</FormLabel>
                              </FormItem>
                            )}
                          />
                        </div>

                        <FormField
                          control={form.control}
                          name="primary_office_other_details"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Other Equipment Details</FormLabel>
                              <FormControl>
                                <Input placeholder="Please specify other equipment" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="other_software_comments"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Additional Software Comments</FormLabel>
                              <FormControl>
                                <Textarea placeholder="Any additional software or system information..." {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                )}

                <div className="flex justify-end space-x-2 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => onOpenChange(false)}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? 'Saving...' : organization ? 'Update Organization' : 'Create Organization'}
                  </Button>
                </div>
              </form>
            </Form>
          </div>

          {/* Contact Person Info */}
          {organization?.profiles && (
            <div className="lg:col-span-1">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <User className="h-4 w-4" />
                    Primary Contact
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <p className="font-medium">
                      {organization.profiles.first_name} {organization.profiles.last_name}
                    </p>
                  </div>
                  {organization.profiles.email && (
                    <div>
                      <label className="text-xs text-muted-foreground">Email</label>
                      <p className="text-sm">{organization.profiles.email}</p>
                    </div>
                  )}
                  {organization.profiles.phone && (
                    <div>
                      <label className="text-xs text-muted-foreground">Phone</label>
                      <p className="text-sm">{organization.profiles.phone}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}