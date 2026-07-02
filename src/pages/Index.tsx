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
import { getMembershipDuesStatus } from '@/utils/membershipDuesStatus';
import { MembershipDuesBadge } from '@/components/MembershipDuesBadge';
import { PayInvoiceButton } from '@/components/PayInvoiceButton';
import { useConferenceRegistrationCode } from '@/hooks/useConferenceRegistrationCode';
import { Copy, Ticket } from 'lucide-react';
import { MemberInvoiceViewModal } from '@/components/MemberInvoiceViewModal';
import { HelpModal } from '@/components/HelpModal';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';

import { useState, useEffect } from 'react';

const Index = () => {
  const { isViewingAsAdmin, signOut, user, session } = useAuth();
  const { data: systemSettings } = useSystemSettings();
  const navigate = useNavigate();
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [feedbackDialogOpen, setFeedbackDialogOpen] = useState(false);
  const { data: unifiedProfileData, loading: profileLoading } = useUnifiedProfile();
  const { data: totals, isLoading: totalsLoading } = useOrganizationTotals();
  const { invoices, loading: invoicesLoading, fetchInvoices } = useInvoices();
  const { data: surveys } = useSurveys();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [unansweredSurveys, setUnansweredSurveys] = useState<number>(0);
  const [surveyAlertDismissed, setSurveyAlertDismissed] = useState(false);
  const [invoiceModalOpen, setInvoiceModalOpen] = useState(false);
  const [deepLinkedInvoice, setDeepLinkedInvoice] = useState<any>(null);

  // Handle emailed "Pay this invoice online" deep link: ?invoice=<id> opens the
  // invoice modal automatically once invoices have loaded.
  useEffect(() => {
    if (invoicesLoading) return;
    const params = new URLSearchParams(window.location.search);
    const targetId = params.get('invoice');
    if (!targetId) return;
    const match = invoices.find((inv) => inv.id === targetId);
    if (match) {
      setDeepLinkedInvoice(match);
      setInvoiceModalOpen(true);
      const url = new URL(window.location.href);
      url.searchParams.delete('invoice');
      window.history.replaceState({}, '', url.pathname + url.search);
    }
  }, [invoicesLoading, invoices]);


  // Handle Stripe success/cancel redirect
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const payment = params.get('payment');
    if (payment === 'success') {
      toast({
        title: 'Payment received',
        description: 'Thank you — your membership invoice has been paid.',
      });
      fetchInvoices();
      queryClient.invalidateQueries({ queryKey: ['system-settings'] });
      // Clean the URL
      window.history.replaceState({}, '', window.location.pathname);
    } else if (payment === 'cancelled') {
      toast({
        title: 'Payment cancelled',
        description: 'No charge was made. You can try again any time.',
        variant: 'destructive',
      });
      window.history.replaceState({}, '', window.location.pathname);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Use organization data from unified profile
  const userOrganization = unifiedProfileData?.organization;
  const organizationInvoices = userOrganization?.id
    ? invoices.filter((invoice) => invoice.organization_id === userOrganization.id)
    : [];

  // Membership-dues status (PAID / DUE badges) — shared helper for consistency
  const { isPaid: duesPaidForCurrentPeriod, unpaidInvoice: currentPeriodUnpaidInvoice } =
    getMembershipDuesStatus(organizationInvoices);

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
  const outstandingBalance = organizationInvoices
    .filter(invoice => invoice.status !== 'paid')
    .reduce((total, invoice) => total + (invoice.prorated_amount || invoice.amount), 0);

  const hasOutstandingBalance = outstandingBalance > 0;

  // Member fee blocks are gated by the "Enable online payments" toggle in
  // Admin Panel → Settings → Online Payments (only for non-admin view).
  const showMemberViewItems = !isViewingAsAdmin && systemSettings?.find(s => s.setting_key === 'stripe_enabled')?.setting_value === 'true';

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

  // Second-row stat cards (Annual Member Fee, Outstanding Balance) were removed.
  // Outstanding balance is now surfaced inside the Membership Fee card below.
  const secondRowStats: Array<{
    title: string;
    value: string;
    icon: typeof DollarSign;
    color: string;
    isClickable: boolean;
    hasAlert: boolean;
    onClick: (() => void) | undefined;
  }> = [];


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
                  <div className="flex-shrink-0 lg:w-64 space-y-3">
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

            {/* Membership Fee Status */}
            {(() => {
              const isAdministrator = !!userOrganization?.name?.toLowerCase().includes('administrator');
              // Always show the Membership Fee block for member organizations, even when
              // no invoice has been generated yet — fall back to an UNPAID/Pending state
              // so users always see their dues status and can contact support.
              const showFallback = isAdministrator || (!duesPaidForCurrentPeriod && !currentPeriodUnpaidInvoice);
              const hasAnyBadge = duesPaidForCurrentPeriod || currentPeriodUnpaidInvoice || showFallback;
              if (!hasAnyBadge) return null;
              return (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Building2 className="h-5 w-5" />
                      Membership Fee
                      <HelpModal title="About the Membership Fee block" ariaLabel="Membership Fee help">
                        <p>
                          This block shows the current status of your institution's
                          annual HESS Consortium membership dues for the active fee period.
                        </p>
                        <ul className="list-disc pl-5 space-y-1">
                          <li>
                            <strong>PAID</strong> badge — your most recent membership
                            invoice has been paid (online or recorded manually by an
                            administrator). No action needed.
                          </li>
                          <li>
                            <strong>UNPAID</strong> badge — an open membership invoice
                            exists for the current period. Use <em>View Invoice</em> to
                            review it or <em>Pay Now</em> to pay securely online via Stripe.
                          </li>
                          <li>
                            <strong>Outstanding Balance</strong> — the total amount due
                            across all of your unpaid invoices. Click <em>View Invoices</em>{' '}
                            to see your full invoice history for this organization.
                          </li>
                        </ul>
                        <p>
                          When you complete an online payment, the badge updates to{' '}
                          <strong>PAID</strong> automatically as soon as Stripe confirms
                          the transaction. If it does not refresh, reload the page.
                        </p>
                        <p className="text-muted-foreground">
                          Questions about a charge? Contact{' '}
                          <a className="underline" href="mailto:support@hessconsortium.org">
                            support@hessconsortium.org
                          </a>
                          .
                        </p>
                      </HelpModal>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between gap-4 flex-wrap">
                      <div className="text-sm text-muted-foreground">
                        Current status of your HESS Consortium annual membership dues.
                      </div>
                      <div className="flex items-center gap-3 flex-wrap">
                        <MembershipDuesBadge
                          invoices={isAdministrator ? [] : invoices}
                          showUnpaidFallback={showFallback}
                        />
                        {currentPeriodUnpaidInvoice && (
                          <>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setInvoiceModalOpen(true)}
                            >
                              <FileText className="h-4 w-4 mr-2" />
                              View Invoice
                            </Button>
                            <PayInvoiceButton
                              invoiceId={currentPeriodUnpaidInvoice.id}
                              size="sm"
                            />
                          </>
                        )}
                      </div>
                    </div>
                    {showMemberViewItems && (
                      <div
                        className={`flex items-center justify-between gap-4 flex-wrap rounded-md border p-3 ${
                          hasOutstandingBalance ? 'border-destructive/40 bg-destructive/5' : 'border-border bg-muted/30'
                        }`}
                      >
                        <div className="flex items-center gap-2 text-sm font-medium">
                          <DollarSign className={`h-4 w-4 ${hasOutstandingBalance ? 'text-red-600' : 'text-green-600'}`} />
                          Outstanding Balance
                          {hasOutstandingBalance && (
                            <Badge variant="destructive" className="flex items-center gap-1 text-xs">
                              <AlertTriangle className="h-3 w-3" />
                              Alert
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-3">
                          <div className={`text-xl font-bold ${hasOutstandingBalance ? 'text-red-600' : 'text-green-600'}`}>
                            {invoicesLoading ? '...' : `$${outstandingBalance.toFixed(2)}`}
                          </div>
                          <Button variant="outline" size="sm" onClick={() => navigate('/invoices')}>
                            View Invoices
                          </Button>
                        </div>
                      </div>
                    )}
                    {userOrganization?.id && !isAdministrator && (
                      <ConferenceRegistrationCodeCard organizationId={userOrganization.id} organizationName={userOrganization.name} />
                    )}
                  </CardContent>

                </Card>
              );
            })()}
            <MemberInvoiceViewModal
              open={invoiceModalOpen}
              onOpenChange={(open) => {
                setInvoiceModalOpen(open);
                if (!open) setDeepLinkedInvoice(null);
              }}
              invoice={deepLinkedInvoice ?? currentPeriodUnpaidInvoice ?? null}
            />



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

function ConferenceRegistrationCodeCard({ organizationId, organizationName }: { organizationId: string; organizationName?: string }) {
  const { data, isLoading } = useConferenceRegistrationCode(organizationId);
  const { toast } = useToast();
  if (isLoading || !data?.code) return null;
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(data.code);
      toast({ title: 'Copied', description: 'Registration code copied to clipboard.' });
    } catch {
      toast({ title: 'Copy failed', description: 'Please copy the code manually.', variant: 'destructive' });
    }
  };
  return (
    <div className="rounded-lg border-2 border-dashed border-primary/40 bg-primary/5 p-4">
      <div className="flex items-start gap-3 flex-wrap">
        <Ticket className="h-5 w-5 text-primary mt-0.5 shrink-0" />
        <div className="flex-1 min-w-[240px]">
          <h4 className="text-sm font-semibold text-foreground">
            HESS 2026 Conference Registration Code
          </h4>
          <p className="text-xs text-muted-foreground mt-1">
            Use this unique code to register <strong>one attendee</strong> from
            your institution for the HESS 2026 Conference.
            {data.redeemed_at ? (
              <span className="ml-1 font-medium text-foreground">
                (Redeemed{data.redeemed_attendee_name ? ` by ${data.redeemed_attendee_name}` : ''}.)
              </span>
            ) : null}
          </p>
          <div className="mt-2 rounded-md bg-amber-50 border border-amber-200 p-2 flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
            <p className="text-xs text-amber-800 font-medium">
              This code is valid for <strong>one attendee only</strong> from {organizationName || 'your institution'} and may not be transferred to another organization.
            </p>
          </div>
          <div className="mt-2 flex items-center gap-2 flex-wrap">
            <code className="px-2 py-1 rounded bg-background border text-sm font-mono font-semibold tracking-wider text-foreground">
              {data.code}
            </code>
            <Button variant="outline" size="sm" onClick={copy}>
              <Copy className="h-3.5 w-3.5 mr-1.5" />
              Copy
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Index;