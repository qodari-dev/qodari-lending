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
import { isUpdatedToday } from '@/utils/date-utils';
import { getThirdPartyLabel } from '@/utils/third-party';
import { ChevronDownIcon, Pencil, Plus, Trash2 } from 'lucide-react';
import { useMemo, useRef, useState } from 'react';
import { useFieldArray, useFormContext } from 'react-hook-form';
import { z } from 'zod';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { toast } from 'sonner';

type FormValues = z.infer<typeof CreateLoanApplicationBodySchema>;

export function LoanApplicationThirdPartiesForm({
  thirdParties,
  onCreateThirdParty,
  onEditThirdParty,
}: {
  thirdParties: ThirdParty[];
  onCreateThirdParty: () => void;
  onEditThirdParty: (thirdParty: ThirdParty) => void;
}) {
  const form = useFormContext<FormValues>();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [selectedThirdPartyId, setSelectedThirdPartyId] = useState<number | undefined>();

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'loanApplicationCoDebtors',
  });

  const selectedSet = useMemo(() => new Set(fields.map((field) => field.thirdPartyId)), [fields]);

  const selectedThirdParty = useMemo(
    () => thirdParties.find((item) => item.id === selectedThirdPartyId) ?? null,
    [selectedThirdPartyId, thirdParties]
  );
  const selectedThirdPartyNeedsUpdate = useMemo(
    () => !isUpdatedToday(selectedThirdParty?.updatedAt),
    [selectedThirdParty]
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
          <p className="text-sm font-medium">Codeudores</p>
          <p className="text-muted-foreground text-sm">
            Seleccione y actualice los codeudores asociados a la solicitud.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={!selectedThirdParty}
            onClick={() => (selectedThirdParty ? onEditThirdParty(selectedThirdParty) : undefined)}
          >
            <Pencil className="mr-1 h-4 w-4" />
            Editar seleccionado
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={onCreateThirdParty}>
            <Plus className="mr-1 h-4 w-4" />
            Nuevo codeudor
          </Button>
        </div>
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
      {selectedThirdParty && selectedThirdPartyNeedsUpdate ? (
        <div className="flex items-center justify-between rounded-md border border-amber-300 bg-amber-50 p-3 text-sm">
          <span className="text-amber-700">
            El codeudor seleccionado requiere actualización hoy.
          </span>
          <Button type="button" size="sm" variant="outline" onClick={() => onEditThirdParty(selectedThirdParty)}>
            <Pencil className="mr-1 h-4 w-4" />
            Actualizar
          </Button>
        </div>
      ) : null}

      {hasItems ? (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Documento</TableHead>
              <TableHead>Codeudor</TableHead>
              <TableHead>Ciudad hogar</TableHead>
              <TableHead>Ciudad trabajo</TableHead>
              <TableHead>Actualizacion</TableHead>
              <TableHead className="w-30 text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {fields.map((field, index) => {
              const item = thirdParties.find((party) => party.id === field.thirdPartyId);
              const updatedToday = isUpdatedToday(item?.updatedAt);
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
                    <span
                      className={cn(
                        'text-xs font-medium',
                        updatedToday ? 'text-emerald-600' : 'text-amber-600'
                      )}
                    >
                      {updatedToday ? 'Actualizado hoy' : 'Requiere actualizacion'}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end gap-2">
                      {item ? (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => onEditThirdParty(item)}
                        >
                          <Pencil className="mr-1 h-4 w-4" />
                          Editar
                        </Button>
                      ) : null}
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
          No hay codeudores asociados.
        </div>
      )}
    </div>
  );
}
