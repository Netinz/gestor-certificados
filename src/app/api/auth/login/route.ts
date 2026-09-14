import { NextResponse } from 'next/server';
import db from '@/lib/db';
import bcrypt from 'bcryptjs';
import { signSession } from '@/lib/auth';

export async function POST(request: Request) {
  try {
    const { username, password } = await request.json();

    if (!username || !password) {
      return NextResponse.json({ error: 'Informe usuário e senha.' }, { status: 400 });
    }

    const user = db.prepare(`
      SELECT u.*, c.name as companyName, c.active as companyActive
      FROM users u
      LEFT JOIN companies c ON u.companyId = c.id
      WHERE u.username = ?
    `).get(username) as any;

    if (!user || !bcrypt.compareSync(password, user.password)) {
      return NextResponse.json({ error: 'Usuário ou senha inválidos.' }, { status: 401 });
    }

    if (user.companyActive === 0) {
      return NextResponse.json({ error: 'A empresa deste usuário encontra-se desativada.' }, { status: 403 });
    }

    const token = signSession({
      id: user.id,
      username: user.username,
      name: user.name,
      role: user.role || 'COMPANY_ADMIN',
      companyId: user.companyId || null,
      companyName: user.companyName || null,
    });

    const response = NextResponse.json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        name: user.name,
        role: user.role,
        companyId: user.companyId,
        companyName: user.companyName
      }
    });

    response.cookies.set('auth_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7 // 7 dias
    });

    return response;
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
