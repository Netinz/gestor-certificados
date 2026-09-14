import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { getSession } from '@/lib/auth';
import { randomUUID } from 'crypto';

export async function GET(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const search = searchParams.get('q') || '';

  let clients;
  if (search) {
    const term = `%${search}%`;
    clients = db.prepare(`
      SELECT c.*, 
        (SELECT COUNT(*) FROM certificates WHERE clientId = c.id) as certificateCount
      FROM clients c
      WHERE c.name LIKE ? OR c.tradeName LIKE ? OR c.document LIKE ? OR c.phone LIKE ?
      ORDER BY c.name ASC
    `).all(term, term, term, term);
  } else {
    clients = db.prepare(`
      SELECT c.*, 
        (SELECT COUNT(*) FROM certificates WHERE clientId = c.id) as certificateCount
      FROM clients c
      ORDER BY c.name ASC
    `).all();
  }

  return NextResponse.json(clients);
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

  try {
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

    if (!document || !name || !phone) {
      return NextResponse.json({ error: 'CPF/CNPJ, Nome e Telefone são obrigatórios.' }, { status: 400 });
    }

    const cleanDoc = document.replace(/\D/g, '');

    // Verificar duplicidade de documento
    const existing = db.prepare('SELECT id FROM clients WHERE document = ?').get(cleanDoc);
    if (existing) {
      return NextResponse.json({ error: 'Já existe um cliente cadastrado com este CPF/CNPJ.' }, { status: 400 });
    }

    const id = randomUUID();
    db.prepare(`
      INSERT INTO clients (
        id, type, document, name, tradeName, email, phone, 
        zipCode, address, number, neighborhood, city, state, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      type || (cleanDoc.length === 14 ? 'PJ' : 'PF'),
      cleanDoc,
      name.trim(),
      tradeName?.trim() || null,
      email?.trim() || null,
      phone.trim(),
      zipCode || null,
      address || null,
      number || null,
      neighborhood || null,
      city || null,
      state || null,
      notes || null
    );

    const created = db.prepare('SELECT * FROM clients WHERE id = ?').get(id);
    return NextResponse.json(created, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
