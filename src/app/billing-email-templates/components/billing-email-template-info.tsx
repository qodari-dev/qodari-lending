import { DescriptionList, DescriptionSection } from '@/components/description-list';
import { HtmlTemplatePreview } from '@/components/html-template/html-template-preview';
import { Badge } from '@/components/ui/badge';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { BillingEmailTemplate } from '@/schemas/billing-email-template';
import { formatDate } from '@/utils/formatters';

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
            <HtmlTemplatePreview htmlContent={billingEmailTemplate.htmlContent} />
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
