import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { getSession } from '@/lib/auth';

export async function GET(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const search = searchParams.get('q') || '';
  const filterCompanyId = searchParams.get('companyId');

  const targetCompanyId =
    session.role === 'SUPER_ADMIN' ? (filterCompanyId || null) : session.companyId;

  try {
    const whereClause: any = {};
    if (targetCompanyId) {
      whereClause.companyId = targetCompanyId;
    }

    if (search) {
      whereClause.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { tradeName: { contains: search, mode: 'insensitive' } },
        { document: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } },
      ];
    }

    const clients = await db.client.findMany({
      where: whereClause,
      include: {
        company: {
          select: { name: true },
        },
        _count: {
          select: { certificates: true },
        },
      },
      orderBy: { name: 'asc' },
    });

    const formatted = clients.map((c) => ({
      ...c,
      companyName: c.company?.name || null,
      certificateCount: c._count.certificates,
    }));

    return NextResponse.json(formatted);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

  try {
    const data = await request.json();
    const {
      companyId,
      type,
      document,
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
      notes,
    } = data;

    if (!document || !name || !phone) {
      return NextResponse.json({ error: 'CPF/CNPJ, Nome e Telefone são obrigatórios.' }, { status: 400 });
    }

    const cleanDoc = document.replace(/\D/g, '');
    const clientCompanyId =
      session.role === 'SUPER_ADMIN'
        ? (companyId || session.companyId || 'company-default')
        : session.companyId;

    const existing = await db.client.findFirst({
      where: {
        document: cleanDoc,
        companyId: clientCompanyId,
      },
    });

    if (existing) {
      return NextResponse.json(
        { error: 'Já existe um cliente cadastrado com este CPF/CNPJ nesta empresa.' },
        { status: 400 }
      );
    }

    const created = await db.client.create({
      data: {
        companyId: clientCompanyId,
        type: type || (cleanDoc.length === 14 ? 'PJ' : 'PF'),
        document: cleanDoc,
        name: name.trim(),
        tradeName: tradeName?.trim() || null,
        email: email?.trim() || null,
        phone: phone.trim(),
        zipCode: zipCode || null,
        address: address || null,
        number: number || null,
        neighborhood: neighborhood || null,
        city: city || null,
        state: state || null,
        notes: notes || null,
      },
    });

    return NextResponse.json(created, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
