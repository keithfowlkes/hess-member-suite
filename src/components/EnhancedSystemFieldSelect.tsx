import { useState } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { useSimpleFieldOptions, type SystemField, useAddSimpleSystemFieldOption } from '@/hooks/useSimpleSystemFieldOptions';
import { useSubmitCustomEntry } from '@/hooks/useCustomSoftwareEntries';
import { useAuth } from '@/hooks/useAuth';
import { Plus } from 'lucide-react';

interface EnhancedSystemFieldSelectProps {
  fieldName: SystemField;
  label: string;
  value: string;
  onChange: (value: string) => void;
  disabled: boolean;
  organizationId?: string;
  required?: boolean;
  showLabel?: boolean;
}

export const EnhancedSystemFieldSelect = ({ 
  fieldName, 
  label, 
  value, 
  onChange, 
  disabled,
  organizationId,
  required = false,
  showLabel = true
}: EnhancedSystemFieldSelectProps) => {
  const options = useSimpleFieldOptions(fieldName);
  const submitCustomEntry = useSubmitCustomEntry();
  const addSystemOption = useAddSimpleSystemFieldOption();
  const { isAdmin } = useAuth();
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [customValue, setCustomValue] = useState('');
  const [pendingValue, setPendingValue] = useState<string | null>(null);

  const handleSelectChange = (val: string) => {
    if (val === 'other') {
      setShowCustomInput(true);
    } else {
      // For required fields, don't allow "none" selection (empty string)
      if (required && val === 'none') {
        onChange('');
        setPendingValue(null);
        return;
      }
      onChange(val === 'none' ? '' : val);
      setPendingValue(null);
      setShowCustomInput(false);
    }
  };

  const handleSubmitCustom = async () => {
    if (!customValue.trim()) return;

    try {
      if (isAdmin) {
        // Admins add directly to system options
        await addSystemOption.mutateAsync({
          fieldName,
          optionValue: customValue.trim()
        });
        
        // Set the value immediately since it's now in the options
        onChange(customValue.trim());
        setPendingValue(null);
      } else {
        // Non-admins submit for review
        if (!organizationId) return;
        
        await submitCustomEntry.mutateAsync({
          organizationId,
          fieldName,
          customValue: customValue.trim()
        });
        
        // Set the value and mark it as pending
        onChange(customValue.trim());
        setPendingValue(customValue.trim());
      }
      
      setCustomValue('');
      setShowCustomInput(false);
    } catch (error) {
      // Error is handled by the mutation's onError
    }
  };

  const handleCancelCustom = () => {
    setShowCustomInput(false);
    setCustomValue('');
  };

  // Check if current value is in the options list
  const isValueInOptions = value && options.includes(value);
  const isPending = !isAdmin && (pendingValue === value || (!isValueInOptions && value && value !== ''));

  return (
    <div className="space-y-2">
      {showLabel && (
        <Label htmlFor={fieldName} className="text-gray-700 font-medium text-sm">
          {label} {required && <span className="text-red-500">*</span>}
        </Label>
      )}
      
      {!showCustomInput ? (
        <div className="space-y-1">
          <Select 
            value={isValueInOptions ? value : (isPending ? "custom" : value || "none")} 
            onValueChange={handleSelectChange} 
            disabled={disabled}
            required={required}
          >
            <SelectTrigger className="bg-background border-input">
              <SelectValue placeholder={`Select ${label.toLowerCase()}`} />
            </SelectTrigger>
            <SelectContent className="max-h-60 overflow-y-auto bg-background border border-input shadow-lg z-[9999]">
              {!required && (
                <SelectItem value="none" className="hover:bg-accent">
                  <span className="text-muted-foreground">None specified</span>
                </SelectItem>
              )}
              {options.map((option) => (
                <SelectItem key={option} value={option} className="hover:bg-accent">
                  {option}
                </SelectItem>
              ))}
              {isPending && value && (
                <SelectItem value="custom" className="hover:bg-accent bg-yellow-50 dark:bg-yellow-950">
                  <div className="flex items-center gap-2">
                    <span>{value}</span>
                    <span className="text-xs text-yellow-600 dark:text-yellow-400">(Pending Review)</span>
                  </div>
                </SelectItem>
              )}
              {!disabled && organizationId && (
                <SelectItem value="other" className="hover:bg-accent border-t border-border mt-1">
                  <div className="flex items-center gap-2">
                    <Plus className="h-4 w-4" />
                    <span className="font-medium">Add other option...</span>
                  </div>
                </SelectItem>
              )}
            </SelectContent>
          </Select>
          {isPending && value && (
            <p className="text-xs text-yellow-600 dark:text-yellow-400">
              This custom entry is pending admin review
            </p>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          <Input
            value={customValue}
            onChange={(e) => setCustomValue(e.target.value)}
            placeholder={`Enter custom ${label.toLowerCase()}`}
            className="bg-background border-input"
          />
          <div className="flex gap-2">
            <Button
              size="sm"
              onClick={handleSubmitCustom}
              disabled={!customValue.trim() || (submitCustomEntry.isPending || addSystemOption.isPending)}
            >
              {isAdmin ? 'Add Option' : 'Submit for Review'}
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={handleCancelCustom}
            >
              Cancel
            </Button>
          </div>
          {!isAdmin && (
            <p className="text-xs text-muted-foreground">
              This custom entry will be reviewed by an administrator before being added to the system.
            </p>
          )}
        </div>
      )}
    </div>
  );
};