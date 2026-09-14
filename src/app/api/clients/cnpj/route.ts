import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';

export async function GET(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const rawCnpj = searchParams.get('cnpj');

  if (!rawCnpj) {
    return NextResponse.json({ error: 'CNPJ não informado.' }, { status: 400 });
  }

  const cleanCnpj = rawCnpj.replace(/\D/g, '');
  if (cleanCnpj.length !== 14) {
    return NextResponse.json({ error: 'CNPJ deve conter 14 dígitos.' }, { status: 400 });
  }

  try {
    const res = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cleanCnpj}`, {
      headers: { 'User-Agent': 'GestaoCertificados/1.0' },
      next: { revalidate: 60 }
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      return NextResponse.json({ 
        error: err.message || 'Erro ao consultar CNPJ na base pública.' 
      }, { status: res.status });
    }

    const data = await res.json();

    // Formatar e padronizar os dados retornados
    const formatted = {
      cnpj: cleanCnpj,
      name: data.razao_social || data.nome_fantasia || '',
      tradeName: data.nome_fantasia || '',
      email: data.email || '',
      phone: data.ddd_telefone_1 ? `${data.ddd_telefone_1.replace(/\s+/g, '')}` : '',
      zipCode: data.cep || '',
      address: data.logradouro || '',
      number: data.numero || '',
      neighborhood: data.bairro || '',
      city: data.municipio || '',
      state: data.uf || '',
      situation: data.descricao_situacao_cadastral || '',
    };

    return NextResponse.json(formatted);
  } catch (error: any) {
    return NextResponse.json({ error: 'Falha na comunicação com serviço da Receita.' }, { status: 500 });
  }
}
