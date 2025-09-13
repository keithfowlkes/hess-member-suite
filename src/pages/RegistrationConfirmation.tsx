import { useSearchParams, Link } from 'react-router-dom';
import { CheckCircle, Mail, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useEffect } from 'react';

export default function RegistrationConfirmation() {
  const [searchParams] = useSearchParams();
  const typeParam = searchParams.get('type');
  const isReassignment = typeParam === 'reassignment';

  // Scroll to top when confirmation page loads
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);
  
  // Debug logging
  console.log('🎯 CONFIRMATION DEBUG: Page loaded');
  console.log('🔍 CONFIRMATION DEBUG: URL params:', Object.fromEntries(searchParams));
  console.log('📝 CONFIRMATION DEBUG: Type parameter:', typeParam);
  console.log('🔄 CONFIRMATION DEBUG: isReassignment:', isReassignment);

  const title = isReassignment 
    ? 'Member Information Update Request Submitted'
    : 'Registration Submitted Successfully';

  const description = isReassignment
    ? 'Your member information update request has been received and is currently under review by our administrative team.'
    : 'Your membership application has been received and is currently under review by our administrative team.';

  console.log('📋 CONFIRMATION DEBUG: Rendering with title:', title);
  console.log('📄 CONFIRMATION DEBUG: Rendering with description:', description);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/30 flex items-start justify-center pt-8 p-4">
      <div className="w-full max-w-2xl">
        <Card className="border-border/50 shadow-2xl bg-card/95 backdrop-blur-sm">
          <CardContent className="p-12 text-center space-y-8">
            {/* Debug info - only visible in development */}
            {process.env.NODE_ENV === 'development' && (
              <div className="text-xs text-muted-foreground bg-muted/30 p-2 rounded mb-4">
                DEBUG: type={typeParam}, isReassignment={String(isReassignment)}
              </div>
            )}

            {/* Logo */}
            <div className="flex justify-center mb-8">
              <img 
                src="/lovable-uploads/2694c555-a061-40a9-877f-5c60af8290c4.png" 
                alt="The HESS Consortium" 
                className="h-24 w-auto object-contain"
                onError={(e) => {
                  console.error('🖼️ CONFIRMATION DEBUG: Logo failed to load');
                  e.currentTarget.style.display = 'none';
                }}
              />
            </div>

            {/* Success Icon */}
            <div className="flex justify-center">
              <div className="relative">
                <div className="absolute inset-0 bg-primary/20 rounded-full blur-xl animate-pulse"></div>
                <CheckCircle className="relative h-24 w-24 text-primary mx-auto" />
              </div>
            </div>

            {/* Title */}
            <div className="space-y-3">
              <h1 className="text-3xl font-bold text-foreground tracking-tight">
                {title}
              </h1>
              <div className="w-24 h-1 bg-gradient-to-r from-primary to-primary/60 rounded-full mx-auto"></div>
            </div>

            {/* Description */}
            <div className="space-y-6 text-muted-foreground">
              <p className="text-lg leading-relaxed max-w-lg mx-auto">
                {description}
              </p>
              
              <div className="flex items-center justify-center gap-3 text-base bg-muted/30 rounded-lg p-4 max-w-md mx-auto">
                <Mail className="h-5 w-5 text-primary flex-shrink-0" />
                <span>
                  You will receive an email notification once your {isReassignment ? 'member information update request' : 'application'} has been approved.
                </span>
              </div>
            </div>

            {/* Next Steps */}
            <div className="bg-card/50 border border-border/30 rounded-xl p-6 space-y-4">
              <h3 className="font-semibold text-foreground text-lg">What happens next?</h3>
              <div className="text-left space-y-3 text-muted-foreground">
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0"></div>
                  <span>Our administrative team will review your {isReassignment ? 'member information update request' : 'application'}</span>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0"></div>
                  <span>You'll receive an email confirmation upon approval</span>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0"></div>
                  <span>Access to your member dashboard will be granted after approval</span>
                </div>
              </div>
            </div>

            {/* Action Button */}
            <div className="pt-4">
              <Button 
                asChild 
                className="px-8 py-3 text-base font-medium bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary shadow-lg hover:shadow-xl transition-all duration-200"
              >
                <Link to="/auth" className="flex items-center gap-2">
                  <ArrowLeft className="h-4 w-4" />
                  Return to Sign In
                </Link>
              </Button>
            </div>

            {/* Footer */}
            <div className="pt-8 border-t border-border/30">
              <p className="text-sm text-muted-foreground">
                Questions? Contact us at{' '}
                <a 
                  href="mailto:support@hessconsortium.org" 
                  className="text-primary hover:underline font-medium"
                >
                  support@hessconsortium.org
                </a>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}