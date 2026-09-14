import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { getSession } from '@/lib/auth';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

  const { id } = await params;
  const client = db.prepare('SELECT * FROM clients WHERE id = ?').get(id);

  if (!client) {
    return NextResponse.json({ error: 'Cliente não encontrado' }, { status: 404 });
  }

  const certificates = db.prepare(`
    SELECT * FROM certificates WHERE clientId = ? ORDER BY expirationDate DESC
  `).all(id);

  return NextResponse.json({ ...(client as object), certificates });
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

  const { id } = await params;
  const data = await request.json();

  const {
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
    notes
  } = data;

  const cleanDoc = document ? document.replace(/\D/g, '') : null;

  db.prepare(`
    UPDATE clients SET
      type = COALESCE(?, type),
      document = COALESCE(?, document),
      name = COALESCE(?, name),
      tradeName = ?,
      email = ?,
      phone = COALESCE(?, phone),
      zipCode = ?,
      address = ?,
      number = ?,
      neighborhood = ?,
      city = ?,
      state = ?,
      notes = ?,
      updatedAt = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(
    type,
    cleanDoc,
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
    id
  );

  const updated = db.prepare('SELECT * FROM clients WHERE id = ?').get(id);
  return NextResponse.json(updated);
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

  const { id } = await params;
  db.prepare('DELETE FROM clients WHERE id = ?').run(id);
  return NextResponse.json({ success: true });
}