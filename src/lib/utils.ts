export function formatDocument(value: string): string {
  if (!value) return '';
  const clean = value.replace(/\D/g, '');
  if (clean.length === 11) {
    return clean.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  } else if (clean.length === 14) {
    return clean.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
  }
  return value;
}

export function formatPhone(value: string): string {
  if (!value) return '';
  const clean = value.replace(/\D/g, '');
  if (clean.length === 11) {
    return clean.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
  } else if (clean.length === 10) {
    return clean.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
  }
  return value;
}

export function getDaysRemaining(expirationDate: string): number {
  if (!expirationDate) return 0;
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const target = new Date(expirationDate);
  target.setHours(0, 0, 0, 0);
  const diffTime = target.getTime() - now.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

export function formatDateBR(dateString?: string | null): string {
  if (!dateString) return '-';
  const parts = dateString.split('T')[0].split('-');
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return dateString;
}

export function generateWhatsAppLink(
  phone: string,
  template: string,
  params: {
    clientName: string;
    certType: string;
    expirationDate: string;
    daysRemaining: number;
    companyName?: string;
  }
): string {
  let cleanPhone = phone.replace(/\D/g, '');
  if (cleanPhone.length >= 10 && !cleanPhone.startsWith('55')) {
    cleanPhone = `55${cleanPhone}`;
  }

  let text = template || '';
  text = text.replace(/\$NomeCliente/gi, params.clientName);
  text = text.replace(/\$TipoCertificado/gi, params.certType);
  text = text.replace(/\$DataVencimento/gi, formatDateBR(params.expirationDate));
  text = text.replace(/\$DiasRestantes/gi, String(params.daysRemaining));
  if (params.companyName) {
    text = text.replace(/\$NomeEmpresa/gi, params.companyName);
  }

  return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(text)}`;
}