import { useState } from 'react';
import { Check, Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useUserCohorts } from '@/hooks/useUserCohorts';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu';

interface MemberCohortSelectorProps {
  userId?: string;
  disabled?: boolean;
  title?: string;
  description?: string;
}

export function MemberCohortSelector({ 
  userId,
  disabled = false,
  title = "Cohort Memberships",
  description = "Select which cohort groups you'd like to join"
}: MemberCohortSelectorProps) {
  const { cohorts, availableCohorts, loading, updating, updateUserCohorts } = useUserCohorts(userId);
  const [isOpen, setIsOpen] = useState(false);

  const toggleCohort = async (cohort: string) => {
    if (disabled || updating) return;

    const newCohorts = cohorts.includes(cohort)
      ? cohorts.filter(c => c !== cohort)
      : [...cohorts, cohort];
    
    await updateUserCohorts(newCohorts);
  };

  const removeCohort = async (cohort: string) => {
    if (disabled || updating) return;

    const newCohorts = cohorts.filter(c => c !== cohort);
    await updateUserCohorts(newCohorts);
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground">Loading cohorts...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description && (
          <p className="text-sm text-muted-foreground">{description}</p>
        )}
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-2 items-center">
          {/* Display current cohorts as badges with remove button */}
          {cohorts.map(cohort => (
            <Badge key={cohort} variant="outline" className="text-xs pr-1">
              {cohort}
              {!disabled && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-4 w-4 p-0 ml-1"
                  onClick={() => removeCohort(cohort)}
                  disabled={updating}
                >
                  <X className="h-3 w-3" />
                </Button>
              )}
            </Badge>
          ))}

          {/* Show message if no cohorts selected */}
          {cohorts.length === 0 && (
            <div className="text-sm text-muted-foreground">
              No cohort memberships selected
            </div>
          )}

          {/* Dropdown for adding cohorts */}
          {!disabled && (
            <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
              <DropdownMenuTrigger asChild>
                <Button 
                  size="sm" 
                  variant="outline" 
                  className="h-6 w-6 p-0"
                  disabled={updating}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48 bg-popover border border-border z-50">
                <div className="p-2 text-sm font-medium text-muted-foreground bg-popover">Available Cohorts</div>
                {availableCohorts.map(cohort => (
                  <DropdownMenuItem 
                    key={cohort} 
                    onClick={() => toggleCohort(cohort)}
                    className="bg-popover hover:bg-accent cursor-pointer"
                  >
                    <div className="flex items-center w-full">
                      {cohort}
                      {cohorts.includes(cohort) && (
                        <Check className="ml-auto h-4 w-4 text-primary" />
                      )}
                    </div>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>

        {updating && (
          <div className="text-xs text-muted-foreground mt-2">
            Updating cohort memberships...
          </div>
        )}
      </CardContent>
    </Card>
  );
}