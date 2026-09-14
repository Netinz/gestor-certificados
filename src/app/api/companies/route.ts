import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { getSession } from '@/lib/auth';
import { randomUUID } from 'crypto';

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

  // Somente super admin pode listar todas as empresas
  if (session.role !== 'SUPER_ADMIN') {
    // Se for administrador da própria empresa, retorna apenas os dados da sua empresa
    const myCompany = db.prepare(`
      SELECT c.*,
        (SELECT COUNT(*) FROM users WHERE companyId = c.id) as userCount,
        (SELECT COUNT(*) FROM clients WHERE companyId = c.id) as clientCount,
        (SELECT COUNT(*) FROM certificates WHERE companyId = c.id) as certificateCount
      FROM companies c
      WHERE c.id = ?
    `).get(session.companyId);
    return NextResponse.json(myCompany ? [myCompany] : []);
  }

  const companies = db.prepare(`
    SELECT c.*,
      (SELECT COUNT(*) FROM users WHERE companyId = c.id) as userCount,
      (SELECT COUNT(*) FROM clients WHERE companyId = c.id) as clientCount,
      (SELECT COUNT(*) FROM certificates WHERE companyId = c.id) as certificateCount
    FROM companies c
    ORDER BY c.name ASC
  `).all();

  return NextResponse.json(companies);
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

  if (session.role !== 'SUPER_ADMIN') {
    return NextResponse.json({ error: 'Apenas o Administrador do Sistema pode cadastrar novas empresas.' }, { status: 403 });
  }

  try {
    const data = await request.json();
    const { name, document, email, phone } = data;

    if (!name) {
      return NextResponse.json({ error: 'O nome da empresa é obrigatório.' }, { status: 400 });
    }

    const id = randomUUID();
    db.prepare(`
      INSERT INTO companies (id, name, document, email, phone, active)
      VALUES (?, ?, ?, ?, ?, 1)
    `).run(id, name.trim(), document || null, email || null, phone || null);

    const created = db.prepare('SELECT * FROM companies WHERE id = ?').get(id);
    return NextResponse.json(created, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}