import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { getSession } from '@/lib/auth';
import { randomUUID } from 'crypto';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

  const { id } = await params;
  const body = await request.json();
  const { newExpirationDate, newIssueDate, notes, attachmentUrl, attachmentName } = body;

  if (!newExpirationDate) {
    return NextResponse.json({ error: 'A nova data de vencimento é obrigatória.' }, { status: 400 });
  }

  const cert = db.prepare('SELECT * FROM certificates WHERE id = ?').get(id) as any;
  if (!cert) {
    return NextResponse.json({ error: 'Certificado não encontrado' }, { status: 404 });
  }

  const previousDate = cert.expirationDate;

  // Atualizar o certificado principal com a nova data e status ativo
  db.prepare(`
    UPDATE certificates SET
      expirationDate = ?,
      issueDate = COALESCE(?, issueDate),
      status = 'ACTIVE',
      attachmentUrl = COALESCE(?, attachmentUrl),
      attachmentName = COALESCE(?, attachmentName),
      notes = COALESCE(?, notes),
      updatedAt = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(
    newExpirationDate,
    newIssueDate || null,
    attachmentUrl || null,
    attachmentName || null,
    notes ? `${cert.notes || ''}\n[Renovação em ${new Date().toLocaleDateString('pt-BR')}]: ${notes}`.trim() : cert.notes,
    id
  );

  // Inserir registro no histórico para auditoria e linha do tempo de renovações
  const historyId = randomUUID();
  db.prepare(`
    INSERT INTO certificate_history (id, certificateId, action, previousDate, newDate, notes)
    VALUES (?, ?, 'RENEWAL', ?, ?, ?)
  `).run(
    historyId,
    id,
    previousDate,
    newExpirationDate,
    notes || 'Certificado renovado com nova data de expiração'
  );

  const updatedCert = db.prepare('SELECT * FROM certificates WHERE id = ?').get(id);
  const histories = db.prepare('SELECT * FROM certificate_history WHERE certificateId = ? ORDER BY createdAt DESC').all(id);

  return NextResponse.json({
    certificate: updatedCert,
    histories,
    message: 'Certificado renovado com sucesso!'
  });
}