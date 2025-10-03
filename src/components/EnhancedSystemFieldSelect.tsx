import { useState } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { useSimpleFieldOptions, type SystemField } from '@/hooks/useSimpleSystemFieldOptions';
import { useSubmitCustomEntry } from '@/hooks/useCustomSoftwareEntries';
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
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [customValue, setCustomValue] = useState('');

  const handleSelectChange = (val: string) => {
    if (val === 'other') {
      setShowCustomInput(true);
    } else {
      // For required fields, don't allow "none" selection (empty string)
      if (required && val === 'none') {
        onChange('');
        return;
      }
      onChange(val === 'none' ? '' : val);
      setShowCustomInput(false);
    }
  };

  const handleSubmitCustom = async () => {
    if (!customValue.trim() || !organizationId) return;

    try {
      await submitCustomEntry.mutateAsync({
        organizationId,
        fieldName,
        customValue: customValue.trim()
      });
      
      // Set the value to the custom entry for now
      onChange(customValue.trim());
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

  return (
    <div className="space-y-2">
      {showLabel && (
        <Label htmlFor={fieldName} className="text-gray-700 font-medium text-sm">
          {label} {required && <span className="text-red-500">*</span>}
        </Label>
      )}
      
      {!showCustomInput ? (
        <Select 
          value={value || "none"} 
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
              disabled={!customValue.trim() || submitCustomEntry.isPending}
            >
              Submit for Review
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={handleCancelCustom}
            >
              Cancel
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            This custom entry will be reviewed by an administrator before being added to the system.
          </p>
        </div>
      )}
    </div>
  );
};