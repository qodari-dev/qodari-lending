'use client';

import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { CreateLoanApplicationBodySchema } from '@/schemas/loan-application';
import { Eye, FileUp, Trash2 } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useFieldArray, useFormContext } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

type FormValues = z.infer<typeof CreateLoanApplicationBodySchema>;

export type RequiredDocumentItem = {
  documentTypeId: number;
  isRequired: boolean;
  documentTypeName: string;
};

export function LoanApplicationDocumentsForm({
  requiredDocuments,
  onUploadFile,
  onViewFile,
}: {
  requiredDocuments: RequiredDocumentItem[];
  onUploadFile: (args: { file: File; documentTypeId: number }) => Promise<string>;
  onViewFile?: (fileKey: string) => void | Promise<void>;
}) {
  const form = useFormContext<FormValues>();
  const { fields, replace, update } = useFieldArray({
    control: form.control,
    name: 'loanApplicationDocuments',
  });

  const [uploadingByType, setUploadingByType] = useState<Record<number, boolean>>({});

  useEffect(() => {
    const current = form.getValues('loanApplicationDocuments') ?? [];
    const currentByType = new Map(current.map((item) => [item.documentTypeId, item]));

    const requiredRows = requiredDocuments.map((requiredDocument) => {
      return (
        currentByType.get(requiredDocument.documentTypeId) ?? {
          documentTypeId: requiredDocument.documentTypeId,
          isDelivered: false,
          fileKey: null,
        }
      );
    });

    const optionalRows = current.filter(
      (item) =>
        !requiredDocuments.some(
          (requiredDocument) => requiredDocument.documentTypeId === item.documentTypeId
        )
    );

    replace([...requiredRows, ...optionalRows]);
  }, [form, replace, requiredDocuments]);

  const requiredByType = useMemo(() => {
    const map = new Map<number, RequiredDocumentItem>();
    requiredDocuments.forEach((item) => map.set(item.documentTypeId, item));
    return map;
  }, [requiredDocuments]);

  const hasRows = useMemo(() => fields.length > 0, [fields.length]);

  const handleFileSelected = async (index: number, file: File | undefined) => {
    if (!file) return;
    const row = fields[index];
    if (!row) return;

    try {
      setUploadingByType((prev) => ({ ...prev, [row.documentTypeId]: true }));
      const fileKey = await onUploadFile({ file, documentTypeId: row.documentTypeId });
      update(index, {
        documentTypeId: row.documentTypeId,
        isDelivered: true,
        fileKey,
      });
      toast.success('Archivo cargado');
    } catch {
      toast.error('No fue posible cargar el archivo');
    } finally {
      setUploadingByType((prev) => ({ ...prev, [row.documentTypeId]: false }));
    }
  };

  const handleToggleDelivered = (index: number, checked: boolean) => {
    const row = fields[index];
    if (!row) return;
    update(index, {
      documentTypeId: row.documentTypeId,
      isDelivered: checked,
      fileKey: checked ? row.fileKey : null,
    });
  };

  const clearFile = (index: number) => {
    const row = fields[index];
    if (!row) return;
    update(index, {
      documentTypeId: row.documentTypeId,
      isDelivered: false,
      fileKey: null,
    });
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="space-y-1">
        <p className="text-sm font-medium">Documentos de la solicitud</p>
        <p className="text-muted-foreground text-sm">
          Debe adjuntar todos los documentos obligatorios del tipo de credito.
        </p>
      </div>

      {hasRows ? (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Documento</TableHead>
              <TableHead>Obligatorio</TableHead>
              <TableHead>Entregado</TableHead>
              <TableHead>Archivo</TableHead>
              <TableHead className="w-30 text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {fields.map((field, index) => {
              const requiredDoc = requiredByType.get(field.documentTypeId);
              const isRequired = requiredDoc?.isRequired ?? false;
              const isUploading = !!uploadingByType[field.documentTypeId];

              return (
                <TableRow key={field.id}>
                  <TableCell>
                    {requiredDoc?.documentTypeName ?? `Documento ${field.documentTypeId}`}
                  </TableCell>
                  <TableCell>{isRequired ? 'Si' : 'No'}</TableCell>
                  <TableCell>
                    <Switch
                      checked={field.isDelivered}
                      onCheckedChange={(checked) => handleToggleDelivered(index, !!checked)}
                    />
                  </TableCell>
                  <TableCell>
                    {field.fileKey ? (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={!onViewFile}
                        onClick={() => field.fileKey && onViewFile?.(field.fileKey)}
                      >
                        <Eye className="mr-2 h-4 w-4" />
                        Ver archivo
                      </Button>
                    ) : (
                      '-'
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        disabled={isUploading}
                        onClick={() => {
                          const input = document.getElementById(
                            `loan-app-doc-file-${field.documentTypeId}`
                          ) as HTMLInputElement | null;
                          input?.click();
                        }}
                      >
                        <FileUp className="mr-2 h-4 w-4" />
                        {isUploading ? 'Cargando...' : 'Subir'}
                      </Button>
                      <input
                        id={`loan-app-doc-file-${field.documentTypeId}`}
                        type="file"
                        className="hidden"
                        onChange={(event) => handleFileSelected(index, event.target.files?.[0])}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => clearFile(index)}
                      >
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
          Seleccione una linea de credito para cargar documentos.
        </div>
      )}
    </div>
  );
}
