import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { getSession } from '@/lib/auth';

export async function GET(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const requestedCompanyId = searchParams.get('companyId');

  let targetCompanyId: string | null = null;
  if (session.role === 'SUPER_ADMIN') {
    if (requestedCompanyId && requestedCompanyId !== 'global') {
      targetCompanyId = requestedCompanyId;
    }
  } else {
    targetCompanyId = session.companyId || null;
  }

  // Configurações globais padrão
  const globalSettings = db.prepare('SELECT * FROM settings').all() as any[];
  const settingsMap: Record<string, any> = {};
  for (const s of globalSettings) {
    settingsMap[s.key] = s.value;
  }

  const defaultWhatsappTemplate = settingsMap['whatsapp_template'] || '';
  let isCustom = false;
  let companyName: string | null = null;

  if (targetCompanyId) {
    const comp: any = db.prepare('SELECT name FROM companies WHERE id = ?').get(targetCompanyId);
    companyName = comp?.name || null;

    // Buscar configurações específicas da empresa
    const companySettings = db.prepare('SELECT * FROM company_settings WHERE companyId = ?').all(targetCompanyId) as any[];
    for (const cs of companySettings) {
      settingsMap[cs.key] = cs.value;
      if (cs.key === 'whatsapp_template') {
        isCustom = true;
      }
    }
  }

  return NextResponse.json({
    ...settingsMap,
    _meta: {
      targetCompanyId,
      companyName,
      isCustom,
      defaultTemplate: defaultWhatsappTemplate,
      isGlobal: !targetCompanyId
    }
  });
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

  try {
    const body = await request.json();
    const { companyId: bodyCompanyId, ...settingsData } = body;

    let targetCompanyId: string | null = null;
    if (session.role === 'SUPER_ADMIN') {
      if (bodyCompanyId && bodyCompanyId !== 'global') {
        targetCompanyId = bodyCompanyId;
      }
    } else {
      targetCompanyId = session.companyId || null;
    }

    if (targetCompanyId) {
      // Salvar especificamente para a empresa na tabela company_settings
      const updateStmt = db.prepare(`
        INSERT INTO company_settings (companyId, key, value, updatedAt)
        VALUES (?, ?, ?, CURRENT_TIMESTAMP)
        ON CONFLICT(companyId, key) DO UPDATE SET
          value = excluded.value,
          updatedAt = CURRENT_TIMESTAMP
      `);

      const updateMany = db.transaction((entries: [string, any][]) => {
        for (const [key, value] of entries) {
          updateStmt.run(targetCompanyId, key, String(value));
        }
      });

      updateMany(Object.entries(settingsData));
    } else {
      // Super admin salvando modelo padrão global
      const updateStmt = db.prepare(`
        INSERT INTO settings (key, value, updatedAt)
        VALUES (?, ?, CURRENT_TIMESTAMP)
        ON CONFLICT(key) DO UPDATE SET
          value = excluded.value,
          updatedAt = CURRENT_TIMESTAMP
      `);

      const updateMany = db.transaction((entries: [string, any][]) => {
        for (const [key, value] of entries) {
          updateStmt.run(key, String(value));
        }
      });

      updateMany(Object.entries(settingsData));
    }

    return NextResponse.json({ success: true, targetCompanyId });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const companyId = searchParams.get('companyId') || session.companyId;
  const key = searchParams.get('key') || 'whatsapp_template';

  if (!companyId) {
    return NextResponse.json({ error: 'Empresa não informada' }, { status: 400 });
  }

  if (session.role !== 'SUPER_ADMIN' && session.companyId !== companyId) {
    return NextResponse.json({ error: 'Permissão negada' }, { status: 403 });
  }

  db.prepare('DELETE FROM company_settings WHERE companyId = ? AND key = ?').run(companyId, key);

  // Retorna o valor padrão para atualizar a tela
  const defaultSetting: any = db.prepare('SELECT value FROM settings WHERE key = ?').get(key);

  return NextResponse.json({
    success: true,
    reset: true,
    defaultValue: defaultSetting?.value || ''
  });
}