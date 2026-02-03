// components/ui/description-list.tsx
import * as React from 'react';
import { cn } from '@/lib/utils';

// ============================================================================
// Types
// ============================================================================

export interface DescriptionItem {
  label: string;
  value: React.ReactNode;
  icon?: React.ReactNode;
  hidden?: boolean;
}

export interface DescriptionSection {
  title?: string;
  description?: string;
  items: DescriptionItem[];
  columns?: 1 | 2 | 3;
}

interface DescriptionListProps {
  items?: DescriptionItem[];
  sections?: DescriptionSection[];
  className?: string;
  columns?: 1 | 2 | 3;
  variant?: 'default' | 'striped' | 'bordered';
}

// ============================================================================
// Components
// ============================================================================

export function DescriptionList({
  items,
  sections,
  className,
  columns = 1,
  variant = 'default',
}: DescriptionListProps) {
  // Si hay secciones, renderizar con secciones
  if (sections?.length) {
    return (
      <div className={cn('space-y-6', className)}>
        {sections.map((section, index) => (
          <DescriptionSection
            key={section.title ?? index}
            section={section}
            variant={variant}
            defaultColumns={columns}
          />
        ))}
      </div>
    );
  }

  // Si solo hay items, renderizar directamente
  if (items?.length) {
    return (
      <DescriptionGrid items={items} columns={columns} variant={variant} className={className} />
    );
  }

  return null;
}

function DescriptionSection({
  section,
  variant,
  defaultColumns,
}: {
  section: DescriptionSection;
  variant: 'default' | 'striped' | 'bordered';
  defaultColumns: 1 | 2 | 3;
}) {
  const visibleItems = section.items.filter((item) => !item.hidden);

  if (visibleItems.length === 0) return null;

  return (
    <div className="space-y-3">
      {(section.title || section.description) && (
        <div>
          {section.title && <h4 className="text-md font-semibold">{section.title}</h4>}
          {section.description && (
            <p className="text-muted-foreground text-sm">{section.description}</p>
          )}
        </div>
      )}
      <DescriptionGrid
        items={visibleItems}
        columns={section.columns ?? defaultColumns}
        variant={variant}
      />
    </div>
  );
}

function DescriptionGrid({
  items,
  columns,
  variant,
  className,
}: {
  items: DescriptionItem[];
  columns: 1 | 2 | 3;
  variant: 'default' | 'striped' | 'bordered';
  className?: string;
}) {
  const visibleItems = items.filter((item) => !item.hidden);

  if (visibleItems.length === 0) return null;

  const gridCols = {
    1: 'grid-cols-1',
    2: 'grid-cols-1 sm:grid-cols-2',
    3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
  };

  return (
    <dl
      className={cn(
        'grid gap-4',
        gridCols[columns],
        variant === 'bordered' && 'divide-y rounded-lg border',
        className
      )}
    >
      {visibleItems.map((item, index) => (
        <DescriptionItemRow key={item.label} item={item} variant={variant} index={index} />
      ))}
    </dl>
  );
}

function DescriptionItemRow({
  item,
  variant,
  index,
}: {
  item: DescriptionItem;
  variant: 'default' | 'striped' | 'bordered';
  index: number;
}) {
  return (
    <div
      className={cn(
        'space-y-1',
        variant === 'striped' && index % 2 === 0 && 'bg-muted/50 rounded-md',
        variant === 'bordered' && 'px-4 py-3',
        variant === 'default' && 'py-1'
      )}
    >
      <dt className="text-muted-foreground flex items-center gap-2 text-sm font-medium">
        {item.icon && <span className="size-4 shrink-0 [&>svg]:size-4">{item.icon}</span>}
        {item.label}
      </dt>
      <dd className={cn('text-sm', item.icon && 'pl-6')}>
        {item.value ?? <span className="text-muted-foreground">—</span>}
      </dd>
    </div>
  );
}
