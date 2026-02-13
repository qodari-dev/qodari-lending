type ThirdPartyLabelInput = {
  personType?: 'NATURAL' | 'LEGAL' | null;
  businessName?: string | null;
  firstName?: string | null;
  secondName?: string | null;
  firstLastName?: string | null;
  secondLastName?: string | null;
  documentNumber?: string | null;
};

export function getThirdPartyLabel(item: ThirdPartyLabelInput | null | undefined): string {
  if (!item) return '-';

  if (item.personType === 'LEGAL') {
    return item.businessName ?? item.documentNumber ?? '-';
  }

  const fullName = [item.firstName, item.secondName, item.firstLastName, item.secondLastName]
    .filter(Boolean)
    .join(' ')
    .trim();

  return fullName || item.documentNumber || '-';
}
