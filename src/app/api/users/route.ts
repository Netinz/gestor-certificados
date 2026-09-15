import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { getSession } from '@/lib/auth';
import bcrypt from 'bcryptjs';

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

  if (session.role === 'USER') {
    return NextResponse.json({ error: 'Acesso restrito a administradores.' }, { status: 403 });
  }

  try {
    const users = await db.user.findMany({
      where: session.role === 'SUPER_ADMIN' ? {} : { companyId: session.companyId },
      include: {
        company: {
          select: { name: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const formatted = users.map((u) => ({
      id: u.id,
      username: u.username,
      name: u.name,
      role: u.role,
      companyId: u.companyId,
      createdAt: u.createdAt,
      companyName: u.company?.name || null,
    }));

    return NextResponse.json(formatted);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

  if (session.role === 'USER') {
    return NextResponse.json({ error: 'Acesso restrito a administradores.' }, { status: 403 });
  }

  try {
    const data = await request.json();
    const { username, password, name, role, companyId } = data;

    if (!username || !password || !name) {
      return NextResponse.json({ error: 'Usuário, senha e nome são obrigatórios.' }, { status: 400 });
    }

    let targetCompanyId = session.companyId;
    let targetRole = role || 'USER';

    if (session.role === 'SUPER_ADMIN') {
      targetCompanyId = companyId || session.companyId || 'company-default';
    } else {
      if (targetRole === 'SUPER_ADMIN') {
        return NextResponse.json(
          { error: 'Não é permitido criar usuários com nível Super Administrador.' },
          { status: 403 }
        );
      }
    }

    const cleanUsername = username.trim().toLowerCase();
    const existing = await db.user.findUnique({
      where: { username: cleanUsername },
    });

    if (existing) {
      return NextResponse.json({ error: 'Este nome de usuário já está em uso.' }, { status: 400 });
    }

    const hashedPassword = bcrypt.hashSync(password, 10);
    const created = await db.user.create({
      data: {
        username: cleanUsername,
        password: hashedPassword,
        name: name.trim(),
        role: targetRole,
        companyId: targetCompanyId,
      },
      include: {
        company: {
          select: { name: true },
        },
      },
    });

    return NextResponse.json(
      {
        id: created.id,
        username: created.username,
        name: created.name,
        role: created.role,
        companyId: created.companyId,
        companyName: created.company?.name || null,
      },
      { status: 201 }
    );
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
