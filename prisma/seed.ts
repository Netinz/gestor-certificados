import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Iniciando seed do banco de dados...');

  // 1. Empresa Matriz Padrão
  const defaultCompany = await prisma.company.upsert({
    where: { id: 'company-default' },
    update: {},
    create: {
      id: 'company-default',
      name: 'Minha Empresa Matriz',
      document: '00.000.000/0001-00',
      phone: '(00) 0000-0000',
      active: true,
    },
  });
  console.log('Empresa padrão:', defaultCompany.name);

  // 2. Super Administrador
  const hashedPassword = bcrypt.hashSync('admin123', 10);
  const adminUser = await prisma.user.upsert({
    where: { username: 'admin' },
    update: {
      role: 'SUPER_ADMIN',
    },
    create: {
      id: 'admin-default',
      username: 'admin',
      password: hashedPassword,
      name: 'Administrador do Sistema',
      role: 'SUPER_ADMIN',
      companyId: defaultCompany.id,
    },
  });
  console.log('Usuário admin:', adminUser.username);

  // 3. Configuração padrão de WhatsApp
  const defaultMsg =
    'Olá, *$NomeCliente*! 👋\n\nInformamos que o seu certificado digital (*$TipoCertificado*) vencerá em breve, no dia *$DataVencimento* (faltam *$DiasRestantes* dias).\n\nPara evitar interrupções no faturamento e emissão de notas fiscais, entre em contato conosco para agendarmos a renovação.\n\nAtenciosamente,\nGestão de Certificados';

  await prisma.setting.upsert({
    where: { key: 'whatsapp_template' },
    update: {},
    create: {
      key: 'whatsapp_template',
      value: defaultMsg,
      description: 'Modelo padrão de mensagem enviada via WhatsApp para certificados a vencer',
    },
  });
  console.log('Configurações padrão salvas com sucesso!');
}

main()
  .catch((e) => {
    console.error('Erro durante o seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
