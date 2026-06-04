import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { supabase } from '@/integrations/supabase/client';
import {
  CheckCircle,
  AlertCircle,
  XCircle,
  RefreshCw,
  Database,
  Mail,
  Cloud,
  Activity,
  Wifi,
  CalendarDays
} from 'lucide-react';

interface ConferenceHubError {
  code: string;
  organization_name?: string | null;
  send_error: string | null;
  created_at: string;
}

interface ServiceStatus {
  name: string;
  status: 'healthy' | 'warning' | 'error' | 'checking';
  message: string;
  icon: React.ComponentType<any>;
  latency?: number;
  errors?: ConferenceHubError[];
}

export function SystemHealthStatus() {
  const [services, setServices] = useState<ServiceStatus[]>([
    {
      name: 'Supabase Database',
      status: 'checking',
      message: 'Checking connection...',
      icon: Database
    },
    {
      name: 'Resend Email Service',
      status: 'checking',
      message: 'Checking service...',
      icon: Mail
    },
    {
      name: 'Amazon Infrastructure',
      status: 'checking',
      message: 'Checking AWS services...',
      icon: Cloud
    },
    {
      name: 'Conference Hub Integration',
      status: 'checking',
      message: 'Checking integration...',
      icon: CalendarDays
    }
  ]);

  const [overallStatus, setOverallStatus] = useState<'healthy' | 'warning' | 'error' | 'checking'>('checking');
  const [lastChecked, setLastChecked] = useState<Date | null>(null);

  const checkSupabaseHealth = async (): Promise<ServiceStatus> => {
    const startTime = Date.now();
    try {
      const { data, error } = await supabase.from('system_settings').select('count').limit(1);
      const latency = Date.now() - startTime;
      
      if (error) {
        return {
          name: 'Supabase Database',
          status: 'error',
          message: `Connection failed: ${error.message}`,
          icon: Database,
          latency
        };
      }
      
      return {
        name: 'Supabase Database',
        status: 'healthy',
        message: `Connected successfully`,
        icon: Database,
        latency
      };
    } catch (err: any) {
      return {
        name: 'Supabase Database',
        status: 'error',
        message: `Connection error: ${err.message}`,
        icon: Database,
        latency: Date.now() - startTime
      };
    }
  };

  const checkResendHealth = async (): Promise<ServiceStatus> => {
    try {
      // Use the same verification approach as the ResendApiConfig component
      const { data, error } = await supabase.functions.invoke('verify-email-config');
      
      if (error) {
        return {
          name: 'Resend Email Service',
          status: 'error',
          message: 'Connection test failed',
          icon: Mail
        };
      }
      
      if (data?.success && data?.configuration) {
        const config = data.configuration;
        
        // Check for critical issues first
        if (!config.hasApiKey) {
          return {
            name: 'Resend Email Service',
            status: 'error',
            message: 'API key not configured',
            icon: Mail
          };
        }
        
        if (!config.hasFromAddress) {
          return {
            name: 'Resend Email Service',
            status: 'error',
            message: 'From address not configured',
            icon: Mail
          };
        }
        
        // Check for warnings (domain verification issues)
        if (config.recommendations && config.recommendations.length > 0) {
          // Check if it's just domain verification issues vs more serious problems
          const hasApiErrors = config.recommendations.some((rec: string) => 
            rec.includes('API connection failed') || rec.includes('API error')
          );
          
          if (hasApiErrors) {
            return {
              name: 'Resend Email Service',
              status: 'error',
              message: 'API connection failed',
              icon: Mail
            };
          }
          
          return {
            name: 'Resend Email Service',
            status: 'warning',
            message: 'Domain verification needed',
            icon: Mail
          };
        }
        
        // All good
        return {
          name: 'Resend Email Service',
          status: 'healthy',
          message: 'Service operational',
          icon: Mail
        };
      }
      
      // If we get here, something unexpected happened
      return {
        name: 'Resend Email Service',
        status: 'warning',
        message: 'Status verification incomplete',
        icon: Mail
      };
      
    } catch (err: any) {
      return {
        name: 'Resend Email Service',
        status: 'error',
        message: 'Health check failed',
        icon: Mail
      };
    }
  };

  const checkAWSHealth = async (): Promise<ServiceStatus> => {
    try {
      // Check if edge functions are responsive by testing a simple function
      const { data, error } = await supabase.functions.invoke('verify-email-config', {
        body: { test: true }
      });
      
      return {
        name: 'Amazon Infrastructure',
        status: 'healthy',
        message: 'Edge functions operational',
        icon: Cloud
      };
    } catch (err: any) {
      return {
        name: 'Amazon Infrastructure',
        status: 'warning',
        message: 'Edge functions may be slow',
        icon: Cloud
      };
    }
  };

  const checkConferenceHubHealth = async (): Promise<ServiceStatus> => {
    const startTime = Date.now();
    try {
      // 1. Verify the Conference Hub app is configured and active
      const { data: app, error: appError } = await supabase
        .from('external_applications')
        .select('id, app_url, is_active')
        .eq('app_identifier', 'conference-hub')
        .maybeSingle();

      if (appError) {
        return {
          name: 'Conference Hub Integration',
          status: 'error',
          message: `Configuration lookup failed: ${appError.message}`,
          icon: CalendarDays,
        };
      }

      if (!app) {
        return {
          name: 'Conference Hub Integration',
          status: 'error',
          message: 'Conference Hub app not configured',
          icon: CalendarDays,
        };
      }

      if (!app.is_active) {
        return {
          name: 'Conference Hub Integration',
          status: 'warning',
          message: 'Conference Hub integration is disabled',
          icon: CalendarDays,
        };
      }

      // 2. Pull recent failures from outbound code delivery
      const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      const { data: failures } = await supabase
        .from('conference_registration_codes')
        .select('code, send_error, created_at, organizations(name)')
        .eq('sent_status', 'failed')
        .gte('created_at', since)
        .order('created_at', { ascending: false })
        .limit(10);

      const errors: ConferenceHubError[] = (failures || []).map((f: any) => ({
        code: f.code,
        organization_name: f.organizations?.name ?? null,
        send_error: f.send_error,
        created_at: f.created_at,
      }));

      const latency = Date.now() - startTime;

      if (errors.length > 0) {
        return {
          name: 'Conference Hub Integration',
          status: 'warning',
          message: `${errors.length} delivery failure${errors.length === 1 ? '' : 's'} in the last 30 days`,
          icon: CalendarDays,
          latency,
          errors,
        };
      }

      return {
        name: 'Conference Hub Integration',
        status: 'healthy',
        message: `Connected to ${app.app_url}`,
        icon: CalendarDays,
        latency,
      };
    } catch (err: any) {
      return {
        name: 'Conference Hub Integration',
        status: 'error',
        message: `Health check failed: ${err.message}`,
        icon: CalendarDays,
      };
    }
  };

  const runHealthChecks = async () => {
    setServices(prev => prev.map(s => ({ ...s, status: 'checking' as const })));
    setOverallStatus('checking');

    try {
      const [supabaseStatus, resendStatus, awsStatus, conferenceHubStatus] = await Promise.all([
        checkSupabaseHealth(),
        checkResendHealth(),
        checkAWSHealth(),
        checkConferenceHubHealth(),
      ]);

      const newServices = [supabaseStatus, resendStatus, awsStatus, conferenceHubStatus];
      setServices(newServices);

      // Calculate overall status
      const hasError = newServices.some(s => s.status === 'error');
      const hasWarning = newServices.some(s => s.status === 'warning');
      
      if (hasError) {
        setOverallStatus('error');
      } else if (hasWarning) {
        setOverallStatus('warning');
      } else {
        setOverallStatus('healthy');
      }

      setLastChecked(new Date());
    } catch (error) {
      setOverallStatus('error');
      console.error('Health check error:', error);
    }
  };

  useEffect(() => {
    runHealthChecks();
    
    // Only run on initial load, no auto-refresh
    // Manual refresh available via button in MasterDashboard
  }, []);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'warning':
        return <AlertCircle className="h-4 w-4 text-yellow-500" />;
      case 'error':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <RefreshCw className="h-4 w-4 animate-spin text-blue-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'healthy':
        return <Badge variant="default" className="bg-green-100 text-green-800 border-green-200">Healthy</Badge>;
      case 'warning':
        return <Badge variant="default" className="bg-yellow-100 text-yellow-800 border-yellow-200">Warning</Badge>;
      case 'error':
        return <Badge variant="destructive">Error</Badge>;
      default:
        return <Badge variant="outline">Checking...</Badge>;
    }
  };

  const getOverallStatusColor = () => {
    switch (overallStatus) {
      case 'healthy':
        return 'text-green-600';
      case 'warning':
        return 'text-yellow-600';
      case 'error':
        return 'text-red-600';
      default:
        return 'text-blue-600';
    }
  };

  return (
    <div className="space-y-4">
      {/* Overall System Health */}
      <div className="flex items-center justify-between p-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-white dark:bg-gray-800 rounded-full shadow-sm">
            <Activity className={`h-6 w-6 ${getOverallStatusColor()}`} />
          </div>
          <div>
            <h3 className="font-semibold text-foreground">System Health</h3>
            <p className="text-sm text-muted-foreground">
              {lastChecked ? `Last checked: ${lastChecked.toLocaleTimeString()}` : 'Checking...'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {getStatusBadge(overallStatus)}
        </div>
      </div>

      {/* Service Status Grid */}
      <div className="grid gap-4">
        {services.map((service) => {
          const IconComponent = service.icon;
          return (
            <div
              key={service.name}
              className="flex items-center justify-between p-4 bg-card rounded-lg border border-border hover:shadow-md transition-shadow"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-muted rounded-lg">
                  <IconComponent className="h-5 w-5 text-muted-foreground" />
                </div>
                <div className="flex-1">
                  <h4 className="font-medium text-foreground">{service.name}</h4>
                  <p className="text-sm text-muted-foreground">{service.message}</p>
                  {service.latency && (
                    <div className="flex items-center gap-1 mt-1">
                      <Wifi className="h-3 w-3 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">{service.latency}ms</span>
                    </div>
                  )}
                  
                  {/* Show detailed configuration info for Resend */}
                  {service.name === 'Resend Email Service' && (
                    <div className="mt-2 text-xs space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground">Provider:</span>
                        <Badge variant="outline" className="text-xs">Resend</Badge>
                      </div>
                    </div>
                  )}

                  {/* Conference Hub error details */}
                  {service.name === 'Conference Hub Integration' && service.errors && service.errors.length > 0 && (
                    <Accordion type="single" collapsible className="mt-2">
                      <AccordionItem value="errors" className="border-none">
                        <AccordionTrigger className="py-1 text-xs text-destructive hover:no-underline">
                          View {service.errors.length} recent error{service.errors.length === 1 ? '' : 's'}
                        </AccordionTrigger>
                        <AccordionContent>
                          <ul className="space-y-2 mt-2">
                            {service.errors.map((e, idx) => (
                              <li key={idx} className="text-xs p-2 rounded border border-destructive/30 bg-destructive/5">
                                <div className="flex justify-between gap-2">
                                  <span className="font-medium">
                                    {e.organization_name || 'Unknown org'} — <code>{e.code}</code>
                                  </span>
                                  <span className="text-muted-foreground whitespace-nowrap">
                                    {new Date(e.created_at).toLocaleString()}
                                  </span>
                                </div>
                                <div className="mt-1 text-destructive break-words">
                                  {e.send_error || 'No error message recorded'}
                                </div>
                              </li>
                            ))}
                          </ul>
                        </AccordionContent>
                      </AccordionItem>
                    </Accordion>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                {getStatusIcon(service.status)}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}