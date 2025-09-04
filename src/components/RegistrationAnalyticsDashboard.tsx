import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';
import { TrendingUp, Users, Clock, CheckCircle, XCircle, AlertTriangle, Calendar } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface AnalyticsData {
  totalRegistrations: number;
  approvedCount: number;
  rejectedCount: number;
  pendingCount: number;
  avgProcessingTime: number;
  dailyRegistrations: Array<{ date: string; count: number }>;
  priorityDistribution: Array<{ priority: string; count: number; color: string }>;
  commonRejectionReasons: Array<{ reason: string; count: number }>;
  organizationsByState: Array<{ state: string; count: number }>;
}

export function RegistrationAnalyticsDashboard() {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('30'); // days
  const [refreshing, setRefreshing] = useState(false);
  const { toast } = useToast();

  const fetchAnalytics = async () => {
    try {
      setRefreshing(true);
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - parseInt(timeRange));

      // Get basic registration counts
      const { data: registrations, error: regError } = await supabase
        .from('pending_registrations')
        .select('approval_status, priority_level, created_at, approved_at, rejection_reason, state')
        .gte('created_at', startDate.toISOString());

      if (regError) throw regError;

      // Calculate metrics
      const totalRegistrations = registrations?.length || 0;
      const approvedCount = registrations?.filter(r => r.approval_status === 'approved').length || 0;
      const rejectedCount = registrations?.filter(r => r.approval_status === 'rejected').length || 0;
      const pendingCount = registrations?.filter(r => r.approval_status === 'pending').length || 0;

      // Calculate average processing time
      const processedRegistrations = registrations?.filter(r => r.approved_at) || [];
      const avgProcessingTime = processedRegistrations.length > 0 
        ? processedRegistrations.reduce((acc, r) => {
            const created = new Date(r.created_at);
            const processed = new Date(r.approved_at!);
            return acc + (processed.getTime() - created.getTime());
          }, 0) / processedRegistrations.length / (1000 * 60 * 60 * 24) // Convert to days
        : 0;

      // Daily registrations
      const dailyData: Record<string, number> = {};
      registrations?.forEach(r => {
        const date = new Date(r.created_at).toISOString().split('T')[0];
        dailyData[date] = (dailyData[date] || 0) + 1;
      });

      const dailyRegistrations = Object.entries(dailyData)
        .map(([date, count]) => ({ date, count }))
        .sort((a, b) => a.date.localeCompare(b.date))
        .slice(-14); // Last 14 days

      // Priority distribution
      const priorityData: Record<string, number> = {};
      registrations?.forEach(r => {
        const priority = r.priority_level || 'normal';
        priorityData[priority] = (priorityData[priority] || 0) + 1;
      });

      const priorityColors = {
        urgent: '#ef4444',
        high: '#f97316',
        normal: '#3b82f6',
        low: '#6b7280'
      };

      const priorityDistribution = Object.entries(priorityData).map(([priority, count]) => ({
        priority,
        count,
        color: priorityColors[priority as keyof typeof priorityColors] || priorityColors.normal
      }));

      // Common rejection reasons
      const rejectionData: Record<string, number> = {};
      registrations?.filter(r => r.rejection_reason).forEach(r => {
        const reason = r.rejection_reason!.split('.')[0]; // Take first sentence
        rejectionData[reason] = (rejectionData[reason] || 0) + 1;
      });

      const commonRejectionReasons = Object.entries(rejectionData)
        .map(([reason, count]) => ({ reason, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      // Organizations by state
      const stateData: Record<string, number> = {};
      registrations?.filter(r => r.state).forEach(r => {
        stateData[r.state!] = (stateData[r.state!] || 0) + 1;
      });

      const organizationsByState = Object.entries(stateData)
        .map(([state, count]) => ({ state, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

      setAnalytics({
        totalRegistrations,
        approvedCount,
        rejectedCount,
        pendingCount,
        avgProcessingTime,
        dailyRegistrations,
        priorityDistribution,
        commonRejectionReasons,
        organizationsByState
      });

    } catch (error: any) {
      console.error('Error fetching analytics:', error);
      toast({
        title: "Analytics Error",
        description: "Failed to load analytics data",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, [timeRange]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="animate-pulse">
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                  <div className="h-8 bg-gray-200 rounded w-1/2"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (!analytics) return null;

  const approvalRate = analytics.totalRegistrations > 0 
    ? (analytics.approvedCount / (analytics.approvedCount + analytics.rejectedCount)) * 100 
    : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Registration Analytics</h2>
          <p className="text-gray-600">Track registration trends and approval patterns</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Last 7 days</SelectItem>
              <SelectItem value="30">Last 30 days</SelectItem>
              <SelectItem value="90">Last 90 days</SelectItem>
              <SelectItem value="365">Last year</SelectItem>
            </SelectContent>
          </Select>
          <Button 
            onClick={fetchAnalytics} 
            disabled={refreshing}
            variant="outline"
            size="sm"
          >
            {refreshing ? 'Refreshing...' : 'Refresh'}
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Registrations</p>
                <p className="text-2xl font-bold text-gray-900">{analytics.totalRegistrations}</p>
              </div>
              <Users className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Approval Rate</p>
                <p className="text-2xl font-bold text-green-600">{approvalRate.toFixed(1)}%</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Pending Review</p>
                <p className="text-2xl font-bold text-orange-600">{analytics.pendingCount}</p>
              </div>
              <Clock className="h-8 w-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Avg. Processing</p>
                <p className="text-2xl font-bold text-blue-600">{analytics.avgProcessingTime.toFixed(1)}d</p>
              </div>
              <TrendingUp className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Daily Registrations */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Daily Registrations (Last 14 Days)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={analytics.dailyRegistrations}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="date" 
                  tickFormatter={(date) => new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                />
                <YAxis />
                <Tooltip 
                  labelFormatter={(date) => new Date(date).toLocaleDateString()}
                />
                <Line type="monotone" dataKey="count" stroke="#3b82f6" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Priority Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Priority Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={analytics.priorityDistribution}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="count"
                >
                  {analytics.priorityDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex flex-wrap gap-2 mt-4">
              {analytics.priorityDistribution.map((item) => (
                <Badge key={item.priority} variant="outline" className="flex items-center gap-1">
                  <div 
                    className="w-3 h-3 rounded-full" 
                    style={{ backgroundColor: item.color }}
                  />
                  {item.priority}: {item.count}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Organizations by State */}
        <Card>
          <CardHeader>
            <CardTitle>Top States (Registrations)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={analytics.organizationsByState}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="state" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" fill="#3b82f6" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Common Rejection Reasons */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <XCircle className="h-5 w-5" />
              Common Rejection Reasons
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {analytics.commonRejectionReasons.length > 0 ? (
                analytics.commonRejectionReasons.map((item, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <span className="text-sm text-gray-700 flex-1">{item.reason}</span>
                    <Badge variant="secondary">{item.count}</Badge>
                  </div>
                ))
              ) : (
                <p className="text-gray-500 text-sm">No rejections in this time period</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}