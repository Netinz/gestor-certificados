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
    const client = await db.client.findUnique({
      where: { id },
      include: {
        certificates: {
          orderBy: { expirationDate: 'desc' },
        },
      },
    });

    if (!client) {
      return NextResponse.json({ error: 'Cliente não encontrado' }, { status: 404 });
    }

    if (session.role !== 'SUPER_ADMIN' && client.companyId !== session.companyId) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
    }

    return NextResponse.json(client);
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
  const existingClient = await db.client.findUnique({ where: { id } });
  if (!existingClient) {
    return NextResponse.json({ error: 'Cliente não encontrado' }, { status: 404 });
  }

  if (session.role !== 'SUPER_ADMIN' && existingClient.companyId !== session.companyId) {
    return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
  }

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
      notes,
    } = data;

    const cleanDoc = document ? document.replace(/\D/g, '') : null;

    if (cleanDoc && cleanDoc !== existingClient.document) {
      const duplicate = await db.client.findFirst({
        where: {
          document: cleanDoc,
          companyId: existingClient.companyId,
          id: { not: id },
        },
      });
      if (duplicate) {
        return NextResponse.json(
          { error: 'Já existe outro cliente com este documento nesta empresa.' },
          { status: 400 }
        );
      }
    }

    const updated = await db.client.update({
      where: { id },
      data: {
        type: type !== undefined ? type : undefined,
        document: cleanDoc || undefined,
        name: name !== undefined ? name : undefined,
        tradeName: tradeName !== undefined ? tradeName : undefined,
        email: email !== undefined ? email : undefined,
        phone: phone !== undefined ? phone : undefined,
        zipCode: zipCode !== undefined ? zipCode : undefined,
        address: address !== undefined ? address : undefined,
        number: number !== undefined ? number : undefined,
        neighborhood: neighborhood !== undefined ? neighborhood : undefined,
        city: city !== undefined ? city : undefined,
        state: state !== undefined ? state : undefined,
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
  const existingClient = await db.client.findUnique({ where: { id } });
  if (!existingClient) {
    return NextResponse.json({ error: 'Cliente não encontrado' }, { status: 404 });
  }

  if (session.role !== 'SUPER_ADMIN' && existingClient.companyId !== session.companyId) {
    return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
  }

  try {
    await db.client.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
