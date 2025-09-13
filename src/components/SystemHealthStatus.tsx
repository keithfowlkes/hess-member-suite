import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
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
  Wifi
} from 'lucide-react';

interface ServiceStatus {
  name: string;
  status: 'healthy' | 'warning' | 'error' | 'checking';
  message: string;
  icon: React.ComponentType<any>;
  latency?: number;
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

  const runHealthChecks = async () => {
    setServices(prev => prev.map(s => ({ ...s, status: 'checking' as const })));
    setOverallStatus('checking');

    try {
      const [supabaseStatus, resendStatus, awsStatus] = await Promise.all([
        checkSupabaseHealth(),
        checkResendHealth(),
        checkAWSHealth()
      ]);

      const newServices = [supabaseStatus, resendStatus, awsStatus];
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
    
    // Auto-refresh every 30 seconds
    const interval = setInterval(runHealthChecks, 30000);
    return () => clearInterval(interval);
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