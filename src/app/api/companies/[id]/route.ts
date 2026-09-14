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

  // Apenas Super Admin ou o Admin da própria empresa pode editar
  if (session.role !== 'SUPER_ADMIN' && session.companyId !== id) {
    return NextResponse.json({ error: 'Permissão negada.' }, { status: 403 });
  }

  const data = await request.json();
  const { name, document, email, phone, active } = data;

  db.prepare(`
    UPDATE companies SET
      name = COALESCE(?, name),
      document = ?,
      email = ?,
      phone = ?,
      active = COALESCE(?, active),
      updatedAt = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(
    name,
    document,
    email,
    phone,
    session.role === 'SUPER_ADMIN' ? active : undefined,
    id
  );

  const updated = db.prepare('SELECT * FROM companies WHERE id = ?').get(id);
  return NextResponse.json(updated);
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

  db.prepare('DELETE FROM companies WHERE id = ?').run(id);
  return NextResponse.json({ success: true });
}