import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { getSession } from '@/lib/auth';

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

  try {
    if (session.role !== 'SUPER_ADMIN') {
      if (!session.companyId) return NextResponse.json([]);
      const myCompany = await db.company.findUnique({
        where: { id: session.companyId },
        include: {
          _count: {
            select: { users: true, clients: true, certificates: true },
          },
        },
      });

      if (!myCompany) return NextResponse.json([]);
      return NextResponse.json([
        {
          ...myCompany,
          userCount: myCompany._count.users,
          clientCount: myCompany._count.clients,
          certificateCount: myCompany._count.certificates,
        },
      ]);
    }

    const companies = await db.company.findMany({
      orderBy: { name: 'asc' },
      include: {
        _count: {
          select: { users: true, clients: true, certificates: true },
        },
      },
    });

    const formatted = companies.map((c) => ({
      ...c,
      userCount: c._count.users,
      clientCount: c._count.clients,
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

  if (session.role !== 'SUPER_ADMIN') {
    return NextResponse.json(
      { error: 'Apenas o Administrador do Sistema pode cadastrar novas empresas.' },
      { status: 403 }
    );
  }

  try {
    const data = await request.json();
    const { name, document, email, phone } = data;

    if (!name) {
      return NextResponse.json({ error: 'O nome da empresa é obrigatório.' }, { status: 400 });
    }

    const created = await db.company.create({
      data: {
        name: name.trim(),
        document: document || null,
        email: email || null,
        phone: phone || null,
        active: true,
      },
    });

    return NextResponse.json(created, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
