import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useSystemSetting, useUpdateSystemSetting } from '@/hooks/useSystemSettings';
import { useToast } from '@/hooks/use-toast';
import TinyMCEEditor from '@/components/TinyMCEEditor';
import { FileText, Save, Eye, RotateCcw, Loader2 } from 'lucide-react';
import DOMPurify from 'dompurify';

const DEFAULT_MEMBER_AGREEMENT = `
<p><strong>HESS Consortium Member Confidentiality and Data Use Agreement</strong></p>
<p>This agreement outlines the commitment of the HESS Consortium (the "Consortium") to protect the privacy and data integrity of its member institutions while facilitating secure, mutual information exchange.</p>

<p><strong>1. Member Information Confidentiality</strong></p>
<p>The Consortium recognizes the sensitive nature of information provided by member institutions. All non-public institutional information, including operational data, contact lists, financial metrics, and internal reports, shall be treated as confidential.</p>

<p><strong>2. Restrictions on External Data Sharing and Sale</strong></p>
<p>The Consortium confirms that the primary purpose of collecting member data is to enable mutual information sharing among Authenticated Users (current HESS members and authorized non-profit state association partners) to foster better organizational understanding and cooperative efficiency.</p>
<p>Notwithstanding this authorized internal sharing, the Consortium explicitly agrees that any data or information submitted by a member institution shall not be shared, sold, rented, or otherwise distributed to commercial third parties, including but not limited to vendor partners, corporate affiliates, or outside industry analytics companies, without the express written consent of the submitting member institution(s). Data aggregation for internal, benchmarking, and analytics will be available to Consortium member institutions and our non-profit, state association partners.</p>

<p><strong>3. Member Responsibility and User Access</strong></p>
<p>The HESS Consortium Member Institution, including its primary account holders and any authorized personnel granted access to the Consortium's shared information systems, is responsible for maintaining the strict confidentiality of all data concerning other members and partners. Member Institution users shall not share, reproduce, or redistribute any specific or aggregated data of other member institutions outside of their own organization. The Member Institution must ensure that account credentials are kept secure and are not shared with unauthorized individuals. Any breach of confidentiality by an Authorized User may result in the suspension or termination of the Member Institution's access privileges.</p>

<p><strong>4. Term and Acceptance</strong></p>
<p>By clicking the submission button below the membership update or new member application, the member institution acknowledges and accepts the terms of this agreement, which shall remain in effect throughout the duration of active membership.</p>
`;

export default function MemberAgreementEditor() {
  const { data: agreementSetting, isLoading } = useSystemSetting('member_agreement_text');
  const updateSetting = useUpdateSystemSetting();
  const { toast } = useToast();
  const [content, setContent] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  useEffect(() => {
    if (agreementSetting?.setting_value) {
      setContent(agreementSetting.setting_value);
    } else if (!isLoading) {
      setContent(DEFAULT_MEMBER_AGREEMENT);
    }
  }, [agreementSetting, isLoading]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await updateSetting.mutateAsync({
        settingKey: 'member_agreement_text',
        settingValue: content,
        description: 'Member Agreement text displayed on registration and member update forms'
      });
    } catch (error) {
      console.error('Error saving member agreement:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    setContent(DEFAULT_MEMBER_AGREEMENT);
    toast({
      title: "Reset to Default",
      description: "Content has been reset. Click Save to apply changes.",
    });
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="w-5 h-5" />
          Member Agreement Text
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Edit the Member Agreement text that appears on registration and member update forms. 
          This WYSIWYG editor preserves formatting when pasting from other sources.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <TinyMCEEditor
          value={content}
          onChange={setContent}
          placeholder="Enter the member agreement text..."
        />
        
        <div className="flex items-center gap-3 pt-2">
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Save Agreement
              </>
            )}
          </Button>
          
          <Dialog open={showPreview} onOpenChange={setShowPreview}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Eye className="w-4 h-4 mr-2" />
                Preview
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Member Agreement Preview</DialogTitle>
              </DialogHeader>
              <div className="bg-white rounded-lg border p-4 mt-4">
                <div 
                  className="prose prose-sm max-w-none text-gray-700 [&>p]:mb-3 [&>p:first-child]:mt-0 [&_strong]:text-gray-900"
                  dangerouslySetInnerHTML={{ 
                    __html: DOMPurify.sanitize(content) 
                  }} 
                />
              </div>
            </DialogContent>
          </Dialog>
          
          <Button variant="ghost" onClick={handleReset}>
            <RotateCcw className="w-4 h-4 mr-2" />
            Reset to Default
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
