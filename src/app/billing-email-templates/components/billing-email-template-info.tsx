import { DescriptionList, DescriptionSection } from '@/components/description-list';
import { Badge } from '@/components/ui/badge';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { BillingEmailTemplate } from '@/schemas/billing-email-template';
import { formatDate } from '@/utils/formatters';
import { HTML_PREVIEW_CLASSES } from './html-preview-styles';

export function BillingEmailTemplateInfo({
  billingEmailTemplate,
  opened,
  onOpened,
}: {
  billingEmailTemplate: BillingEmailTemplate | undefined;
  opened: boolean;
  onOpened(opened: boolean): void;
}) {
  if (!billingEmailTemplate) return null;

  const sections: DescriptionSection[] = [
    {
      title: 'Informacion basica',
      columns: 2,
      items: [
        { label: 'Nombre', value: billingEmailTemplate.name },
        { label: 'From', value: billingEmailTemplate.fromEmail },
        { label: 'Asunto', value: billingEmailTemplate.subject },
        {
          label: 'Estado',
          value: (
            <Badge variant={billingEmailTemplate.isActive ? 'default' : 'outline'}>
              {billingEmailTemplate.isActive ? 'Activa' : 'Inactiva'}
            </Badge>
          ),
        },
      ],
    },
    {
      title: 'Actividad',
      columns: 2,
      items: [
        { label: 'Creada', value: formatDate(billingEmailTemplate.createdAt) },
        { label: 'Actualizada', value: formatDate(billingEmailTemplate.updatedAt) },
      ],
    },
  ];

  return (
    <Sheet open={opened} onOpenChange={(open) => onOpened(open)}>
      <SheetContent className="overflow-y-scroll sm:max-w-3xl">
        <SheetHeader>
          <SheetTitle>Plantilla de correo</SheetTitle>
        </SheetHeader>
        <div className="space-y-4 px-4">
          <DescriptionList sections={sections} columns={2} />
          <div className="space-y-2">
            <p className="text-muted-foreground text-sm font-medium">Vista previa HTML</p>
            <div
              className={`rounded-md border p-4 text-sm ${HTML_PREVIEW_CLASSES}`}
              dangerouslySetInnerHTML={{ __html: billingEmailTemplate.htmlContent }}
            />
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
