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

  try {
    const globalSettings = await db.setting.findMany();
    const settingsMap: Record<string, any> = {};
    for (const s of globalSettings) {
      settingsMap[s.key] = s.value;
    }

    const defaultWhatsappTemplate = settingsMap['whatsapp_template'] || '';
    let isCustom = false;
    let companyName: string | null = null;

    if (targetCompanyId) {
      const comp = await db.company.findUnique({
        where: { id: targetCompanyId },
        select: { name: true },
      });
      companyName = comp?.name || null;

      const companySettings = await db.companySetting.findMany({
        where: { companyId: targetCompanyId },
      });

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
        isGlobal: !targetCompanyId,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
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
      for (const [key, value] of Object.entries(settingsData)) {
        await db.companySetting.upsert({
          where: {
            companyId_key: {
              companyId: targetCompanyId,
              key,
            },
          },
          update: {
            value: String(value),
          },
          create: {
            companyId: targetCompanyId,
            key,
            value: String(value),
          },
        });
      }
    } else {
      for (const [key, value] of Object.entries(settingsData)) {
        await db.setting.upsert({
          where: { key },
          update: {
            value: String(value),
          },
          create: {
            key,
            value: String(value),
          },
        });
      }
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

  try {
    await db.companySetting.deleteMany({
      where: {
        companyId,
        key,
      },
    });

    const defaultSetting = await db.setting.findUnique({
      where: { key },
      select: { value: true },
    });

    return NextResponse.json({
      success: true,
      reset: true,
      defaultValue: defaultSetting?.value || '',
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
