import { useState } from 'react';
import { Check, Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';

interface MultiRoleSelectorProps {
  userId: string;
  currentRoles: string[];
  currentCohorts: string[];
  onRolesChange: (userId: string, roles: string[]) => void;
  onCohortsChange: (userId: string, cohorts: string[]) => void;
}

const availableRoles = ['admin', 'member', 'cohort_leader'];
const availableCohorts = ['Anthology', 'Ellucian Banner', 'Ellucian Colleague', 'Jenzabar ONE', 'Oracle Cloud', 'Workday'];

export function MultiRoleSelector({ 
  userId, 
  currentRoles, 
  currentCohorts, 
  onRolesChange, 
  onCohortsChange 
}: MultiRoleSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);

  const toggleRole = (role: string) => {
    const newRoles = currentRoles.includes(role) 
      ? currentRoles.filter(r => r !== role)
      : [...currentRoles, role];
    onRolesChange(userId, newRoles);
  };

  const toggleCohort = (cohort: string) => {
    const newCohorts = currentCohorts.includes(cohort)
      ? currentCohorts.filter(c => c !== cohort)
      : [...currentCohorts, cohort];
    onCohortsChange(userId, newCohorts);
  };

  const removeCohort = (cohort: string) => {
    const newCohorts = currentCohorts.filter(c => c !== cohort);
    onCohortsChange(userId, newCohorts);
  };

  return (
    <div className="flex flex-wrap gap-2 items-center">
      {/* Display current roles as badges */}
      {currentRoles.map(role => (
        <Badge key={role} variant="secondary" className="text-xs">
          {role === 'cohort_leader' ? 'Cohort Leader' : role}
        </Badge>
      ))}
      
      {/* Display current cohorts as badges with remove button */}
      {currentCohorts.map(cohort => (
        <Badge key={cohort} variant="outline" className="text-xs pr-1">
          {cohort}
          <Button
            size="sm"
            variant="ghost"
            className="h-4 w-4 p-0 ml-1"
            onClick={() => removeCohort(cohort)}
          >
            <X className="h-3 w-3" />
          </Button>
        </Badge>
      ))}

      {/* Dropdown for adding roles and cohorts */}
      <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
        <DropdownMenuTrigger asChild>
          <Button size="sm" variant="outline" className="h-6 w-6 p-0">
            <Plus className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <div className="p-2 text-sm font-medium text-muted-foreground">Roles</div>
          {availableRoles.map(role => (
            <DropdownMenuItem key={role} onClick={() => toggleRole(role)}>
              <div className="flex items-center w-full">
                {role === 'cohort_leader' ? 'Cohort Leader' : role}
                {currentRoles.includes(role) && (
                  <Check className="ml-auto h-4 w-4" />
                )}
              </div>
            </DropdownMenuItem>
          ))}
          
          <DropdownMenuSeparator />
          
          <div className="p-2 text-sm font-medium text-muted-foreground">Cohorts</div>
          {availableCohorts.map(cohort => (
            <DropdownMenuItem key={cohort} onClick={() => toggleCohort(cohort)}>
              <div className="flex items-center w-full">
                {cohort}
                {currentCohorts.includes(cohort) && (
                  <Check className="ml-auto h-4 w-4" />
                )}
              </div>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}