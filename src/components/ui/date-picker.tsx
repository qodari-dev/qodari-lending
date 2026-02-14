'use client';

import { format } from 'date-fns';
import { CalendarIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

type DatePickerProps = {
  id?: string;
  value?: Date | null;
  onChange(value: Date | null): void;
  placeholder?: string;
  disabled?: boolean;
  ariaInvalid?: boolean;
  className?: string;
  allowClear?: boolean;
};

export function DatePicker({
  id,
  value,
  onChange,
  placeholder = 'Seleccione fecha',
  disabled,
  ariaInvalid,
  className,
  allowClear = false,
}: DatePickerProps) {
  const selectedDate =
    value instanceof Date && !Number.isNaN(value.getTime()) ? value : undefined;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          id={id}
          type="button"
          variant="outline"
          disabled={disabled}
          aria-invalid={ariaInvalid}
          className={cn(
            'w-full justify-start text-left font-normal',
            !selectedDate && 'text-muted-foreground',
            className
          )}
        >
          <CalendarIcon className="mr-2 size-4" />
          {selectedDate ? format(selectedDate, 'PPP') : placeholder}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={selectedDate}
          onSelect={(nextValue) => onChange(nextValue ?? null)}
          initialFocus
          captionLayout="dropdown"
        />
        {allowClear ? (
          <div className="border-t p-2">
            <Button type="button" variant="ghost" className="w-full" onClick={() => onChange(null)}>
              Limpiar fecha
            </Button>
          </div>
        ) : null}
      </PopoverContent>
    </Popover>
  );
}
