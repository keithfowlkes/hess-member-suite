import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from "recharts";
import { TrendingUp, Mail, Eye, MousePointer, Users } from "lucide-react";

interface CRMAnalyticsProps {
  compact?: boolean;
}

export const CRMAnalytics = ({ compact = false }: CRMAnalyticsProps) => {
  // Mock analytics data - in real app, this would come from your database
  const emailPerformanceData = [
    { month: 'Jan', sent: 245, opened: 189, clicked: 45 },
    { month: 'Feb', sent: 267, opened: 201, clicked: 52 },
    { month: 'Mar', sent: 234, opened: 178, clicked: 38 },
    { month: 'Apr', sent: 289, opened: 225, clicked: 67 },
    { month: 'May', sent: 301, opened: 234, clicked: 71 },
    { month: 'Jun', sent: 278, opened: 212, clicked: 58 },
  ];

  const campaignTypesData = [
    { name: 'Newsletter', value: 45, color: '#8B7355' },
    { name: 'Announcements', value: 25, color: '#D4AF37' },
    { name: 'Reminders', value: 20, color: '#4A90E2' },
    { name: 'Welcome', value: 10, color: '#7ED321' },
  ];

  const engagementTrendsData = [
    { week: 'Week 1', openRate: 72, clickRate: 18 },
    { week: 'Week 2', openRate: 78, clickRate: 22 },
    { week: 'Week 3', openRate: 75, clickRate: 19 },
    { week: 'Week 4', openRate: 81, clickRate: 25 },
    { week: 'Week 5', openRate: 79, clickRate: 23 },
    { week: 'Week 6', openRate: 83, clickRate: 27 },
  ];

  const topPerformingEmails = [
    { subject: 'December Newsletter - Year in Review', openRate: 89, clickRate: 32, sent: 247 },
    { subject: 'New Partnership Announcement', openRate: 85, clickRate: 28, sent: 234 },
    { subject: 'Member Spotlight: Innovation Stories', openRate: 82, clickRate: 25, sent: 189 },
    { subject: 'Upcoming Webinar Series', openRate: 78, clickRate: 22, sent: 201 },
  ];

  if (compact) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center p-4 bg-muted/50 rounded-lg">
            <p className="text-2xl font-bold text-green-600">78%</p>
            <p className="text-sm text-muted-foreground">Avg Open Rate</p>
          </div>
          <div className="text-center p-4 bg-muted/50 rounded-lg">
            <p className="text-2xl font-bold text-blue-600">23%</p>
            <p className="text-sm text-muted-foreground">Avg Click Rate</p>
          </div>
        </div>
        <div className="h-32">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={engagementTrendsData}>
              <Line type="monotone" dataKey="openRate" stroke="#8B7355" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="clickRate" stroke="#D4AF37" strokeWidth={2} dot={false} />
              <Tooltip />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <Mail className="h-8 w-8 text-blue-500" />
              <div>
                <p className="text-2xl font-bold">1,614</p>
                <p className="text-sm text-muted-foreground">Total Emails Sent</p>
                <p className="text-xs text-green-600 flex items-center gap-1">
                  <TrendingUp className="h-3 w-3" />
                  +12% vs last month
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <Eye className="h-8 w-8 text-green-500" />
              <div>
                <p className="text-2xl font-bold">78%</p>
                <p className="text-sm text-muted-foreground">Average Open Rate</p>
                <p className="text-xs text-green-600 flex items-center gap-1">
                  <TrendingUp className="h-3 w-3" />
                  +3% vs last month
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <MousePointer className="h-8 w-8 text-orange-500" />
              <div>
                <p className="text-2xl font-bold">23%</p>
                <p className="text-sm text-muted-foreground">Average Click Rate</p>
                <p className="text-xs text-green-600 flex items-center gap-1">
                  <TrendingUp className="h-3 w-3" />
                  +5% vs last month
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <Users className="h-8 w-8 text-purple-500" />
              <div>
                <p className="text-2xl font-bold">247</p>
                <p className="text-sm text-muted-foreground">Active Subscribers</p>
                <p className="text-xs text-green-600 flex items-center gap-1">
                  <TrendingUp className="h-3 w-3" />
                  +8% vs last month
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Email Performance Trends */}
        <Card>
          <CardHeader>
            <CardTitle>Email Performance Trends</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={emailPerformanceData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="sent" fill="#8B7355" name="Sent" />
                  <Bar dataKey="opened" fill="#D4AF37" name="Opened" />
                  <Bar dataKey="clicked" fill="#4A90E2" name="Clicked" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Campaign Types Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Campaign Types Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={campaignTypesData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {campaignTypesData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Engagement Trends */}
      <Card>
        <CardHeader>
          <CardTitle>Engagement Rate Trends</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={engagementTrendsData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="week" />
                <YAxis />
                <Tooltip />
                <Line 
                  type="monotone" 
                  dataKey="openRate" 
                  stroke="#8B7355" 
                  strokeWidth={3}
                  name="Open Rate (%)"
                />
                <Line 
                  type="monotone" 
                  dataKey="clickRate" 
                  stroke="#D4AF37" 
                  strokeWidth={3}
                  name="Click Rate (%)"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Top Performing Emails */}
      <Card>
        <CardHeader>
          <CardTitle>Top Performing Emails</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {topPerformingEmails.map((email, index) => (
              <div key={index} className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                <div className="flex-1">
                  <p className="font-medium">{email.subject}</p>
                  <p className="text-sm text-muted-foreground">Sent to {email.sent} recipients</p>
                </div>
                <div className="flex gap-6 text-sm">
                  <div className="text-center">
                    <p className="font-semibold text-green-600">{email.openRate}%</p>
                    <p className="text-muted-foreground">Open Rate</p>
                  </div>
                  <div className="text-center">
                    <p className="font-semibold text-blue-600">{email.clickRate}%</p>
                    <p className="text-muted-foreground">Click Rate</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};