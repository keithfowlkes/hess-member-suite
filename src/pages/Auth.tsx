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
  const { data: recaptchaSetting, isLoading: isLoadingRecaptcha } = useSystemSetting('recaptcha_site_key');
  const { data: recaptchaEnabledSetting, isLoading: isLoadingRecaptchaEnabled } = useSystemSetting('recaptcha_enabled');
  
  const [signInForm, setSignInForm] = useState({ email: '', password: '' });
  const [signInCaptcha, setSignInCaptcha] = useState<string | null>(null);
  const [signUpCaptcha, setSignUpCaptcha] = useState<string | null>(null);
  const [isReassignment, setIsReassignment] = useState(false);
  const [selectedOrganizationId, setSelectedOrganizationId] = useState<string>('');
  const [showPasswordReset, setShowPasswordReset] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const signInCaptchaRef = useRef<ReCAPTCHA>(null);
  const signUpCaptchaRef = useRef<ReCAPTCHA>(null);
  
  // Get reCAPTCHA settings from database - wait for loading to complete
  const recaptchaSiteKey = isLoadingRecaptcha ? null : recaptchaSetting?.setting_value;
  const recaptchaEnabled = isLoadingRecaptchaEnabled ? true : (recaptchaEnabledSetting?.setting_value !== 'false');

  // System field select component
  const SystemFieldSelect = ({ 
    fieldName, 
    label, 
    value, 
    onChange, 
    disabled,
    customValue,
    onCustomValueChange,
    required = false
  }: {
    fieldName: SystemField;
    label: string;
    value: string;
    onChange: (value: string) => void;
    disabled: boolean;
    customValue: string;
    onCustomValueChange: (value: string) => void;
    required?: boolean;
  }) => {
    const options = useFieldOptions(fieldName);
    
    return (
      <div className="space-y-3">
        <Label htmlFor={fieldName} className="text-gray-700 font-medium text-sm">
          {label} {required && <span className="text-red-500">*</span>}
        </Label>
        <Select 
          value={value || "none"} 
          onValueChange={(val) => onChange(val === "none" ? "" : val)} 
          disabled={disabled}
          required={required}
        >
          <SelectTrigger className="h-11 bg-white border-gray-300 shadow-sm">
            <SelectValue placeholder={`Select ${label.toLowerCase()}`} />
          </SelectTrigger>
          <SelectContent className="max-h-60 overflow-y-auto bg-white dark:bg-gray-800 border border-input shadow-lg z-[9999] pointer-events-auto">
            <SelectItem value="none" className="bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700">
              <span className="text-muted-foreground">None specified</span>
            </SelectItem>
            {options.map((option) => (
              <SelectItem key={option} value={option} className="bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700">
                {option}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {value === 'Other' && (
          <div className="mt-2">
            <Input
              placeholder={`Please specify ${label.toLowerCase()}`}
              value={customValue}
              onChange={(e) => onCustomValueChange(e.target.value)}
              className="h-10 bg-gray-50 border-gray-300"
              disabled={disabled}
              required={required}
            />
          </div>
        )}
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
    studentInformationSystemOther: '',
    financialSystem: '',
    financialSystemOther: '',
    financialAid: '',
    financialAidOther: '',
    hcmHr: '',
    hcmHrOther: '',
    payrollSystem: '',
    payrollSystemOther: '',
    purchasingSystem: '',
    purchasingSystemOther: '',
    housingManagement: '',
    housingManagementOther: '',
    learningManagement: '',
    learningManagementOther: '',
    admissionsCrm: '',
    admissionsCrmOther: '',
    alumniAdvancementCrm: '',
    alumniAdvancementCrmOther: '',
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
    
    if (recaptchaEnabled && !signInCaptcha) {
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
      if (recaptchaEnabled) {
        signInCaptchaRef.current?.reset();
        setSignInCaptcha(null);
      }
    } else {
      toast({
        title: "Welcome back!",
        description: "You have been signed in successfully.",
      });
    }
    setIsSubmitting(false);
  };

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    const { error } = await supabase.auth.resetPasswordForEmail(resetEmail, {
      redirectTo: `${window.location.origin}/auth?reset=true`
    });
    
    if (error) {
      toast({
        title: "Password reset failed",
        description: error.message,
        variant: "destructive"
      });
    } else {
      toast({
        title: "Reset email sent",
        description: "Please check your email for password reset instructions.",
      });
      setShowPasswordReset(false);
      setResetEmail('');
    }
    
    setIsSubmitting(false);
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (recaptchaEnabled && !signUpCaptcha) {
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
          student_information_system: signUpForm.studentInformationSystem === 'Other' 
            ? signUpForm.studentInformationSystemOther 
            : signUpForm.studentInformationSystem,
          financial_system: signUpForm.financialSystem === 'Other' 
            ? signUpForm.financialSystemOther 
            : signUpForm.financialSystem,
          financial_aid: signUpForm.financialAid === 'Other' 
            ? signUpForm.financialAidOther 
            : signUpForm.financialAid,
          hcm_hr: signUpForm.hcmHr === 'Other' 
            ? signUpForm.hcmHrOther 
            : signUpForm.hcmHr,
          payroll_system: signUpForm.payrollSystem === 'Other' 
            ? signUpForm.payrollSystemOther 
            : signUpForm.payrollSystem,
          purchasing_system: signUpForm.purchasingSystem === 'Other' 
            ? signUpForm.purchasingSystemOther 
            : signUpForm.purchasingSystem,
          housing_management: signUpForm.housingManagement === 'Other' 
            ? signUpForm.housingManagementOther 
            : signUpForm.housingManagement,
          learning_management: signUpForm.learningManagement === 'Other' 
            ? signUpForm.learningManagementOther 
            : signUpForm.learningManagement,
          admissions_crm: signUpForm.admissionsCrm === 'Other' 
            ? signUpForm.admissionsCrmOther 
            : signUpForm.admissionsCrm,
          alumni_advancement_crm: signUpForm.alumniAdvancementCrm === 'Other' 
            ? signUpForm.alumniAdvancementCrmOther 
            : signUpForm.alumniAdvancementCrm,
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
        });

        // Reset captcha after success
        if (recaptchaEnabled) {
          signUpCaptchaRef.current?.reset();
          setSignUpCaptcha(null);
        }
      } catch (error: any) {
        toast({
          title: "Member information update request failed",
          description: error.message,
          variant: "destructive"
        });
        // Reset captcha on error
        if (recaptchaEnabled) {
          signUpCaptchaRef.current?.reset();
          setSignUpCaptcha(null);
        }
      }
    } else {
      // Normal registration - prepare form data with custom "Other" values
      const formDataWithCustomValues = {
        ...signUpForm,
        studentInformationSystem: signUpForm.studentInformationSystem === 'Other' 
          ? signUpForm.studentInformationSystemOther 
          : signUpForm.studentInformationSystem,
        financialSystem: signUpForm.financialSystem === 'Other' 
          ? signUpForm.financialSystemOther 
          : signUpForm.financialSystem,
        financialAid: signUpForm.financialAid === 'Other' 
          ? signUpForm.financialAidOther 
          : signUpForm.financialAid,
        hcmHr: signUpForm.hcmHr === 'Other' 
          ? signUpForm.hcmHrOther 
          : signUpForm.hcmHr,
        payrollSystem: signUpForm.payrollSystem === 'Other' 
          ? signUpForm.payrollSystemOther 
          : signUpForm.payrollSystem,
        purchasingSystem: signUpForm.purchasingSystem === 'Other' 
          ? signUpForm.purchasingSystemOther 
          : signUpForm.purchasingSystem,
        housingManagement: signUpForm.housingManagement === 'Other' 
          ? signUpForm.housingManagementOther 
          : signUpForm.housingManagement,
        learningManagement: signUpForm.learningManagement === 'Other' 
          ? signUpForm.learningManagementOther 
          : signUpForm.learningManagement,
        admissionsCrm: signUpForm.admissionsCrm === 'Other' 
          ? signUpForm.admissionsCrmOther 
          : signUpForm.admissionsCrm,
        alumniAdvancementCrm: signUpForm.alumniAdvancementCrm === 'Other' 
          ? signUpForm.alumniAdvancementCrmOther 
          : signUpForm.alumniAdvancementCrm,
      };

      const { error } = await signUp(
        signUpForm.email, 
        signUpForm.password,
        formDataWithCustomValues
      );
      
      if (error) {
        toast({
          title: "Sign up failed", 
          description: error.message,
          variant: "destructive"
        });
        // Reset captcha on error
        if (recaptchaEnabled) {
          signUpCaptchaRef.current?.reset();
          setSignUpCaptcha(null);
        }
      } else {
        // Send welcome email to new registrants
        await supabase.functions.invoke('organization-emails', {
          body: {
            type: 'welcome',
            to: signUpForm.email,
            organizationName: signUpForm.organization
          }
        });

        // Redirect to confirmation page
        const confirmationType = isReassignment ? 'reassignment' : 'registration';
        window.location.href = `/registration-confirmation?type=${confirmationType}`;
        
        // Reset captcha after success
        if (recaptchaEnabled) {
          signUpCaptchaRef.current?.reset();
          setSignUpCaptcha(null);
        }
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
          <TabsList className="grid w-full grid-cols-2 mb-6 bg-white">
            <TabsTrigger value="signin" className="text-base py-3 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Sign In</TabsTrigger>
            <TabsTrigger value="signup" className="text-base py-3 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">New Member Registration</TabsTrigger>
          </TabsList>
          
          <TabsContent value="signin">
            <div className="bg-auth-form rounded-lg shadow-sm p-8">
              <div className="border-b border-gray-200 pb-4 mb-6">
                <h2 className="text-xl font-semibold text-gray-800">
                  {showPasswordReset ? 'Reset Password' : 'Sign In'}
                </h2>
                <p className="text-gray-600 mt-1">
                  {showPasswordReset 
                    ? 'Enter your email to receive password reset instructions'
                    : 'Sign in to your HESS Consortium account'
                  }
                </p>
              </div>
              
              {showPasswordReset ? (
                <form onSubmit={handlePasswordReset} className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="reset-email" className="text-gray-700 font-medium">
                      Email <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="reset-email"
                      type="email"
                      placeholder="Enter your email"
                      value={resetEmail}
                      onChange={(e) => setResetEmail(e.target.value)}
                      className="bg-gray-50 border-gray-300"
                      required
                    />
                  </div>
                  <div className="flex gap-3">
                    <Button 
                      type="button" 
                      variant="outline" 
                      className="flex-1"
                      onClick={() => {
                        setShowPasswordReset(false);
                        setResetEmail('');
                      }}
                      disabled={isSubmitting}
                    >
                      Back to Sign In
                    </Button>
                    <Button 
                      type="submit" 
                      className="flex-1 bg-auth-button hover:bg-auth-button/90 text-auth-button-foreground" 
                      disabled={isSubmitting || !resetEmail}
                    >
                      {isSubmitting ? 'Sending...' : 'Send Reset Email'}
                    </Button>
                  </div>
                </form>
              ) : (
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
                    {recaptchaEnabled ? (
                      isLoadingRecaptcha ? (
                        <div className="h-20 bg-gray-100 animate-pulse rounded flex items-center justify-center">
                          <span className="text-gray-500 text-sm">Loading verification...</span>
                        </div>
                      ) : (recaptchaEnabled && recaptchaSiteKey) ? (
                        <ReCAPTCHA
                          ref={signInCaptchaRef}
                          sitekey={recaptchaSiteKey}
                          onChange={setSignInCaptcha}
                        />
                      ) : (
                        <div className="p-3 bg-red-50 border border-red-200 rounded text-sm text-red-700">
                          <div className="font-medium">reCAPTCHA Configuration Missing</div>
                          <div className="mt-1">Administrator needs to configure reCAPTCHA site key in Settings → Security Settings.</div>
                        </div>
                      )
                    ) : (
                      <div className="p-3 bg-blue-50 border border-blue-200 rounded text-sm text-blue-700">
                        reCAPTCHA verification is disabled by administrator
                      </div>
                    )}
                  </div>
                  <Button type="submit" className="w-full bg-auth-button hover:bg-auth-button/90 text-auth-button-foreground py-3" disabled={isSubmitting || (recaptchaEnabled && !signInCaptcha)}>
                    {isSubmitting ? 'Signing in...' : 'Sign In'}
                  </Button>
                  <div className="text-center">
                    <button
                      type="button"
                      onClick={() => setShowPasswordReset(true)}
                      className="text-primary hover:text-primary/80 text-sm underline"
                    >
                      Forgot your password?
                    </button>
                  </div>
                </form>
              )}
            </div>
          </TabsContent>
          
          <TabsContent value="signup">
            <div className="bg-auth-form rounded-lg shadow-sm border border-gray-200">
              <div className="p-8 border-b border-gray-200">
                <h2 className="text-xl font-semibold text-gray-800 mb-2">New Member Registration</h2>
                <p className="text-gray-600">
                  Join the HESS Consortium community or request reassignment as primary contact
                </p>
              </div>
              <div className="p-8 space-y-8">
                <form onSubmit={handleSignUp} className="space-y-8">
                  {/* Eligibility Section */}
                  <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                    <div className="mb-6">
                      <h3 className="text-lg font-semibold text-gray-800 mb-2">Registration Type</h3>
                      <p className="text-gray-600 text-sm">Please confirm eligibility and select your registration type.</p>
                    </div>
                    
                    <div className="space-y-6">
                      <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                        <div className="flex items-start space-x-3">
                          <Checkbox
                            id="private-nonprofit"
                            checked={signUpForm.isPrivateNonProfit}
                            onCheckedChange={(checked) => 
                              setSignUpForm(prev => ({ ...prev, isPrivateNonProfit: checked === true }))
                            }
                            className="mt-0.5"
                          />
                          <div className="flex-1">
                            <label htmlFor="private-nonprofit" className="text-gray-800 font-medium cursor-pointer">
                              My institution is a private, non-profit college or university <span className="text-red-500">*</span>
                            </label>
                            <p className="text-sm text-gray-600 mt-1">
                              Only private, non-profit institutions of higher education are eligible for HESS Consortium membership.
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="p-4 bg-amber-50 rounded-lg border border-amber-200">
                        <div className="flex items-start space-x-3">
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
                            className="mt-0.5"
                          />
                          <div className="flex-1">
                            <label htmlFor="reassignment-request" className="text-gray-800 font-medium cursor-pointer">
                              This is member information update request
                            </label>
                            <p className="text-sm text-gray-600 mt-1">
                              Check this if you're requesting to become the primary contact for an existing member institution.
                            </p>
                          </div>
                        </div>
                        {isReassignment && (
                          <div className="mt-3 p-3 bg-blue-50 rounded-md border-l-4 border-blue-400">
                            <p className="text-sm text-blue-800">
                              <strong>Note:</strong> Your reassignment request will be reviewed by an administrator before approval.
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                {/* Account Information */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                  <div className="mb-6">
                    <h3 className="text-lg font-semibold text-gray-800 mb-2">Account Information</h3>
                    <p className="text-gray-600 text-sm">Your login credentials and contact information.</p>
                  </div>
                  
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      <div className="lg:col-span-2 space-y-2">
                        <Label htmlFor="signup-email" className="text-gray-700 font-medium text-sm">
                          Primary Email Address <span className="text-red-500">*</span>
                        </Label>
                        <Input
                          id="signup-email"
                          type="email"
                          placeholder="your.email@institution.edu"
                          value={signUpForm.email}
                          onChange={(e) => setSignUpForm(prev => ({ ...prev, email: e.target.value }))}
                          className="h-11 bg-gray-50 border-gray-300"
                          disabled={!signUpForm.isPrivateNonProfit}
                          required
                        />
                        <p className="text-xs text-gray-500">This will be your login email address</p>
                      </div>
                      
                      {!isReassignment && (
                        <div className="lg:col-span-2 space-y-2">
                          <Label htmlFor="signup-password" className="text-gray-700 font-medium text-sm">
                            Password <span className="text-red-500">*</span>
                          </Label>
                          <Input
                            id="signup-password"
                            type="password"
                            placeholder="Create a secure password"
                            value={signUpForm.password}
                            onChange={(e) => setSignUpForm(prev => ({ ...prev, password: e.target.value }))}
                            className="h-11 bg-gray-50 border-gray-300 max-w-md"
                            disabled={!signUpForm.isPrivateNonProfit}
                            required
                            minLength={6}
                          />
                          <p className="text-xs text-gray-500">Minimum 6 characters required</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Institution Information */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                  <div className="mb-6">
                    <h3 className="text-lg font-semibold text-gray-800 mb-2">Institution Information</h3>
                    <p className="text-gray-600 text-sm">Details about your college or university.</p>
                  </div>
                  
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <Label htmlFor="organization" className="text-gray-700 font-medium text-sm">
                          Institution Name <span className="text-red-500">*</span>
                        </Label>
                        {isReassignment ? (
                          <Select value={selectedOrganizationId} onValueChange={handleOrganizationSelect}>
                            <SelectTrigger className="h-11 bg-gray-50 border-gray-300">
                              <SelectValue placeholder="Select existing institution" />
                            </SelectTrigger>
                            <SelectContent className="max-h-60 overflow-y-auto bg-white border border-gray-300 shadow-lg z-50">
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
                            placeholder="Full institution name"
                            value={signUpForm.organization}
                            onChange={(e) => setSignUpForm(prev => ({ ...prev, organization: e.target.value }))}
                            className="h-11 bg-gray-50 border-gray-300"
                            disabled={!signUpForm.isPrivateNonProfit}
                            required
                          />
                        )}
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="student-fte" className="text-gray-700 font-medium text-sm">
                          Student FTE <span className="text-red-500">*</span>
                        </Label>
                        <Input
                          id="student-fte"
                          type="number"
                          placeholder="e.g. 2500"
                          value={signUpForm.studentFte}
                          onChange={(e) => setSignUpForm(prev => ({ ...prev, studentFte: e.target.value }))}
                          className="h-11 bg-gray-50 border-gray-300"
                          disabled={!signUpForm.isPrivateNonProfit}
                          required
                        />
                        <p className="text-xs text-gray-500">IPEDS headcount enrollment</p>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="state-association" className="text-gray-700 font-medium text-sm">
                        State Association
                      </Label>
                      <Input
                        id="state-association"
                        placeholder="State association name (if applicable)"
                        value={signUpForm.stateAssociation}
                        onChange={(e) => setSignUpForm(prev => ({ ...prev, stateAssociation: e.target.value }))}
                        className="h-11 bg-gray-50 border-gray-300"
                        disabled={!signUpForm.isPrivateNonProfit}
                      />
                    </div>
                    
                    <div>
                      <Label className="text-gray-700 font-medium text-sm mb-3 block">
                        Mailing Address <span className="text-red-500">*</span>
                      </Label>
                      <div className="space-y-4">
                        <Input
                          id="address"
                          placeholder="Street address"
                          value={signUpForm.address}
                          onChange={(e) => setSignUpForm(prev => ({ ...prev, address: e.target.value }))}
                          className="h-11 bg-gray-50 border-gray-300"
                          disabled={!signUpForm.isPrivateNonProfit}
                          required
                        />
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <Input
                            id="city"
                            placeholder="City"
                            value={signUpForm.city}
                            onChange={(e) => setSignUpForm(prev => ({ ...prev, city: e.target.value }))}
                            className="h-11 bg-gray-50 border-gray-300"
                            disabled={!signUpForm.isPrivateNonProfit}
                            required
                          />
                          <Input
                            id="state"
                            placeholder="State (e.g. TX)"
                            value={signUpForm.state}
                            onChange={(e) => setSignUpForm(prev => ({ ...prev, state: e.target.value }))}
                            className="h-11 bg-gray-50 border-gray-300"
                            disabled={!signUpForm.isPrivateNonProfit}
                            maxLength={2}
                            required
                          />
                          <Input
                            id="zip"
                            placeholder="ZIP Code"
                            value={signUpForm.zip}
                            onChange={(e) => setSignUpForm(prev => ({ ...prev, zip: e.target.value }))}
                            className="h-11 bg-gray-50 border-gray-300"
                            disabled={!signUpForm.isPrivateNonProfit}
                            required
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Primary Contact */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                  <div className="mb-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Primary Contact</h3>
                    <p className="text-gray-600 text-sm">Information for the main institutional contact person.</p>
                  </div>
                  
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <Label htmlFor="signup-firstname" className="text-gray-700 font-medium text-sm">
                          First Name <span className="text-red-500">*</span>
                        </Label>
                        <Input
                          id="signup-firstname"
                          placeholder="First name"
                          value={signUpForm.firstName}
                          onChange={(e) => setSignUpForm(prev => ({ ...prev, firstName: e.target.value }))}
                          className="h-11 bg-gray-50 border-gray-300"
                          disabled={!signUpForm.isPrivateNonProfit}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="signup-lastname" className="text-gray-700 font-medium text-sm">
                          Last Name <span className="text-red-500">*</span>
                        </Label>
                        <Input
                          id="signup-lastname"
                          placeholder="Last name"
                          value={signUpForm.lastName}
                          onChange={(e) => setSignUpForm(prev => ({ ...prev, lastName: e.target.value }))}
                          className="h-11 bg-gray-50 border-gray-300"
                          disabled={!signUpForm.isPrivateNonProfit}
                          required
                        />
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="primary-contact-title" className="text-gray-700 font-medium text-sm">
                        Job Title <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="primary-contact-title"
                        placeholder="e.g. CIO, IT Director, VP of Technology"
                        value={signUpForm.primaryContactTitle}
                        onChange={(e) => setSignUpForm(prev => ({ ...prev, primaryContactTitle: e.target.value }))}
                        className="h-11 bg-gray-50 border-gray-300"
                        disabled={!signUpForm.isPrivateNonProfit}
                        required
                      />
                    </div>
                  </div>
                </div>

                {/* Secondary Contact */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                  <div className="mb-6">
                    <h3 className="text-lg font-semibold text-gray-800 mb-2">Secondary Contact</h3>
                    <p className="text-gray-600 text-sm">Optional backup contact information.</p>
                  </div>
                  
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <Label htmlFor="secondary-firstname" className="text-gray-700 font-medium text-sm">
                          First Name
                        </Label>
                        <Input
                          id="secondary-firstname"
                          placeholder="First name"
                          value={signUpForm.secondaryFirstName}
                          onChange={(e) => setSignUpForm(prev => ({ ...prev, secondaryFirstName: e.target.value }))}
                          className="h-11 bg-gray-50 border-gray-300"
                          disabled={!signUpForm.isPrivateNonProfit}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="secondary-lastname" className="text-gray-700 font-medium text-sm">
                          Last Name
                        </Label>
                        <Input
                          id="secondary-lastname"
                          placeholder="Last name"
                          value={signUpForm.secondaryLastName}
                          onChange={(e) => setSignUpForm(prev => ({ ...prev, secondaryLastName: e.target.value }))}
                          className="h-11 bg-gray-50 border-gray-300"
                          disabled={!signUpForm.isPrivateNonProfit}
                        />
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <Label htmlFor="secondary-contact-title" className="text-gray-700 font-medium text-sm">
                          Job Title
                        </Label>
                        <Input
                          id="secondary-contact-title"
                          placeholder="Job title"
                          value={signUpForm.secondaryContactTitle}
                          onChange={(e) => setSignUpForm(prev => ({ ...prev, secondaryContactTitle: e.target.value }))}
                          className="h-11 bg-gray-50 border-gray-300"
                          disabled={!signUpForm.isPrivateNonProfit}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="secondary-contact-email" className="text-gray-700 font-medium text-sm">
                          Email Address
                        </Label>
                        <Input
                          id="secondary-contact-email"
                          type="email"
                          placeholder="secondary.contact@institution.edu"
                          value={signUpForm.secondaryContactEmail}
                          onChange={(e) => setSignUpForm(prev => ({ ...prev, secondaryContactEmail: e.target.value }))}
                          className="h-11 bg-gray-50 border-gray-300"
                          disabled={!signUpForm.isPrivateNonProfit}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Technology Systems */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                  <div className="mb-6">
                    <h3 className="text-lg font-semibold text-gray-800 mb-2">Technology Systems</h3>
                    <p className="text-gray-600 text-sm">Select the systems your institution currently uses.</p>
                  </div>
                  
                  <div className="space-y-8">
                    {/* Academic Systems */}
                    <div>
                      <h4 className="text-md font-medium text-gray-800 mb-4 pb-2 border-b border-gray-200">Academic Systems</h4>
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <SystemFieldSelect
                          fieldName="student_information_system"
                          label="Student Information System"
                          value={signUpForm.studentInformationSystem}
                          onChange={(value) => setSignUpForm(prev => ({ ...prev, studentInformationSystem: value }))}
                          disabled={!signUpForm.isPrivateNonProfit}
                          customValue={signUpForm.studentInformationSystemOther}
                          onCustomValueChange={(value) => setSignUpForm(prev => ({ ...prev, studentInformationSystemOther: value }))}
                          required={true}
                        />
                        <SystemFieldSelect
                          fieldName="learning_management"
                          label="Learning Management System"
                          value={signUpForm.learningManagement}
                          onChange={(value) => setSignUpForm(prev => ({ ...prev, learningManagement: value }))}
                          disabled={!signUpForm.isPrivateNonProfit}
                          customValue={signUpForm.learningManagementOther}
                          onCustomValueChange={(value) => setSignUpForm(prev => ({ ...prev, learningManagementOther: value }))}
                          required={true}
                        />
                      </div>
                    </div>

                    {/* Financial Systems */}
                    <div>
                      <h4 className="text-md font-medium text-gray-800 mb-4 pb-2 border-b border-gray-200">Financial Systems</h4>
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <SystemFieldSelect
                          fieldName="financial_system"
                          label="Financial System"
                          value={signUpForm.financialSystem}
                          onChange={(value) => setSignUpForm(prev => ({ ...prev, financialSystem: value }))}
                          disabled={!signUpForm.isPrivateNonProfit}
                          customValue={signUpForm.financialSystemOther}
                          onCustomValueChange={(value) => setSignUpForm(prev => ({ ...prev, financialSystemOther: value }))}
                          required={true}
                        />
                        <SystemFieldSelect
                          fieldName="financial_aid"
                          label="Financial Aid System"
                          value={signUpForm.financialAid}
                          onChange={(value) => setSignUpForm(prev => ({ ...prev, financialAid: value }))}
                          disabled={!signUpForm.isPrivateNonProfit}
                          customValue={signUpForm.financialAidOther}
                          onCustomValueChange={(value) => setSignUpForm(prev => ({ ...prev, financialAidOther: value }))}
                          required={true}
                        />
                        <SystemFieldSelect
                          fieldName="purchasing_system"
                          label="Purchasing System"
                          value={signUpForm.purchasingSystem}
                          onChange={(value) => setSignUpForm(prev => ({ ...prev, purchasingSystem: value }))}
                          disabled={!signUpForm.isPrivateNonProfit}
                          customValue={signUpForm.purchasingSystemOther}
                          onCustomValueChange={(value) => setSignUpForm(prev => ({ ...prev, purchasingSystemOther: value }))}
                          required={true}
                        />
                      </div>
                    </div>

                    {/* HR & Operations */}
                    <div>
                      <h4 className="text-md font-medium text-gray-800 mb-4 pb-2 border-b border-gray-200">HR & Operations</h4>
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <SystemFieldSelect
                          fieldName="hcm_hr"
                          label="Human Capital Management"
                          value={signUpForm.hcmHr}
                          onChange={(value) => setSignUpForm(prev => ({ ...prev, hcmHr: value }))}
                          disabled={!signUpForm.isPrivateNonProfit}
                          customValue={signUpForm.hcmHrOther}
                          onCustomValueChange={(value) => setSignUpForm(prev => ({ ...prev, hcmHrOther: value }))}
                          required={true}
                        />
                        <SystemFieldSelect
                          fieldName="payroll_system"
                          label="Payroll System"
                          value={signUpForm.payrollSystem}
                          onChange={(value) => setSignUpForm(prev => ({ ...prev, payrollSystem: value }))}
                          disabled={!signUpForm.isPrivateNonProfit}
                          customValue={signUpForm.payrollSystemOther}
                          onCustomValueChange={(value) => setSignUpForm(prev => ({ ...prev, payrollSystemOther: value }))}
                          required={true}
                        />
                        <SystemFieldSelect
                          fieldName="housing_management"
                          label="Housing Management"
                          value={signUpForm.housingManagement}
                          onChange={(value) => setSignUpForm(prev => ({ ...prev, housingManagement: value }))}
                          disabled={!signUpForm.isPrivateNonProfit}
                          customValue={signUpForm.housingManagementOther}
                          onCustomValueChange={(value) => setSignUpForm(prev => ({ ...prev, housingManagementOther: value }))}
                          required={true}
                        />
                      </div>
                    </div>

                    {/* CRM Systems */}
                    <div>
                      <h4 className="text-md font-medium text-gray-800 mb-4 pb-2 border-b border-gray-200">CRM Systems</h4>
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <SystemFieldSelect
                          fieldName="admissions_crm"
                          label="Admissions CRM"
                          value={signUpForm.admissionsCrm}
                          onChange={(value) => setSignUpForm(prev => ({ ...prev, admissionsCrm: value }))}
                          disabled={!signUpForm.isPrivateNonProfit}
                          customValue={signUpForm.admissionsCrmOther}
                          onCustomValueChange={(value) => setSignUpForm(prev => ({ ...prev, admissionsCrmOther: value }))}
                          required={true}
                        />
                        <SystemFieldSelect
                          fieldName="alumni_advancement_crm"
                          label="Alumni & Advancement CRM"
                          value={signUpForm.alumniAdvancementCrm}
                          onChange={(value) => setSignUpForm(prev => ({ ...prev, alumniAdvancementCrm: value }))}
                          disabled={!signUpForm.isPrivateNonProfit}
                          customValue={signUpForm.alumniAdvancementCrmOther}
                          onCustomValueChange={(value) => setSignUpForm(prev => ({ ...prev, alumniAdvancementCrmOther: value }))}
                          required={true}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Hardware & Additional Information */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                  <div className="mb-6">
                    <h3 className="text-lg font-semibold text-gray-800 mb-2">Hardware & Additional Information</h3>
                    <p className="text-gray-600 text-sm">Information about your computer hardware and any additional details.</p>
                  </div>
                  
                  <div className="space-y-8">
                    {/* Primary Office Computers */}
                    <div>
                      <h4 className="text-md font-medium text-gray-800 mb-4 pb-2 border-b border-gray-200">Primary Office Computers</h4>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                          <Checkbox
                            id="apple"
                            checked={signUpForm.primaryOfficeApple}
                            onCheckedChange={(checked) => setSignUpForm(prev => ({ ...prev, primaryOfficeApple: !!checked }))}
                            disabled={!signUpForm.isPrivateNonProfit}
                          />
                          <Label htmlFor="apple" className="text-sm font-medium cursor-pointer">Apple</Label>
                        </div>
                        <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                          <Checkbox
                            id="asus"
                            checked={signUpForm.primaryOfficeAsus}
                            onCheckedChange={(checked) => setSignUpForm(prev => ({ ...prev, primaryOfficeAsus: !!checked }))}
                            disabled={!signUpForm.isPrivateNonProfit}
                          />
                          <Label htmlFor="asus" className="text-sm font-medium cursor-pointer">ASUS</Label>
                        </div>
                        <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                          <Checkbox
                            id="dell"
                            checked={signUpForm.primaryOfficeDell}
                            onCheckedChange={(checked) => setSignUpForm(prev => ({ ...prev, primaryOfficeDell: !!checked }))}
                            disabled={!signUpForm.isPrivateNonProfit}
                          />
                          <Label htmlFor="dell" className="text-sm font-medium cursor-pointer">Dell</Label>
                        </div>
                        <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                          <Checkbox
                            id="hp"
                            checked={signUpForm.primaryOfficeHp}
                            onCheckedChange={(checked) => setSignUpForm(prev => ({ ...prev, primaryOfficeHp: !!checked }))}
                            disabled={!signUpForm.isPrivateNonProfit}
                          />
                          <Label htmlFor="hp" className="text-sm font-medium cursor-pointer">HP</Label>
                        </div>
                        <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                          <Checkbox
                            id="microsoft"
                            checked={signUpForm.primaryOfficeMicrosoft}
                            onCheckedChange={(checked) => setSignUpForm(prev => ({ ...prev, primaryOfficeMicrosoft: !!checked }))}
                            disabled={!signUpForm.isPrivateNonProfit}
                          />
                          <Label htmlFor="microsoft" className="text-sm font-medium cursor-pointer">Microsoft</Label>
                        </div>
                        <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                          <Checkbox
                            id="other"
                            checked={signUpForm.primaryOfficeOther}
                            onCheckedChange={(checked) => setSignUpForm(prev => ({ ...prev, primaryOfficeOther: !!checked }))}
                            disabled={!signUpForm.isPrivateNonProfit}
                          />
                          <Label htmlFor="other" className="text-sm font-medium cursor-pointer">Other</Label>
                        </div>
                      </div>
                      
                      {signUpForm.primaryOfficeOther && (
                        <div className="mt-4 space-y-2">
                          <Label htmlFor="other-computer-details" className="text-gray-700 font-medium text-sm">
                            Please specify other computer types <span className="text-red-500">*</span>
                          </Label>
                          <Input
                            id="other-computer-details"
                            placeholder="Please specify other computer types..."
                            value={signUpForm.primaryOfficeOtherDetails}
                            onChange={(e) => setSignUpForm(prev => ({ ...prev, primaryOfficeOtherDetails: e.target.value }))}
                            className="h-11 bg-gray-50 border-gray-300"
                            disabled={!signUpForm.isPrivateNonProfit}
                            required
                          />
                        </div>
                      )}
                    </div>

                    {/* Additional Comments */}
                    <div>
                      <h4 className="text-md font-medium text-gray-800 mb-4 pb-2 border-b border-gray-200">Additional Information</h4>
                      <div className="space-y-2">
                        <Label htmlFor="other-software-comments" className="text-gray-700 font-medium text-sm">
                          Additional software and operational comments
                        </Label>
                        <textarea
                          id="other-software-comments"
                          placeholder="Please share any additional information about your software, operations, or special requirements..."
                          value={signUpForm.otherSoftwareComments}
                          onChange={(e) => setSignUpForm(prev => ({ ...prev, otherSoftwareComments: e.target.value }))}
                          disabled={!signUpForm.isPrivateNonProfit}
                          className="w-full min-h-[120px] p-4 bg-gray-50 border border-gray-300 rounded-lg resize-none focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Security Verification */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                  <div className="mb-6">
                    <h3 className="text-lg font-semibold text-gray-800 mb-2">Security Verification</h3>
                    <p className="text-gray-600 text-sm">Complete the verification to submit your registration.</p>
                  </div>
                  
                  <div className="space-y-4">
                    {recaptchaEnabled ? (
                      isLoadingRecaptcha ? (
                        <div className="h-20 bg-gray-100 animate-pulse rounded flex items-center justify-center">
                          <span className="text-gray-500 text-sm">Loading verification...</span>
                        </div>
                      ) : (recaptchaEnabled && recaptchaSiteKey) ? (
                        <ReCAPTCHA
                          ref={signUpCaptchaRef}
                          sitekey={recaptchaSiteKey}
                          onChange={setSignUpCaptcha}
                        />
                      ) : (
                        <div className="p-3 bg-red-50 border border-red-200 rounded text-sm text-red-700">
                          <div className="font-medium">reCAPTCHA Configuration Missing</div>
                          <div className="mt-1">Administrator needs to configure reCAPTCHA site key in Settings → Security Settings.</div>
                        </div>
                      )
                    ) : (
                      <div className="p-3 bg-blue-50 border border-blue-200 rounded text-sm text-blue-700">
                        reCAPTCHA verification is disabled by administrator
                      </div>
                    )}
                  </div>
                </div>

                <Button 
                  type="submit" 
                  className="w-full bg-auth-button hover:bg-auth-button/90 text-auth-button-foreground py-3" 
                  disabled={
                    isSubmitting || 
                    !signUpForm.isPrivateNonProfit || 
                    (recaptchaEnabled && !signUpCaptcha) ||
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
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
