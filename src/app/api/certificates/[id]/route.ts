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
  const cert: any = db.prepare(`
    SELECT cert.*, 
      c.name as clientName, 
      c.tradeName as clientTradeName, 
      c.phone as clientPhone,
      c.document as clientDocument
    FROM certificates cert
    JOIN clients c ON cert.clientId = c.id
    WHERE cert.id = ?
  `).get(id);

  if (!cert) {
    return NextResponse.json({ error: 'Certificado não encontrado' }, { status: 404 });
  }

  if (session.role !== 'SUPER_ADMIN' && cert.companyId !== session.companyId) {
    return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
  }

  const histories = db.prepare(`
    SELECT * FROM certificate_history 
    WHERE certificateId = ? 
    ORDER BY createdAt DESC
  `).all(id);

  return NextResponse.json({ ...(cert as object), histories });
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

  const { id } = await params;
  const existingCert: any = db.prepare('SELECT * FROM certificates WHERE id = ?').get(id);
  if (!existingCert) {
    return NextResponse.json({ error: 'Certificado não encontrado' }, { status: 404 });
  }

  if (session.role !== 'SUPER_ADMIN' && existingCert.companyId !== session.companyId) {
    return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
  }

  const data = await request.json();

  const {
    type,
    issuer,
    status,
    issueDate,
    expirationDate,
    attachmentUrl,
    attachmentName,
    passwordHint,
    notes
  } = data;

  db.prepare(`
    UPDATE certificates SET
      type = COALESCE(?, type),
      issuer = ?,
      status = COALESCE(?, status),
      issueDate = ?,
      expirationDate = COALESCE(?, expirationDate),
      attachmentUrl = COALESCE(?, attachmentUrl),
      attachmentName = COALESCE(?, attachmentName),
      passwordHint = ?,
      notes = ?,
      updatedAt = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(
    type,
    issuer,
    status,
    issueDate,
    expirationDate,
    attachmentUrl,
    attachmentName,
    passwordHint,
    notes,
    id
  );

  const updated = db.prepare('SELECT * FROM certificates WHERE id = ?').get(id);
  return NextResponse.json(updated);
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

  const { id } = await params;
  const existingCert: any = db.prepare('SELECT * FROM certificates WHERE id = ?').get(id);
  if (!existingCert) {
    return NextResponse.json({ error: 'Certificado não encontrado' }, { status: 404 });
  }

  if (session.role !== 'SUPER_ADMIN' && existingCert.companyId !== session.companyId) {
    return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
  }

  db.prepare('DELETE FROM certificates WHERE id = ?').run(id);
  return NextResponse.json({ success: true });
}