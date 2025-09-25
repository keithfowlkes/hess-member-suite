import React, { useState, useRef, useEffect } from 'react';
import { Navigate, useSearchParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import ReCAPTCHA from 'react-google-recaptcha';
import { useSystemSetting } from '@/hooks/useSystemSettings';
import { useSimpleFieldOptions, type SystemField } from '@/hooks/useSimpleSystemFieldOptions';
import { EnhancedSystemFieldSelect } from '@/components/EnhancedSystemFieldSelect';
import { useOrganizations } from '@/hooks/useOrganizations';
import { useMemberRegistrationUpdates } from '@/hooks/useMemberRegistrationUpdates';
import { AuthHeader } from '@/components/AuthHeader';
import { Eye, EyeOff } from 'lucide-react';
import { useDebounce } from '@/hooks/useDebounce';

// Store the actual password for later use during approval
const storeActualPassword = (password: string): string => {
  // Instead of storing plain text, we'll store it securely
  // For now, return the actual password to fix the login issue
  console.log('📝 PASSWORD DEBUG: Storing password for approval process');
  return password;
};

export default function Auth() {
  const { user, signIn, signUp, loading } = useAuth();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  
  // Scroll to top when auth page loads
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);
  const { data: organizations = [] } = useOrganizations();
  const { createRegistrationUpdate } = useMemberRegistrationUpdates();
  const { data: recaptchaSetting, isLoading: isLoadingRecaptcha } = useSystemSetting('recaptcha_site_key');
  const { data: recaptchaEnabledSetting, isLoading: isLoadingRecaptchaEnabled } = useSystemSetting('recaptcha_enabled');
  const { data: authConfigSetting } = useSystemSetting('auth_page_config');
  
  const [signInForm, setSignInForm] = useState({ email: '', password: '' });
  const [signInCaptcha, setSignInCaptcha] = useState<string | null>(null);
  const [signUpCaptcha, setSignUpCaptcha] = useState<string | null>(null);
  const [isReassignment, setIsReassignment] = useState(false);
  const [selectedOrganizationId, setSelectedOrganizationId] = useState<string>('');
  const [showPasswordReset, setShowPasswordReset] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  // Password visibility states
  const [showSignInPassword, setShowSignInPassword] = useState(false);
  const [showSignUpPassword, setShowSignUpPassword] = useState(false);
  const [showSignUpConfirmPassword, setShowSignUpConfirmPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showNewConfirmPassword, setShowNewConfirmPassword] = useState(false);
  
  // Password validation states
  const [passwordsMatch, setPasswordsMatch] = useState<boolean | null>(null);
  const [signUpPasswordsMatch, setSignUpPasswordsMatch] = useState<boolean | null>(null);
  
  // Login attempt tracking
  const [loginAttempts, setLoginAttempts] = useState(() => {
    const stored = localStorage.getItem('loginAttempts');
    return stored ? parseInt(stored) : 0;
  });
  const [lockoutUntil, setLockoutUntil] = useState(() => {
    const stored = localStorage.getItem('lockoutUntil');
    return stored ? parseInt(stored) : 0;
  });
  const [showUserNotFoundModal, setShowUserNotFoundModal] = useState(false);
  const [showTooManyAttemptsModal, setShowTooManyAttemptsModal] = useState(false);
  const initialTab = React.useMemo(() => {
    try {
      const sp = new URLSearchParams(window.location.search)
      const t = sp.get('tab')?.toLowerCase()
      if (t === 'register' || t === 'signup') return 'signup'
      if (t === 'member-update') return 'member-update'
      return 'signin'
    } catch {
      return 'signin'
    }
  }, [])
  const [activeTab, setActiveTab] = useState(initialTab)
  const [showEmailNotFoundDialog, setShowEmailNotFoundDialog] = useState(false);
  
  // Ensure URL param forces tab selection after mount as well
  useEffect(() => {
    const sp = new URLSearchParams(window.location.search)
    const t = sp.get('tab')?.toLowerCase()
    if (t === 'register' || t === 'signup') {
      setActiveTab('signup')
    } else if (t === 'member-update') {
      setActiveTab('member-update')
    }
  }, [])
  
  // Clear lockout when time expires
  useEffect(() => {
    if (lockoutUntil > 0) {
      const now = Date.now();
      if (lockoutUntil <= now) {
        setLockoutUntil(0);
        localStorage.removeItem('lockoutUntil');
      } else {
        const timeoutId = setTimeout(() => {
          setLockoutUntil(0);
          localStorage.removeItem('lockoutUntil');
        }, lockoutUntil - now);
        return () => clearTimeout(timeoutId);
      }
    }
  }, [lockoutUntil]);
  const [emailNotFoundAddress, setEmailNotFoundAddress] = useState('');
  const signInCaptchaRef = useRef<ReCAPTCHA>(null);
  const signUpCaptchaRef = useRef<ReCAPTCHA>(null);
  
  // Check if this is a password reset callback
  const isPasswordReset = searchParams.get('reset') === 'true';
  const hasError = searchParams.get('error');
  
  // Handle password reset errors on component mount
  useEffect(() => {
    if (hasError) {
      let errorMessage = "Password reset failed.";
      const errorCode = searchParams.get('error_code');
      const errorDescription = searchParams.get('error_description');
      
      if (errorCode === 'otp_expired') {
        errorMessage = "The password reset link has expired. Please request a new one.";
      } else if (errorDescription) {
        errorMessage = decodeURIComponent(errorDescription);
      }
      
      toast({
        title: "Password Reset Error",
        description: errorMessage,
        variant: "destructive"
      });
    }
  }, [hasError, searchParams, toast]);
  
  // Get reCAPTCHA settings from database - wait for loading to complete
  const recaptchaSiteKey = isLoadingRecaptcha ? null : recaptchaSetting?.setting_value;
  // Default to enabled if setting is not found or still loading, but disable on preview domains
  const isPreviewDomain = window.location.hostname.includes('lovableproject.com');
  const recaptchaEnabled = isPreviewDomain ? false : (isLoadingRecaptchaEnabled ? true : (recaptchaEnabledSetting?.setting_value !== 'false'));
  
  console.log('🔍 reCAPTCHA Debug:', {
    isLoadingRecaptcha,
    isLoadingRecaptchaEnabled,
    recaptchaSiteKey: recaptchaSiteKey ? 'Present' : 'Missing',
    recaptchaEnabled,
    recaptchaSetting: recaptchaSetting?.setting_value,
    recaptchaEnabledSetting: recaptchaEnabledSetting?.setting_value
  });

  // Parse auth page configuration
  const authConfig = React.useMemo(() => {
    if (!authConfigSetting?.setting_value) return null;
    try {
      return JSON.parse(authConfigSetting.setting_value);
    } catch (error) {
      console.error('Error parsing auth config:', error);
      return null;
    }
  }, [authConfigSetting]);

  // Get signin, signup, and member update fields configuration
  const signinFields = React.useMemo(() => {
    if (!authConfig?.signin) return [];
    return authConfig.signin
      .filter((field: any) => field.visible)
      .sort((a: any, b: any) => a.order - b.order);
  }, [authConfig]);

  const signupFields = React.useMemo(() => {
    if (!authConfig?.signup) return [];
    return authConfig.signup
      .filter((field: any) => field.visible)
      .sort((a: any, b: any) => a.order - b.order);
  }, [authConfig]);

  const memberUpdateFields = React.useMemo(() => {
    if (!authConfig?.memberUpdate) return [];
    return authConfig.memberUpdate
      .filter((field: any) => field.visible)
      .sort((a: any, b: any) => a.order - b.order);
  }, [authConfig]);

  // Function to render dynamic form fields
  const renderDynamicField = (field: any) => {
    const fieldId = `member-update-${field.id}`;
    const isRequired = field.required;

    switch (field.type) {
      case 'text':
      case 'email':
      case 'number':
        return (
          <div key={field.id} className="space-y-2">
            <Label htmlFor={fieldId} className="text-gray-700 font-medium text-sm">
              {field.label} {isRequired && <span className="text-red-500">*</span>}
            </Label>
            <Input
              id={fieldId}
              type={field.type}
              placeholder={field.placeholder}
              value={getFieldValue(field.id)}
              onChange={(e) => handleFieldChange(field.id, e.target.value)}
              className="h-11 bg-gray-50 border-gray-300"
              disabled={!isReassignment}
              required={isRequired}
            />
          </div>
        );
      case 'textarea':
        return (
          <div key={field.id} className="space-y-2">
            <Label htmlFor={fieldId} className="text-gray-700 font-medium text-sm">
              {field.label} {isRequired && <span className="text-red-500">*</span>}
            </Label>
            <Textarea
              id={fieldId}
              placeholder={field.placeholder}
              value={getFieldValue(field.id)}
              onChange={(e) => handleFieldChange(field.id, e.target.value)}
              className="bg-gray-50 border-gray-300"
              disabled={!isReassignment}
              required={isRequired}
            />
          </div>
        );
      case 'checkbox':
        return (
          <div key={field.id} className="flex items-center space-x-2">
            <Checkbox
              id={fieldId}
              checked={getFieldValue(field.id)}
              disabled={!isReassignment}
              onCheckedChange={(checked) => handleFieldChange(field.id, checked)}
            />
            <Label htmlFor={fieldId} className="text-sm text-gray-700">
              {field.label}
            </Label>
          </div>
        );
      case 'select':
        return (
          <div key={field.id} className="space-y-2">
            <Label htmlFor={fieldId} className="text-gray-700 font-medium text-sm">
              {field.label} {isRequired && <span className="text-red-500">*</span>}
            </Label>
            <Select
              value={getFieldValue(field.id)}
              onValueChange={(value) => handleFieldChange(field.id, value)}
              disabled={!isReassignment}
              required={isRequired}
            >
              <SelectTrigger className="h-11 bg-gray-50 border-gray-300">
                <SelectValue placeholder={field.placeholder} />
              </SelectTrigger>
              <SelectContent>
                {field.options?.map((option: string) => (
                  <SelectItem key={option} value={option}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        );
      default:
        return null;
    }
  };

  // Helper functions for field value management
  const getFieldValue = (fieldId: string) => {
    const fieldMap: Record<string, any> = {
      firstName: signUpForm.firstName,
      lastName: signUpForm.lastName,
      email: signUpForm.email,
      password: signUpForm.password,
      confirmPassword: signUpForm.confirmPassword,
      organization: signUpForm.organization,
      primaryContactTitle: signUpForm.primaryContactTitle,
      stateAssociation: signUpForm.stateAssociation,
      studentFte: signUpForm.studentFte,
      address: signUpForm.address,
      city: signUpForm.city,
      state: signUpForm.state,
      zip: signUpForm.zip,
      isReassignment: isReassignment,
      // Add other field mappings as needed
    };
    return fieldMap[fieldId] || '';
  };

  const handleFieldChange = (fieldId: string, value: any) => {
    if (fieldId === 'isReassignment') {
      setIsReassignment(value);
      return;
    }

    const fieldMap: Record<string, string> = {
      firstName: 'firstName',
      lastName: 'lastName',
      email: 'email',
      password: 'password',
      confirmPassword: 'confirmPassword',
      organization: 'organization',
      primaryContactTitle: 'primaryContactTitle',
      stateAssociation: 'stateAssociation',
      studentFte: 'studentFte',
      address: 'address',
      city: 'city',
      state: 'state',
      zip: 'zip',
      // Add other field mappings as needed
    };

    const formField = fieldMap[fieldId];
    if (formField) {
      setSignUpForm(prev => ({ ...prev, [formField]: value }));
    }
  };

  // Group fields by section
  const groupFieldsBySection = (fields: any[]) => {
    const grouped: Record<string, any[]> = {};
    fields.forEach(field => {
      const section = field.section || 'General';
      if (!grouped[section]) grouped[section] = [];
      grouped[section].push(field);
    });
    return grouped;
  };

  
  const initialSignUpFormState = {
    isPrivateNonProfit: true,
    email: '', 
    password: '', 
    confirmPassword: '',
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
    otherSoftwareComments: '',
    loginHint: '',
    // Additional fields for comprehensive forms
    signupType: 'new-member',
    title: '',
    phone: '',
    secondaryEmail: '',
    secondaryPhone: '',
    sis: '',
    lms: '',
    library: '',
    otherSoftware: '',
    desktopOS: '',
    serverOS: '',
    comments: ''
  };

  const [signUpForm, setSignUpForm] = useState(initialSignUpFormState);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Debounced password validation
  const debouncedPasswordValidation = useDebounce((newPass: string, confirmPass: string) => {
    if (newPass && confirmPass) {
      setPasswordsMatch(newPass === confirmPass);
    } else {
      setPasswordsMatch(null);
    }
  }, 300);

  const debouncedSignUpPasswordValidation = useDebounce((newPass: string, confirmPass: string) => {
    if (newPass && confirmPass) {
      setSignUpPasswordsMatch(newPass === confirmPass);
    } else {
      setSignUpPasswordsMatch(null);
    }
  }, 300);

  // Effect for password reset validation
  useEffect(() => {
    debouncedPasswordValidation(newPassword, confirmPassword);
  }, [newPassword, confirmPassword, debouncedPasswordValidation]);

  // Effect for sign up password validation
  useEffect(() => {
    debouncedSignUpPasswordValidation(signUpForm.password, signUpForm.confirmPassword);
  }, [signUpForm.password, signUpForm.confirmPassword, debouncedSignUpPasswordValidation]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Only redirect if user exists and we're not in the middle of a sign out process
  if (user && !loading) {
    return <Navigate to="/" replace />;
  }

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Check if user is currently locked out
    const now = Date.now();
    if (lockoutUntil > now) {
      setShowTooManyAttemptsModal(true);
      return;
    }
    
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
      const isUserNotFound = 
        error.message?.includes('Invalid login credentials') ||
        error.message?.includes('User not found') ||
        error.message?.includes('Email not confirmed') ||
        error.message?.includes('not found in the membership database');
      
      if (isUserNotFound) {
        const newAttempts = loginAttempts + 1;
        setLoginAttempts(newAttempts);
        localStorage.setItem('loginAttempts', newAttempts.toString());
        
        if (newAttempts >= 3) {
          // Lock out for 30 minutes
          const lockoutTime = now + (30 * 60 * 1000);
          setLockoutUntil(lockoutTime);
          localStorage.setItem('lockoutUntil', lockoutTime.toString());
          setShowTooManyAttemptsModal(true);
        } else {
          setShowUserNotFoundModal(true);
        }
      } else {
        toast({
          title: "Sign in failed",
          description: error.message,
          variant: "destructive"
        });
      }
      
      // Reset captcha on error
      if (recaptchaEnabled) {
        signInCaptchaRef.current?.reset();
        setSignInCaptcha(null);
      }
    } else {
      // Reset login attempts on successful login
      setLoginAttempts(0);
      localStorage.removeItem('loginAttempts');
      localStorage.removeItem('lockoutUntil');
      setLockoutUntil(0);
      
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
    
    // First, let's check the email configuration to diagnose issues
    const { data: verifyData, error: verifyError } = await supabase.functions.invoke('verify-email-config');
    if (verifyData) {
      console.log('Email config verification:', verifyData);
    }
    if (verifyError) {
      console.error('Verification error:', verifyError);
    }
    
    // Use custom password reset edge function that includes login hint
    const { data, error } = await supabase.functions.invoke('send-password-reset', {
      body: { 
        email: resetEmail
        // Let the edge function use the system setting for redirect URL
      }
    });
    
    if (error) {
      console.log('Password reset error details:', error);
      
      // Check if the error is specifically because the email was not found
      const isUserNotFound = 
        error.message === 'User not found' ||
        error.status === 404 ||
        error.statusCode === 404 ||
        (error.details && (
          error.details === 'User not found' ||
          error.details.message === 'User not found'
        ));
      
      if (isUserNotFound) {
        // Store the email and show the dialog
        setEmailNotFoundAddress(resetEmail);
        setShowEmailNotFoundDialog(true);
        setShowPasswordReset(false);
      } else {
        toast({
          title: "Password reset failed",
          description: error.message,
          variant: "destructive"
        });
      }
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

  const handleNewPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (newPassword !== confirmPassword) {
      toast({
        title: "Passwords don't match",
        description: "Please make sure both passwords are identical.",
        variant: "destructive"
      });
      return;
    }
    
    setIsSubmitting(true);
    
    const { error } = await supabase.auth.updateUser({
      password: newPassword
    });
    
    if (error) {
      toast({
        title: "Password update failed",
        description: error.message,
        variant: "destructive"
      });
    } else {
      toast({
        title: "Password updated successfully",
        description: "You can now sign in with your new password.",
      });
      // Clear the reset parameter from URL
      window.history.replaceState({}, document.title, '/auth');
      setNewPassword('');
      setConfirmPassword('');
    }
    
    setIsSubmitting(false);
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    
    console.log('🚀 REGISTRATION DEBUG: handleSignUp started');
    console.log('📋 Form data state:', {
      email: signUpForm.email,
      firstName: signUpForm.firstName,
      lastName: signUpForm.lastName,
      organization: signUpForm.organization,
      isReassignment,
      selectedOrganizationId
    });
    
    console.log('🔍 CRITICAL DEBUG: isReassignment =', isReassignment);
    console.log('🔍 CRITICAL DEBUG: selectedOrganizationId =', selectedOrganizationId);
    console.log('🔍 CRITICAL DEBUG: Will enter reassignment block?', isReassignment && selectedOrganizationId);
    
    // Validate password confirmation
    if (signUpForm.password !== signUpForm.confirmPassword) {
      toast({
        title: "Passwords don't match",
        description: "Please ensure both password fields match.",
        variant: "destructive"
      });
      setIsSubmitting(false);
      return;
    }
    
    if (recaptchaEnabled && !signUpCaptcha) {
      console.warn('reCAPTCHA validation failed or incomplete');
      toast({
        title: "reCAPTCHA required",
        description: "Please complete the reCAPTCHA verification. If it's not loading, try refreshing the page.",
        variant: "destructive"
      });
      return;
    }
    
    console.log('✅ REGISTRATION DEBUG: Validation passed, setting submitting state');
    setIsSubmitting(true);

    // If this is a true member update request (only from member-update tab AND user is updating existing org), handle differently
    // This should NEVER run for new registrations - only for existing members updating their org info
    if (activeTab === 'member-update' && selectedOrganizationId && isReassignment && organizations.find(org => org.id === selectedOrganizationId)) {
      console.log('🔄 MEMBER UPDATE FLOW: Processing as member update (reassignment) - this should NOT happen for new registrations');
      console.log('📝 Selected organization ID:', selectedOrganizationId);
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

        console.log('🔍 DEBUG: About to call createRegistrationUpdate with data:', {
          submitted_email: signUpForm.email,
          existing_organization_id: selectedOrganizationId,
          existing_organization_name: currentOrg?.name || 'No org name'
        });

        try {
          const result = await createRegistrationUpdate({
            submitted_email: signUpForm.email,
            registration_data: {
              email: signUpForm.email,
              password: storeActualPassword(signUpForm.password),
              first_name: signUpForm.firstName,
              last_name: signUpForm.lastName,
              address: signUpForm.address,
              city: signUpForm.city,
              state: signUpForm.state,
              zip: signUpForm.zip,
              primary_contact_title: signUpForm.primaryContactTitle,
              secondary_first_name: signUpForm.secondaryFirstName,
              secondary_last_name: signUpForm.secondaryLastName,
              secondary_contact_title: signUpForm.secondaryContactTitle,
              secondary_contact_email: signUpForm.secondaryContactEmail,
              is_private_nonprofit: signUpForm.isPrivateNonProfit,
              ...newOrgData
            },
            organization_data: newOrgData,
            existing_organization_id: selectedOrganizationId,
            existing_organization_name: currentOrg?.name,
            submission_type: 'member_update'
          });
          
          console.log('✅ DEBUG: createRegistrationUpdate call completed successfully:', result);
          
          // Send notification email to current primary contact
          try {
            if (currentOrg?.email) {
              console.log('📧 MEMBER UPDATE DEBUG: Sending notification email to current contact:', currentOrg.email);
              
              const { error: emailError } = await supabase.functions.invoke('centralized-email-delivery', {
                body: {
                  type: 'unauthorized_update_warning',
                  to: currentOrg.email,
                  subject: 'URGENT: Unauthorized Organization Update Alert - Action Required',
                  data: {
                    organization_name: currentOrg.name,
                    submitted_email: signUpForm.email,
                    primary_contact_name: `${signUpForm.firstName} ${signUpForm.lastName}`,
                    contact_email: 'info@hessconsortium.org'
                  }
                }
              });
              
              if (emailError) {
                console.error('❌ MEMBER UPDATE DEBUG: Failed to send notification email:', emailError);
              } else {
                console.log('✅ MEMBER UPDATE DEBUG: Notification email sent successfully');
              }
            }
          } catch (emailError) {
            console.error('❌ MEMBER UPDATE DEBUG: Error sending notification email:', emailError);
          }
        } catch (error) {
          console.error('❌ ERROR in createRegistrationUpdate:', error);
          throw error; // Re-throw to be caught by the outer try-catch
        }

        // Redirect to confirmation page  
        console.log('📍 MEMBER UPDATE DEBUG: Navigating to: /registration-confirmation?type=reassignment');
        
        // Reset form state before navigation
        setSignUpForm(initialSignUpFormState);
        setSelectedOrganizationId('');
        setIsReassignment(false);
        
        try {
          navigate('/registration-confirmation?type=reassignment', { replace: true });
          console.log('✅ MEMBER UPDATE DEBUG: Navigate call completed successfully');
          setIsSubmitting(false);
          return; // Exit early for member update flow
        } catch (error) {
          console.error('❌ REASSIGNMENT DEBUG: Navigate call failed:', error);
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
        setIsSubmitting(false);
        return; // Exit early on error
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

      // Store registration data for admin approval instead of creating user immediately
      console.log('📝 REGISTRATION DEBUG: Submitting to pending_registrations table');
      console.log('📊 Complete registration data:', {
        email: signUpForm.email,
        firstName: formDataWithCustomValues.firstName,
        lastName: formDataWithCustomValues.lastName,
        organization: formDataWithCustomValues.organization,
        allFormData: formDataWithCustomValues
      });
      
      console.log('🔄 REGISTRATION DEBUG: About to call supabase.from(pending_registrations).insert()');
      console.log('📝 PASSWORD DEBUG: Password being stored:', signUpForm.password ? 'Password provided' : 'No password');
      const { error } = await supabase
        .from('pending_registrations')
        .insert({
          email: signUpForm.email,
        password_hash: storeActualPassword(signUpForm.password),
          first_name: formDataWithCustomValues.firstName,
          last_name: formDataWithCustomValues.lastName,
          organization_name: formDataWithCustomValues.organization,
          state_association: formDataWithCustomValues.stateAssociation,
          student_fte: formDataWithCustomValues.studentFte ? parseInt(formDataWithCustomValues.studentFte) : null,
          address: formDataWithCustomValues.address,
          city: formDataWithCustomValues.city,
          state: formDataWithCustomValues.state,
          zip: formDataWithCustomValues.zip,
          primary_contact_title: formDataWithCustomValues.primaryContactTitle,
          secondary_first_name: formDataWithCustomValues.secondaryFirstName,
          secondary_last_name: formDataWithCustomValues.secondaryLastName,
          secondary_contact_title: formDataWithCustomValues.secondaryContactTitle,
          secondary_contact_email: formDataWithCustomValues.secondaryContactEmail,
          student_information_system: formDataWithCustomValues.studentInformationSystem,
          financial_system: formDataWithCustomValues.financialSystem,
          financial_aid: formDataWithCustomValues.financialAid,
          hcm_hr: formDataWithCustomValues.hcmHr,
          payroll_system: formDataWithCustomValues.payrollSystem,
          purchasing_system: formDataWithCustomValues.purchasingSystem,
          housing_management: formDataWithCustomValues.housingManagement,
          learning_management: formDataWithCustomValues.learningManagement,
          admissions_crm: formDataWithCustomValues.admissionsCrm,
          alumni_advancement_crm: formDataWithCustomValues.alumniAdvancementCrm,
          primary_office_apple: formDataWithCustomValues.primaryOfficeApple,
          primary_office_asus: formDataWithCustomValues.primaryOfficeAsus,
          primary_office_dell: formDataWithCustomValues.primaryOfficeDell,
          primary_office_hp: formDataWithCustomValues.primaryOfficeHp,
          primary_office_microsoft: formDataWithCustomValues.primaryOfficeMicrosoft,
          primary_office_other: formDataWithCustomValues.primaryOfficeOther,
          primary_office_other_details: formDataWithCustomValues.primaryOfficeOtherDetails,
          other_software_comments: formDataWithCustomValues.otherSoftwareComments,
          is_private_nonprofit: formDataWithCustomValues.isPrivateNonProfit,
          login_hint: signUpForm.loginHint,
        });
      
      if (error) {
        console.error('❌ REGISTRATION DEBUG: Database insert failed');
        console.error('🔍 Registration error details:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code,
          fullError: error
        });
        
        let errorMessage = error.message;
        if (error.code === '23505') {
          // Try to clean up orphaned records and retry
          try {
            console.log('🧹 Attempting to cleanup orphaned records for:', signUpForm.email);
            const { cleanupOrphanedRecords } = await import('@/utils/cleanupOrphanedRecords');
            await cleanupOrphanedRecords(signUpForm.email);
            
            // Retry the registration after cleanup
            console.log('🔄 Retrying registration after cleanup');
            const { error: retryError } = await supabase
              .from('pending_registrations')
              .insert({
                email: signUpForm.email,
                password_hash: storeActualPassword(signUpForm.password),
                first_name: formDataWithCustomValues.firstName,
                last_name: formDataWithCustomValues.lastName,
                organization_name: formDataWithCustomValues.organization,
                state_association: formDataWithCustomValues.stateAssociation,
                student_fte: formDataWithCustomValues.studentFte ? parseInt(formDataWithCustomValues.studentFte) : null,
                address: formDataWithCustomValues.address,
                city: formDataWithCustomValues.city,
                state: formDataWithCustomValues.state,
                zip: formDataWithCustomValues.zip,
                primary_contact_title: formDataWithCustomValues.primaryContactTitle,
                secondary_first_name: formDataWithCustomValues.secondaryFirstName,
                secondary_last_name: formDataWithCustomValues.secondaryLastName,
                secondary_contact_title: formDataWithCustomValues.secondaryContactTitle,
                secondary_contact_email: formDataWithCustomValues.secondaryContactEmail,
                student_information_system: formDataWithCustomValues.studentInformationSystem,
                financial_system: formDataWithCustomValues.financialSystem,
                financial_aid: formDataWithCustomValues.financialAid,
                hcm_hr: formDataWithCustomValues.hcmHr,
                payroll_system: formDataWithCustomValues.payrollSystem,
                purchasing_system: formDataWithCustomValues.purchasingSystem,
                housing_management: formDataWithCustomValues.housingManagement,
                learning_management: formDataWithCustomValues.learningManagement,
                admissions_crm: formDataWithCustomValues.admissionsCrm,
                alumni_advancement_crm: formDataWithCustomValues.alumniAdvancementCrm,
                primary_office_apple: formDataWithCustomValues.primaryOfficeApple,
                primary_office_asus: formDataWithCustomValues.primaryOfficeAsus,
                primary_office_dell: formDataWithCustomValues.primaryOfficeDell,
                primary_office_hp: formDataWithCustomValues.primaryOfficeHp,
                primary_office_microsoft: formDataWithCustomValues.primaryOfficeMicrosoft,
                primary_office_other: formDataWithCustomValues.primaryOfficeOther,
                primary_office_other_details: formDataWithCustomValues.primaryOfficeOtherDetails,
                other_software_comments: formDataWithCustomValues.otherSoftwareComments,
                is_private_nonprofit: formDataWithCustomValues.isPrivateNonProfit,
                login_hint: signUpForm.loginHint,
              });
            
            if (!retryError) {
              console.log('✅ Registration successful after cleanup');
              toast({
                title: "Registration submitted successfully",
                description: "Your registration has been submitted for admin approval. You'll receive an email when it's processed.",
              });
              
              if (recaptchaEnabled) {
                signUpCaptchaRef.current?.reset();
                setSignUpCaptcha(null);
              }
              
              setSignUpForm(initialSignUpFormState);
              navigate('/registration-confirmation?type=pending', { replace: true });
              setIsSubmitting(false);
              return;
            } else {
              console.error('❌ Retry failed after cleanup:', retryError);
              errorMessage = "Registration failed. The email may already be registered. Please contact support if this continues.";
            }
          } catch (cleanupError) {
            console.error('❌ Cleanup failed:', cleanupError);
            errorMessage = "An account with this email already exists or is pending approval.";
          }
        }
        
        toast({
          title: "Sign up failed", 
          description: errorMessage,
          variant: "destructive"
        });
        // Reset captcha on error
        if (recaptchaEnabled) {
          signUpCaptchaRef.current?.reset();
          setSignUpCaptcha(null);
        }
      } else {
        console.log('✅ REGISTRATION DEBUG: Database insert successful!');
        console.log('🎉 REGISTRATION DEBUG: Registration saved to pending_registrations table');
        
        toast({
          title: "Registration submitted successfully",
          description: "Your registration has been submitted for admin approval. You'll receive an email when it's processed.",
        });

        // Reset captcha after success
        if (recaptchaEnabled) {
          signUpCaptchaRef.current?.reset();
          setSignUpCaptcha(null);
        }
        
        console.log('🔄 REGISTRATION DEBUG: About to redirect to confirmation page');
        console.log('📍 REGISTRATION DEBUG: Navigating to: /registration-confirmation?type=pending');
        
        // Reset form state before navigation
        setSignUpForm(initialSignUpFormState);
        
        // Redirect to confirmation page
        try {
          navigate('/registration-confirmation?type=pending', { replace: true });
          console.log('✅ REGISTRATION DEBUG: Navigate call completed successfully');
        } catch (error) {
          console.error('❌ REGISTRATION DEBUG: Navigate call failed:', error);
        }
      }
    }
    console.log('🏁 REGISTRATION DEBUG: Setting submitting to false and finishing');
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

  console.log('🎮 Current activeTab state:', activeTab);
  console.log('🔍 Current URL searchParams:', Object.fromEntries(searchParams));

  return (
    <div className="min-h-screen bg-gray-100">
      <AuthHeader />
      <div className="p-4">
        <div className="w-full max-w-4xl mx-auto">

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-6 bg-white">
            <TabsTrigger value="signin" className="text-base py-3 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Sign In</TabsTrigger>
            <TabsTrigger value="signup" className="text-base py-3 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">New Member Registration</TabsTrigger>
            <TabsTrigger value="member-update" className="text-base py-3 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Current Member Updates</TabsTrigger>
          </TabsList>
          
          <TabsContent value="signin">
            <div className="bg-auth-form rounded-lg shadow-sm p-8">
              <div className="border-b border-gray-200 pb-4 mb-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-semibold text-gray-800">
                      {isPasswordReset ? 'Set New Password' : showPasswordReset ? 'Reset Password' : 'Sign In'}
                    </h2>
                    <p className="text-gray-600 mt-1">
                      {isPasswordReset 
                        ? 'Please enter your new password'
                        : showPasswordReset 
                          ? 'Enter your email to receive password reset instructions'
                          : 'Sign in to your HESS Consortium account'
                      }
                    </p>
                  </div>
                  <img 
                    src="/lovable-uploads/c2026cbe-1547-4c12-ba1e-542841a78351.png" 
                    alt="HESS Consortium" 
                    className="h-14 w-auto"
                  />
                </div>
              </div>
              
              {isPasswordReset ? (
                <form onSubmit={handleNewPassword} className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="new-password" className="text-gray-700 font-medium">
                      New Password <span className="text-red-500">*</span>
                    </Label>
                    <div className="relative">
                      <Input
                        id="new-password"
                        type={showNewPassword ? "text" : "password"}
                        placeholder="Enter your new password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        className="bg-gray-50 border-gray-300 pr-10"
                        required
                        minLength={6}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                      >
                        {showNewPassword ? (
                          <EyeOff className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <Eye className="h-4 w-4 text-muted-foreground" />
                        )}
                      </Button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirm-password" className="text-gray-700 font-medium">
                      Confirm Password <span className="text-red-500">*</span>
                    </Label>
                    <div className="relative">
                      <Input
                        id="confirm-password"
                        type={showNewConfirmPassword ? "text" : "password"}
                        placeholder="Confirm your new password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className={`bg-gray-50 border-gray-300 pr-10 ${
                          passwordsMatch === false ? 'border-red-300 focus:border-red-500' : 
                          passwordsMatch === true ? 'border-green-300 focus:border-green-500' : ''
                        }`}
                        required
                        minLength={6}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                        onClick={() => setShowNewConfirmPassword(!showNewConfirmPassword)}
                      >
                        {showNewConfirmPassword ? (
                          <EyeOff className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <Eye className="h-4 w-4 text-muted-foreground" />
                        )}
                      </Button>
                    </div>
                    {passwordsMatch === false && (
                      <p className="text-xs text-red-500">Passwords do not match</p>
                    )}
                    {passwordsMatch === true && (
                      <p className="text-xs text-green-600">Passwords match</p>
                    )}
                  </div>
                  <Button 
                    type="submit" 
                    className="w-full bg-auth-button hover:bg-auth-button/90 text-auth-button-foreground py-3" 
                    disabled={isSubmitting || !newPassword || !confirmPassword}
                  >
                    {isSubmitting ? 'Setting Password...' : 'Set New Password'}
                  </Button>
                </form>
              ) : showPasswordReset ? (
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
                  {signinFields.length > 0 ? (
                    <>
                      {/* Dynamic fields based on configuration */}
                      {Object.entries(groupFieldsBySection(signinFields)).map(([section, fields]) => (
                        <div key={section} className="space-y-6">
                          {section !== 'General' && (
                            <div className="border-t border-gray-200 pt-6">
                              <h4 className="text-md font-medium text-gray-800 mb-4">{section}</h4>
                            </div>
                          )}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {fields.map(field => {
                              if (field.id === 'email') {
                                return (
                                  <div key={field.id} className="space-y-2">
                                    <Label htmlFor="signin-email" className="text-gray-700 font-medium">
                                      {field.label} {field.required && <span className="text-red-500">*</span>}
                                    </Label>
                                    <Input
                                      id="signin-email"
                                      type="email"
                                      placeholder={field.placeholder}
                                      value={signInForm.email}
                                      onChange={(e) => setSignInForm(prev => ({ ...prev, email: e.target.value }))}
                                      className="bg-gray-50 border-gray-300"
                                      required={field.required}
                                    />
                                  </div>
                                );
                              } else if (field.id === 'password') {
                                return (
                                  <div key={field.id} className="space-y-2">
                                    <Label htmlFor="signin-password" className="text-gray-700 font-medium">
                                      {field.label} {field.required && <span className="text-red-500">*</span>}
                                    </Label>
                                    <div className="relative">
                                      <Input
                                        id="signin-password"
                                        type={showSignInPassword ? "text" : "password"}
                                        placeholder={field.placeholder}
                                        value={signInForm.password}
                                        onChange={(e) => setSignInForm(prev => ({ ...prev, password: e.target.value }))}
                                        className="bg-gray-50 border-gray-300 pr-10"
                                        required={field.required}
                                      />
                                      <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                                        onClick={() => setShowSignInPassword(!showSignInPassword)}
                                      >
                                        {showSignInPassword ? (
                                          <EyeOff className="h-4 w-4 text-muted-foreground" />
                                        ) : (
                                          <Eye className="h-4 w-4 text-muted-foreground" />
                                        )}
                                      </Button>
                                    </div>
                                  </div>
                                );
                              } else {
                                return renderDynamicField(field);
                              }
                            })}
                          </div>
                        </div>
                      ))}
                    </>
                  ) : (
                    /* Fallback to default sign in form */
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
                        <div className="relative">
                          <Input
                            id="signin-password"
                            type={showSignInPassword ? "text" : "password"}
                            placeholder="Enter your password"
                            value={signInForm.password}
                            onChange={(e) => setSignInForm(prev => ({ ...prev, password: e.target.value }))}
                            className="bg-gray-50 border-gray-300 pr-10"
                            required
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                            onClick={() => setShowSignInPassword(!showSignInPassword)}
                          >
                            {showSignInPassword ? (
                              <EyeOff className="h-4 w-4 text-muted-foreground" />
                            ) : (
                              <Eye className="h-4 w-4 text-muted-foreground" />
                            )}
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  <div className="space-y-2">
                    <Label className="text-gray-700 font-medium">Security Verification</Label>
                    {recaptchaEnabled ? (
                      isLoadingRecaptcha ? (
                        <div className="h-20 bg-gray-100 animate-pulse rounded flex items-center justify-center">
                          <span className="text-gray-500 text-sm">Loading verification...</span>
                        </div>
                      ) : recaptchaSiteKey ? (
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
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-semibold text-gray-800 mb-2">New Member Registration</h2>
                    <p className="text-gray-600">
                      Join the HESS Consortium community or request reassignment as primary contact
                    </p>
                  </div>
                  <img 
                    src="/lovable-uploads/c2026cbe-1547-4c12-ba1e-542841a78351.png" 
                    alt="HESS Consortium" 
                    className="h-14 w-auto"
                  />
                </div>
              </div>
              <div className="px-8 pt-5 pb-8 space-y-8">
                <form onSubmit={handleSignUp} className="space-y-8">
                  {signupFields.length > 0 ? (
                    <>
                      {/* Dynamic sections based on configuration */}
                      {Object.entries(groupFieldsBySection(signupFields)).map(([section, fields]) => (
                        <div key={section} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                          <div className="mb-6">
                            <h3 className="text-lg font-semibold text-gray-800 mb-2">{section}</h3>
                            {section === 'Eligibility' && (
                              <p className="text-gray-600 text-sm">Please confirm eligibility and select your registration type.</p>
                            )}
                            {section === 'Account Information' && (
                              <p className="text-gray-600 text-sm">Your login credentials and contact information.</p>
                            )}
                            {section === 'Institution Information' && (
                              <p className="text-gray-600 text-sm">Details about your college or university.</p>
                            )}
                            {section === 'Secondary Contact' && (
                              <p className="text-gray-600 text-sm">Optional secondary contact information.</p>
                            )}
                            {section === 'Academic Systems' && (
                              <p className="text-gray-600 text-sm">Select the systems your institution currently uses.</p>
                            )}
                            {section === 'Additional Information' && (
                              <p className="text-gray-600 text-sm">Information about your computer hardware and any additional details.</p>
                            )}
                          </div>
                          
                          <div className="space-y-6">
                            {section === 'Eligibility' && (
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
                            )}
                            
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                              {fields.map(field => {
                                // Handle special field types with custom logic
                                if (field.id === 'password') {
                                  return (
                                    <div key={field.id} className="space-y-2">
                                      <Label htmlFor="signup-password" className="text-gray-700 font-medium text-sm">
                                        {field.label} {field.required && <span className="text-red-500">*</span>}
                                      </Label>
                                      <div className="relative">
                                        <Input
                                          id="signup-password"
                                          type={showSignUpPassword ? "text" : "password"}
                                          placeholder={field.placeholder}
                                          value={signUpForm.password}
                                          onChange={(e) => setSignUpForm(prev => ({ ...prev, password: e.target.value }))}
                                          className="h-11 bg-gray-50 border-gray-300 pr-10"
                                          disabled={!signUpForm.isPrivateNonProfit}
                                          required={field.required}
                                          minLength={6}
                                        />
                                        <Button
                                          type="button"
                                          variant="ghost"
                                          size="sm"
                                          className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                                          onClick={() => setShowSignUpPassword(!showSignUpPassword)}
                                          disabled={!signUpForm.isPrivateNonProfit}
                                        >
                                          {showSignUpPassword ? (
                                            <EyeOff className="h-4 w-4 text-muted-foreground" />
                                          ) : (
                                            <Eye className="h-4 w-4 text-muted-foreground" />
                                          )}
                                        </Button>
                                      </div>
                                    </div>
                                  );
                                } else if (field.id === 'confirmPassword') {
                                  return (
                                    <div key={field.id} className="space-y-2">
                                      <Label htmlFor="signup-confirm-password" className="text-gray-700 font-medium text-sm">
                                        {field.label} {field.required && <span className="text-red-500">*</span>}
                                      </Label>
                                      <div className="relative">
                                        <Input
                                          id="signup-confirm-password"
                                          type={showSignUpConfirmPassword ? "text" : "password"}
                                          placeholder={field.placeholder}
                                          value={signUpForm.confirmPassword}
                                          onChange={(e) => setSignUpForm(prev => ({ ...prev, confirmPassword: e.target.value }))}
                                          className={`h-11 bg-gray-50 border-gray-300 pr-10 ${
                                            signUpPasswordsMatch === false ? 'border-red-300 focus:border-red-500' : 
                                            signUpPasswordsMatch === true ? 'border-green-300 focus:border-green-500' : ''
                                          }`}
                                          disabled={!signUpForm.isPrivateNonProfit}
                                          required={field.required}
                                          minLength={6}
                                        />
                                        <Button
                                          type="button"
                                          variant="ghost"
                                          size="sm"
                                          className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                                          onClick={() => setShowSignUpConfirmPassword(!showSignUpConfirmPassword)}
                                          disabled={!signUpForm.isPrivateNonProfit}
                                        >
                                          {showSignUpConfirmPassword ? (
                                            <EyeOff className="h-4 w-4 text-muted-foreground" />
                                          ) : (
                                            <Eye className="h-4 w-4 text-muted-foreground" />
                                          )}
                                        </Button>
                                      </div>
                                      {signUpPasswordsMatch === false && (
                                        <p className="text-xs text-red-500">Passwords do not match</p>
                                      )}
                                      {signUpPasswordsMatch === true && (
                                        <p className="text-xs text-green-600">Passwords match</p>
                                      )}
                                    </div>
                                  );
                                } else {
                                  return renderDynamicField(field);
                                }
                              })}
                            </div>
                          </div>
                        </div>
                      ))}
                    </>
                  ) : (
                    /* Fallback to default form if no configuration is available */
                    <>
                      {/* Default eligibility section */}
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
                          
                          <div className="grid grid-cols-2 gap-4">
                            <div className="flex items-center space-x-2">
                              <input
                                type="radio"
                                id="new-member"
                                name="signup-type"
                                value="new-member"
                                checked={signUpForm.signupType === 'new-member'}
                                onChange={() => setSignUpForm(prev => ({ ...prev, signupType: 'new-member' }))}
                                className="h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                                disabled={!signUpForm.isPrivateNonProfit}
                              />
                              <label htmlFor="new-member" className="text-sm font-medium text-gray-700">
                                New Member Registration
                              </label>
                            </div>
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
                            
                            <div className="space-y-2">
                              <Label htmlFor="signup-password" className="text-gray-700 font-medium text-sm">
                                Password <span className="text-red-500">*</span>
                              </Label>
                              <div className="relative">
                                <Input
                                  id="signup-password"
                                  type={showSignUpPassword ? "text" : "password"}
                                  placeholder="Create a secure password"
                                  value={signUpForm.password}
                                  onChange={(e) => setSignUpForm(prev => ({ ...prev, password: e.target.value }))}
                                  className="h-11 bg-gray-50 border-gray-300 pr-10"
                                  disabled={!signUpForm.isPrivateNonProfit}
                                  required
                                  minLength={6}
                                />
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                                  onClick={() => setShowSignUpPassword(!showSignUpPassword)}
                                  disabled={!signUpForm.isPrivateNonProfit}
                                >
                                  {showSignUpPassword ? (
                                    <EyeOff className="h-4 w-4 text-muted-foreground" />
                                  ) : (
                                    <Eye className="h-4 w-4 text-muted-foreground" />
                                  )}
                                </Button>
                              </div>
                              <p className="text-xs text-gray-500">Minimum 6 characters required</p>
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="signup-confirm-password" className="text-gray-700 font-medium text-sm">
                                Confirm Password <span className="text-red-500">*</span>
                              </Label>
                              <div className="relative">
                                <Input
                                  id="signup-confirm-password"
                                  type={showSignUpConfirmPassword ? "text" : "password"}
                                  placeholder="Confirm password"
                                  value={signUpForm.confirmPassword}
                                  onChange={(e) => setSignUpForm(prev => ({ ...prev, confirmPassword: e.target.value }))}
                                  className={`h-11 bg-gray-50 border-gray-300 pr-10 ${
                                    signUpPasswordsMatch === false ? 'border-red-300 focus:border-red-500' : 
                                    signUpPasswordsMatch === true ? 'border-green-300 focus:border-green-500' : ''
                                  }`}
                                  disabled={!signUpForm.isPrivateNonProfit}
                                  required
                                  minLength={6}
                                />
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                                  onClick={() => setShowSignUpConfirmPassword(!showSignUpConfirmPassword)}
                                  disabled={!signUpForm.isPrivateNonProfit}
                                >
                                  {showSignUpConfirmPassword ? (
                                    <EyeOff className="h-4 w-4 text-muted-foreground" />
                                  ) : (
                                    <Eye className="h-4 w-4 text-muted-foreground" />
                                  )}
                                </Button>
                              </div>
                              {signUpPasswordsMatch === false && (
                                <p className="text-xs text-red-500">Passwords do not match</p>
                              )}
                              {signUpPasswordsMatch === true && (
                                <p className="text-xs text-green-600">Passwords match</p>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Contact Details */}
                      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                        <div className="mb-6">
                          <h3 className="text-lg font-semibold text-gray-800 mb-2">Contact Details</h3>
                          <p className="text-gray-600 text-sm">Your professional contact information.</p>
                        </div>
                        
                        <div className="space-y-6">
                          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            <div className="space-y-2">
                              <Label htmlFor="signup-first-name" className="text-gray-700 font-medium text-sm">
                                First Name <span className="text-red-500">*</span>
                              </Label>
                              <Input
                                id="signup-first-name"
                                type="text"
                                placeholder="First name"
                                value={signUpForm.firstName}
                                onChange={(e) => setSignUpForm(prev => ({ ...prev, firstName: e.target.value }))}
                                className="h-11 bg-gray-50 border-gray-300"
                                disabled={!signUpForm.isPrivateNonProfit}
                                required
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="signup-last-name" className="text-gray-700 font-medium text-sm">
                                Last Name <span className="text-red-500">*</span>
                              </Label>
                              <Input
                                id="signup-last-name"
                                type="text"
                                placeholder="Last name"
                                value={signUpForm.lastName}
                                onChange={(e) => setSignUpForm(prev => ({ ...prev, lastName: e.target.value }))}
                                className="h-11 bg-gray-50 border-gray-300"
                                disabled={!signUpForm.isPrivateNonProfit}
                                required
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="signup-title" className="text-gray-700 font-medium text-sm">
                                Title/Position <span className="text-red-500">*</span>
                              </Label>
                              <Input
                                id="signup-title"
                                type="text"
                                placeholder="Your job title"
                                value={signUpForm.title}
                                onChange={(e) => setSignUpForm(prev => ({ ...prev, title: e.target.value }))}
                                className="h-11 bg-gray-50 border-gray-300"
                                disabled={!signUpForm.isPrivateNonProfit}
                                required
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="signup-phone" className="text-gray-700 font-medium text-sm">
                                Phone Number <span className="text-red-500">*</span>
                              </Label>
                              <Input
                                id="signup-phone"
                                type="tel"
                                placeholder="(555) 123-4567"
                                value={signUpForm.phone}
                                onChange={(e) => setSignUpForm(prev => ({ ...prev, phone: e.target.value }))}
                                className="h-11 bg-gray-50 border-gray-300"
                                disabled={!signUpForm.isPrivateNonProfit}
                                required
                              />
                            </div>
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
                            <div className="lg:col-span-2 space-y-2">
                              <Label htmlFor="signup-organization" className="text-gray-700 font-medium text-sm">
                                Institution Name <span className="text-red-500">*</span>
                              </Label>
                              <Input
                                id="signup-organization"
                                type="text"
                                placeholder="Your College or University Name"
                                value={signUpForm.organization}
                                onChange={(e) => setSignUpForm(prev => ({ ...prev, organization: e.target.value }))}
                                className="h-11 bg-gray-50 border-gray-300"
                                disabled={!signUpForm.isPrivateNonProfit}
                                required
                              />
                            </div>
                            
                            <div className="space-y-2">
                              <Label htmlFor="signup-address" className="text-gray-700 font-medium text-sm">
                                Street Address <span className="text-red-500">*</span>
                              </Label>
                              <Input
                                id="signup-address"
                                type="text"
                                placeholder="123 College Ave"
                                value={signUpForm.address}
                                onChange={(e) => setSignUpForm(prev => ({ ...prev, address: e.target.value }))}
                                className="h-11 bg-gray-50 border-gray-300"
                                disabled={!signUpForm.isPrivateNonProfit}
                                required
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="signup-city" className="text-gray-700 font-medium text-sm">
                                City <span className="text-red-500">*</span>
                              </Label>
                              <Input
                                id="signup-city"
                                type="text"
                                placeholder="City"
                                value={signUpForm.city}
                                onChange={(e) => setSignUpForm(prev => ({ ...prev, city: e.target.value }))}
                                className="h-11 bg-gray-50 border-gray-300"
                                disabled={!signUpForm.isPrivateNonProfit}
                                required
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="signup-state" className="text-gray-700 font-medium text-sm">
                                State <span className="text-red-500">*</span>
                              </Label>
                              <Input
                                id="signup-state"
                                type="text"
                                placeholder="State"
                                value={signUpForm.state}
                                onChange={(e) => setSignUpForm(prev => ({ ...prev, state: e.target.value }))}
                                className="h-11 bg-gray-50 border-gray-300"
                                disabled={!signUpForm.isPrivateNonProfit}
                                required
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="signup-zip" className="text-gray-700 font-medium text-sm">
                                ZIP Code <span className="text-red-500">*</span>
                              </Label>
                              <Input
                                id="signup-zip"
                                type="text"
                                placeholder="12345"
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

                      {/* Secondary Contact */}
                      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                        <div className="mb-6">
                          <h3 className="text-lg font-semibold text-gray-800 mb-2">Secondary Contact</h3>
                          <p className="text-gray-600 text-sm">Optional secondary contact information.</p>
                        </div>
                        
                        <div className="space-y-6">
                          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            <div className="space-y-2">
                              <Label htmlFor="signup-secondary-first-name" className="text-gray-700 font-medium text-sm">
                                First Name
                              </Label>
                              <Input
                                id="signup-secondary-first-name"
                                type="text"
                                placeholder="Secondary contact first name"
                                value={signUpForm.secondaryFirstName}
                                onChange={(e) => setSignUpForm(prev => ({ ...prev, secondaryFirstName: e.target.value }))}
                                className="h-11 bg-gray-50 border-gray-300"
                                disabled={!signUpForm.isPrivateNonProfit}
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="signup-secondary-last-name" className="text-gray-700 font-medium text-sm">
                                Last Name
                              </Label>
                              <Input
                                id="signup-secondary-last-name"
                                type="text"
                                placeholder="Secondary contact last name"
                                value={signUpForm.secondaryLastName}
                                onChange={(e) => setSignUpForm(prev => ({ ...prev, secondaryLastName: e.target.value }))}
                                className="h-11 bg-gray-50 border-gray-300"
                                disabled={!signUpForm.isPrivateNonProfit}
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="signup-secondary-email" className="text-gray-700 font-medium text-sm">
                                Email Address
                              </Label>
                              <Input
                                id="signup-secondary-email"
                                type="email"
                                placeholder="secondary@institution.edu"
                                value={signUpForm.secondaryEmail}
                                onChange={(e) => setSignUpForm(prev => ({ ...prev, secondaryEmail: e.target.value }))}
                                className="h-11 bg-gray-50 border-gray-300"
                                disabled={!signUpForm.isPrivateNonProfit}
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="signup-secondary-phone" className="text-gray-700 font-medium text-sm">
                                Phone Number
                              </Label>
                              <Input
                                id="signup-secondary-phone"
                                type="tel"
                                placeholder="(555) 123-4567"
                                value={signUpForm.secondaryPhone}
                                onChange={(e) => setSignUpForm(prev => ({ ...prev, secondaryPhone: e.target.value }))}
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
                          <h3 className="text-lg font-semibold text-gray-800 mb-2">Academic Systems</h3>
                          <p className="text-gray-600 text-sm">Select the systems your institution currently uses.</p>
                        </div>
                        
                        <div className="space-y-6">
                          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            <div className="space-y-2">
                              <Label htmlFor="signup-sis" className="text-gray-700 font-medium text-sm">
                                Student Information System
                              </Label>
                              <Input
                                id="signup-sis"
                                type="text"
                                placeholder="e.g., Banner, PeopleSoft, PowerSchool"
                                value={signUpForm.sis}
                                onChange={(e) => setSignUpForm(prev => ({ ...prev, sis: e.target.value }))}
                                className="h-11 bg-gray-50 border-gray-300"
                                disabled={!signUpForm.isPrivateNonProfit}
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="signup-lms" className="text-gray-700 font-medium text-sm">
                                Learning Management System
                              </Label>
                              <Input
                                id="signup-lms"
                                type="text"
                                placeholder="e.g., Canvas, Blackboard, Moodle"
                                value={signUpForm.lms}
                                onChange={(e) => setSignUpForm(prev => ({ ...prev, lms: e.target.value }))}
                                className="h-11 bg-gray-50 border-gray-300"
                                disabled={!signUpForm.isPrivateNonProfit}
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="signup-library" className="text-gray-700 font-medium text-sm">
                                Library System
                              </Label>
                              <Input
                                id="signup-library"
                                type="text"
                                placeholder="e.g., Alma, Symphony, Koha"
                                value={signUpForm.library}
                                onChange={(e) => setSignUpForm(prev => ({ ...prev, library: e.target.value }))}
                                className="h-11 bg-gray-50 border-gray-300"
                                disabled={!signUpForm.isPrivateNonProfit}
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="signup-other-software" className="text-gray-700 font-medium text-sm">
                                Other Software
                              </Label>
                              <Input
                                id="signup-other-software"
                                type="text"
                                placeholder="Other systems or software"
                                value={signUpForm.otherSoftware}
                                onChange={(e) => setSignUpForm(prev => ({ ...prev, otherSoftware: e.target.value }))}
                                className="h-11 bg-gray-50 border-gray-300"
                                disabled={!signUpForm.isPrivateNonProfit}
                              />
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Hardware Information */}
                      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                        <div className="mb-6">
                          <h3 className="text-lg font-semibold text-gray-800 mb-2">Additional Information</h3>
                          <p className="text-gray-600 text-sm">Information about your computer hardware and any additional details.</p>
                        </div>
                        
                        <div className="space-y-6">
                          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            <div className="space-y-2">
                              <Label htmlFor="signup-desktop-os" className="text-gray-700 font-medium text-sm">
                                Desktop Operating System
                              </Label>
                              <Input
                                id="signup-desktop-os"
                                type="text"
                                placeholder="e.g., Windows 11, macOS, Linux"
                                value={signUpForm.desktopOS}
                                onChange={(e) => setSignUpForm(prev => ({ ...prev, desktopOS: e.target.value }))}
                                className="h-11 bg-gray-50 border-gray-300"
                                disabled={!signUpForm.isPrivateNonProfit}
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="signup-server-os" className="text-gray-700 font-medium text-sm">
                                Server Operating System
                              </Label>
                              <Input
                                id="signup-server-os"
                                type="text"
                                placeholder="e.g., Windows Server, Linux, Unix"
                                value={signUpForm.serverOS}
                                onChange={(e) => setSignUpForm(prev => ({ ...prev, serverOS: e.target.value }))}
                                className="h-11 bg-gray-50 border-gray-300"
                                disabled={!signUpForm.isPrivateNonProfit}
                              />
                            </div>
                            <div className="lg:col-span-2 space-y-2">
                              <Label htmlFor="signup-comments" className="text-gray-700 font-medium text-sm">
                                Additional Comments
                              </Label>
                              <Textarea
                                id="signup-comments"
                                placeholder="Any additional information you'd like to share..."
                                value={signUpForm.comments}
                                onChange={(e) => setSignUpForm(prev => ({ ...prev, comments: e.target.value }))}
                                className="bg-gray-50 border-gray-300 min-h-[100px]"
                                disabled={!signUpForm.isPrivateNonProfit}
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    </>
                  )}

                  {/* Security Verification - Always shown */}
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
                        ) : recaptchaSiteKey ? (
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
                        (recaptchaEnabled && !signUpCaptcha)
                      }
                  >
                    {isSubmitting ? 'Creating account...' : 'Register Organization'}
                  </Button>
                </form>
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="member-update">
            <div className="bg-auth-form rounded-lg shadow-sm border border-gray-200">
              <div className="p-8 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-semibold text-gray-800 mb-2">Current Member Updates</h2>
                    <p className="text-gray-600">
                      Update information for your existing member institution. Note, these entries are subject to review and approval to eliminate spam entries.
                    </p>
                  </div>
                  <img 
                    src="/lovable-uploads/c2026cbe-1547-4c12-ba1e-542841a78351.png" 
                    alt="HESS Consortium" 
                    className="h-14 w-auto"
                  />
                </div>
              </div>
              <div className="p-8 space-y-8">
                <form onSubmit={handleSignUp} className="space-y-8">
                  {memberUpdateFields.length > 0 ? (
                    <>
                      {/* Dynamic sections based on configuration */}
                      {Object.entries(groupFieldsBySection(memberUpdateFields)).map(([section, fields]) => (
                        <div key={section} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                          <div className="mb-6">
                            <h3 className="text-lg font-semibold text-gray-800 mb-2">{section}</h3>
                            {section === 'Update Type' && (
                              <p className="text-gray-600 text-sm">Please confirm this is an information update for an existing member institution.</p>
                            )}
                            {section === 'Account Information' && (
                              <p className="text-gray-600 text-sm">Your login credentials and contact information.</p>
                            )}
                            {section === 'Institution Information' && (
                              <p className="text-gray-600 text-sm">Details about your college or university.</p>
                            )}
                          </div>
                          
                          <div className="space-y-6">
                            {section === 'Update Type' && (
                              <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                                <div className="flex items-start space-x-3">
                                  <Checkbox
                                    id="member-update-is-reassignment"
                                    checked={isReassignment}
                                    onCheckedChange={(checked) => setIsReassignment(checked === true)}
                                    className="mt-0.5"
                                  />
                                  <div className="flex-1">
                                    <label htmlFor="member-update-is-reassignment" className="text-gray-800 font-medium cursor-pointer">
                                      This is a member information update request <span className="text-red-500">*</span>
                                    </label>
                                    <p className="text-sm text-gray-600 mt-1">
                                      I am an authorized agent from my current HESS member institution and am updating information for my own existing institution.
                                    </p>
                                  </div>
                                </div>
                              </div>
                            )}
                            
                            {section === 'Institution Information' && (
                              <div className="space-y-6">
                                <Label htmlFor="member-update-existing-organization" className="text-gray-700 font-medium text-sm">
                                  Select Existing Institution <span className="text-red-600">*</span>
                                </Label>
                                <Select
                                  value={selectedOrganizationId}
                                  onValueChange={handleOrganizationSelect}
                                  disabled={!isReassignment}
                                  required
                                >
                                  <SelectTrigger className="h-11 bg-gray-50 border-gray-300 max-w-lg">
                                    <SelectValue placeholder="Choose your institution..." />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {organizations.map((org) => (
                                      <SelectItem key={org.id} value={org.id}>
                                        {org.name}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                <p className="text-sm text-muted-foreground">
                                  Select your institution from the list above. This will update the existing record.
                                </p>
                              </div>
                            )}
                            
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                              {fields.map(renderDynamicField)}
                            </div>
                          </div>
                        </div>
                      ))}
                    </>
                  ) : (
                    /* Fallback to default form if no configuration is available */
                    <>
                      {/* Update Type Section */}
                      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                        <div className="mb-6">
                          <h3 className="text-lg font-semibold text-gray-800 mb-2">Update Type</h3>
                          <p className="text-gray-600 text-sm">Please confirm this is an information update for an existing member institution.</p>
                        </div>
                        
                        <div className="space-y-6">
                          <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                            <div className="flex items-start space-x-3">
                              <Checkbox
                                id="member-update-is-reassignment"
                                checked={isReassignment}
                                onCheckedChange={(checked) => setIsReassignment(checked === true)}
                                className="mt-0.5"
                              />
                              <div className="flex-1">
                                <label htmlFor="member-update-is-reassignment" className="text-gray-800 font-medium cursor-pointer">
                                  This is a member information update request <span className="text-red-500">*</span>
                                </label>
                                <p className="text-sm text-gray-600 mt-1">
                                  I am an authorized agent from my current HESS member institution and am updating information for my own existing institution.
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Contact Details */}
                      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                        <div className="mb-6">
                          <h3 className="text-lg font-semibold text-gray-800 mb-2">Contact Details</h3>
                          <p className="text-gray-600 text-sm">Your professional contact information.</p>
                        </div>
                        
                        <div className="space-y-6">
                          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            <div className="space-y-2">
                              <Label htmlFor="member-update-first-name" className="text-gray-700 font-medium text-sm">
                                First Name <span className="text-red-500">*</span>
                              </Label>
                              <Input
                                id="member-update-first-name"
                                type="text"
                                placeholder="Enter first name"
                                value={signUpForm.firstName}
                                onChange={(e) => setSignUpForm(prev => ({ ...prev, firstName: e.target.value }))}
                                className="h-11 bg-gray-50 border-gray-300"
                                disabled={!isReassignment}
                                required
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="member-update-last-name" className="text-gray-700 font-medium text-sm">
                                Last Name <span className="text-red-500">*</span>
                              </Label>
                              <Input
                                id="member-update-last-name"
                                type="text"
                                placeholder="Enter last name"
                                value={signUpForm.lastName}
                                onChange={(e) => setSignUpForm(prev => ({ ...prev, lastName: e.target.value }))}
                                className="h-11 bg-gray-50 border-gray-300"
                                disabled={!isReassignment}
                                required
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="member-update-title" className="text-gray-700 font-medium text-sm">
                                Title/Position <span className="text-red-500">*</span>
                              </Label>
                              <Input
                                id="member-update-title"
                                type="text"
                                placeholder="Your job title"
                                value={signUpForm.title}
                                onChange={(e) => setSignUpForm(prev => ({ ...prev, title: e.target.value }))}
                                className="h-11 bg-gray-50 border-gray-300"
                                disabled={!isReassignment}
                                required
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="member-update-phone" className="text-gray-700 font-medium text-sm">
                                Phone Number <span className="text-red-500">*</span>
                              </Label>
                              <Input
                                id="member-update-phone"
                                type="tel"
                                placeholder="(555) 123-4567"
                                value={signUpForm.phone}
                                onChange={(e) => setSignUpForm(prev => ({ ...prev, phone: e.target.value }))}
                                className="h-11 bg-gray-50 border-gray-300"
                                disabled={!isReassignment}
                                required
                              />
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Institution Selection */}
                      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                        <div className="mb-6">
                          <h3 className="text-lg font-semibold text-gray-800 mb-2">Institution Information</h3>
                          <p className="text-gray-600 text-sm">Details about your college or university.</p>
                        </div>
                        
                        <div className="space-y-6">
                          <Label htmlFor="member-update-existing-organization" className="text-gray-700 font-medium text-sm">
                            Select Existing Institution <span className="text-red-600">*</span>
                          </Label>
                          <Select
                            value={selectedOrganizationId}
                            onValueChange={handleOrganizationSelect}
                            disabled={!isReassignment}
                            required
                          >
                            <SelectTrigger className="h-11 bg-gray-50 border-gray-300 max-w-lg">
                              <SelectValue placeholder="Choose your institution..." />
                            </SelectTrigger>
                            <SelectContent>
                              {organizations.map((org) => (
                                <SelectItem key={org.id} value={org.id}>
                                  {org.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <p className="text-sm text-muted-foreground">
                            Select your institution from the list above. This will update the existing record.
                          </p>
                        </div>
                      </div>

                      {/* Technology Systems */}
                      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                        <div className="mb-6">
                          <h3 className="text-lg font-semibold text-gray-800 mb-2">Academic Systems</h3>
                          <p className="text-gray-600 text-sm">Select the systems your institution currently uses.</p>
                        </div>
                        
                        <div className="space-y-6">
                          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            <div className="space-y-2">
                              <Label htmlFor="member-update-sis" className="text-gray-700 font-medium text-sm">
                                Student Information System
                              </Label>
                              <Input
                                id="member-update-sis"
                                type="text"
                                placeholder="e.g., Banner, PeopleSoft, PowerSchool"
                                value={signUpForm.sis}
                                onChange={(e) => setSignUpForm(prev => ({ ...prev, sis: e.target.value }))}
                                className="h-11 bg-gray-50 border-gray-300"
                                disabled={!isReassignment}
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="member-update-lms" className="text-gray-700 font-medium text-sm">
                                Learning Management System
                              </Label>
                              <Input
                                id="member-update-lms"
                                type="text"
                                placeholder="e.g., Canvas, Blackboard, Moodle"
                                value={signUpForm.lms}
                                onChange={(e) => setSignUpForm(prev => ({ ...prev, lms: e.target.value }))}
                                className="h-11 bg-gray-50 border-gray-300"
                                disabled={!isReassignment}
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="member-update-library" className="text-gray-700 font-medium text-sm">
                                Library System
                              </Label>
                              <Input
                                id="member-update-library"
                                type="text"
                                placeholder="e.g., Alma, Symphony, Koha"
                                value={signUpForm.library}
                                onChange={(e) => setSignUpForm(prev => ({ ...prev, library: e.target.value }))}
                                className="h-11 bg-gray-50 border-gray-300"
                                disabled={!isReassignment}
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="member-update-other-software" className="text-gray-700 font-medium text-sm">
                                Other Software
                              </Label>
                              <Input
                                id="member-update-other-software"
                                type="text"
                                placeholder="Other systems or software"
                                value={signUpForm.otherSoftware}
                                onChange={(e) => setSignUpForm(prev => ({ ...prev, otherSoftware: e.target.value }))}
                                className="h-11 bg-gray-50 border-gray-300"
                                disabled={!isReassignment}
                              />
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Hardware Information */}
                      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                        <div className="mb-6">
                          <h3 className="text-lg font-semibold text-gray-800 mb-2">Additional Information</h3>
                          <p className="text-gray-600 text-sm">Information about your computer hardware and any additional details.</p>
                        </div>
                        
                        <div className="space-y-6">
                          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            <div className="space-y-2">
                              <Label htmlFor="member-update-desktop-os" className="text-gray-700 font-medium text-sm">
                                Desktop Operating System
                              </Label>
                              <Input
                                id="member-update-desktop-os"
                                type="text"
                                placeholder="e.g., Windows 11, macOS, Linux"
                                value={signUpForm.desktopOS}
                                onChange={(e) => setSignUpForm(prev => ({ ...prev, desktopOS: e.target.value }))}
                                className="h-11 bg-gray-50 border-gray-300"
                                disabled={!isReassignment}
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="member-update-server-os" className="text-gray-700 font-medium text-sm">
                                Server Operating System
                              </Label>
                              <Input
                                id="member-update-server-os"
                                type="text"
                                placeholder="e.g., Windows Server, Linux, Unix"
                                value={signUpForm.serverOS}
                                onChange={(e) => setSignUpForm(prev => ({ ...prev, serverOS: e.target.value }))}
                                className="h-11 bg-gray-50 border-gray-300"
                                disabled={!isReassignment}
                              />
                            </div>
                            <div className="lg:col-span-2 space-y-2">
                              <Label htmlFor="member-update-comments" className="text-gray-700 font-medium text-sm">
                                Additional Comments
                              </Label>
                              <Textarea
                                id="member-update-comments"
                                placeholder="Any additional information you'd like to share..."
                                value={signUpForm.comments}
                                onChange={(e) => setSignUpForm(prev => ({ ...prev, comments: e.target.value }))}
                                className="bg-gray-50 border-gray-300 min-h-[100px]"
                                disabled={!isReassignment}
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    </>
                  )}

                  {/* reCAPTCHA Section */}
                  <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                    <div className="mb-6">
                      <h3 className="text-lg font-semibold text-gray-800 mb-2">Verification</h3>
                      <p className="text-gray-600 text-sm">Complete the verification below to submit your update request.</p>
                    </div>
                    
                    <div className="space-y-4">
                      {recaptchaEnabled ? (
                        isLoadingRecaptcha ? (
                          <div className="flex items-center justify-center py-8">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                          </div>
                        ) : recaptchaSiteKey ? (
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
                      !isReassignment || 
                      (recaptchaEnabled && !signUpCaptcha) ||
                      !selectedOrganizationId
                    }
                  >
                    {isSubmitting ? 'Submitting update request...' : 'Submit Information Update Request'}
                  </Button>
                </form>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Email Not Found Dialog */}
      <AlertDialog open={showEmailNotFoundDialog} onOpenChange={setShowEmailNotFoundDialog}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-xl font-semibold text-center">
              Account Not Found
            </AlertDialogTitle>
            <AlertDialogDescription className="text-center pt-2">
              The email address "<strong>{emailNotFoundAddress}</strong>" cannot be found in our member database.
              <br /><br />
              Would you like to request a new account?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col sm:flex-row gap-2">
            <AlertDialogCancel 
              onClick={() => {
                setShowEmailNotFoundDialog(false);
                setEmailNotFoundAddress('');
                setResetEmail('');
              }}
              className="w-full sm:w-auto"
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => {
                setActiveTab('signup');
                setShowEmailNotFoundDialog(false);
                setEmailNotFoundAddress('');
                setResetEmail('');
              }}
              className="w-full sm:w-auto"
            >
              New Member Registration
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* User Not Found Modal */}
      <AlertDialog open={showUserNotFoundModal} onOpenChange={setShowUserNotFoundModal}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-xl font-semibold text-center">
              User Not Found
            </AlertDialogTitle>
            <AlertDialogDescription className="text-center pt-2">
              This user is not found in our membership database.
              <br /><br />
              If this is in error, please contact <strong>info@hessconsortium.org</strong>.
              <br /><br />
              You have <strong>{3 - loginAttempts}</strong> attempts remaining.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction 
              onClick={() => setShowUserNotFoundModal(false)}
              className="w-full"
            >
              OK
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Too Many Attempts Modal */}
      <AlertDialog open={showTooManyAttemptsModal} onOpenChange={setShowTooManyAttemptsModal}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-xl font-semibold text-center">
              Too Many Login Attempts
            </AlertDialogTitle>
            <AlertDialogDescription className="text-center pt-2">
              You have exceeded the maximum number of login attempts.
              <br /><br />
              Please wait 30 minutes before trying again.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction 
              onClick={() => setShowTooManyAttemptsModal(false)}
              className="w-full"
            >
              OK
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      </div>
    </div>
  );
}
