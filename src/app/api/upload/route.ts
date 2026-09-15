import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { getSession } from '@/lib/auth';
import { randomUUID } from 'crypto';
import { createClient } from '@supabase/supabase-js';

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

  try {
    const data = await request.formData();
    const file: File | null = data.get('file') as unknown as File;

    if (!file) {
      return NextResponse.json({ error: 'Nenhum arquivo enviado.' }, { status: 400 });
    }

    const originalName = file.name;
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const contentType = file.type || 'application/octet-stream';

    // 1. Tenta upload no Supabase Storage se configurado
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (supabaseUrl && supabaseKey && !supabaseUrl.includes('[PROJECT_REF]')) {
      try {
        const supabase = createClient(supabaseUrl, supabaseKey);
        const bucketName = 'certificates';
        const ext = originalName.includes('.') ? originalName.slice(originalName.lastIndexOf('.')) : '';
        const uniqueFileName = `${randomUUID()}${ext}`;

        const { data: buckets } = await supabase.storage.listBuckets();
        if (!buckets?.some((b) => b.name === bucketName)) {
          await supabase.storage.createBucket(bucketName, { public: true });
        }

        const { error: uploadError } = await supabase.storage
          .from(bucketName)
          .upload(uniqueFileName, buffer, {
            contentType,
            upsert: false,
          });

        if (!uploadError) {
          const { data: publicUrlData } = supabase.storage
            .from(bucketName)
            .getPublicUrl(uniqueFileName);

          return NextResponse.json({
            url: publicUrlData.publicUrl,
            originalName,
            size: file.size,
          });
        }
      } catch (storageErr) {
        console.warn('Tentativa no Supabase Storage falhou, salvando no banco de dados:', storageErr);
      }
    }

    // 2. Gravação 100% resiliente no PostgreSQL (funciona imediatamente na Vercel sem depender de disco)
    const attachment = await db.certificateAttachment.create({
      data: {
        name: originalName,
        contentType,
        data: buffer,
        size: file.size,
      },
    });

    return NextResponse.json({
      url: `/api/upload?id=${attachment.id}`,
      originalName,
      size: file.size,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json({ error: 'ID do anexo não informado' }, { status: 400 });
  }

  try {
    const attachment = await db.certificateAttachment.findUnique({
      where: { id },
    });

    if (!attachment) {
      return NextResponse.json({ error: 'Arquivo não encontrado' }, { status: 404 });
    }

    return new NextResponse(attachment.data, {
      status: 200,
      headers: {
        'Content-Type': attachment.contentType || 'application/octet-stream',
        'Content-Disposition': `attachment; filename="${encodeURIComponent(attachment.name)}"`,
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

