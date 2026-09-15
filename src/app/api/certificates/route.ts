import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { getSession } from '@/lib/auth';
import { addDays, format } from 'date-fns';

export async function GET(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const clientId = searchParams.get('clientId');
  const filter = searchParams.get('filter'); // '30days', '15days', 'expired'
  const search = searchParams.get('q');
  const filterCompanyId = searchParams.get('companyId');

  const targetCompanyId =
    session.role === 'SUPER_ADMIN' ? (filterCompanyId || null) : session.companyId;

  try {
    const whereClause: any = {};

    if (targetCompanyId) {
      whereClause.companyId = targetCompanyId;
    }

    if (clientId) {
      whereClause.clientId = clientId;
    }

    if (search) {
      whereClause.OR = [
        { client: { name: { contains: search, mode: 'insensitive' } } },
        { client: { document: { contains: search, mode: 'insensitive' } } },
        { type: { contains: search, mode: 'insensitive' } },
      ];
    }

    const todayStr = format(new Date(), 'yyyy-MM-dd');

    if (filter === 'expired') {
      whereClause.expirationDate = { lt: todayStr };
      whereClause.status = { not: 'RENEWED' };
    } else if (filter === '15days') {
      const in15Days = format(addDays(new Date(), 15), 'yyyy-MM-dd');
      whereClause.expirationDate = { gte: todayStr, lte: in15Days };
      whereClause.status = { not: 'RENEWED' };
    } else if (filter === '30days') {
      const in30Days = format(addDays(new Date(), 30), 'yyyy-MM-dd');
      whereClause.expirationDate = { gte: todayStr, lte: in30Days };
      whereClause.status = { not: 'RENEWED' };
    }

    const certificates = await db.certificate.findMany({
      where: whereClause,
      include: {
        client: true,
        company: {
          include: {
            settings: {
              where: { key: 'whatsapp_template' },
            },
          },
        },
      },
      orderBy: { expirationDate: 'asc' },
    });

    const formatted = certificates.map((cert) => ({
      id: cert.id,
      companyId: cert.companyId,
      clientId: cert.clientId,
      type: cert.type,
      issuer: cert.issuer,
      status: cert.status,
      issueDate: cert.issueDate,
      expirationDate: cert.expirationDate,
      attachmentUrl: cert.attachmentUrl,
      attachmentName: cert.attachmentName,
      passwordHint: cert.passwordHint,
      notes: cert.notes,
      createdAt: cert.createdAt,
      updatedAt: cert.updatedAt,
      clientName: cert.client.name,
      clientTradeName: cert.client.tradeName,
      clientPhone: cert.client.phone,
      clientDocument: cert.client.document,
      companyName: cert.company?.name || null,
      companyWhatsappTemplate: cert.company?.settings?.[0]?.value || null,
    }));

    return NextResponse.json(formatted);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
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
      notes,
    } = data;

    if (!clientId || !type || !expirationDate) {
      return NextResponse.json(
        { error: 'Cliente, Tipo de Certificado e Data de Vencimento são obrigatórios.' },
        { status: 400 }
      );
    }

    const client = await db.client.findUnique({
      where: { id: clientId },
      select: { companyId: true },
    });

    const certCompanyId = client?.companyId || session.companyId || 'company-default';

    const result = await db.$transaction(async (tx) => {
      const created = await tx.certificate.create({
        data: {
          companyId: certCompanyId,
          clientId,
          type,
          issuer: issuer || null,
          status: 'ACTIVE',
          issueDate: issueDate || null,
          expirationDate,
          attachmentUrl: attachmentUrl || null,
          attachmentName: attachmentName || null,
          passwordHint: passwordHint || null,
          notes: notes || null,
        },
      });

      await tx.certificateHistory.create({
        data: {
          certificateId: created.id,
          action: 'CREATED',
          newDate: expirationDate,
          notes: 'Certificado cadastrado inicialmente',
        },
      });

      return created;
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
