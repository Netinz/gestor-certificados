import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { getSession } from '@/lib/auth';

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

  const cert = await db.certificate.findUnique({ where: { id } });
  if (!cert) {
    return NextResponse.json({ error: 'Certificado não encontrado' }, { status: 404 });
  }

  if (session.role !== 'SUPER_ADMIN' && cert.companyId !== session.companyId) {
    return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
  }

  const previousDate = cert.expirationDate;

  try {
    const renewalNote = notes
      ? `${cert.notes || ''}\n[Renovação em ${new Date().toLocaleDateString('pt-BR')}]: ${notes}`.trim()
      : cert.notes;

    const result = await db.$transaction(async (tx) => {
      const updatedCert = await tx.certificate.update({
        where: { id },
        data: {
          expirationDate: newExpirationDate,
          issueDate: newIssueDate || cert.issueDate,
          status: 'ACTIVE',
          attachmentUrl: attachmentUrl || cert.attachmentUrl,
          attachmentName: attachmentName || cert.attachmentName,
          notes: renewalNote,
        },
      });

      await tx.certificateHistory.create({
        data: {
          certificateId: id,
          action: 'RENEWAL',
          previousDate,
          newDate: newExpirationDate,
          notes: notes || 'Certificado renovado com nova data de expiração',
        },
      });

      const histories = await tx.certificateHistory.findMany({
        where: { certificateId: id },
        orderBy: { createdAt: 'desc' },
      });

      return { updatedCert, histories };
    });

    return NextResponse.json({
      certificate: result.updatedCert,
      histories: result.histories,
      message: 'Certificado renovado com sucesso!',
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
