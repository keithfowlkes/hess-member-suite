import { ReactNode } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface SortablePartnerItemProps {
  id: string;
  children: ReactNode;
}

/** Admin-only draggable wrapper used to set the partner display order. */
export function SortablePartnerItem({ id, children }: SortablePartnerItemProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });

  return (
    <Card
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(isDragging && 'ring-2 ring-primary shadow-lg z-10 relative')}
    >
      <div className="flex items-stretch">
        <button
          type="button"
          aria-label="Drag to reorder"
          className="px-2 flex items-center text-muted-foreground hover:text-foreground cursor-grab active:cursor-grabbing touch-none"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="h-5 w-5" />
        </button>
        <div className="flex-1 min-w-0">{children}</div>
      </div>
    </Card>
  );
}
