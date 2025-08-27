import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
// Logo import removed - using uploaded HESS logo instead

export default function Auth() {
  const { user, signIn, signUp, loading } = useAuth();
  const { toast } = useToast();
  
  const [signInForm, setSignInForm] = useState({ email: '', password: '' });
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
    setIsSubmitting(true);
    
    const { error } = await signIn(signInForm.email, signInForm.password);
    
    if (error) {
      toast({
        title: "Sign in failed",
        description: error.message,
        variant: "destructive"
      });
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
    setIsSubmitting(true);
    
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
    } else {
      toast({
        title: "Account created!",
        description: "Please check your email to verify your account.",
      });
    }
    setIsSubmitting(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-6xl">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <img 
              src="/lovable-uploads/06437c29-40c8-489a-b779-616d8fc6ab04.png" 
              alt="HESS Consortium Logo"
              className="h-16 w-auto"
            />
          </div>
          <h1 className="text-3xl font-bold text-foreground">HESS Consortium</h1>
          <p className="text-muted-foreground mt-2">Member Management Portal</p>
        </div>

        <Tabs defaultValue="signin" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="signin">Sign In</TabsTrigger>
            <TabsTrigger value="signup">Member Registration</TabsTrigger>
          </TabsList>
          
          <TabsContent value="signin">
            <Card>
              <CardHeader>
                <CardTitle>Sign In</CardTitle>
                <CardDescription>
                  Sign in to your HESS Consortium account
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSignIn} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="signin-email">Email</Label>
                    <Input
                      id="signin-email"
                      type="email"
                      placeholder="Enter your email"
                      value={signInForm.email}
                      onChange={(e) => setSignInForm(prev => ({ ...prev, email: e.target.value }))}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signin-password">Password</Label>
                    <Input
                      id="signin-password"
                      type="password"
                      placeholder="Enter your password"
                      value={signInForm.password}
                      onChange={(e) => setSignInForm(prev => ({ ...prev, password: e.target.value }))}
                      required
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={isSubmitting}>
                    {isSubmitting ? 'Signing in...' : 'Sign In'}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="signup">
            <Card className="max-w-4xl mx-auto">
              <CardHeader>
                <CardTitle>Member Registration</CardTitle>
                <CardDescription>
                  Register your organization with HESS Consortium
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSignUp} className="space-y-6">
                  {/* Institution Type Verification */}
                  <div className="space-y-4 pb-6 border-b">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="private-nonprofit"
                        checked={signUpForm.isPrivateNonProfit}
                        onCheckedChange={(checked) => 
                          setSignUpForm(prev => ({ ...prev, isPrivateNonProfit: checked === true }))
                        }
                      />
                      <Label 
                        htmlFor="private-nonprofit" 
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                      >
                        I confirm that this institution is a private, non-profit college or university *
                      </Label>
                    </div>
                    {!signUpForm.isPrivateNonProfit && (
                      <p className="text-sm text-muted-foreground">
                        Please confirm your institution type to proceed with registration.
                      </p>
                    )}
                  </div>

                  {/* Organization Information */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold">Organization Information</h3>
                    <div className="space-y-2">
                      <Label htmlFor="organization">Organization</Label>
                      <Input
                        id="organization"
                        placeholder="Organization name"
                        value={signUpForm.organization}
                        onChange={(e) => setSignUpForm(prev => ({ ...prev, organization: e.target.value }))}
                        disabled={!signUpForm.isPrivateNonProfit}
                        required
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="state-association">State Association (if applicable)</Label>
                        <Input
                          id="state-association"
                          placeholder="State association"
                          value={signUpForm.stateAssociation}
                          onChange={(e) => setSignUpForm(prev => ({ ...prev, stateAssociation: e.target.value }))}
                          disabled={!signUpForm.isPrivateNonProfit}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="student-fte">Student FTE</Label>
                        <Input
                          id="student-fte"
                          type="number"
                          placeholder="Student FTE"
                          value={signUpForm.studentFte}
                          onChange={(e) => setSignUpForm(prev => ({ ...prev, studentFte: e.target.value }))}
                          disabled={!signUpForm.isPrivateNonProfit}
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="address">Address</Label>
                      <Input
                        id="address"
                        placeholder="Street address"
                        value={signUpForm.address}
                        onChange={(e) => setSignUpForm(prev => ({ ...prev, address: e.target.value }))}
                        disabled={!signUpForm.isPrivateNonProfit}
                      />
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="city">City</Label>
                        <Input
                          id="city"
                          placeholder="City"
                          value={signUpForm.city}
                          onChange={(e) => setSignUpForm(prev => ({ ...prev, city: e.target.value }))}
                          disabled={!signUpForm.isPrivateNonProfit}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="state">State</Label>
                        <Input
                          id="state"
                          placeholder="State"
                          value={signUpForm.state}
                          onChange={(e) => setSignUpForm(prev => ({ ...prev, state: e.target.value }))}
                          disabled={!signUpForm.isPrivateNonProfit}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="zip">Zip</Label>
                        <Input
                          id="zip"
                          placeholder="ZIP code"
                          value={signUpForm.zip}
                          onChange={(e) => setSignUpForm(prev => ({ ...prev, zip: e.target.value }))}
                          disabled={!signUpForm.isPrivateNonProfit}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Primary Contact */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold">Primary Contact</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="signup-firstname">First Name - Primary Contact</Label>
                        <Input
                          id="signup-firstname"
                          placeholder="First name"
                          value={signUpForm.firstName}
                          onChange={(e) => setSignUpForm(prev => ({ ...prev, firstName: e.target.value }))}
                          disabled={!signUpForm.isPrivateNonProfit}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="signup-lastname">Last Name - Primary Contact</Label>
                        <Input
                          id="signup-lastname"
                          placeholder="Last name"
                          value={signUpForm.lastName}
                          onChange={(e) => setSignUpForm(prev => ({ ...prev, lastName: e.target.value }))}
                          disabled={!signUpForm.isPrivateNonProfit}
                          required
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="primary-contact-title">Primary Contact Title</Label>
                        <Input
                          id="primary-contact-title"
                          placeholder="Job title"
                          value={signUpForm.primaryContactTitle}
                          onChange={(e) => setSignUpForm(prev => ({ ...prev, primaryContactTitle: e.target.value }))}
                          disabled={!signUpForm.isPrivateNonProfit}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="signup-email">Primary Email</Label>
                        <Input
                          id="signup-email"
                          type="email"
                          placeholder="Enter your email"
                          value={signUpForm.email}
                          onChange={(e) => setSignUpForm(prev => ({ ...prev, email: e.target.value }))}
                          disabled={!signUpForm.isPrivateNonProfit}
                          required
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="signup-password">Password</Label>
                      <Input
                        id="signup-password"
                        type="password"
                        placeholder="Create a password"
                        value={signUpForm.password}
                        onChange={(e) => setSignUpForm(prev => ({ ...prev, password: e.target.value }))}
                        disabled={!signUpForm.isPrivateNonProfit}
                        required
                        minLength={6}
                      />
                    </div>
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
                      <div className="space-y-2">
                        <Label htmlFor="student-info-system">Student Information System</Label>
                        <Input
                          id="student-info-system"
                          placeholder="Student information system"
                          value={signUpForm.studentInformationSystem}
                          onChange={(e) => setSignUpForm(prev => ({ ...prev, studentInformationSystem: e.target.value }))}
                          disabled={!signUpForm.isPrivateNonProfit}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="financial-system">Financial System</Label>
                        <Input
                          id="financial-system"
                          placeholder="Financial system"
                          value={signUpForm.financialSystem}
                          onChange={(e) => setSignUpForm(prev => ({ ...prev, financialSystem: e.target.value }))}
                          disabled={!signUpForm.isPrivateNonProfit}
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="financial-aid">Financial Aid</Label>
                        <Input
                          id="financial-aid"
                          placeholder="Financial aid system"
                          value={signUpForm.financialAid}
                          onChange={(e) => setSignUpForm(prev => ({ ...prev, financialAid: e.target.value }))}
                          disabled={!signUpForm.isPrivateNonProfit}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="hcm-hr">HCM (HR)</Label>
                        <Input
                          id="hcm-hr"
                          placeholder="HCM/HR system"
                          value={signUpForm.hcmHr}
                          onChange={(e) => setSignUpForm(prev => ({ ...prev, hcmHr: e.target.value }))}
                          disabled={!signUpForm.isPrivateNonProfit}
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="payroll-system">Payroll System</Label>
                        <Input
                          id="payroll-system"
                          placeholder="Payroll system"
                          value={signUpForm.payrollSystem}
                          onChange={(e) => setSignUpForm(prev => ({ ...prev, payrollSystem: e.target.value }))}
                          disabled={!signUpForm.isPrivateNonProfit}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="purchasing-system">Purchasing System</Label>
                        <Input
                          id="purchasing-system"
                          placeholder="Purchasing system"
                          value={signUpForm.purchasingSystem}
                          onChange={(e) => setSignUpForm(prev => ({ ...prev, purchasingSystem: e.target.value }))}
                          disabled={!signUpForm.isPrivateNonProfit}
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="housing-management">Housing Management</Label>
                        <Input
                          id="housing-management"
                          placeholder="Housing management system"
                          value={signUpForm.housingManagement}
                          onChange={(e) => setSignUpForm(prev => ({ ...prev, housingManagement: e.target.value }))}
                          disabled={!signUpForm.isPrivateNonProfit}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="learning-management">Learning Management (LMS)</Label>
                        <Input
                          id="learning-management"
                          placeholder="Learning management system"
                          value={signUpForm.learningManagement}
                          onChange={(e) => setSignUpForm(prev => ({ ...prev, learningManagement: e.target.value }))}
                          disabled={!signUpForm.isPrivateNonProfit}
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="admissions-crm">Admissions CRM</Label>
                        <Input
                          id="admissions-crm"
                          placeholder="Admissions CRM system"
                          value={signUpForm.admissionsCrm}
                          onChange={(e) => setSignUpForm(prev => ({ ...prev, admissionsCrm: e.target.value }))}
                          disabled={!signUpForm.isPrivateNonProfit}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="alumni-advancement-crm">Alumni / Advancement CRM</Label>
                        <Input
                          id="alumni-advancement-crm"
                          placeholder="Alumni/Advancement CRM"
                          value={signUpForm.alumniAdvancementCrm}
                          onChange={(e) => setSignUpForm(prev => ({ ...prev, alumniAdvancementCrm: e.target.value }))}
                          disabled={!signUpForm.isPrivateNonProfit}
                        />
                      </div>
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

                  <Button type="submit" className="w-full" disabled={isSubmitting || !signUpForm.isPrivateNonProfit}>
                    {isSubmitting ? 'Creating account...' : 'Register Organization'}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}