import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { getSession } from '@/lib/auth';

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

  const settings = db.prepare('SELECT * FROM settings').all();
  const settingsMap: Record<string, string> = {};
  for (const s of settings as any[]) {
    settingsMap[s.key] = s.value;
  }

  return NextResponse.json(settingsMap);
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

  try {
    const body = await request.json();
    const updateStmt = db.prepare(`
      INSERT INTO settings (key, value, updatedAt)
      VALUES (?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(key) DO UPDATE SET
        value = excluded.value,
        updatedAt = CURRENT_TIMESTAMP
    `);

    const updateMany = db.transaction((entries: [string, string][]) => {
      for (const [key, value] of entries) {
        updateStmt.run(key, String(value));
      }
    });

    updateMany(Object.entries(body));

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}