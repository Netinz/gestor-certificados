import { NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
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

    const ext = path.extname(file.name);
    const uniqueFileName = `${randomUUID()}${ext}`;
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Se as credenciais do Supabase estiverem configuradas, faz upload no Supabase Storage!
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (supabaseUrl && supabaseKey && !supabaseUrl.includes('[PROJECT_REF]')) {
      const supabase = createClient(supabaseUrl, supabaseKey);
      const bucketName = 'certificates';

      // Garantir bucket
      const { data: buckets } = await supabase.storage.listBuckets();
      if (!buckets?.some((b) => b.name === bucketName)) {
        await supabase.storage.createBucket(bucketName, { public: true });
      }

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from(bucketName)
        .upload(uniqueFileName, buffer, {
          contentType: file.type || 'application/octet-stream',
          upsert: false,
        });

      if (uploadError) {
        throw new Error(`Falha no upload para o Supabase Storage: ${uploadError.message}`);
      }

      const { data: publicUrlData } = supabase.storage
        .from(bucketName)
        .getPublicUrl(uniqueFileName);

      return NextResponse.json({
        url: publicUrlData.publicUrl,
        originalName: file.name,
        size: file.size,
      });
    }

    // Fallback para desenvolvimento local caso o Supabase Storage não esteja configurado ainda
    const uploadDir = path.join(process.cwd(), 'public', 'uploads');
    await mkdir(uploadDir, { recursive: true });
    const filePath = path.join(uploadDir, uniqueFileName);
    await writeFile(filePath, buffer);

    return NextResponse.json({
      url: `/uploads/${uniqueFileName}`,
      originalName: file.name,
      size: file.size,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
