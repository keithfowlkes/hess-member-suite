import React, { useState, useRef, useEffect } from 'react';
import { Navigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import ReCAPTCHA from 'react-google-recaptcha';
import { useSystemSetting } from '@/hooks/useSystemSettings';
import { useFieldOptions, type SystemField } from '@/hooks/useSystemFieldOptions';
import { useOrganizations } from '@/hooks/useOrganizations';
import { useCreateReassignmentRequest } from '@/hooks/useReassignmentRequests';

export default function Auth() {
  const { user, signIn, signUp, loading } = useAuth();
  const { toast } = useToast();
  const { data: organizations = [] } = useOrganizations();
  const createReassignmentRequest = useCreateReassignmentRequest();
  const { data: recaptchaSetting } = useSystemSetting('recaptcha_site_key');
  
  const [signInForm, setSignInForm] = useState({ email: '', password: '' });
  const [signInCaptcha, setSignInCaptcha] = useState<string | null>(null);
  const [signUpCaptcha, setSignUpCaptcha] = useState<string | null>(null);
  const [isReassignment, setIsReassignment] = useState(false);
  const [selectedOrganizationId, setSelectedOrganizationId] = useState<string>('');
  const signInCaptchaRef = useRef<ReCAPTCHA>(null);
  const signUpCaptchaRef = useRef<ReCAPTCHA>(null);
  
  // Get reCAPTCHA site key from database or fallback to test key
  const recaptchaSiteKey = recaptchaSetting?.setting_value || "6LeIxAcTAAAAAJcZVRqyHh71UMIEGNQ_MXjiZKhI";

  // System field select component
  const SystemFieldSelect = ({ 
    fieldName, 
    label, 
    value, 
    onChange, 
    disabled 
  }: {
    fieldName: SystemField;
    label: string;
    value: string;
    onChange: (value: string) => void;
    disabled: boolean;
  }) => {
    const options = useFieldOptions(fieldName);
    
    return (
      <div className="space-y-2">
        <Label htmlFor={fieldName}>{label}</Label>
        <Select 
          value={value} 
          onValueChange={onChange} 
          disabled={disabled}
        >
          <SelectTrigger className="bg-gray-50 border-gray-300">
            <SelectValue placeholder={`Select ${label.toLowerCase()}`} />
          </SelectTrigger>
          <SelectContent className="max-h-60 overflow-y-auto bg-white border border-gray-300 shadow-lg z-50">
            <SelectItem value="">
              <span className="text-gray-500">None specified</span>
            </SelectItem>
            {options.map((option) => (
              <SelectItem key={option} value={option}>
                {option}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    );
  };
  
  const [signUpForm, setSignUpForm] = useState({ 
    isPrivateNonProfit: false,
    email: '', 
    password: '', 
    firstName: '', 
    lastName: '',
    organization: '',
    stateAssociation: '',
    studentFte: '',
    address: '',
    city: '',
    state: '',
    zip: '',
    primaryContactTitle: '',
    secondaryFirstName: '',
    secondaryLastName: '',
    secondaryContactTitle: '',
    secondaryContactEmail: '',
    studentInformationSystem: '',
    financialSystem: '',
    financialAid: '',
    hcmHr: '',
    payrollSystem: '',
    purchasingSystem: '',
    housingManagement: '',
    learningManagement: '',
    admissionsCrm: '',
    alumniAdvancementCrm: '',
    primaryOfficeApple: false,
    primaryOfficeAsus: false,
    primaryOfficeDell: false,
    primaryOfficeHp: false,
    primaryOfficeMicrosoft: false,
    primaryOfficeOther: false,
    primaryOfficeOtherDetails: '',
    otherSoftwareComments: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (user) {
    return <Navigate to="/" replace />;
  }

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!signInCaptcha) {
      toast({
        title: "Verification required",
        description: "Please complete the captcha verification.",
        variant: "destructive"
      });
      return;
    }
    
    setIsSubmitting(true);
    
    const { error } = await signIn(signInForm.email, signInForm.password);
    
    if (error) {
      toast({
        title: "Sign in failed",
        description: error.message,
        variant: "destructive"
      });
      // Reset captcha on error
      signInCaptchaRef.current?.reset();
      setSignInCaptcha(null);
    } else {
      toast({
        title: "Welcome back!",
        description: "You have been signed in successfully.",
      });
    }
    setIsSubmitting(false);
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!signUpCaptcha) {
      toast({
        title: "Verification required",
        description: "Please complete the captcha verification.",
        variant: "destructive"
      });
      return;
    }
    
    setIsSubmitting(true);

    // If this is a reassignment request, handle differently
    if (isReassignment && selectedOrganizationId) {
      try {
        // Get the current organization data
        const { data: currentOrg, error: fetchError } = await supabase
          .from('organizations')
          .select('*')
          .eq('id', selectedOrganizationId)
          .single();

        if (fetchError) throw fetchError;

        // Create reassignment request with new data
        const newOrgData = {
          name: signUpForm.organization,
          state_association: signUpForm.stateAssociation,
          student_fte: signUpForm.studentFte ? parseInt(signUpForm.studentFte) : null,
          address_line_1: signUpForm.address,
          city: signUpForm.city,
          state: signUpForm.state,
          zip_code: signUpForm.zip,
          primary_contact_title: signUpForm.primaryContactTitle,
          secondary_first_name: signUpForm.secondaryFirstName,
          secondary_last_name: signUpForm.secondaryLastName,
          secondary_contact_title: signUpForm.secondaryContactTitle,
          secondary_contact_email: signUpForm.secondaryContactEmail,
          student_information_system: signUpForm.studentInformationSystem,
          financial_system: signUpForm.financialSystem,
          financial_aid: signUpForm.financialAid,
          hcm_hr: signUpForm.hcmHr,
          payroll_system: signUpForm.payrollSystem,
          purchasing_system: signUpForm.purchasingSystem,
          housing_management: signUpForm.housingManagement,
          learning_management: signUpForm.learningManagement,
          admissions_crm: signUpForm.admissionsCrm,
          alumni_advancement_crm: signUpForm.alumniAdvancementCrm,
          primary_office_apple: signUpForm.primaryOfficeApple,
          primary_office_asus: signUpForm.primaryOfficeAsus,
          primary_office_dell: signUpForm.primaryOfficeDell,
          primary_office_hp: signUpForm.primaryOfficeHp,
          primary_office_microsoft: signUpForm.primaryOfficeMicrosoft,
          primary_office_other: signUpForm.primaryOfficeOther,
          primary_office_other_details: signUpForm.primaryOfficeOtherDetails,
          other_software_comments: signUpForm.otherSoftwareComments
        };

        await createReassignmentRequest.mutateAsync({
          organization_id: selectedOrganizationId,
          new_contact_email: signUpForm.email,
          new_organization_data: newOrgData,
          original_organization_data: currentOrg
        });

        // Reset captcha after success
        signUpCaptchaRef.current?.reset();
        setSignUpCaptcha(null);
      } catch (error: any) {
        toast({
          title: "Reassignment request failed",
          description: error.message,
          variant: "destructive"
        });
        // Reset captcha on error
        signUpCaptchaRef.current?.reset();
        setSignUpCaptcha(null);
      }
    } else {
      // Normal registration
      const { error } = await signUp(
        signUpForm.email, 
        signUpForm.password,
        signUpForm
      );
      
      if (error) {
        toast({
          title: "Sign up failed", 
          description: error.message,
          variant: "destructive"
        });
        // Reset captcha on error
        signUpCaptchaRef.current?.reset();
        setSignUpCaptcha(null);
      } else {
        // Send welcome email to new registrants
        await supabase.functions.invoke('organization-emails', {
          body: {
            type: 'welcome',
            to: signUpForm.email,
            organizationName: signUpForm.organization
          }
        });

        toast({
          title: "Registration submitted!",
          description: isReassignment 
            ? "Reassignment request submitted and awaiting admin approval."
            : "Please check your email and await approval from our admin team.",
        });
        
        // Reset captcha after success
        signUpCaptchaRef.current?.reset();
        setSignUpCaptcha(null);
      }
    }
    setIsSubmitting(false);
  };

  // Update organization field when organization is selected from dropdown
  const handleOrganizationSelect = (organizationId: string) => {
    setSelectedOrganizationId(organizationId);
    const selectedOrg = organizations.find(org => org.id === organizationId);
    if (selectedOrg) {
      setSignUpForm(prev => ({ ...prev, organization: selectedOrg.name }));
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 p-4">
      <div className="w-full max-w-4xl mx-auto">

        <Tabs defaultValue="signin" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="signin" className="text-base py-3">Sign In</TabsTrigger>
            <TabsTrigger value="signup" className="text-base py-3">New Member Registration or Reassignment</TabsTrigger>
          </TabsList>
          
          <TabsContent value="signin">
            <div className="bg-auth-form rounded-lg shadow-sm p-8">
              <div className="border-b border-gray-200 pb-4 mb-6">
                <h2 className="text-xl font-semibold text-gray-800">Sign In</h2>
                <p className="text-gray-600 mt-1">
                  Sign in to your HESS Consortium account
                </p>
              </div>
              <form onSubmit={handleSignIn} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="signin-email" className="text-gray-700 font-medium">
                      Email <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="signin-email"
                      type="email"
                      placeholder="Enter your email"
                      value={signInForm.email}
                      onChange={(e) => setSignInForm(prev => ({ ...prev, email: e.target.value }))}
                      className="bg-gray-50 border-gray-300"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signin-password" className="text-gray-700 font-medium">
                      Password <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="signin-password"
                      type="password"
                      placeholder="Enter your password"
                      value={signInForm.password}
                      onChange={(e) => setSignInForm(prev => ({ ...prev, password: e.target.value }))}
                      className="bg-gray-50 border-gray-300"
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-gray-700 font-medium">Security Verification</Label>
                  <ReCAPTCHA
                    ref={signInCaptchaRef}
                    sitekey={recaptchaSiteKey}
                    onChange={setSignInCaptcha}
                  />
                </div>
                <Button type="submit" className="w-full bg-auth-button hover:bg-auth-button/90 text-auth-button-foreground py-3" disabled={isSubmitting || !signInCaptcha}>
                  {isSubmitting ? 'Signing in...' : 'Sign In'}
                </Button>
              </form>
            </div>
          </TabsContent>
          
          <TabsContent value="signup">
            <div className="bg-auth-form rounded-lg shadow-sm p-8">
              <div className="border-b border-gray-200 pb-4 mb-6">
                <h2 className="text-xl font-semibold text-gray-800">New Member Registration or Reassignment</h2>
                <p className="text-gray-600 mt-1">
                  Register your organization with HESS Consortium or request reassignment
                </p>
              </div>
              <form onSubmit={handleSignUp} className="space-y-8">
                  {/* Reassignment Checkbox */}
                  <div className="space-y-4 pb-6 border-b">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="reassignment-request"
                        checked={isReassignment}
                        onCheckedChange={(checked) => {
                          setIsReassignment(checked === true);
                          if (!checked) {
                            setSelectedOrganizationId('');
                            setSignUpForm(prev => ({ ...prev, organization: '' }));
                          }
                        }}
                      />
                      <Label 
                        htmlFor="reassignment-request" 
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                      >
                        This is a reassignment request for my organization
                      </Label>
                    </div>
                    {isReassignment && (
                      <p className="text-sm text-muted-foreground bg-blue-50 p-3 rounded-md border-l-4 border-blue-400">
                        <strong>Note:</strong> Your reassignment request will be reviewed by an administrator before approval. 
                        If approved, the existing organization information will be replaced with your new details.
                      </p>
                    )}
                  </div>

                {/* Institution Type Verification */}
                <div className="space-y-4 pb-6 border-b border-gray-200">
                  <div className="flex items-start space-x-2">
                    <Checkbox
                      id="private-nonprofit"
                      checked={signUpForm.isPrivateNonProfit}
                      onCheckedChange={(checked) => 
                        setSignUpForm(prev => ({ ...prev, isPrivateNonProfit: checked === true }))
                      }
                      className="mt-1"
                    />
                    <Label 
                      htmlFor="private-nonprofit" 
                      className="text-gray-700 font-medium leading-relaxed peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                      We are a private, non-profit institution <span className="text-red-500">*</span>
                      <br />
                      <span className="text-sm text-gray-600 font-normal">
                        Yes, we are a private, non-profit institution of higher education
                      </span>
                      <br />
                      <span className="text-xs text-gray-500 font-normal">
                        Only private, non-profit institutions are eligible.
                      </span>
                    </Label>
                  </div>
                </div>

                {/* Organization Information */}
                <div className="space-y-6">
                  <h3 className="text-lg font-semibold text-gray-800 border-b border-gray-200 pb-2">Institutional Information</h3>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="organization" className="text-gray-700 font-medium">
                        Your college or university <span className="text-red-500">*</span>
                      </Label>
                      {isReassignment ? (
                        <Select value={selectedOrganizationId} onValueChange={handleOrganizationSelect}>
                          <SelectTrigger className="bg-gray-50 border-gray-300">
                            <SelectValue placeholder="Select an existing organization" />
                          </SelectTrigger>
                          <SelectContent>
                            {organizations.map((org) => (
                              <SelectItem key={org.id} value={org.id}>
                                {org.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <Input
                          id="organization"
                          placeholder="Organization name"
                          value={signUpForm.organization}
                          onChange={(e) => setSignUpForm(prev => ({ ...prev, organization: e.target.value }))}
                          className="bg-gray-50 border-gray-300"
                          disabled={!signUpForm.isPrivateNonProfit}
                          required
                        />
                      )}
                      <p className="text-xs text-gray-500">Only private, non-profit institutions are eligible.</p>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="state-association" className="text-gray-700 font-medium">
                        State Association (if applicable)
                      </Label>
                      <Input
                        id="state-association"
                        placeholder="State association"
                        value={signUpForm.stateAssociation}
                        onChange={(e) => setSignUpForm(prev => ({ ...prev, stateAssociation: e.target.value }))}
                        className="bg-gray-50 border-gray-300"
                        disabled={!signUpForm.isPrivateNonProfit}
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="student-fte" className="text-gray-700 font-medium">
                        Student FTE <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="student-fte"
                        type="number"
                        placeholder="Student FTE"
                        value={signUpForm.studentFte}
                        onChange={(e) => setSignUpForm(prev => ({ ...prev, studentFte: e.target.value }))}
                        className="bg-gray-50 border-gray-300"
                        disabled={!signUpForm.isPrivateNonProfit}
                      />
                      <p className="text-xs text-gray-500">IPEDS headcount</p>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="address" className="text-gray-700 font-medium">
                        Institutional Mailing Address <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="address"
                        placeholder="Address"
                        value={signUpForm.address}
                        onChange={(e) => setSignUpForm(prev => ({ ...prev, address: e.target.value }))}
                        className="bg-gray-50 border-gray-300"
                        disabled={!signUpForm.isPrivateNonProfit}
                        required
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="city" className="text-gray-700 font-medium">
                        City <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="city"
                        placeholder="City"
                        value={signUpForm.city}
                        onChange={(e) => setSignUpForm(prev => ({ ...prev, city: e.target.value }))}
                        className="bg-gray-50 border-gray-300"
                        disabled={!signUpForm.isPrivateNonProfit}
                        required
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="state" className="text-gray-700 font-medium">
                        State (two letter abbrev) <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="state"
                        placeholder="State"
                        value={signUpForm.state}
                        onChange={(e) => setSignUpForm(prev => ({ ...prev, state: e.target.value }))}
                        className="bg-gray-50 border-gray-300"
                        disabled={!signUpForm.isPrivateNonProfit}
                        required
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="zip" className="text-gray-700 font-medium">
                        Zip Code <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="zip"
                        placeholder="Zip code"
                        value={signUpForm.zip}
                        onChange={(e) => setSignUpForm(prev => ({ ...prev, zip: e.target.value }))}
                        className="bg-gray-50 border-gray-300"
                        disabled={!signUpForm.isPrivateNonProfit}
                        required
                      />
                    </div>
                  </div>
                </div>

                {/* Institutional Contacts */}
                <div className="space-y-6">
                  <h3 className="text-lg font-semibold text-gray-800 border-b border-gray-200 pb-2">Institutional Contacts</h3>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="signup-firstname" className="text-gray-700 font-medium">
                        First Name- Primary Contact <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="signup-firstname"
                        placeholder="First name"
                        value={signUpForm.firstName}
                        onChange={(e) => setSignUpForm(prev => ({ ...prev, firstName: e.target.value }))}
                        className="bg-gray-50 border-gray-300"
                        disabled={!signUpForm.isPrivateNonProfit}
                        required
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="signup-lastname" className="text-gray-700 font-medium">
                        Last Name- Primary Contact <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="signup-lastname"
                        placeholder="Last name"
                        value={signUpForm.lastName}
                        onChange={(e) => setSignUpForm(prev => ({ ...prev, lastName: e.target.value }))}
                        className="bg-gray-50 border-gray-300"
                        disabled={!signUpForm.isPrivateNonProfit}
                        required
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="primary-contact-title" className="text-gray-700 font-medium">
                        Primary Contact Title <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="primary-contact-title"
                        placeholder="Title"
                        value={signUpForm.primaryContactTitle}
                        onChange={(e) => setSignUpForm(prev => ({ ...prev, primaryContactTitle: e.target.value }))}
                        className="bg-gray-50 border-gray-300"
                        disabled={!signUpForm.isPrivateNonProfit}
                        required
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="signup-email" className="text-gray-700 font-medium">
                        Primary Email <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="signup-email"
                        type="email"
                        placeholder="Email"
                        value={signUpForm.email}
                        onChange={(e) => setSignUpForm(prev => ({ ...prev, email: e.target.value }))}
                        className="bg-gray-50 border-gray-300"
                        disabled={!signUpForm.isPrivateNonProfit}
                        required
                      />
                      <p className="text-xs text-gray-500">Email</p>
                    </div>
                  </div>
                  
                  {!isReassignment && (
                    <div className="space-y-2">
                      <Label htmlFor="signup-password" className="text-gray-700 font-medium">
                        Password <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="signup-password"
                        type="password"
                        placeholder="Create a password"
                        value={signUpForm.password}
                        onChange={(e) => setSignUpForm(prev => ({ ...prev, password: e.target.value }))}
                        className="bg-gray-50 border-gray-300 max-w-md"
                        disabled={!signUpForm.isPrivateNonProfit}
                        required
                        minLength={6}
                      />
                      <p className="text-xs text-gray-500">Confirm Email</p>
                    </div>
                  )}
                </div>

                  {/* Secondary Contact */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold">Secondary Contact</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="secondary-firstname">First Name - Secondary Contact</Label>
                        <Input
                          id="secondary-firstname"
                          placeholder="First name"
                          value={signUpForm.secondaryFirstName}
                          onChange={(e) => setSignUpForm(prev => ({ ...prev, secondaryFirstName: e.target.value }))}
                          disabled={!signUpForm.isPrivateNonProfit}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="secondary-lastname">Last Name - Secondary Contact</Label>
                        <Input
                          id="secondary-lastname"
                          placeholder="Last name"
                          value={signUpForm.secondaryLastName}
                          onChange={(e) => setSignUpForm(prev => ({ ...prev, secondaryLastName: e.target.value }))}
                          disabled={!signUpForm.isPrivateNonProfit}
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="secondary-contact-title">Secondary Contact Title</Label>
                        <Input
                          id="secondary-contact-title"
                          placeholder="Job title"
                          value={signUpForm.secondaryContactTitle}
                          onChange={(e) => setSignUpForm(prev => ({ ...prev, secondaryContactTitle: e.target.value }))}
                          disabled={!signUpForm.isPrivateNonProfit}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="secondary-contact-email">Secondary Contact Email</Label>
                        <Input
                          id="secondary-contact-email"
                          type="email"
                          placeholder="Secondary contact email"
                          value={signUpForm.secondaryContactEmail}
                          onChange={(e) => setSignUpForm(prev => ({ ...prev, secondaryContactEmail: e.target.value }))}
                          disabled={!signUpForm.isPrivateNonProfit}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Systems Information */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold">Systems Information</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <SystemFieldSelect
                        fieldName="student_information_system"
                        label="Student Information System"
                        value={signUpForm.studentInformationSystem}
                        onChange={(value) => setSignUpForm(prev => ({ ...prev, studentInformationSystem: value }))}
                        disabled={!signUpForm.isPrivateNonProfit}
                      />
                      <SystemFieldSelect
                        fieldName="financial_system"
                        label="Financial System"
                        value={signUpForm.financialSystem}
                        onChange={(value) => setSignUpForm(prev => ({ ...prev, financialSystem: value }))}
                        disabled={!signUpForm.isPrivateNonProfit}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <SystemFieldSelect
                        fieldName="financial_aid"
                        label="Financial Aid"
                        value={signUpForm.financialAid}
                        onChange={(value) => setSignUpForm(prev => ({ ...prev, financialAid: value }))}
                        disabled={!signUpForm.isPrivateNonProfit}
                      />
                      <SystemFieldSelect
                        fieldName="hcm_hr"
                        label="HCM (HR)"
                        value={signUpForm.hcmHr}
                        onChange={(value) => setSignUpForm(prev => ({ ...prev, hcmHr: value }))}
                        disabled={!signUpForm.isPrivateNonProfit}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <SystemFieldSelect
                        fieldName="payroll_system"
                        label="Payroll System"
                        value={signUpForm.payrollSystem}
                        onChange={(value) => setSignUpForm(prev => ({ ...prev, payrollSystem: value }))}
                        disabled={!signUpForm.isPrivateNonProfit}
                      />
                      <SystemFieldSelect
                        fieldName="purchasing_system"
                        label="Purchasing System"
                        value={signUpForm.purchasingSystem}
                        onChange={(value) => setSignUpForm(prev => ({ ...prev, purchasingSystem: value }))}
                        disabled={!signUpForm.isPrivateNonProfit}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <SystemFieldSelect
                        fieldName="housing_management"
                        label="Housing Management"
                        value={signUpForm.housingManagement}
                        onChange={(value) => setSignUpForm(prev => ({ ...prev, housingManagement: value }))}
                        disabled={!signUpForm.isPrivateNonProfit}
                      />
                      <SystemFieldSelect
                        fieldName="learning_management"
                        label="Learning Management (LMS)"
                        value={signUpForm.learningManagement}
                        onChange={(value) => setSignUpForm(prev => ({ ...prev, learningManagement: value }))}
                        disabled={!signUpForm.isPrivateNonProfit}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <SystemFieldSelect
                        fieldName="admissions_crm"
                        label="Admissions CRM"
                        value={signUpForm.admissionsCrm}
                        onChange={(value) => setSignUpForm(prev => ({ ...prev, admissionsCrm: value }))}
                        disabled={!signUpForm.isPrivateNonProfit}
                      />
                      <SystemFieldSelect
                        fieldName="alumni_advancement_crm"
                        label="Alumni / Advancement CRM"
                        value={signUpForm.alumniAdvancementCrm}
                        onChange={(value) => setSignUpForm(prev => ({ ...prev, alumniAdvancementCrm: value }))}
                        disabled={!signUpForm.isPrivateNonProfit}
                      />
                    </div>
                  </div>

                  {/* Primary Office Computers */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold">Primary Office Computers</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id="apple"
                          checked={signUpForm.primaryOfficeApple}
                          onChange={(e) => setSignUpForm(prev => ({ ...prev, primaryOfficeApple: e.target.checked }))}
                          disabled={!signUpForm.isPrivateNonProfit}
                          className="rounded"
                        />
                        <Label htmlFor="apple">Apple</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id="asus"
                          checked={signUpForm.primaryOfficeAsus}
                          onChange={(e) => setSignUpForm(prev => ({ ...prev, primaryOfficeAsus: e.target.checked }))}
                          disabled={!signUpForm.isPrivateNonProfit}
                          className="rounded"
                        />
                        <Label htmlFor="asus">Asus</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id="dell"
                          checked={signUpForm.primaryOfficeDell}
                          onChange={(e) => setSignUpForm(prev => ({ ...prev, primaryOfficeDell: e.target.checked }))}
                          disabled={!signUpForm.isPrivateNonProfit}
                          className="rounded"
                        />
                        <Label htmlFor="dell">Dell</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id="hp"
                          checked={signUpForm.primaryOfficeHp}
                          onChange={(e) => setSignUpForm(prev => ({ ...prev, primaryOfficeHp: e.target.checked }))}
                          disabled={!signUpForm.isPrivateNonProfit}
                          className="rounded"
                        />
                        <Label htmlFor="hp">HP</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id="microsoft"
                          checked={signUpForm.primaryOfficeMicrosoft}
                          onChange={(e) => setSignUpForm(prev => ({ ...prev, primaryOfficeMicrosoft: e.target.checked }))}
                          disabled={!signUpForm.isPrivateNonProfit}
                          className="rounded"
                        />
                        <Label htmlFor="microsoft">Microsoft</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id="other"
                          checked={signUpForm.primaryOfficeOther}
                          onChange={(e) => setSignUpForm(prev => ({ ...prev, primaryOfficeOther: e.target.checked }))}
                          disabled={!signUpForm.isPrivateNonProfit}
                          className="rounded"
                        />
                        <Label htmlFor="other">Other</Label>
                      </div>
                    </div>
                    
                    {/* Conditional field for Other selection */}
                    {signUpForm.primaryOfficeOther && (
                      <div className="space-y-2">
                        <Label htmlFor="other-computer-details">You selected other. Please give us more information.</Label>
                        <Input
                          id="other-computer-details"
                          placeholder="Please specify other computer types..."
                          value={signUpForm.primaryOfficeOtherDetails}
                          onChange={(e) => setSignUpForm(prev => ({ ...prev, primaryOfficeOtherDetails: e.target.value }))}
                          disabled={!signUpForm.isPrivateNonProfit}
                        />
                      </div>
                    )}
                  </div>

                  {/* Additional Comments */}
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="other-software-comments">If you answered other above, please share other software and any comments on your operation?</Label>
                      <textarea
                        id="other-software-comments"
                        placeholder="Please share any additional information about your software and operations..."
                        value={signUpForm.otherSoftwareComments}
                        onChange={(e) => setSignUpForm(prev => ({ ...prev, otherSoftwareComments: e.target.value }))}
                        disabled={!signUpForm.isPrivateNonProfit}
                        className="w-full min-h-[100px] p-3 border border-input rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50 disabled:cursor-not-allowed"
                      />
                    </div>
                  </div>

                <div className="space-y-2">
                  <Label className="text-gray-700 font-medium">Security Verification</Label>
                  <ReCAPTCHA
                    ref={signUpCaptchaRef}
                    sitekey={recaptchaSiteKey}
                    onChange={setSignUpCaptcha}
                  />
                  {!recaptchaSetting?.setting_value && (
                    <p className="text-xs text-gray-500">
                      Using test reCAPTCHA key. Admin should configure production key in System Settings.
                    </p>
                  )}
                </div>

                <Button 
                  type="submit" 
                  className="w-full bg-auth-button hover:bg-auth-button/90 text-auth-button-foreground py-3" 
                  disabled={
                    isSubmitting || 
                    !signUpForm.isPrivateNonProfit || 
                    !signUpCaptcha ||
                    (isReassignment && !selectedOrganizationId)
                  }
                >
                  {isSubmitting 
                    ? (isReassignment ? 'Submitting request...' : 'Creating account...') 
                    : (isReassignment ? 'Submit Reassignment Request' : 'Register Organization')
                  }
                </Button>
              </form>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
