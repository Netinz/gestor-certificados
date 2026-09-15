import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { getSession } from '@/lib/auth';
import bcrypt from 'bcryptjs';

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

  if (session.role === 'USER') {
    return NextResponse.json({ error: 'Acesso negado.' }, { status: 403 });
  }

  const { id } = await params;
  const targetUser = await db.user.findUnique({ where: { id } });
  if (!targetUser) {
    return NextResponse.json({ error: 'Usuário não encontrado.' }, { status: 404 });
  }

  if (session.role === 'COMPANY_ADMIN') {
    if (targetUser.companyId !== session.companyId) {
      return NextResponse.json({ error: 'Permissão negada para editar usuário de outra empresa.' }, { status: 403 });
    }
    if (targetUser.role === 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Permissão negada para editar este usuário.' }, { status: 403 });
    }
  }

  try {
    const data = await request.json();
    const { name, role, companyId, password, username } = data;

    let newRole = targetUser.role;
    if (role) {
      if (session.role === 'COMPANY_ADMIN') {
        if (role === 'SUPER_ADMIN') {
          return NextResponse.json({ error: 'Não é permitido conceder permissão de Super Admin.' }, { status: 403 });
        }
        newRole = role;
      } else if (session.role === 'SUPER_ADMIN') {
        if (targetUser.username === 'admin' && role !== 'SUPER_ADMIN') {
          return NextResponse.json({ error: 'Não é permitido alterar o nível de acesso do administrador mestre.' }, { status: 400 });
        }
        newRole = role;
      }
    }

    let newCompanyId = targetUser.companyId;
    if (session.role === 'SUPER_ADMIN' && companyId !== undefined) {
      newCompanyId = companyId || null;
    }

    let newUsername = targetUser.username;
    if (username && username.trim().toLowerCase() !== targetUser.username) {
      const cleanUsername = username.trim().toLowerCase();
      const existing = await db.user.findFirst({
        where: {
          username: cleanUsername,
          id: { not: id },
        },
      });
      if (existing) {
        return NextResponse.json({ error: 'Este nome de usuário já está em uso.' }, { status: 400 });
      }
      newUsername = cleanUsername;
    }

    const updateData: any = {
      name: name ? name.trim() : targetUser.name,
      username: newUsername,
      role: newRole,
      companyId: newCompanyId,
    };

    if (password && password.trim()) {
      updateData.password = bcrypt.hashSync(password, 10);
    }

    const updated = await db.user.update({
      where: { id },
      data: updateData,
      include: {
        company: {
          select: { name: true },
        },
      },
    });

    return NextResponse.json({
      id: updated.id,
      username: updated.username,
      name: updated.name,
      role: updated.role,
      companyId: updated.companyId,
      createdAt: updated.createdAt,
      companyName: updated.company?.name || null,
    });
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

  if (session.role === 'USER') {
    return NextResponse.json({ error: 'Acesso negado.' }, { status: 403 });
  }

  const { id } = await params;

  if (session.id === id) {
    return NextResponse.json({ error: 'Você não pode excluir o seu próprio usuário logado.' }, { status: 400 });
  }

  const targetUser = await db.user.findUnique({ where: { id } });
  if (!targetUser) {
    return NextResponse.json({ error: 'Usuário não encontrado.' }, { status: 404 });
  }

  if (targetUser.username === 'admin') {
    return NextResponse.json({ error: 'O usuário administrador mestre não pode ser excluído.' }, { status: 400 });
  }

  if (session.role === 'COMPANY_ADMIN') {
    if (targetUser.companyId !== session.companyId) {
      return NextResponse.json({ error: 'Permissão negada para excluir usuário de outra empresa.' }, { status: 403 });
    }
    if (targetUser.role === 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Permissão negada.' }, { status: 403 });
    }
  }

  try {
    await db.user.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
