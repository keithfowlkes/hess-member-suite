import { Layout } from '@/components/Layout';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/AppSidebar';
import { useAuth } from '@/hooks/useAuth';
import { useSystemSettings } from '@/hooks/useSystemSettings';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Navigate, useNavigate } from 'react-router-dom';
import { Building2, FileText, DollarSign, LogOut, MapPin, Mail, User, AlertTriangle, Edit3, Info, MessageSquare, ClipboardList, ExternalLink } from 'lucide-react';
import { useUnifiedProfile } from '@/hooks/useUnifiedProfile';
import { useOrganizationTotals } from '@/hooks/useOrganizationTotals';
import { useInvoices } from '@/hooks/useInvoices';
import MemberSystemMessages from '@/components/MemberSystemMessages';
import { ProfileEditModal } from '@/components/ProfileEditModal';
import { AnalyticsFeedbackDialog } from '@/components/AnalyticsFeedbackDialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useSurveys } from '@/hooks/useSurveys';
import { supabase } from '@/integrations/supabase/client';

import { useState, useEffect } from 'react';

const Index = () => {
  const { isViewingAsAdmin, signOut, user, session } = useAuth();
  const { data: systemSettings } = useSystemSettings();
  const navigate = useNavigate();
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [feedbackDialogOpen, setFeedbackDialogOpen] = useState(false);
  const { data: unifiedProfileData, loading: profileLoading } = useUnifiedProfile();
  const { data: totals, isLoading: totalsLoading } = useOrganizationTotals();
  const { invoices, loading: invoicesLoading } = useInvoices();
  const { data: surveys } = useSurveys();
  const [unansweredSurveys, setUnansweredSurveys] = useState<number>(0);
  const [surveyAlertDismissed, setSurveyAlertDismissed] = useState(false);

  // Use organization data from unified profile
  const userOrganization = unifiedProfileData?.organization;

  // Check for unanswered active surveys
  useEffect(() => {
    const checkUnansweredSurveys = async () => {
      if (!user || !surveys) return;

      const activeSurveys = surveys.filter(s => s.is_active);
      if (activeSurveys.length === 0) {
        setUnansweredSurveys(0);
        return;
      }

      // Check which surveys the user has already responded to
      const { data: responses } = await supabase
        .from('survey_responses')
        .select('survey_id')
        .eq('user_id', user.id);

      const respondedSurveyIds = new Set(responses?.map(r => r.survey_id) || []);
      const unanswered = activeSurveys.filter(s => !respondedSurveyIds.has(s.id));
      
      setUnansweredSurveys(unanswered.length);
      
      // Reset dismissed state if surveys have changed
      const dismissedKey = `survey-alert-dismissed-${user.id}`;
      const dismissedData = localStorage.getItem(dismissedKey);
      if (dismissedData) {
        const { surveyIds, timestamp } = JSON.parse(dismissedData);
        const currentSurveyIds = activeSurveys.map(s => s.id).sort().join(',');
        
        // If surveys have changed or it's been more than 7 days, reset dismissed state
        const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
        if (surveyIds !== currentSurveyIds || timestamp < sevenDaysAgo) {
          localStorage.removeItem(dismissedKey);
          setSurveyAlertDismissed(false);
        } else {
          setSurveyAlertDismissed(true);
        }
      } else {
        setSurveyAlertDismissed(false);
      }
    };

    checkUnansweredSurveys();
  }, [user, surveys]);

  const handleDismissSurveyAlert = () => {
    if (!user || !surveys) return;
    
    const activeSurveys = surveys.filter(s => s.is_active);
    const surveyIds = activeSurveys.map(s => s.id).sort().join(',');
    
    const dismissedKey = `survey-alert-dismissed-${user.id}`;
    localStorage.setItem(dismissedKey, JSON.stringify({
      surveyIds,
      timestamp: Date.now()
    }));
    
    setSurveyAlertDismissed(true);
  };

  // Redirect admin users to the Master Dashboard
  if (isViewingAsAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  // Calculate outstanding balance from invoices
  const outstandingBalance = invoices
    .filter(invoice => invoice.status !== 'paid')
    .reduce((total, invoice) => total + (invoice.prorated_amount || invoice.amount), 0);

  const hasOutstandingBalance = outstandingBalance > 0;

  // Check if member view items should be shown (only for non-admin view)
  const showMemberViewItems = !isViewingAsAdmin && systemSettings?.find(s => s.setting_key === 'show_member_view_items')?.setting_value === 'true';

  // Check for missing organization information
  const checkMissingInfo = (org: any) => {
    if (!org) return [];
    
    const missingFields = [];
    
    if (!org.address_line_1 || !org.city || !org.state || !org.zip_code) {
      missingFields.push('Address information');
    }
    // Note: Phone is stored in the profile, not organization, so we don't check it here
    if (!org.student_fte) {
      missingFields.push('Student FTE');
    }
    if (!org.student_information_system) {
      missingFields.push('Student Information System');
    }
    if (!org.financial_system) {
      missingFields.push('Financial System');
    }
    
    return missingFields;
  };

  const missingInfo = userOrganization ? checkMissingInfo(userOrganization) : [];
  const hasIncompleteProfile = missingInfo.length > 0;

  // Define member stats for first row - conditionally include Next Renewal
  const firstRowStats = [
    { title: 'Membership Status', value: 'Active', icon: Building2, color: 'text-green-600', isClickable: false, hasAlert: false, onClick: undefined },
    ...(showMemberViewItems ? [{ title: 'Next Renewal', value: 'Dec 2024', icon: FileText, color: 'text-blue-600', isClickable: false, hasAlert: false, onClick: undefined }] : [])
  ];

  // Define member stats for second row - conditionally include fee information
  const secondRowStats = showMemberViewItems ? [
    {
      title: 'Annual Member Fee',
      value: userOrganization?.annual_fee_amount ? `$${userOrganization.annual_fee_amount.toFixed(2)}` : '$0.00',
      icon: DollarSign,
      color: 'text-blue-600',
      isClickable: false,
      hasAlert: false,
      onClick: undefined
    },
    { 
      title: 'Outstanding Balance', 
      value: `$${outstandingBalance.toFixed(2)}`, 
      icon: DollarSign, 
      color: hasOutstandingBalance ? 'text-red-600' : 'text-green-600',
      isClickable: true,
      hasAlert: hasOutstandingBalance,
      onClick: () => navigate('/invoices')
    },
  ] : [];

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <main className="flex-1 flex flex-col">
          <div className="flex-1 overflow-y-auto">
            {/* Mobile menu button - always visible on mobile */}
            <div className="sticky top-0 z-50 flex items-center gap-2 border-b bg-background p-4 lg:hidden">
              <SidebarTrigger className="h-10 w-10 rounded-md border-2 border-primary bg-primary/10 hover:bg-primary/20" />
              <h1 className="text-lg font-semibold">HESS Consortium</h1>
            </div>
            
            <div className="p-8 pb-0">
              <div className="flex justify-between items-start gap-4">
                <div className="flex-1 min-w-0">
                  <h1 className="text-3xl font-bold text-foreground">
                    Member Dashboard
                  </h1>
                  <p className="text-muted-foreground mt-2">
                    View your membership status and invoices
                  </p>
                  {user?.email && (
                    <div className="text-sm text-muted-foreground mt-1">
                      <span>Logged in as: </span>
                      <a 
                        href={`mailto:${user.email}`}
                        className="font-medium text-primary hover:underline"
                      >
                        {user.email}
                      </a>
                      {userOrganization?.name && (
                        <span className="ml-2 text-foreground">
                          • <span className="font-medium">{userOrganization.name}</span>
                        </span>
                      )}
                    </div>
                  )}
                </div>
                <div className="flex flex-col gap-2">
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={() => {
                        const productionOrigin = 'https://members.hessconsortium.app';
                        // If already on production domain, use current origin to maintain session
                        const targetOrigin = window.location.origin.includes('hessconsortium.app')
                          ? window.location.origin
                          : productionOrigin;
                        window.open(`${targetOrigin}/`, '_blank');
                      }}
                      className="flex items-center gap-2"
                      title="Open in new window"
                    >
                      <ExternalLink className="h-4 w-4" />
                      New Window
                    </Button>
                    <Button
                      variant="outline"
                      onClick={signOut}
                      className="flex items-center gap-2"
                    >
                      <LogOut className="h-4 w-4" />
                      Sign Out
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-8 space-y-6">

            <MemberSystemMessages />

            {/* Survey Participation Alert */}
            {unansweredSurveys > 0 && !surveyAlertDismissed && (
              <Alert className="border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950">
                <ClipboardList className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                <AlertDescription className="flex items-center justify-between gap-4">
                  <div className="text-blue-800 dark:text-blue-200 flex-1">
                    {unansweredSurveys === 1 
                      ? 'There is a new survey available! Your feedback helps improve our services.'
                      : `There are ${unansweredSurveys} new surveys available! Your feedback helps improve our services.`}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      className="text-blue-800 border-blue-300 hover:bg-blue-100"
                      onClick={handleDismissSurveyAlert}
                    >
                      Dismiss
                    </Button>
                    <Button 
                      variant="default" 
                      size="sm"
                      className="bg-blue-600 hover:bg-blue-700"
                      onClick={() => navigate('/surveys')}
                    >
                      Take Survey{unansweredSurveys > 1 ? 's' : ''}
                    </Button>
                  </div>
                </AlertDescription>
              </Alert>
            )}

            {/* Profile Completion Reminder */}
            {hasIncompleteProfile && (
              <Alert className="border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950">
                <Info className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                <AlertDescription className="text-amber-800 dark:text-amber-200">
                  Your organization profile is missing some information. 
                  <Button 
                    variant="link" 
                    className="p-0 h-auto font-medium text-amber-800 dark:text-amber-200 underline hover:no-underline"
                    onClick={() => setProfileModalOpen(true)}
                  >
                    Update Your Profile
                  </Button> to complete your information.
                </AlertDescription>
              </Alert>
            )}

            {/* Institution Information - Moved to top */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5" />
                  Institution Information
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col lg:flex-row gap-6">
                  {/* Organization Information */}
                  <div className="flex-1">
                    {userOrganization ? (
                      <div className="space-y-4">
                        <div>
                          <h3 className="font-semibold text-foreground">{userOrganization.name}</h3>
                        </div>
                        
                        {(userOrganization.address_line_1 || userOrganization.city || userOrganization.state) && (
                          <div className="flex items-start gap-2 text-sm">
                            <MapPin className="h-4 w-4 mt-0.5 text-muted-foreground flex-shrink-0" />
                            <div className="text-muted-foreground">
                              {userOrganization.address_line_1 && (
                                <div>{userOrganization.address_line_1}</div>
                              )}
                              {userOrganization.address_line_2 && (
                                <div>{userOrganization.address_line_2}</div>
                              )}
                              {(userOrganization.city || userOrganization.state) && (
                                <div>
                                  {userOrganization.city}
                                  {userOrganization.city && userOrganization.state && ', '}
                                  {userOrganization.state} {userOrganization.zip_code}
                                </div>
                              )}
                            </div>
                          </div>
                        )}

                        {userOrganization.email && (
                          <div className="flex items-center gap-2 text-sm">
                            <Mail className="h-4 w-4 text-muted-foreground" />
                            <a 
                              href={`mailto:${userOrganization.email}`}
                              className="text-primary hover:underline"
                            >
                              {userOrganization.email}
                            </a>
                          </div>
                        )}

                        {user?.email && (
                          <div className="pt-2 border-t">
                            <div className="flex items-center gap-2 text-sm">
                              <User className="h-4 w-4 text-muted-foreground" />
                              <div>
                                <div className="font-medium text-foreground">Primary Contact</div>
                                <div className="text-muted-foreground">{user.email}</div>
                              </div>
                            </div>
                          </div>
                        )}

                        {userOrganization.updated_at && (
                          <div className="pt-2 border-t">
                            <div className="text-sm text-muted-foreground">
                              <span className="font-medium">Profile Last Updated:</span> {new Date(userOrganization.updated_at).toLocaleDateString('en-US', {
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric'
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="text-sm text-muted-foreground">Loading institution information...</div>
                    )}
                  </div>

                  {/* Profile Update Button */}
                  <div className="flex-shrink-0 lg:w-64">
                    <div className="bg-gradient-to-br from-primary/10 to-primary/5 rounded-lg p-4 h-full flex flex-col justify-center">
                      <div className="text-center space-y-3">
                        <Edit3 className="h-8 w-8 text-primary mx-auto" />
                        <div>
                          <h4 className="font-medium text-foreground mb-1">Keep Your Profile Current</h4>
                          <p className="text-sm text-muted-foreground mb-3">
                            Update your organization and contact information
                          </p>
                        </div>
                        <Button 
                          onClick={() => setProfileModalOpen(true)}
                          className="w-full"
                          size="lg"
                        >
                          Update Your Profile
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Stats Grid */}
            <div className="space-y-6">
              {/* First Row */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {firstRowStats.map((stat) => {
                  const Icon = stat.icon;
                  return (
                    <Card 
                      key={stat.title}
                      className={stat.isClickable ? "cursor-pointer hover:shadow-md transition-shadow" : ""}
                      onClick={stat.onClick}
                    >
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium flex items-center gap-2">
                          {stat.title}
                          {stat.hasAlert && (
                            <Badge variant="destructive" className="flex items-center gap-1 text-xs">
                              <AlertTriangle className="h-3 w-3" />
                              Alert
                            </Badge>
                          )}
                        </CardTitle>
                        <Icon className={`h-4 w-4 ${stat.color}`} />
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold flex items-center gap-2">
                          {stat.value}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
                
                {/* Questions & Feedback Block */}
                <Card className="bg-gradient-to-br from-primary/10 to-primary/5">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Questions & Feedback</CardTitle>
                    <MessageSquare className="h-4 w-4 text-primary" />
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground mb-3">
                      Have suggestions or questions? We'd love to hear from you.
                    </p>
                    <Button 
                      variant="outline"
                      size="sm"
                      onClick={() => setFeedbackDialogOpen(true)}
                      className="w-full gap-2"
                    >
                      <MessageSquare className="h-4 w-4" />
                      What would you like to see?
                    </Button>
                  </CardContent>
                </Card>
              </div>
              
              {/* Second Row */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {secondRowStats.map((stat) => {
                  const Icon = stat.icon;
                  return (
                    <Card 
                      key={stat.title}
                      className={stat.isClickable ? "cursor-pointer hover:shadow-md transition-shadow" : ""}
                      onClick={stat.onClick}
                    >
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium flex items-center gap-2">
                          {stat.title}
                          {stat.hasAlert && (
                            <Badge variant="destructive" className="flex items-center gap-1 text-xs">
                              <AlertTriangle className="h-3 w-3" />
                              Alert
                            </Badge>
                          )}
                        </CardTitle>
                        <Icon className={`h-4 w-4 ${stat.color}`} />
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold flex items-center gap-2">
                          {invoicesLoading && stat.title === 'Outstanding Balance' ? '...' : stat.value}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>

            {/* Member Totals */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Total Member Organizations</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-foreground">
                    {totalsLoading ? '...' : totals?.totalOrganizations?.toLocaleString() || 0}
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Total Student FTE Represented by HESS Member Institutions</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-foreground">
                    {totalsLoading ? '...' : totals?.totalStudentFte?.toLocaleString() || 0}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Footer */}
            <div className="flex flex-col items-center justify-center py-8 mt-12 border-t border-border">
              <img 
                src="/lovable-uploads/95b9e225-2202-4407-bdb2-f95edf683d93.png" 
                alt="DeusLogic Logo" 
                className="h-8 w-auto mb-2 opacity-70"
              />
              <p className="text-xs text-muted-foreground">
                Copyright 2025 DeusLogic, LLC.
              </p>
              <p className="text-xs text-muted-foreground text-center mt-4 max-w-2xl px-4">
                The member information on this website portal is confidential to HESS Consortium members. This information should not be shared with outside organizations without the written permission of the members.
              </p>
            </div>
            </div>
          </div>
          
          {/* Profile Edit Modal */}
          <ProfileEditModal 
            open={profileModalOpen} 
            onOpenChange={setProfileModalOpen} 
          />
          
          {/* Feedback Dialog */}
          <AnalyticsFeedbackDialog
            open={feedbackDialogOpen}
            onOpenChange={setFeedbackDialogOpen}
          />
        </main>
      </div>
    </SidebarProvider>
  );
};

export default Index;