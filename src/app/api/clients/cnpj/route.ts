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
    // 1. Tentar primeiro na BrasilAPI
    let dataBrasil: any = null;
    try {
      const res = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cleanCnpj}`, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
          'Accept': 'application/json'
        },
        next: { revalidate: 60 }
      });
      if (res.ok) {
        dataBrasil = await res.json();
      }
    } catch (e) {
      console.error('BrasilAPI error:', e);
    }

    // 2. Consultar ReceitaWS para complementar telefone, email, logradouro e número (que são mais completos lá)
    let dataReceitaWS: any = null;
    try {
      const resWS = await fetch(`https://receitaws.com.br/v1/cnpj/${cleanCnpj}`, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
          'Accept': 'application/json'
        },
        next: { revalidate: 60 }
      });
      if (resWS.ok) {
        dataReceitaWS = await resWS.json();
      }
    } catch (e) {
      console.error('ReceitaWS error:', e);
    }

    if (!dataBrasil && !dataReceitaWS) {
      return NextResponse.json({ error: 'Não foi possível consultar os dados do CNPJ nos serviços públicos.' }, { status: 502 });
    }

    // Unificar e obter o dado mais rico de cada campo
    const name = dataBrasil?.razao_social || dataReceitaWS?.nome || '';
    const tradeName = dataBrasil?.nome_fantasia || dataReceitaWS?.fantasia || '';
    const email = dataReceitaWS?.email || dataBrasil?.email || '';

    // Telefone
    let phone = '';
    if (dataReceitaWS?.telefone) {
      // ReceitaWS pode retornar múltiplos telefones separados por barra
      const firstPhone = dataReceitaWS.telefone.split('/')[0].trim();
      phone = firstPhone;
    } else if (dataBrasil?.ddd_telefone_1) {
      phone = dataBrasil.ddd_telefone_1.replace(/\s+/g, '');
    }

    // Endereço
    const zipCode = (dataReceitaWS?.cep || dataBrasil?.cep || '').replace(/\D/g, '');
    let address = dataReceitaWS?.logradouro || dataBrasil?.logradouro || '';
    const number = dataReceitaWS?.numero || dataBrasil?.numero || '';
    let neighborhood = dataReceitaWS?.bairro || dataBrasil?.bairro || '';
    let city = dataReceitaWS?.municipio || dataBrasil?.municipio || '';
    let state = dataReceitaWS?.uf || dataBrasil?.uf || '';

    // Se o logradouro ainda estiver vazio, consultar ViaCEP pelo CEP
    if ((!address || !neighborhood) && zipCode && zipCode.length === 8) {
      try {
        const cepRes = await fetch(`https://viacep.com.br/ws/${zipCode}/json/`);
        if (cepRes.ok) {
          const cepData = await cepRes.json();
          if (!cepData.erro) {
            address = address || cepData.logradouro || '';
            neighborhood = neighborhood || cepData.bairro || '';
            city = city || cepData.localidade || '';
            state = state || cepData.uf || '';
          }
        }
      } catch (e) {
        console.error('ViaCEP lookup fallback error:', e);
      }
    }

    const formatted = {
      cnpj: cleanCnpj,
      name,
      tradeName,
      email,
      phone,
      zipCode,
      address,
      number,
      neighborhood,
      city,
      state,
    };

    return NextResponse.json(formatted);
  } catch (error: any) {
    return NextResponse.json({ error: 'Falha na comunicação com serviço da Receita.' }, { status: 500 });
  }
}
