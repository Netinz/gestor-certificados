import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { getSession } from '@/lib/auth';
import { randomUUID } from 'crypto';

export async function GET(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const search = searchParams.get('q') || '';
  const filterCompanyId = searchParams.get('companyId');

  // Se for super admin, pode ver de uma empresa específica ou de todas; se for usuário de empresa, só vê da sua
  const targetCompanyId = session.role === 'SUPER_ADMIN' 
    ? (filterCompanyId || null) 
    : session.companyId;

  let query = `
    SELECT c.*, comp.name as companyName,
      (SELECT COUNT(*) FROM certificates WHERE clientId = c.id) as certificateCount
    FROM clients c
    LEFT JOIN companies comp ON c.companyId = comp.id
    WHERE 1=1
  `;
  const params: any[] = [];

  if (targetCompanyId) {
    query += ' AND c.companyId = ?';
    params.push(targetCompanyId);
  }

  if (search) {
    query += ' AND (c.name LIKE ? OR c.tradeName LIKE ? OR c.document LIKE ? OR c.phone LIKE ?)';
    const term = `%${search}%`;
    params.push(term, term, term, term);
  }

  query += ' ORDER BY c.name ASC';

  const clients = db.prepare(query).all(...params);
  return NextResponse.json(clients);
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
      notes
    } = data;

    if (!document || !name || !phone) {
      return NextResponse.json({ error: 'CPF/CNPJ, Nome e Telefone são obrigatórios.' }, { status: 400 });
    }

    const cleanDoc = document.replace(/\D/g, '');
    const clientCompanyId = session.role === 'SUPER_ADMIN' 
      ? (companyId || session.companyId || 'company-default') 
      : session.companyId;

    // Verificar duplicidade de documento DENTRO da mesma empresa
    const existing = db.prepare('SELECT id FROM clients WHERE document = ? AND companyId = ?').get(cleanDoc, clientCompanyId);
    if (existing) {
      return NextResponse.json({ error: 'Já existe um cliente cadastrado com este CPF/CNPJ nesta empresa.' }, { status: 400 });
    }

    const id = randomUUID();
    db.prepare(`
      INSERT INTO clients (
        id, companyId, type, document, name, tradeName, email, phone, 
        zipCode, address, number, neighborhood, city, state, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      clientCompanyId,
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
