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
  try {
    const cert = await db.certificate.findUnique({
      where: { id },
      include: {
        client: true,
        company: {
          include: {
            settings: {
              where: { key: 'whatsapp_template' },
            },
          },
        },
        history: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!cert) {
      return NextResponse.json({ error: 'Certificado não encontrado' }, { status: 404 });
    }

    if (session.role !== 'SUPER_ADMIN' && cert.companyId !== session.companyId) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
    }

    const formatted = {
      ...cert,
      clientName: cert.client.name,
      clientTradeName: cert.client.tradeName,
      clientPhone: cert.client.phone,
      clientDocument: cert.client.document,
      companyName: cert.company?.name || null,
      companyWhatsappTemplate: cert.company?.settings?.[0]?.value || null,
      histories: cert.history,
    };

    return NextResponse.json(formatted);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

  const { id } = await params;
  const existingCert = await db.certificate.findUnique({ where: { id } });
  if (!existingCert) {
    return NextResponse.json({ error: 'Certificado não encontrado' }, { status: 404 });
  }

  if (session.role !== 'SUPER_ADMIN' && existingCert.companyId !== session.companyId) {
    return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
  }

  try {
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
      notes,
    } = data;

    const updated = await db.certificate.update({
      where: { id },
      data: {
        type: type !== undefined ? type : undefined,
        issuer: issuer !== undefined ? issuer : undefined,
        status: status !== undefined ? status : undefined,
        issueDate: issueDate !== undefined ? issueDate : undefined,
        expirationDate: expirationDate !== undefined ? expirationDate : undefined,
        attachmentUrl: attachmentUrl !== undefined ? attachmentUrl : undefined,
        attachmentName: attachmentName !== undefined ? attachmentName : undefined,
        passwordHint: passwordHint !== undefined ? passwordHint : undefined,
        notes: notes !== undefined ? notes : undefined,
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

  const { id } = await params;
  const existingCert = await db.certificate.findUnique({ where: { id } });
  if (!existingCert) {
    return NextResponse.json({ error: 'Certificado não encontrado' }, { status: 404 });
  }

  if (session.role !== 'SUPER_ADMIN' && existingCert.companyId !== session.companyId) {
    return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
  }

  try {
    await db.certificate.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
