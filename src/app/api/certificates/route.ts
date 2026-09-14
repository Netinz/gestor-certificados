import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { getSession } from '@/lib/auth';
import { randomUUID } from 'crypto';

export async function GET(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const clientId = searchParams.get('clientId');
  const filter = searchParams.get('filter'); // '30days', '15days', 'expired'
  const search = searchParams.get('q');

  let query = `
    SELECT cert.*, 
      c.name as clientName, 
      c.tradeName as clientTradeName, 
      c.phone as clientPhone,
      c.document as clientDocument
    FROM certificates cert
    JOIN clients c ON cert.clientId = c.id
    WHERE 1=1
  `;
  const params: any[] = [];

  if (clientId) {
    query += ' AND cert.clientId = ?';
    params.push(clientId);
  }

  if (search) {
    query += ' AND (c.name LIKE ? OR c.document LIKE ? OR cert.type LIKE ?)';
    const term = `%${search}%`;
    params.push(term, term, term);
  }

  // Filtragem por vencimento
  // Formato de data ISO: YYYY-MM-DD
  const today = new Date().toISOString().split('T')[0];

  if (filter === 'expired') {
    query += ' AND date(cert.expirationDate) < date(?) AND cert.status != "RENEWED"';
    params.push(today);
  } else if (filter === '15days') {
    query += `
      AND date(cert.expirationDate) >= date(?) 
      AND date(cert.expirationDate) <= date(?, '+15 days')
      AND cert.status != "RENEWED"
    `;
    params.push(today, today);
  } else if (filter === '30days') {
    query += `
      AND date(cert.expirationDate) >= date(?) 
      AND date(cert.expirationDate) <= date(?, '+30 days')
      AND cert.status != "RENEWED"
    `;
    params.push(today, today);
  }

  query += ' ORDER BY cert.expirationDate ASC';

  const certificates = db.prepare(query).all(...params);
  return NextResponse.json(certificates);
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

  try {
    const data = await request.json();
    const {
      clientId,
      type,
      issuer,
      issueDate,
      expirationDate,
      attachmentUrl,
      attachmentName,
      passwordHint,
      notes
    } = data;

    if (!clientId || !type || !expirationDate) {
      return NextResponse.json({ 
        error: 'Cliente, Tipo de Certificado e Data de Vencimento são obrigatórios.' 
      }, { status: 400 });
    }

    const id = randomUUID();
    db.prepare(`
      INSERT INTO certificates (
        id, clientId, type, issuer, status, issueDate, expirationDate,
        attachmentUrl, attachmentName, passwordHint, notes
      ) VALUES (?, ?, ?, ?, 'ACTIVE', ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      clientId,
      type,
      issuer || null,
      issueDate || null,
      expirationDate,
      attachmentUrl || null,
      attachmentName || null,
      passwordHint || null,
      notes || null
    );

    // Registrar no histórico de certificados
    const historyId = randomUUID();
    db.prepare(`
      INSERT INTO certificate_history (id, certificateId, action, newDate, notes)
      VALUES (?, ?, 'CREATED', ?, ?)
    `).run(historyId, id, expirationDate, 'Certificado cadastrado inicialmente');

    const created = db.prepare('SELECT * FROM certificates WHERE id = ?').get(id);
    return NextResponse.json(created, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}