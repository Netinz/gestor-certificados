import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { getSession } from '@/lib/auth';

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

  const { id } = await params;

  if (session.role !== 'SUPER_ADMIN' && session.companyId !== id) {
    return NextResponse.json({ error: 'Permissão negada.' }, { status: 403 });
  }

  try {
    const data = await request.json();
    const { name, document, email, phone, active } = data;

    const updated = await db.company.update({
      where: { id },
      data: {
        name: name !== undefined ? name : undefined,
        document: document !== undefined ? document : undefined,
        email: email !== undefined ? email : undefined,
        phone: phone !== undefined ? phone : undefined,
        active: session.role === 'SUPER_ADMIN' && active !== undefined ? Boolean(active) : undefined,
      },
    });

    return NextResponse.json(updated);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

  if (session.role !== 'SUPER_ADMIN') {
    return NextResponse.json({ error: 'Apenas Super Admin pode excluir empresas.' }, { status: 403 });
  }

  const { id } = await params;
  if (id === 'company-default') {
    return NextResponse.json({ error: 'A empresa matriz padrão não pode ser excluída.' }, { status: 400 });
  }

  try {
    await db.company.delete({
      where: { id },
    });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
