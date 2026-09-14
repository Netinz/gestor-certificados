import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { getSession } from '@/lib/auth';
import bcrypt from 'bcryptjs';
import { randomUUID } from 'crypto';

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

  // Apenas Super Admin e Company Admin podem listar usuários
  if (session.role === 'USER') {
    return NextResponse.json({ error: 'Acesso restrito a administradores.' }, { status: 403 });
  }

  let users;
  if (session.role === 'SUPER_ADMIN') {
    users = db.prepare(`
      SELECT u.id, u.username, u.name, u.role, u.companyId, u.createdAt,
             c.name as companyName
      FROM users u
      LEFT JOIN companies c ON u.companyId = c.id
      ORDER BY u.createdAt DESC
    `).all();
  } else {
    // Admin da empresa: apenas usuários da sua própria empresa
    users = db.prepare(`
      SELECT u.id, u.username, u.name, u.role, u.companyId, u.createdAt,
             c.name as companyName
      FROM users u
      LEFT JOIN companies c ON u.companyId = c.id
      WHERE u.companyId = ?
      ORDER BY u.createdAt DESC
    `).all(session.companyId);
  }

  return NextResponse.json(users);
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

    // Definir a empresa do novo usuário
    let targetCompanyId = session.companyId;
    let targetRole = role || 'USER';

    if (session.role === 'SUPER_ADMIN') {
      targetCompanyId = companyId || session.companyId;
    } else {
      // Company Admin não pode criar SUPER_ADMIN
      if (targetRole === 'SUPER_ADMIN') {
        targetRole = 'COMPANY_ADMIN';
      }
    }

    // Verificar duplicidade de username
    const existing = db.prepare('SELECT id FROM users WHERE username = ?').get(username.trim().toLowerCase());
    if (existing) {
      return NextResponse.json({ error: 'Este nome de usuário já está em uso.' }, { status: 400 });
    }

    const id = randomUUID();
    const hashedPassword = bcrypt.hashSync(password, 10);

    db.prepare(`
      INSERT INTO users (id, username, password, name, role, companyId)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(
      id,
      username.trim().toLowerCase(),
      hashedPassword,
      name.trim(),
      targetRole,
      targetCompanyId || null
    );

    const created = db.prepare(`
      SELECT u.id, u.username, u.name, u.role, u.companyId, u.createdAt,
             c.name as companyName
      FROM users u
      LEFT JOIN companies c ON u.companyId = c.id
      WHERE u.id = ?
    `).get(id);

    return NextResponse.json(created, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}