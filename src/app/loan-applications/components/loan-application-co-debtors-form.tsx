'use client';

import { Button } from '@/components/ui/button';
import {
  Combobox,
  ComboboxCollection,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
  ComboboxTrigger,
  ComboboxValue,
} from '@/components/ui/combobox';
import { cn } from '@/lib/utils';
import { CreateLoanApplicationBodySchema } from '@/schemas/loan-application';
import { ThirdParty } from '@/schemas/third-party';
import { ChevronDownIcon, Plus, Trash2 } from 'lucide-react';
import { useMemo, useRef, useState } from 'react';
import { useFieldArray, useFormContext } from 'react-hook-form';
import { z } from 'zod';
import { useThirdParties } from '@/hooks/queries/use-third-party-queries';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { toast } from 'sonner';
import { ThirdPartyForm } from '@/app/third-parties/components/third-party-form';

type FormValues = z.infer<typeof CreateLoanApplicationBodySchema>;

function getThirdPartyLabel(item: {
  personType: 'NATURAL' | 'LEGAL';
  businessName?: string | null;
  firstName?: string | null;
  secondName?: string | null;
  firstLastName?: string | null;
  secondLastName?: string | null;
  documentNumber: string;
}): string {
  if (item.personType === 'LEGAL') {
    return item.businessName ?? item.documentNumber;
  }

  const fullName = [item.firstName, item.secondName, item.firstLastName, item.secondLastName]
    .filter(Boolean)
    .join(' ')
    .trim();
  return fullName || item.documentNumber;
}

export function LoanApplicationThirdPartiesForm() {
  const form = useFormContext<FormValues>();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [selectedThirdPartyId, setSelectedThirdPartyId] = useState<number | undefined>();
  const [openedThirdPartyForm, setOpenedThirdPartyForm] = useState(false);
  const [localThirdParty, setLocalThirdParty] = useState<ThirdParty | null>(null);

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'loanApplicationCoDebtors',
  });

  const { data: thirdPartiesData } = useThirdParties({
    limit: 1000,
    include: ['identificationType', 'homeCity', 'workCity'],
    sort: [{ field: 'createdAt', order: 'desc' }],
  });
  const thirdParties = useMemo(() => {
    const base = thirdPartiesData?.body?.data ?? [];
    if (!localThirdParty) return base;
    if (base.some((item) => item.id === localThirdParty.id)) return base;
    return [localThirdParty, ...base];
  }, [thirdPartiesData, localThirdParty]);

  const selectedSet = useMemo(() => new Set(fields.map((field) => field.thirdPartyId)), [fields]);

  const selectedThirdParty = useMemo(
    () => thirdParties.find((item) => item.id === selectedThirdPartyId) ?? null,
    [selectedThirdPartyId, thirdParties]
  );

  const handleAdd = () => {
    if (!selectedThirdPartyId) return;

    if (selectedSet.has(selectedThirdPartyId)) {
      toast.error('No puede repetir el mismo tercero');
      return;
    }

    append({ thirdPartyId: selectedThirdPartyId });
    setSelectedThirdPartyId(undefined);
  };

  const hasItems = fields.length > 0;

  return (
    <div ref={containerRef} className="flex flex-col gap-4">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <p className="text-sm font-medium">Terceros asociados</p>
          <p className="text-muted-foreground text-sm">
            Seleccione terceros existentes para asociarlos a la solicitud.
          </p>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={() => setOpenedThirdPartyForm(true)}>
          <Plus className="mr-1 h-4 w-4" />
          Nuevo tercero
        </Button>
      </div>

      <div className="grid grid-cols-[1fr_auto] gap-2">
        <Combobox
          items={thirdParties}
          value={selectedThirdParty}
          onValueChange={(value) => setSelectedThirdPartyId(value?.id)}
          itemToStringValue={(item) => String(item.id)}
          itemToStringLabel={(item) => `${getThirdPartyLabel(item)} (${item.documentNumber})`}
        >
          <ComboboxTrigger
            render={
              <Button type="button" variant="outline" className="w-full justify-between font-normal">
                <ComboboxValue placeholder="Seleccione tercero..." />
                <ChevronDownIcon className="text-muted-foreground size-4" />
              </Button>
            }
          />
          <ComboboxContent portalContainer={containerRef}>
            <ComboboxInput placeholder="Buscar tercero..." showClear showTrigger={false} />
            <ComboboxList>
              <ComboboxEmpty>No se encontraron terceros</ComboboxEmpty>
              <ComboboxCollection>
                {(item) => (
                  <ComboboxItem key={item.id} value={item}>
                    {getThirdPartyLabel(item)} ({item.documentNumber})
                  </ComboboxItem>
                )}
              </ComboboxCollection>
            </ComboboxList>
          </ComboboxContent>
        </Combobox>

        <Button type="button" onClick={handleAdd} disabled={!selectedThirdPartyId}>
          <Plus className="h-4 w-4" />
          Agregar
        </Button>
      </div>

      {hasItems ? (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Documento</TableHead>
              <TableHead>Tercero</TableHead>
              <TableHead>Ciudad hogar</TableHead>
              <TableHead>Ciudad trabajo</TableHead>
              <TableHead className="w-30 text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {fields.map((field, index) => {
              const item = thirdParties.find((party) => party.id === field.thirdPartyId);
              return (
                <TableRow key={field.id}>
                  <TableCell>
                    {item
                      ? `${item.identificationType?.name ?? '-'} ${item.documentNumber}`
                      : field.thirdPartyId}
                  </TableCell>
                  <TableCell>{item ? getThirdPartyLabel(item) : '-'}</TableCell>
                  <TableCell>{item?.homeCity?.name ?? '-'}</TableCell>
                  <TableCell>{item?.workCity?.name ?? '-'}</TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end gap-2">
                      <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)}>
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      ) : (
        <div className={cn('text-muted-foreground rounded-md border border-dashed p-4 text-sm')}>
          No hay terceros asociados.
        </div>
      )}

      <ThirdPartyForm
        thirdParty={undefined}
        opened={openedThirdPartyForm}
        onOpened={setOpenedThirdPartyForm}
        onSaved={(thirdParty) => {
          setLocalThirdParty(thirdParty);
          setSelectedThirdPartyId(thirdParty.id);
        }}
      />
    </div>
  );
}
