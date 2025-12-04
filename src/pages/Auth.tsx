import React, { useState, useRef, useEffect } from 'react';
import { Navigate, useSearchParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import ReCAPTCHA from 'react-google-recaptcha';
import { useSystemSetting } from '@/hooks/useSystemSettings';
import { useSimpleFieldOptions, type SystemField } from '@/hooks/useSimpleSystemFieldOptions';
import DOMPurify from 'dompurify';
import { EnhancedSystemFieldSelect } from '@/components/EnhancedSystemFieldSelect';
import { useOrganizations } from '@/hooks/useOrganizations';
import { useMemberRegistrationUpdates } from '@/hooks/useMemberRegistrationUpdates';
import { Eye, EyeOff } from 'lucide-react';
import { useDebounce } from '@/hooks/useDebounce';

import { encryptPassword } from '@/utils/passwordEncryption';

// U.S. State abbreviations
const US_STATES = [
  'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
  'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
  'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
  'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
  'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY'
];

// Partner programs
const PARTNER_PROGRAMS = ['Ellucian', 'Jenzabar', 'Oracle', 'Workday'];

// Encrypt password before storing - returns encrypted string or falls back to plaintext
const encryptPasswordForStorage = async (password: string): Promise<string> => {
  try {
    const encrypted = await encryptPassword(password);
    console.log('🔐 Password encrypted successfully for storage');
    return `encrypted:${encrypted}`;
  } catch (error) {
    console.warn('⚠️ Password encryption failed, storing plaintext:', error);
    return password;
  }
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
  const { data: memberAgreementSetting } = useSystemSetting('member_agreement_text');
  
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
    primaryContactPhone: '',
    secondaryFirstName: '',
    secondaryLastName: '',
    secondaryContactTitle: '',
    secondaryContactEmail: '',
    secondaryContactPhone: '',
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
    paymentPlatform: '',
    paymentPlatformOther: '',
    mealPlanManagement: '',
    mealPlanManagementOther: '',
    identityManagement: '',
    identityManagementOther: '',
    doorAccess: '',
    doorAccessOther: '',
    documentManagement: '',
    documentManagementOther: '',
    voip: '',
    voipOther: '',
    networkInfrastructure: '',
    networkInfrastructureOther: '',
    primaryOfficeApple: false,
    primaryOfficeLenovo: false,
    primaryOfficeDell: false,
    primaryOfficeHp: false,
    primaryOfficeMicrosoft: false,
    primaryOfficeOther: false,
    primaryOfficeOtherDetails: '',
    otherSoftwareComments: '',
    loginHint: '',
    approximateDateJoinedHess: '',
    requestedCohorts: [] as string[],
    partnerProgramInterest: [] as string[]
  };

  const availableCohorts = ['Anthology', 'Ellucian Banner', 'Ellucian Colleague', 'Jenzabar ONE', 'Oracle Cloud', 'Workday'];

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
    
    // Validate required system fields
    const requiredSystemFields = [
      { key: 'identityManagement', label: 'Identity Management' },
      { key: 'doorAccess', label: 'Door Access' },
      { key: 'documentManagement', label: 'Document Management' },
      { key: 'voip', label: 'VoIP' },
      { key: 'networkInfrastructure', label: 'Network Infrastructure' }
    ];
    
    for (const field of requiredSystemFields) {
      const value = signUpForm[field.key as keyof typeof signUpForm];
      if (!value || (typeof value === 'string' && value.trim() === '')) {
        toast({
          title: "Required field missing",
          description: `Please select a value for ${field.label}.`,
          variant: "destructive"
        });
        setIsSubmitting(false);
        return;
      }
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

    // Encrypt password before storage
    const encryptedPassword = await encryptPasswordForStorage(signUpForm.password);
    console.log('🔐 PASSWORD DEBUG: Password encrypted for storage');

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
          payment_platform: signUpForm.paymentPlatform === 'Other' 
            ? signUpForm.paymentPlatformOther 
            : signUpForm.paymentPlatform,
          meal_plan_management: signUpForm.mealPlanManagement === 'Other' 
            ? signUpForm.mealPlanManagementOther 
            : signUpForm.mealPlanManagement,
          identity_management: signUpForm.identityManagement === 'Other' 
            ? signUpForm.identityManagementOther 
            : signUpForm.identityManagement,
          door_access: signUpForm.doorAccess === 'Other' 
            ? signUpForm.doorAccessOther 
            : signUpForm.doorAccess,
          document_management: signUpForm.documentManagement === 'Other' 
            ? signUpForm.documentManagementOther 
            : signUpForm.documentManagement,
          voip: signUpForm.voip === 'Other' 
            ? signUpForm.voipOther 
            : signUpForm.voip,
          network_infrastructure: signUpForm.networkInfrastructure === 'Other' 
            ? signUpForm.networkInfrastructureOther 
            : signUpForm.networkInfrastructure,
          primary_office_apple: signUpForm.primaryOfficeApple,
          primary_office_lenovo: signUpForm.primaryOfficeLenovo,
          primary_office_dell: signUpForm.primaryOfficeDell,
          primary_office_hp: signUpForm.primaryOfficeHp,
          primary_office_microsoft: signUpForm.primaryOfficeMicrosoft,
          primary_office_other: signUpForm.primaryOfficeOther,
          primary_office_other_details: signUpForm.primaryOfficeOtherDetails,
          other_software_comments: signUpForm.otherSoftwareComments,
          approximate_date_joined_hess: signUpForm.approximateDateJoinedHess,
          partner_program_interest: signUpForm.partnerProgramInterest
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
              password: encryptedPassword,
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
              secondary_contact_phone: signUpForm.secondaryContactPhone,
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
        paymentPlatform: signUpForm.paymentPlatform === 'Other' 
          ? signUpForm.paymentPlatformOther 
          : signUpForm.paymentPlatform,
        mealPlanManagement: signUpForm.mealPlanManagement === 'Other' 
          ? signUpForm.mealPlanManagementOther 
          : signUpForm.mealPlanManagement,
        identityManagement: signUpForm.identityManagement === 'Other' 
          ? signUpForm.identityManagementOther 
          : signUpForm.identityManagement,
        doorAccess: signUpForm.doorAccess === 'Other' 
          ? signUpForm.doorAccessOther 
          : signUpForm.doorAccess,
        documentManagement: signUpForm.documentManagement === 'Other' 
          ? signUpForm.documentManagementOther 
          : signUpForm.documentManagement,
        voip: signUpForm.voip === 'Other' 
          ? signUpForm.voipOther 
          : signUpForm.voip,
        networkInfrastructure: signUpForm.networkInfrastructure === 'Other' 
          ? signUpForm.networkInfrastructureOther 
          : signUpForm.networkInfrastructure,
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
        password_hash: encryptedPassword,
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
          secondary_contact_phone: formDataWithCustomValues.secondaryContactPhone,
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
          payment_platform: formDataWithCustomValues.paymentPlatform,
          meal_plan_management: formDataWithCustomValues.mealPlanManagement,
          identity_management: formDataWithCustomValues.identityManagement,
          door_access: formDataWithCustomValues.doorAccess,
          document_management: formDataWithCustomValues.documentManagement,
          voip: formDataWithCustomValues.voip,
          network_infrastructure: formDataWithCustomValues.networkInfrastructure,
          primary_office_apple: formDataWithCustomValues.primaryOfficeApple,
          primary_office_lenovo: formDataWithCustomValues.primaryOfficeLenovo,
          primary_office_dell: formDataWithCustomValues.primaryOfficeDell,
          primary_office_hp: formDataWithCustomValues.primaryOfficeHp,
          primary_office_microsoft: formDataWithCustomValues.primaryOfficeMicrosoft,
          primary_office_other: formDataWithCustomValues.primaryOfficeOther,
          primary_office_other_details: formDataWithCustomValues.primaryOfficeOtherDetails,
          other_software_comments: formDataWithCustomValues.otherSoftwareComments,
          is_private_nonprofit: formDataWithCustomValues.isPrivateNonProfit,
          login_hint: signUpForm.loginHint,
          approximate_date_joined_hess: new Date().toISOString().split('T')[0],
          requested_cohorts: signUpForm.requestedCohorts,
          partner_program_interest: signUpForm.partnerProgramInterest
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
                password_hash: encryptedPassword,
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
                secondary_contact_phone: formDataWithCustomValues.secondaryContactPhone,
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
                payment_platform: formDataWithCustomValues.paymentPlatform,
                meal_plan_management: formDataWithCustomValues.mealPlanManagement,
                identity_management: formDataWithCustomValues.identityManagement,
                door_access: formDataWithCustomValues.doorAccess,
                document_management: formDataWithCustomValues.documentManagement,
                voip: formDataWithCustomValues.voip,
                network_infrastructure: formDataWithCustomValues.networkInfrastructure,
                primary_office_apple: formDataWithCustomValues.primaryOfficeApple,
                primary_office_lenovo: formDataWithCustomValues.primaryOfficeLenovo,
                primary_office_dell: formDataWithCustomValues.primaryOfficeDell,
                primary_office_hp: formDataWithCustomValues.primaryOfficeHp,
                primary_office_microsoft: formDataWithCustomValues.primaryOfficeMicrosoft,
                primary_office_other: formDataWithCustomValues.primaryOfficeOther,
                 primary_office_other_details: formDataWithCustomValues.primaryOfficeOtherDetails,
                 other_software_comments: formDataWithCustomValues.otherSoftwareComments,
                 is_private_nonprofit: formDataWithCustomValues.isPrivateNonProfit,
                 login_hint: signUpForm.loginHint,
                 approximate_date_joined_hess: new Date().toISOString().split('T')[0],
                 requested_cohorts: signUpForm.requestedCohorts,
                 partner_program_interest: signUpForm.partnerProgramInterest
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
      <div className="p-4 pt-8 md:pt-8">
        <div className="w-full max-w-4xl mx-auto">

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-1 md:grid-cols-3 mb-16 md:mb-6 bg-white gap-3 md:gap-0 h-auto md:h-10">
            <TabsTrigger value="signin" className="text-sm md:text-base py-3 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Sign In</TabsTrigger>
            <TabsTrigger value="signup" className="text-sm md:text-base py-3 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">New Member Registration</TabsTrigger>
            <TabsTrigger value="member-update" className="text-sm md:text-base py-3 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Current Member Updates</TabsTrigger>
          </TabsList>
          
          <TabsContent value="signin" className="mt-8 md:mt-2">
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
          
          <TabsContent value="signup" className="mt-8 md:mt-2">
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
                      <div className="lg:col-span-2 flex items-center space-x-2">
                        <Checkbox
                          id="signup-is-private-nonprofit"
                          checked={signUpForm.isPrivateNonProfit ?? true}
                          onCheckedChange={(checked) => 
                            setSignUpForm(prev => ({ ...prev, isPrivateNonProfit: checked as boolean }))
                          }
                        />
                        <Label htmlFor="signup-is-private-nonprofit" className="text-sm text-gray-700">
                          This is a private non-profit institution
                        </Label>
                      </div>

                      <div className="lg:col-span-2 space-y-2">
                        <Label htmlFor="signup-organization" className="text-gray-700 font-medium text-sm">
                          Institution Name <span className="text-red-500">*</span>
                        </Label>
                        <Input
                          id="signup-organization"
                          placeholder="Your Institution Name"
                          value={signUpForm.organization}
                          onChange={(e) => setSignUpForm(prev => ({ ...prev, organization: e.target.value }))}
                          className="h-11 bg-gray-50 border-gray-300"
                          disabled={!signUpForm.isPrivateNonProfit}
                          required
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="signup-student-fte" className="text-gray-700 font-medium text-sm">
                          Student FTE <span className="text-red-500">*</span>
                        </Label>
                        <Input
                          id="signup-student-fte"
                          type="number"
                          placeholder="e.g., 5000"
                          value={signUpForm.studentFte}
                          onChange={(e) => setSignUpForm(prev => ({ ...prev, studentFte: e.target.value }))}
                          className="h-11 bg-gray-50 border-gray-300"
                          disabled={!signUpForm.isPrivateNonProfit}
                          required
                        />
                      </div>
                      
                      <div className="lg:col-span-2 space-y-2">
                        <Label htmlFor="signup-address" className="text-gray-700 font-medium text-sm">
                          Address <span className="text-red-500">*</span>
                        </Label>
                        <Input
                          id="signup-address"
                          type="text"
                          placeholder="123 Main Street"
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
                        <Select
                          value={signUpForm.state}
                          onValueChange={(value) => setSignUpForm(prev => ({ ...prev, state: value }))}
                          disabled={!signUpForm.isPrivateNonProfit}
                          required
                        >
                          <SelectTrigger id="signup-state" className="h-11 bg-gray-50 border-gray-300">
                            <SelectValue placeholder="Select state" />
                          </SelectTrigger>
                          <SelectContent className="bg-background z-50">
                            {US_STATES.map((state) => (
                              <SelectItem key={state} value={state}>
                                {state}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
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
                      <div className="space-y-2">
                        <Label htmlFor="signup-state-association" className="text-gray-700 font-medium text-sm">
                          State Association
                        </Label>
                        <Input
                          id="signup-state-association"
                          type="text"
                          placeholder="e.g., ACCS, CTC, etc."
                          value={signUpForm.stateAssociation}
                          onChange={(e) => setSignUpForm(prev => ({ ...prev, stateAssociation: e.target.value }))}
                          className="h-11 bg-gray-50 border-gray-300"
                          disabled={!signUpForm.isPrivateNonProfit}
                        />
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
                      
                        {isReassignment ? (
                          <>
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                              <div className="space-y-2">
                                <Label htmlFor="signup-password" className="text-gray-700 font-medium text-sm">
                                  New Contact Password <span className="text-red-500">*</span>
                                </Label>
                                <div className="relative">
                                  <Input
                                    id="signup-password"
                                    type={showSignUpPassword ? "text" : "password"}
                                    placeholder="Password for the new contact"
                                    value={signUpForm.password}
                                    onChange={(e) => setSignUpForm(prev => ({ ...prev, password: e.target.value }))}
                                    className="h-11 bg-gray-50 border-gray-300 pr-10"
                                    required
                                    minLength={6}
                                  />
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                                    onClick={() => setShowSignUpPassword(!showSignUpPassword)}
                                  >
                                    {showSignUpPassword ? (
                                      <EyeOff className="h-4 w-4 text-muted-foreground" />
                                    ) : (
                                      <Eye className="h-4 w-4 text-muted-foreground" />
                                    )}
                                  </Button>
                                </div>
                                <p className="text-xs text-gray-500">This password will be set for the new contact after admin approval</p>
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
                                    required
                                    minLength={6}
                                  />
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                                    onClick={() => setShowSignUpConfirmPassword(!showSignUpConfirmPassword)}
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
                            <div className="lg:col-span-2 space-y-2">
                              <Label htmlFor="signup-login-hint" className="text-gray-700 font-medium text-sm">
                                Login Hint (Optional)
                              </Label>
                              <Input
                                id="signup-login-hint"
                                type="text"
                                placeholder="e.g., Maiden name, pet name, etc."
                                value={signUpForm.loginHint}
                                onChange={(e) => setSignUpForm(prev => ({ ...prev, loginHint: e.target.value }))}
                                className="h-11 bg-gray-50 border-gray-300 max-w-md"
                              />
                              <p className="text-xs text-gray-500">This hint will be included in password reset emails to help the new contact remember their account</p>
                            </div>
                          </>
                        ) : (
                          <>
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
                            <div className="lg:col-span-2 space-y-2">
                              <Label htmlFor="signup-login-hint" className="text-gray-700 font-medium text-sm">
                                Login Hint (Optional)
                              </Label>
                              <Input
                                id="signup-login-hint"
                                type="text"
                                placeholder="e.g., Maiden name, pet name, etc."
                                value={signUpForm.loginHint}
                                onChange={(e) => setSignUpForm(prev => ({ ...prev, loginHint: e.target.value }))}
                                className="h-11 bg-gray-50 border-gray-300 max-w-md"
                                disabled={!signUpForm.isPrivateNonProfit}
                              />
                              <p className="text-xs text-gray-500">This hint will be included in password reset emails to help you remember your account</p>
                            </div>
                          </>
                        )}
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
                    
                    <div className="space-y-2">
                      <Label htmlFor="primary-contact-phone" className="text-gray-700 font-medium text-sm">
                        Phone Number
                      </Label>
                      <Input
                        id="primary-contact-phone"
                        type="tel"
                        placeholder="(555) 123-4567"
                        value={signUpForm.primaryContactPhone}
                        onChange={(e) => setSignUpForm(prev => ({ ...prev, primaryContactPhone: e.target.value }))}
                        className="h-11 bg-gray-50 border-gray-300"
                        disabled={!signUpForm.isPrivateNonProfit}
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
                      <div className="space-y-2">
                        <Label htmlFor="secondary-contact-phone" className="text-gray-700 font-medium text-sm">
                          Phone Number
                        </Label>
                        <Input
                          id="secondary-contact-phone"
                          type="tel"
                          placeholder="(555) 123-4567"
                          value={signUpForm.secondaryContactPhone}
                          onChange={(e) => setSignUpForm(prev => ({ ...prev, secondaryContactPhone: e.target.value }))}
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
                        <EnhancedSystemFieldSelect
                          fieldName="student_information_system"
                          label="Student Information System"
                          value={signUpForm.studentInformationSystem}
                          onChange={(value) => setSignUpForm(prev => ({ ...prev, studentInformationSystem: value }))}
                          disabled={!signUpForm.isPrivateNonProfit}
                          required={true}
                        />
                        <EnhancedSystemFieldSelect
                          fieldName="learning_management"
                          label="Learning Management System"
                          value={signUpForm.learningManagement}
                          onChange={(value) => setSignUpForm(prev => ({ ...prev, learningManagement: value }))}
                          disabled={!signUpForm.isPrivateNonProfit}
                          required={true}
                        />
                      </div>
                    </div>

                    {/* Financial Systems */}
                    <div>
                      <h4 className="text-md font-medium text-gray-800 mb-4 pb-2 border-b border-gray-200">Financial Systems</h4>
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <EnhancedSystemFieldSelect
                          fieldName="financial_system"
                          label="Financial System"
                          value={signUpForm.financialSystem}
                          onChange={(value) => setSignUpForm(prev => ({ ...prev, financialSystem: value }))}
                          disabled={!signUpForm.isPrivateNonProfit}
                          required={true}
                        />
                        <EnhancedSystemFieldSelect
                          fieldName="financial_aid"
                          label="Financial Aid System"
                          value={signUpForm.financialAid}
                          onChange={(value) => setSignUpForm(prev => ({ ...prev, financialAid: value }))}
                          disabled={!signUpForm.isPrivateNonProfit}
                          required={true}
                        />
                        <EnhancedSystemFieldSelect
                          fieldName="purchasing_system"
                          label="Purchasing System"
                          value={signUpForm.purchasingSystem}
                          onChange={(value) => setSignUpForm(prev => ({ ...prev, purchasingSystem: value }))}
                          disabled={!signUpForm.isPrivateNonProfit}
                          required={true}
                        />
                      </div>
                    </div>

                    {/* HR & Operations */}
                    <div>
                      <h4 className="text-md font-medium text-gray-800 mb-4 pb-2 border-b border-gray-200">HR & Operations</h4>
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <EnhancedSystemFieldSelect
                          fieldName="hcm_hr"
                          label="Human Capital Management"
                          value={signUpForm.hcmHr}
                          onChange={(value) => setSignUpForm(prev => ({ ...prev, hcmHr: value }))}
                          disabled={!signUpForm.isPrivateNonProfit}
                          required={true}
                        />
                        <EnhancedSystemFieldSelect
                          fieldName="payroll_system"
                          label="Payroll System"
                          value={signUpForm.payrollSystem}
                          onChange={(value) => setSignUpForm(prev => ({ ...prev, payrollSystem: value }))}
                          disabled={!signUpForm.isPrivateNonProfit}
                          required={true}
                        />
                        <EnhancedSystemFieldSelect
                          fieldName="housing_management"
                          label="Housing Management"
                          value={signUpForm.housingManagement}
                          onChange={(value) => setSignUpForm(prev => ({ ...prev, housingManagement: value }))}
                          disabled={!signUpForm.isPrivateNonProfit}
                          required={true}
                        />
                      </div>
                    </div>

                    {/* CRM Systems */}
                    <div>
                      <h4 className="text-md font-medium text-gray-800 mb-4 pb-2 border-b border-gray-200">CRM Systems</h4>
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <EnhancedSystemFieldSelect
                          fieldName="admissions_crm"
                          label="Admissions CRM"
                          value={signUpForm.admissionsCrm}
                          onChange={(value) => setSignUpForm(prev => ({ ...prev, admissionsCrm: value }))}
                          disabled={!signUpForm.isPrivateNonProfit}
                          required={true}
                        />
                        <EnhancedSystemFieldSelect
                          fieldName="alumni_advancement_crm"
                          label="Alumni & Advancement CRM"
                          value={signUpForm.alumniAdvancementCrm}
                          onChange={(value) => setSignUpForm(prev => ({ ...prev, alumniAdvancementCrm: value }))}
                          disabled={!signUpForm.isPrivateNonProfit}
                          required={true}
                        />
                      </div>
                    </div>

                    {/* Additional System Management */}
                    <div>
                      <h4 className="text-md font-medium text-gray-800 mb-4 pb-2 border-b border-gray-200">Additional System Management</h4>
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <EnhancedSystemFieldSelect
                          fieldName="payment_platform"
                          label="Payment Platform"
                          value={signUpForm.paymentPlatform}
                          onChange={(value) => setSignUpForm(prev => ({ ...prev, paymentPlatform: value }))}
                          disabled={!signUpForm.isPrivateNonProfit}
                          required={true}
                        />
                        <EnhancedSystemFieldSelect
                          fieldName="meal_plan_management"
                          label="Meal Plan Management"
                          value={signUpForm.mealPlanManagement}
                          onChange={(value) => setSignUpForm(prev => ({ ...prev, mealPlanManagement: value }))}
                          disabled={!signUpForm.isPrivateNonProfit}
                          required={true}
                        />
                        <EnhancedSystemFieldSelect
                          fieldName="identity_management"
                          label="Identity Management"
                          value={signUpForm.identityManagement}
                          onChange={(value) => setSignUpForm(prev => ({ ...prev, identityManagement: value }))}
                          disabled={!signUpForm.isPrivateNonProfit}
                          required={true}
                        />
                        <EnhancedSystemFieldSelect
                          fieldName="door_access"
                          label="Door Access"
                          value={signUpForm.doorAccess}
                          onChange={(value) => setSignUpForm(prev => ({ ...prev, doorAccess: value }))}
                          disabled={!signUpForm.isPrivateNonProfit}
                          required={true}
                        />
                        <EnhancedSystemFieldSelect
                          fieldName="document_management"
                          label="Document Management"
                          value={signUpForm.documentManagement}
                          onChange={(value) => setSignUpForm(prev => ({ ...prev, documentManagement: value }))}
                          disabled={!signUpForm.isPrivateNonProfit}
                          required={true}
                        />
                      </div>
                    </div>

                    {/* Network & Communication */}
                    <div>
                      <h4 className="text-md font-medium text-gray-800 mb-4 pb-2 border-b border-gray-200">Network & Communication</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <EnhancedSystemFieldSelect
                          fieldName="voip"
                          label="VoIP"
                          value={signUpForm.voip}
                          onChange={(value) => setSignUpForm(prev => ({ ...prev, voip: value }))}
                          disabled={!signUpForm.isPrivateNonProfit}
                          required={true}
                        />
                        <EnhancedSystemFieldSelect
                          fieldName="network_infrastructure"
                          label="Network Infrastructure"
                          value={signUpForm.networkInfrastructure}
                          onChange={(value) => setSignUpForm(prev => ({ ...prev, networkInfrastructure: value }))}
                          disabled={!signUpForm.isPrivateNonProfit}
                          required={true}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Cohort Selection */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                  <div className="mb-6">
                    <h3 className="text-lg font-semibold text-gray-800 mb-2">System Cohort Membership</h3>
                    <p className="text-gray-600 text-sm">Select the system cohorts you wish to join to collaborate with other institutions using similar technology platforms.</p>
                  </div>
                  
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {availableCohorts.map((cohort) => (
                        <div key={cohort} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                          <Checkbox
                            id={`cohort-${cohort.replace(/\s+/g, '-').toLowerCase()}`}
                            checked={signUpForm.requestedCohorts.includes(cohort)}
                            onCheckedChange={(checked) => {
                              setSignUpForm(prev => ({
                                ...prev,
                                requestedCohorts: checked
                                  ? [...prev.requestedCohorts, cohort]
                                  : prev.requestedCohorts.filter(c => c !== cohort)
                              }));
                            }}
                            disabled={!signUpForm.isPrivateNonProfit}
                          />
                          <Label 
                            htmlFor={`cohort-${cohort.replace(/\s+/g, '-').toLowerCase()}`} 
                            className="text-sm font-medium cursor-pointer"
                          >
                            {cohort}
                          </Label>
                        </div>
                      ))}
                    </div>
                    {signUpForm.requestedCohorts.length === 0 && (
                      <p className="text-xs text-gray-500 italic">You can join cohorts later from your profile settings if you prefer.</p>
                    )}
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
                            id="lenovo"
                            checked={signUpForm.primaryOfficeLenovo}
                            onCheckedChange={(checked) => setSignUpForm(prev => ({ ...prev, primaryOfficeLenovo: !!checked }))}
                            disabled={!signUpForm.isPrivateNonProfit}
                          />
                          <Label htmlFor="lenovo" className="text-sm font-medium cursor-pointer">Lenovo</Label>
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

                    {/* Partner Program Interest */}
                    <div className="border-t border-gray-200 pt-6">
                      <h4 className="text-md font-medium text-gray-800 mb-4">Partner Program Interest</h4>
                      <div className="space-y-3">
                        <Label className="text-gray-700 font-medium text-sm">
                          Are you interested in learning more about our HESS programs with any of our foundational enterprise systems partners?
                        </Label>
                        <div className="grid grid-cols-2 gap-3">
                          {PARTNER_PROGRAMS.map((partner) => (
                            <div key={partner} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                              <Checkbox
                                id={`partner-${partner}`}
                                checked={signUpForm.partnerProgramInterest.includes(partner)}
                                onCheckedChange={(checked) => {
                                  setSignUpForm(prev => ({
                                    ...prev,
                                    partnerProgramInterest: checked
                                      ? [...prev.partnerProgramInterest, partner]
                                      : prev.partnerProgramInterest.filter(p => p !== partner)
                                  }));
                                }}
                                disabled={!signUpForm.isPrivateNonProfit}
                              />
                              <Label
                                htmlFor={`partner-${partner}`}
                                className="text-sm font-medium cursor-pointer"
                              >
                                {partner}
                              </Label>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Member Agreement */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                  <Accordion type="single" collapsible className="w-full">
                    <AccordionItem value="member-agreement" className="border-none">
                      <AccordionTrigger className="hover:no-underline [&[data-state=open]>div>svg]:rotate-180 p-0">
                        <div className="text-left w-full">
                          <h3 className="text-lg font-semibold text-gray-800 mb-2">View Member Agreement</h3>
                          <div className="flex items-center gap-2">
                            <p className="text-gray-600 text-sm">Please click here to review the Member Agreement before submitting your registration or changes.</p>
                          </div>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="text-gray-700 space-y-4 pt-4">
                        {memberAgreementSetting?.setting_value ? (
                          <div 
                            className="prose prose-sm max-w-none [&>p]:mb-3 [&>p:first-child]:mt-0 [&_strong]:text-gray-900 [&_strong]:font-semibold"
                            dangerouslySetInnerHTML={{ 
                              __html: DOMPurify.sanitize(memberAgreementSetting.setting_value) 
                            }} 
                          />
                        ) : (
                          <div className="space-y-4">
                            <p className="font-semibold text-gray-900">
                              HESS Consortium Member Confidentiality and Data Use Agreement
                            </p>
                            <p className="text-sm leading-relaxed">
                              This agreement outlines the commitment of the HESS Consortium (the "Consortium") to protect the privacy and data integrity of its member institutions while facilitating secure, mutual information exchange.
                            </p>
                            
                            <div className="space-y-3">
                              <div>
                                <p className="font-semibold text-gray-900">1. Member Information Confidentiality</p>
                                <p className="text-sm leading-relaxed">
                                  The Consortium recognizes the sensitive nature of information provided by member institutions. All non-public institutional information, including operational data, contact lists, financial metrics, and internal reports, shall be treated as confidential.
                                </p>
                              </div>
                              
                              <div>
                                <p className="font-semibold text-gray-900">2. Restrictions on External Data Sharing and Sale</p>
                                <p className="text-sm leading-relaxed">
                                  The Consortium confirms that the primary purpose of collecting member data is to enable mutual information sharing among Authenticated Users (current HESS members and authorized non-profit state association partners) to foster better organizational understanding and cooperative efficiency.
                                </p>
                                <p className="text-sm leading-relaxed">
                                  Notwithstanding this authorized internal sharing, the Consortium explicitly agrees that any data or information submitted by a member institution shall not be shared, sold, rented, or otherwise distributed to commercial third parties, including but not limited to vendor partners, corporate affiliates, or outside industry analytics companies, without the express written consent of the submitting member institution(s). Data aggregation for internal, benchmarking, and analytics will be available to Consortium member institutions and our non-profit, state association partners.
                                </p>
                              </div>
                              
                              <div>
                                <p className="font-semibold text-gray-900">3. Member Responsibility and User Access</p>
                                <p className="text-sm leading-relaxed">
                                  The HESS Consortium Member Institution, including its primary account holders and any authorized personnel granted access to the Consortium's shared information systems, is responsible for maintaining the strict confidentiality of all data concerning other members and partners. Member Institution users shall not share, reproduce, or redistribute any specific or aggregated data of other member institutions outside of their own organization. The Member Institution must ensure that account credentials are kept secure and are not shared with unauthorized individuals. Any breach of confidentiality by an Authorized User may result in the suspension or termination of the Member Institution's access privileges.
                                </p>
                              </div>
                              
                              <div>
                                <p className="font-semibold text-gray-900">4. Term and Acceptance</p>
                                <p className="text-sm leading-relaxed">
                                  By clicking the submission button below the membership update or or new member application, the member institution acknowledges and accepts the terms of this agreement, which shall remain in effect throughout the duration of active membership.
                                </p>
                              </div>
                            </div>
                          </div>
                        )}
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>
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
          
          <TabsContent value="member-update" className="mt-8 md:mt-2">
            <div className="bg-auth-form rounded-lg shadow-sm border border-gray-200">
              <div className="p-8 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-semibold text-gray-800 mb-2">Current Member Updates</h2>
                    <p className="text-gray-600">
                      Update information for your existing member institution. Note, these entries are reviewed and verified and are subject to admin approval to eliminate unauthorized or spam entries.
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
                  {/* Eligibility Section */}
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

                  {/* Institution Information */}
                  <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                    <div className="mb-6">
                      <h3 className="text-lg font-semibold text-gray-800 mb-2">Institution Information</h3>
                      <p className="text-gray-600 text-sm">Details about your college or university.</p>
                    </div>
                    
                     <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                       <div className="space-y-2">
                         <Label htmlFor="member-update-existing-organization" className="text-gray-700 font-medium text-sm">
                           Select Existing Institution <span className="text-red-600">*</span>
                         </Label>
                          <Select
                            value={selectedOrganizationId}
                            onValueChange={handleOrganizationSelect}
                            disabled={!isReassignment}
                            required
                          >
                            <SelectTrigger className="h-11 bg-gray-50 border-gray-300">
                              <SelectValue placeholder="Choose your institution..." />
                            </SelectTrigger>
                            <SelectContent className="bg-background border border-border z-50 max-h-[300px]">
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
                       
                       <div className="space-y-2">
                         <Label htmlFor="member-update-date-joined" className="text-gray-700 font-medium text-sm">
                           Approximate Date your institution joined HESS <span className="text-red-600">*</span>
                         </Label>
                         <Input
                           id="member-update-date-joined"
                           type="date"
                           value={signUpForm.approximateDateJoinedHess}
                           onChange={(e) => setSignUpForm(prev => ({ ...prev, approximateDateJoinedHess: e.target.value }))}
                           className="h-11 bg-gray-50 border-gray-300"
                           disabled={!isReassignment}
                           required
                         />
                         <p className="text-sm text-muted-foreground">
                           Please provide the approximate date when your institution became a HESS member.
                         </p>
                       </div>
                     </div>
                    
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      <div className="lg:col-span-2 flex items-center space-x-2">
                        <Checkbox
                          id="member-update-is-private-nonprofit"
                          checked={signUpForm.isPrivateNonProfit ?? true}
                          disabled={!isReassignment}
                          onCheckedChange={(checked) => 
                            setSignUpForm(prev => ({ ...prev, isPrivateNonProfit: checked as boolean }))
                          }
                        />
                        <Label htmlFor="member-update-is-private-nonprofit" className="text-sm text-gray-700">
                          This is a private non-profit institution
                        </Label>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="member-update-state-association" className="text-gray-700 font-medium text-sm">
                          State Association
                        </Label>
                        <Input
                          id="member-update-state-association"
                          type="text"
                          placeholder="e.g., ACCS, CTC, etc."
                          value={signUpForm.stateAssociation}
                          onChange={(e) => setSignUpForm(prev => ({ ...prev, stateAssociation: e.target.value }))}
                          className="h-11 bg-gray-50 border-gray-300"
                          disabled={!isReassignment}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="member-update-student-fte" className="text-gray-700 font-medium text-sm">
                          Student FTE <span className="text-red-500">*</span>
                        </Label>
                        <Input
                          id="member-update-student-fte"
                          type="number"
                          placeholder="e.g., 5000"
                          value={signUpForm.studentFte}
                          onChange={(e) => setSignUpForm(prev => ({ ...prev, studentFte: e.target.value }))}
                          className="h-11 bg-gray-50 border-gray-300"
                          disabled={!isReassignment}
                          required
                        />
                      </div>
                      <div className="lg:col-span-2 space-y-2">
                        <Label htmlFor="member-update-address" className="text-gray-700 font-medium text-sm">
                          Address <span className="text-red-500">*</span>
                        </Label>
                        <Input
                          id="member-update-address"
                          type="text"
                          placeholder="123 Main Street"
                          value={signUpForm.address}
                          onChange={(e) => setSignUpForm(prev => ({ ...prev, address: e.target.value }))}
                          className="h-11 bg-gray-50 border-gray-300"
                          disabled={!isReassignment}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="member-update-city" className="text-gray-700 font-medium text-sm">
                          City <span className="text-red-500">*</span>
                        </Label>
                        <Input
                          id="member-update-city"
                          type="text"
                          placeholder="City"
                          value={signUpForm.city}
                          onChange={(e) => setSignUpForm(prev => ({ ...prev, city: e.target.value }))}
                          className="h-11 bg-gray-50 border-gray-300"
                          disabled={!isReassignment}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="member-update-state" className="text-gray-700 font-medium text-sm">
                          State <span className="text-red-500">*</span>
                        </Label>
                        <Select
                          value={signUpForm.state}
                          onValueChange={(value) => setSignUpForm(prev => ({ ...prev, state: value }))}
                          disabled={!isReassignment}
                          required
                        >
                          <SelectTrigger id="member-update-state" className="h-11 bg-gray-50 border-gray-300">
                            <SelectValue placeholder="Select state" />
                          </SelectTrigger>
                          <SelectContent className="bg-background z-50">
                            {US_STATES.map((state) => (
                              <SelectItem key={state} value={state}>
                                {state}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="member-update-zip" className="text-gray-700 font-medium text-sm">
                          ZIP Code <span className="text-red-500">*</span>
                        </Label>
                        <Input
                          id="member-update-zip"
                          type="text"
                          placeholder="12345"
                          value={signUpForm.zip}
                          onChange={(e) => setSignUpForm(prev => ({ ...prev, zip: e.target.value }))}
                          className="h-11 bg-gray-50 border-gray-300"
                          disabled={!isReassignment}
                          required
                        />
                      </div>
                    </div>
                  </div>

                  {/* Account Information */}
                  <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                    <div className="mb-6">
                      <h3 className="text-lg font-semibold text-gray-800 mb-2">Account & Primary Contact Information</h3>
                      <p className="text-gray-600 text-sm">Your login credentials and contact information.</p>
                    </div>
                    
                    <div className="space-y-6">
                      <div className="space-y-2">
                        <Label htmlFor="member-update-first-name" className="text-gray-700 font-medium text-sm">
                          First Name <span className="text-red-600">*</span>
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
                          Last Name <span className="text-red-600">*</span>
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
                        <Label htmlFor="member-update-email" className="text-gray-700 font-medium text-sm">
                          Email Address <span className="text-red-600">*</span>
                        </Label>
                        <Input
                          id="member-update-email"
                          type="email"
                          placeholder="Enter email address"
                          value={signUpForm.email}
                          onChange={(e) => setSignUpForm(prev => ({ ...prev, email: e.target.value }))}
                          className="h-11 bg-gray-50 border-gray-300"
                          disabled={!isReassignment}
                          required
                        />
                      </div>
                      <p className="text-xs text-gray-500 mb-4">
                        This is a password reset. Please record this password for use when your information update request is approved.
                      </p>
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <Label htmlFor="member-update-password" className="text-gray-700 font-medium text-sm">
                            Password <span className="text-red-600">*</span>
                          </Label>
                          <div className="relative">
                            <Input
                              id="member-update-password"
                              type={showSignUpPassword ? "text" : "password"}
                              placeholder="Create a secure password"
                              value={signUpForm.password}
                              onChange={(e) => setSignUpForm(prev => ({ ...prev, password: e.target.value }))}
                              className="h-11 bg-gray-50 border-gray-300 pr-10"
                              disabled={!isReassignment}
                              required
                              minLength={6}
                            />
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                              onClick={() => setShowSignUpPassword(!showSignUpPassword)}
                              disabled={!isReassignment}
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
                          <Label htmlFor="member-update-confirm-password" className="text-gray-700 font-medium text-sm">
                            Confirm Password <span className="text-red-600">*</span>
                          </Label>
                          <div className="relative">
                            <Input
                              id="member-update-confirm-password"
                              type={showSignUpConfirmPassword ? "text" : "password"}
                              placeholder="Confirm password"
                              value={signUpForm.confirmPassword}
                              onChange={(e) => setSignUpForm(prev => ({ ...prev, confirmPassword: e.target.value }))}
                              className={`h-11 bg-gray-50 border-gray-300 pr-10 ${
                                signUpPasswordsMatch === false ? 'border-red-300 focus:border-red-500' : 
                                signUpPasswordsMatch === true ? 'border-green-300 focus:border-green-500' : ''
                              }`}
                              disabled={!isReassignment}
                              required
                              minLength={6}
                            />
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                              onClick={() => setShowSignUpConfirmPassword(!showSignUpConfirmPassword)}
                              disabled={!isReassignment}
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
                      <div className="lg:col-span-2 space-y-2">
                        <Label htmlFor="member-update-title" className="text-gray-700 font-medium text-sm">
                          Title/Position <span className="text-red-500">*</span>
                        </Label>
                        <Input
                          id="member-update-title"
                          type="text"
                          placeholder="e.g., IT Director, System Administrator"
                          value={signUpForm.primaryContactTitle}
                          onChange={(e) => setSignUpForm(prev => ({ ...prev, primaryContactTitle: e.target.value }))}
                          className="h-11 bg-gray-50 border-gray-300 max-w-md"
                          disabled={!isReassignment}
                          required
                        />
                      </div>
                      <div className="lg:col-span-2 space-y-2">
                        <Label htmlFor="member-update-phone" className="text-gray-700 font-medium text-sm">
                          Phone Number
                        </Label>
                        <Input
                          id="member-update-phone"
                          type="tel"
                          placeholder="(555) 123-4567"
                          value={signUpForm.primaryContactPhone}
                          onChange={(e) => setSignUpForm(prev => ({ ...prev, primaryContactPhone: e.target.value }))}
                          className="h-11 bg-gray-50 border-gray-300 max-w-md"
                          disabled={!isReassignment}
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
                          <Label htmlFor="member-update-secondary-firstname" className="text-gray-700 font-medium text-sm">
                            First Name
                          </Label>
                          <Input
                            id="member-update-secondary-firstname"
                            placeholder="First name"
                            value={signUpForm.secondaryFirstName}
                            onChange={(e) => setSignUpForm(prev => ({ ...prev, secondaryFirstName: e.target.value }))}
                            className="h-11 bg-gray-50 border-gray-300"
                            disabled={!isReassignment}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="member-update-secondary-lastname" className="text-gray-700 font-medium text-sm">
                            Last Name
                          </Label>
                          <Input
                            id="member-update-secondary-lastname"
                            placeholder="Last name"
                            value={signUpForm.secondaryLastName}
                            onChange={(e) => setSignUpForm(prev => ({ ...prev, secondaryLastName: e.target.value }))}
                            className="h-11 bg-gray-50 border-gray-300"
                            disabled={!isReassignment}
                          />
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <Label htmlFor="member-update-secondary-contact-title" className="text-gray-700 font-medium text-sm">
                            Job Title
                          </Label>
                          <Input
                            id="member-update-secondary-contact-title"
                            placeholder="Job title"
                            value={signUpForm.secondaryContactTitle}
                            onChange={(e) => setSignUpForm(prev => ({ ...prev, secondaryContactTitle: e.target.value }))}
                            className="h-11 bg-gray-50 border-gray-300"
                            disabled={!isReassignment}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="member-update-secondary-contact-email" className="text-gray-700 font-medium text-sm">
                            Email Address
                          </Label>
                          <Input
                            id="member-update-secondary-contact-email"
                            type="email"
                            placeholder="secondary.contact@institution.edu"
                            value={signUpForm.secondaryContactEmail}
                            onChange={(e) => setSignUpForm(prev => ({ ...prev, secondaryContactEmail: e.target.value }))}
                            className="h-11 bg-gray-50 border-gray-300"
                            disabled={!isReassignment}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="member-update-secondary-contact-phone" className="text-gray-700 font-medium text-sm">
                            Phone Number
                          </Label>
                          <Input
                            id="member-update-secondary-contact-phone"
                            type="tel"
                            placeholder="(555) 123-4567"
                            value={signUpForm.secondaryContactPhone}
                            onChange={(e) => setSignUpForm(prev => ({ ...prev, secondaryContactPhone: e.target.value }))}
                            className="h-11 bg-gray-50 border-gray-300"
                            disabled={!isReassignment}
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
                          <EnhancedSystemFieldSelect
                            fieldName="student_information_system"
                            label="Student Information System"
                            value={signUpForm.studentInformationSystem}
                            onChange={(value) => setSignUpForm(prev => ({ ...prev, studentInformationSystem: value }))}
                            disabled={!isReassignment}
                            organizationId={selectedOrganizationId || undefined}
                            required={true}
                          />
                          <EnhancedSystemFieldSelect
                            fieldName="learning_management"
                            label="Learning Management System"
                            value={signUpForm.learningManagement}
                            onChange={(value) => setSignUpForm(prev => ({ ...prev, learningManagement: value }))}
                            disabled={!isReassignment}
                            organizationId={selectedOrganizationId || undefined}
                            required={true}
                          />
                        </div>
                      </div>

                      {/* Financial Systems */}
                      <div>
                        <h4 className="text-md font-medium text-gray-800 mb-4 pb-2 border-b border-gray-200">Financial Systems</h4>
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                          <EnhancedSystemFieldSelect
                            fieldName="financial_system"
                            label="Financial System"
                            value={signUpForm.financialSystem}
                            onChange={(value) => setSignUpForm(prev => ({ ...prev, financialSystem: value }))}
                            disabled={!isReassignment}
                            organizationId={selectedOrganizationId || undefined}
                            required={true}
                          />
                          <EnhancedSystemFieldSelect
                            fieldName="financial_aid"
                            label="Financial Aid System"
                            value={signUpForm.financialAid}
                            onChange={(value) => setSignUpForm(prev => ({ ...prev, financialAid: value }))}
                            disabled={!isReassignment}
                            organizationId={selectedOrganizationId || undefined}
                            required={true}
                          />
                          <EnhancedSystemFieldSelect
                            fieldName="purchasing_system"
                            label="Purchasing System"
                            value={signUpForm.purchasingSystem}
                            onChange={(value) => setSignUpForm(prev => ({ ...prev, purchasingSystem: value }))}
                            disabled={!isReassignment}
                            organizationId={selectedOrganizationId || undefined}
                            required={true}
                          />
                        </div>
                      </div>

                      {/* HR & Operations */}
                      <div>
                        <h4 className="text-md font-medium text-gray-800 mb-4 pb-2 border-b border-gray-200">HR & Operations</h4>
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                          <EnhancedSystemFieldSelect
                            fieldName="hcm_hr"
                            label="Human Capital Management"
                            value={signUpForm.hcmHr}
                            onChange={(value) => setSignUpForm(prev => ({ ...prev, hcmHr: value }))}
                            disabled={!isReassignment}
                            organizationId={selectedOrganizationId || undefined}
                            required={true}
                          />
                          <EnhancedSystemFieldSelect
                            fieldName="payroll_system"
                            label="Payroll System"
                            value={signUpForm.payrollSystem}
                            onChange={(value) => setSignUpForm(prev => ({ ...prev, payrollSystem: value }))}
                            disabled={!isReassignment}
                            organizationId={selectedOrganizationId || undefined}
                            required={true}
                          />
                          <EnhancedSystemFieldSelect
                            fieldName="housing_management"
                            label="Housing Management"
                            value={signUpForm.housingManagement}
                            onChange={(value) => setSignUpForm(prev => ({ ...prev, housingManagement: value }))}
                            disabled={!isReassignment}
                            organizationId={selectedOrganizationId || undefined}
                            required={true}
                          />
                        </div>
                      </div>

                      {/* CRM Systems */}
                      <div>
                        <h4 className="text-md font-medium text-gray-800 mb-4 pb-2 border-b border-gray-200">CRM Systems</h4>
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                          <EnhancedSystemFieldSelect
                            fieldName="admissions_crm"
                            label="Admissions CRM"
                            value={signUpForm.admissionsCrm}
                            onChange={(value) => setSignUpForm(prev => ({ ...prev, admissionsCrm: value }))}
                            disabled={!isReassignment}
                            organizationId={selectedOrganizationId || undefined}
                            required={true}
                          />
                          <EnhancedSystemFieldSelect
                            fieldName="alumni_advancement_crm"
                            label="Alumni & Advancement CRM"
                            value={signUpForm.alumniAdvancementCrm}
                            onChange={(value) => setSignUpForm(prev => ({ ...prev, alumniAdvancementCrm: value }))}
                            disabled={!isReassignment}
                            organizationId={selectedOrganizationId || undefined}
                            required={true}
                          />
                        </div>
                      </div>

                      {/* Additional System Management */}
                      <div>
                        <h4 className="text-md font-medium text-gray-800 mb-4 pb-2 border-b border-gray-200">Additional System Management</h4>
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                          <EnhancedSystemFieldSelect
                            fieldName="payment_platform"
                            label="Payment Platform"
                            value={signUpForm.paymentPlatform}
                            onChange={(value) => setSignUpForm(prev => ({ ...prev, paymentPlatform: value }))}
                            disabled={!isReassignment}
                            organizationId={selectedOrganizationId || undefined}
                            required={true}
                          />
                          <EnhancedSystemFieldSelect
                            fieldName="meal_plan_management"
                            label="Meal Plan Management"
                            value={signUpForm.mealPlanManagement}
                            onChange={(value) => setSignUpForm(prev => ({ ...prev, mealPlanManagement: value }))}
                            disabled={!isReassignment}
                            organizationId={selectedOrganizationId || undefined}
                            required={true}
                          />
                          <EnhancedSystemFieldSelect
                            fieldName="identity_management"
                            label="Identity Management"
                            value={signUpForm.identityManagement}
                            onChange={(value) => setSignUpForm(prev => ({ ...prev, identityManagement: value }))}
                            disabled={!isReassignment}
                            organizationId={selectedOrganizationId || undefined}
                            required={true}
                          />
                          <EnhancedSystemFieldSelect
                            fieldName="door_access"
                            label="Door Access"
                            value={signUpForm.doorAccess}
                            onChange={(value) => setSignUpForm(prev => ({ ...prev, doorAccess: value }))}
                            disabled={!isReassignment}
                            organizationId={selectedOrganizationId || undefined}
                            required={true}
                          />
                          <EnhancedSystemFieldSelect
                            fieldName="document_management"
                            label="Document Management"
                            value={signUpForm.documentManagement}
                            onChange={(value) => setSignUpForm(prev => ({ ...prev, documentManagement: value }))}
                            disabled={!isReassignment}
                            organizationId={selectedOrganizationId || undefined}
                            required={true}
                          />
                        </div>
                      </div>

                      {/* Network & Communication */}
                      <div>
                        <h4 className="text-md font-medium text-gray-800 mb-4 pb-2 border-b border-gray-200">Network & Communication</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <EnhancedSystemFieldSelect
                            fieldName="voip"
                            label="VoIP"
                            value={signUpForm.voip}
                            onChange={(value) => setSignUpForm(prev => ({ ...prev, voip: value }))}
                            disabled={!isReassignment}
                            organizationId={selectedOrganizationId || undefined}
                            required={true}
                          />
                          <EnhancedSystemFieldSelect
                            fieldName="network_infrastructure"
                            label="Network Infrastructure"
                            value={signUpForm.networkInfrastructure}
                            onChange={(value) => setSignUpForm(prev => ({ ...prev, networkInfrastructure: value }))}
                            disabled={!isReassignment}
                            organizationId={selectedOrganizationId || undefined}
                            required={true}
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Cohort Selection */}
                  <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                    <div className="mb-6">
                      <h3 className="text-lg font-semibold text-gray-800 mb-2">System Cohort Membership</h3>
                      <p className="text-gray-600 text-sm">Select the system cohorts you wish to join to collaborate with other institutions using similar technology platforms.</p>
                    </div>
                    
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {availableCohorts.map((cohort) => (
                          <div key={cohort} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                            <Checkbox
                              id={`member-update-cohort-${cohort.replace(/\s+/g, '-').toLowerCase()}`}
                              checked={signUpForm.requestedCohorts.includes(cohort)}
                              onCheckedChange={(checked) => {
                                setSignUpForm(prev => ({
                                  ...prev,
                                  requestedCohorts: checked
                                    ? [...prev.requestedCohorts, cohort]
                                    : prev.requestedCohorts.filter(c => c !== cohort)
                                }));
                              }}
                              disabled={!isReassignment}
                            />
                            <Label 
                              htmlFor={`member-update-cohort-${cohort.replace(/\s+/g, '-').toLowerCase()}`} 
                              className="text-sm font-medium cursor-pointer"
                            >
                              {cohort}
                            </Label>
                          </div>
                        ))}
                      </div>
                      {signUpForm.requestedCohorts.length === 0 && (
                        <p className="text-xs text-gray-500 italic">You can join cohorts later from your profile settings if you prefer.</p>
                      )}
                    </div>
                  </div>

                  {/* Hardware Section */}
                  <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                    <div className="mb-6">
                      <h3 className="text-lg font-semibold text-gray-800 mb-2">Primary Office Hardware</h3>
                      <p className="text-gray-600 text-sm">Select the hardware brands used at your institution.</p>
                    </div>
                    
                    <div className="space-y-6">
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        {[
                          { key: 'primaryOfficeApple', label: 'Apple' },
                          { key: 'primaryOfficeLenovo', label: 'Lenovo' },
                          { key: 'primaryOfficeDell', label: 'Dell' },
                          { key: 'primaryOfficeHp', label: 'HP' },
                          { key: 'primaryOfficeMicrosoft', label: 'Microsoft' },
                          { key: 'primaryOfficeOther', label: 'Other' }
                        ].map(({ key, label }) => (
                          <div key={`member-update-${key}`} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                            <Checkbox
                              id={`member-update-${key}`}
                              checked={signUpForm[key as keyof typeof signUpForm] as boolean}
                              disabled={!isReassignment}
                              onCheckedChange={(checked) => 
                                setSignUpForm(prev => ({ ...prev, [key]: checked }))
                              }
                            />
                            <Label htmlFor={`member-update-${key}`} className="text-sm font-medium cursor-pointer">
                              {label}
                            </Label>
                          </div>
                        ))}
                      </div>
                      
                      {signUpForm.primaryOfficeOther && (
                        <div className="mt-4 space-y-2">
                          <Label htmlFor="member-update-primary-office-other-details" className="text-gray-700 font-medium text-sm">
                            Please specify other computer types <span className="text-red-500">*</span>
                          </Label>
                          <Input
                            id="member-update-primary-office-other-details"
                            placeholder="Please specify other computer types..."
                            value={signUpForm.primaryOfficeOtherDetails}
                            onChange={(e) => setSignUpForm(prev => ({ ...prev, primaryOfficeOtherDetails: e.target.value }))}
                            className="h-11 bg-gray-50 border-gray-300"
                            disabled={!isReassignment}
                            required
                          />
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Additional Information */}
                  <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                    <div className="mb-6">
                      <h3 className="text-lg font-semibold text-gray-800 mb-2">Additional Information</h3>
                      <p className="text-gray-600 text-sm">Optional additional details about your software and operations.</p>
                    </div>
                    
                    <div className="space-y-6">
                      <div className="space-y-2">
                        <Label htmlFor="member-update-other-software-comments" className="text-gray-700 font-medium text-sm">
                          Additional software and operational comments
                        </Label>
                        <textarea
                          id="member-update-other-software-comments"
                          placeholder="Please share any additional information about your software, operations, or special requirements..."
                          value={signUpForm.otherSoftwareComments}
                          onChange={(e) => setSignUpForm(prev => ({ ...prev, otherSoftwareComments: e.target.value }))}
                          disabled={!isReassignment}
                          className="w-full min-h-[120px] p-4 bg-gray-50 border border-gray-300 rounded-lg resize-none focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
                          rows={4}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Partner Program Interest */}
                  <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                    <div className="mb-6">
                      <h3 className="text-lg font-semibold text-gray-800 mb-2">Partner Program Interest</h3>
                      <p className="text-gray-600 text-sm">Optional: Indicate if you're interested in learning more about HESS programs with our foundational enterprise systems partners.</p>
                    </div>
                    
                    <div className="space-y-3">
                      <Label className="text-gray-700 font-medium text-sm">
                        Are you interested in learning more about our HESS programs with any of our foundational enterprise systems partners?
                      </Label>
                      <div className="grid grid-cols-2 gap-3">
                        {PARTNER_PROGRAMS.map((partner) => (
                          <div key={partner} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                            <Checkbox
                              id={`member-update-partner-${partner}`}
                              checked={signUpForm.partnerProgramInterest.includes(partner)}
                              onCheckedChange={(checked) => {
                                setSignUpForm(prev => ({
                                  ...prev,
                                  partnerProgramInterest: checked
                                    ? [...prev.partnerProgramInterest, partner]
                                    : prev.partnerProgramInterest.filter(p => p !== partner)
                                }));
                              }}
                              disabled={!isReassignment}
                            />
                            <Label
                              htmlFor={`member-update-partner-${partner}`}
                              className="text-sm font-medium cursor-pointer"
                            >
                              {partner}
                            </Label>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                  
                  {/* Member Agreement */}
                  <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                    <Accordion type="single" collapsible className="w-full">
                      <AccordionItem value="member-agreement" className="border-none">
                        <AccordionTrigger className="hover:no-underline [&[data-state=open]>div>svg]:rotate-180 p-0">
                          <div className="text-left w-full">
                            <h3 className="text-lg font-semibold text-gray-800 mb-2">View Member Agreement</h3>
                            <div className="flex items-center gap-2">
                              <p className="text-gray-600 text-sm">Please click here to review the Member Agreement before submitting your registration or changes.</p>
                            </div>
                          </div>
                        </AccordionTrigger>
                        <AccordionContent className="text-gray-700 space-y-4 pt-4">
                          {memberAgreementSetting?.setting_value ? (
                            <div 
                              className="prose prose-sm max-w-none [&>p]:mb-3 [&>p:first-child]:mt-0 [&_strong]:text-gray-900 [&_strong]:font-semibold"
                              dangerouslySetInnerHTML={{ 
                                __html: DOMPurify.sanitize(memberAgreementSetting.setting_value) 
                              }} 
                            />
                          ) : (
                            <div className="space-y-4">
                              <p className="font-semibold text-gray-900">
                                HESS Consortium Member Confidentiality and Data Use Agreement
                              </p>
                              <p className="text-sm leading-relaxed">
                                This agreement outlines the commitment of the HESS Consortium (the "Consortium") to protect the privacy and data integrity of its member institutions while facilitating secure, mutual information exchange.
                              </p>
                              
                              <div className="space-y-3">
                                <div>
                                  <p className="font-semibold text-gray-900">1. Member Information Confidentiality</p>
                                  <p className="text-sm leading-relaxed">
                                    The Consortium recognizes the sensitive nature of information provided by member institutions. All non-public institutional information, including operational data, contact lists, financial metrics, and internal reports, shall be treated as confidential.
                                  </p>
                                </div>
                                
                                <div>
                                  <p className="font-semibold text-gray-900">2. Restrictions on External Data Sharing and Sale</p>
                                  <p className="text-sm leading-relaxed">
                                    The Consortium confirms that the primary purpose of collecting member data is to enable mutual information sharing among Authenticated Users (current HESS members and authorized non-profit state association partners) to foster better organizational understanding and cooperative efficiency.
                                  </p>
                                  <p className="text-sm leading-relaxed">
                                    Notwithstanding this authorized internal sharing, the Consortium explicitly agrees that any data or information submitted by a member institution shall not be shared, sold, rented, or otherwise distributed to commercial third parties, including but not limited to vendor partners, corporate affiliates, or outside industry analytics companies, without the express written consent of the submitting member institution(s). Data aggregation for internal, benchmarking, and analytics will be available to Consortium member institutions and our non-profit, state association partners.
                                  </p>
                                </div>
                                
                                <div>
                                  <p className="font-semibold text-gray-900">3. Member Responsibility and User Access</p>
                                  <p className="text-sm leading-relaxed">
                                    The HESS Consortium Member Institution, including its primary account holders and any authorized personnel granted access to the Consortium's shared information systems, is responsible for maintaining the strict confidentiality of all data concerning other members and partners. Member Institution users shall not share, reproduce, or redistribute any specific or aggregated data of other member institutions outside of their own organization. The Member Institution must ensure that account credentials are kept secure and are not shared with unauthorized individuals. Any breach of confidentiality by an Authorized User may result in the suspension or termination of the Member Institution's access privileges.
                                  </p>
                                </div>
                                
                                <div>
                                  <p className="font-semibold text-gray-900">4. Term and Acceptance</p>
                                  <p className="text-sm leading-relaxed">
                                    By clicking the submission button below the membership update or or new member application, the member institution acknowledges and accepts the terms of this agreement, which shall remain in effect throughout the duration of active membership.
                                  </p>
                                </div>
                              </div>
                            </div>
                          )}
                        </AccordionContent>
                      </AccordionItem>
                    </Accordion>
                  </div>

                  {/* Security Verification */}
                  <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                    <div className="mb-6">
                      <h3 className="text-lg font-semibold text-gray-800 mb-2">Security Verification</h3>
                      <p className="text-gray-600 text-sm">Complete the verification to submit your request.</p>
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
