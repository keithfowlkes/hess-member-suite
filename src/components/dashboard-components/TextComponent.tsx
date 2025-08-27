import { DashboardComponent } from '@/hooks/useDashboards';

interface TextComponentProps {
  component: DashboardComponent;
}

export function TextComponent({ component }: TextComponentProps) {
  return (
    <div className="p-4">
      <div className="prose prose-sm max-w-none">
        {component.config.content || 'Add your text content here...'}
      </div>
    </div>
  );
}