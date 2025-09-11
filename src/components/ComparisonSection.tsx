import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowRight, AlertTriangle } from 'lucide-react';

interface ComparisonItem {
  field: string;
  label: string;
  oldValue: any;
  newValue: any;
  type?: 'text' | 'boolean' | 'array' | 'badge' | 'email' | 'phone' | 'currency';
}

interface ComparisonSectionProps {
  title: string;
  icon?: React.ReactNode;
  items: ComparisonItem[];
  className?: string;
}

export function ComparisonSection({ title, icon, items, className = "" }: ComparisonSectionProps) {
  const formatValue = (value: any, type: ComparisonItem['type'] = 'text'): string => {
    if (value === null || value === undefined || value === '') return 'Not set';
    
    switch (type) {
      case 'boolean':
        return value ? 'Yes' : 'No';
      case 'array':
        return Array.isArray(value) ? value.join(', ') : String(value);
      case 'currency':
        return typeof value === 'number' ? `$${value.toLocaleString()}` : String(value);
      case 'email':
      case 'phone':
      default:
        return String(value);
    }
  };

  const renderValue = (value: any, type: ComparisonItem['type'] = 'text', isOld = false) => {
    const formattedValue = formatValue(value, type);
    const isEmpty = value === null || value === undefined || value === '';
    
    if (type === 'badge' && !isEmpty) {
      return <Badge variant={isOld ? "secondary" : "default"}>{formattedValue}</Badge>;
    }
    
    return (
      <span className={`text-sm ${isEmpty ? 'text-muted-foreground italic' : isOld ? 'text-muted-foreground' : 'text-foreground font-medium'}`}>
        {formattedValue}
      </span>
    );
  };

  const hasChanges = items.some(item => item.oldValue !== item.newValue);

  if (!hasChanges) return null;

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          {icon}
          {title}
          <Badge variant="outline" className="text-xs">
            {items.filter(item => item.oldValue !== item.newValue).length} changes
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {items
          .filter(item => item.oldValue !== item.newValue)
          .map((item) => (
            <div key={item.field} className="flex items-center justify-between gap-4 p-3 bg-muted/30 rounded-lg">
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-muted-foreground mb-2">{item.label}</div>
                <div className="flex items-center gap-2">
                  <div className="flex-1 min-w-0">
                    {renderValue(item.oldValue, item.type, true)}
                  </div>
                  <ArrowRight className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    {renderValue(item.newValue, item.type, false)}
                  </div>
                </div>
              </div>
            </div>
          ))}
      </CardContent>
    </Card>
  );
}