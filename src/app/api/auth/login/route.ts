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

    const user = await db.user.findUnique({
      where: { username },
      include: { company: true },
    });

    if (!user || !bcrypt.compareSync(password, user.password)) {
      return NextResponse.json({ error: 'Usuário ou senha inválidos.' }, { status: 401 });
    }

    if (user.company && user.company.active === false) {
      return NextResponse.json({ error: 'A empresa deste usuário encontra-se desativada.' }, { status: 403 });
    }

    const token = signSession({
      id: user.id,
      username: user.username,
      name: user.name,
      role: (user.role as any) || 'COMPANY_ADMIN',
      companyId: user.companyId || null,
      companyName: user.company?.name || null,
    });

    const response = NextResponse.json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        name: user.name,
        role: user.role,
        companyId: user.companyId,
        companyName: user.company?.name || null,
      },
    });

    response.cookies.set('auth_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7, // 7 dias
    });

    return response;
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
