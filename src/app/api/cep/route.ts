import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';

export async function GET(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const rawCep = searchParams.get('cep');

  if (!rawCep) {
    return NextResponse.json({ error: 'CEP não informado.' }, { status: 400 });
  }

  const cleanCep = rawCep.replace(/\D/g, '');
  if (cleanCep.length !== 8) {
    return NextResponse.json({ error: 'CEP deve conter 8 dígitos.' }, { status: 400 });
  }

  try {
    // 1. Tentar ViaCEP
    const res = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      next: { revalidate: 3600 }
    });

    if (res.ok) {
      const data = await res.json();
      if (!data.erro) {
        return NextResponse.json({
          zipCode: cleanCep,
          address: data.logradouro || '',
          neighborhood: data.bairro || '',
          city: data.localidade || '',
          state: data.uf || '',
        });
      }
    }

    // 2. Fallback para BrasilAPI
    const resBrasil = await fetch(`https://brasilapi.com.br/api/cep/v1/${cleanCep}`, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      next: { revalidate: 3600 }
    });

    if (resBrasil.ok) {
      const dataBrasil = await resBrasil.json();
      return NextResponse.json({
        zipCode: cleanCep,
        address: dataBrasil.street || '',
        neighborhood: dataBrasil.neighborhood || '',
        city: dataBrasil.city || '',
        state: dataBrasil.state || '',
      });
    }

    return NextResponse.json({ error: 'CEP não encontrado.' }, { status: 404 });
  } catch (error: any) {
    return NextResponse.json({ error: 'Falha na consulta do CEP.' }, { status: 500 });
  }
}