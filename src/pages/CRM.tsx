import React, { useState } from "react";
import { Layout } from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { 
  Users, 
  Mail, 
  BarChart3, 
  Search, 
  Plus, 
  Send, 
  Eye,
  Download,
  Calendar,
  Target,
  TrendingUp,
  MessageSquare
} from "lucide-react";
import { CRMContactManager } from "@/components/CRMContactManager";
import { CRMEmailCampaigns } from "@/components/CRMEmailCampaigns";
import { CRMAnalytics } from "@/components/CRMAnalytics";
import { CRMCommunicationHistory } from "@/components/CRMCommunicationHistory";

const CRM = () => {
  const [activeTab, setActiveTab] = useState("overview");

  return (
    <Layout>
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Customer Relationship Management</h1>
            <p className="text-muted-foreground mt-2">
              Manage contacts, campaigns, and communications
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Export Data
            </Button>
            <Button size="sm">
              <Plus className="h-4 w-4 mr-2" />
              New Campaign
            </Button>
          </div>
        </div>

        {/* Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center space-x-2">
                <Users className="h-8 w-8 text-primary" />
                <div>
                  <p className="text-2xl font-bold">247</p>
                  <p className="text-sm text-muted-foreground">Total Contacts</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center space-x-2">
                <Mail className="h-8 w-8 text-blue-500" />
                <div>
                  <p className="text-2xl font-bold">12</p>
                  <p className="text-sm text-muted-foreground">Active Campaigns</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center space-x-2">
                <TrendingUp className="h-8 w-8 text-green-500" />
                <div>
                  <p className="text-2xl font-bold">78%</p>
                  <p className="text-sm text-muted-foreground">Open Rate</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center space-x-2">
                <Target className="h-8 w-8 text-orange-500" />
                <div>
                  <p className="text-2xl font-bold">34</p>
                  <p className="text-sm text-muted-foreground">Responses</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main CRM Interface */}
        <Card>
          <CardContent className="p-6">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="contacts">Contacts</TabsTrigger>
                <TabsTrigger value="campaigns">Campaigns</TabsTrigger>
                <TabsTrigger value="analytics">Analytics</TabsTrigger>
              </TabsList>
              
              <TabsContent value="overview" className="mt-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <MessageSquare className="h-5 w-5" />
                        Recent Communication
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <CRMCommunicationHistory limit={5} />
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <BarChart3 className="h-5 w-5" />
                        Campaign Performance
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <CRMAnalytics compact />
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>
              
              <TabsContent value="contacts" className="mt-6">
                <CRMContactManager />
              </TabsContent>
              
              <TabsContent value="campaigns" className="mt-6">
                <CRMEmailCampaigns />
              </TabsContent>
              
              <TabsContent value="analytics" className="mt-6">
                <CRMAnalytics />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default CRM;