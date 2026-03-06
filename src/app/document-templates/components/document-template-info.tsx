import { DescriptionList, DescriptionSection } from '@/components/description-list';
import { HtmlTemplatePreview } from '@/components/html-template/html-template-preview';
import { Badge } from '@/components/ui/badge';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';
import {
  documentContentFormatLabels,
  documentTemplateStatusLabels,
  DocumentTemplate,
  signerRoleLabels,
} from '@/schemas/document-template';
import { formatDate } from '@/utils/formatters';

export function DocumentTemplateInfo({
  documentTemplate,
  opened,
  onOpened,
}: {
  documentTemplate: DocumentTemplate | undefined;
  opened: boolean;
  onOpened(opened: boolean): void;
}) {
  if (!documentTemplate) return null;

  const signerRules = (documentTemplate.templateSignerRules ?? []).slice().sort((a, b) => a.signOrder - b.signOrder);
  const productRules = documentTemplate.creditProductDocumentRules ?? [];

  const sections: DescriptionSection[] = [
    {
      title: 'Informacion basica',
      columns: 2,
      items: [
        { label: 'Codigo', value: documentTemplate.code },
        { label: 'Nombre', value: documentTemplate.name },
        { label: 'Version', value: documentTemplate.version },
        {
          label: 'Estado',
          value: (
            <Badge variant={documentTemplate.status === 'ACTIVE' ? 'default' : 'outline'}>
              {documentTemplateStatusLabels[documentTemplate.status]}
            </Badge>
          ),
        },
        { label: 'Formato', value: documentContentFormatLabels[documentTemplate.contentFormat] },
      ],
    },
    {
      title: 'Actividad',
      columns: 2,
      items: [
        { label: 'Creado', value: formatDate(documentTemplate.createdAt) },
        { label: 'Actualizado', value: formatDate(documentTemplate.updatedAt) },
      ],
    },
  ];

  return (
    <Sheet open={opened} onOpenChange={(open) => onOpened(open)}>
      <SheetContent className="overflow-y-scroll sm:max-w-3xl">
        <SheetHeader>
          <SheetTitle>Informacion plantilla</SheetTitle>
        </SheetHeader>
        <div className="space-y-6 px-4">
          <DescriptionList sections={sections} columns={2} />

          {documentTemplate.contentFormat === 'HTML_HBS' ? (
            <>
              <div className="space-y-2">
                <h3 className="text-sm font-semibold">Vista previa HTML</h3>
                <HtmlTemplatePreview htmlContent={documentTemplate.templateBody ?? ''} />
              </div>
              <div className="space-y-2">
                <h3 className="text-sm font-semibold">Template body</h3>
                <pre className="bg-muted max-h-56 overflow-auto rounded-md p-3 text-xs whitespace-pre-wrap">
                  {documentTemplate.templateBody || '-'}
                </pre>
              </div>
            </>
          ) : (
            <div className="space-y-2">
              <h3 className="text-sm font-semibold">PDF estatico</h3>
              <p className="text-muted-foreground text-sm">{documentTemplate.templateStorageKey || '-'}</p>
            </div>
          )}

          <div className="space-y-2">
            <h3 className="text-sm font-semibold">Reglas de firmantes</h3>
            {signerRules.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Orden</TableHead>
                    <TableHead>Rol</TableHead>
                    <TableHead>Obligatorio</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {signerRules.map((rule) => (
                    <TableRow key={rule.id}>
                      <TableCell>{rule.signOrder}</TableCell>
                      <TableCell>{signerRoleLabels[rule.signerRole]}</TableCell>
                      <TableCell>
                        <Badge variant={rule.required ? 'default' : 'outline'}>
                          {rule.required ? 'Si' : 'No'}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className={cn('text-muted-foreground rounded-md border border-dashed p-4 text-sm')}>
                No hay firmantes configurados.
              </div>
            )}
          </div>

          <div className="space-y-2">
            <h3 className="text-sm font-semibold">Asociaciones a productos</h3>
            {productRules.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Producto</TableHead>
                    <TableHead>Orden</TableHead>
                    <TableHead>Obligatorio</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {productRules.map((rule) => (
                    <TableRow key={rule.id}>
                      <TableCell>{rule.creditProduct?.name ?? `#${rule.creditProductId}`}</TableCell>
                      <TableCell>{rule.documentOrder}</TableCell>
                      <TableCell>
                        <Badge variant={rule.required ? 'default' : 'outline'}>
                          {rule.required ? 'Si' : 'No'}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className={cn('text-muted-foreground rounded-md border border-dashed p-4 text-sm')}>
                La plantilla no esta asociada a productos de credito.
              </div>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
