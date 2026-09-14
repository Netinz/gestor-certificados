import Database from 'better-sqlite3';
import path from 'path';
import bcrypt from 'bcryptjs';

const dbPath = path.resolve(process.cwd(), 'database.sqlite');
const db = new Database(dbPath);

// Ativar foreign keys
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// Criação das tabelas base
db.exec(`
  CREATE TABLE IF NOT EXISTS companies (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    document TEXT,
    email TEXT,
    phone TEXT,
    active INTEGER DEFAULT 1,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    name TEXT NOT NULL,
    role TEXT DEFAULT 'COMPANY_ADMIN', -- 'SUPER_ADMIN', 'COMPANY_ADMIN', 'USER'
    companyId TEXT,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(companyId) REFERENCES companies(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS clients (
    id TEXT PRIMARY KEY,
    companyId TEXT,
    type TEXT DEFAULT 'PJ',
    document TEXT NOT NULL,
    name TEXT NOT NULL,
    tradeName TEXT,
    email TEXT,
    phone TEXT NOT NULL,
    zipCode TEXT,
    address TEXT,
    number TEXT,
    neighborhood TEXT,
    city TEXT,
    state TEXT,
    notes TEXT,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(companyId) REFERENCES companies(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS certificates (
    id TEXT PRIMARY KEY,
    companyId TEXT,
    clientId TEXT NOT NULL,
    type TEXT NOT NULL,
    issuer TEXT,
    status TEXT DEFAULT 'ACTIVE',
    issueDate TEXT,
    expirationDate TEXT NOT NULL,
    attachmentUrl TEXT,
    attachmentName TEXT,
    passwordHint TEXT,
    notes TEXT,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(clientId) REFERENCES clients(id) ON DELETE CASCADE,
    FOREIGN KEY(companyId) REFERENCES companies(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS certificate_history (
    id TEXT PRIMARY KEY,
    certificateId TEXT NOT NULL,
    action TEXT NOT NULL,
    previousDate TEXT,
    newDate TEXT NOT NULL,
    notes TEXT,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(certificateId) REFERENCES certificates(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    description TEXT,
    updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS company_settings (
    companyId TEXT NOT NULL,
    key TEXT NOT NULL,
    value TEXT NOT NULL,
    updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (companyId, key),
    FOREIGN KEY(companyId) REFERENCES companies(id) ON DELETE CASCADE
  );
`);

// Migração segura para bancos existentes (adiciona companyId e role se ainda não existirem)
try {
  db.exec(`
    ALTER TABLE users ADD COLUMN role TEXT DEFAULT 'COMPANY_ADMIN';
  `);
} catch {}

try {
  db.exec(`
    ALTER TABLE users ADD COLUMN companyId TEXT REFERENCES companies(id);
  `);
} catch {}

try {
  db.exec(`
    ALTER TABLE clients ADD COLUMN companyId TEXT REFERENCES companies(id);
  `);
} catch {}

try {
  db.exec(`
    ALTER TABLE certificates ADD COLUMN companyId TEXT REFERENCES companies(id);
  `);
} catch {}

// Empresa Padrão Matriz para dados legados
const defaultCompanyId = 'company-default';
db.prepare(`
  INSERT OR IGNORE INTO companies (id, name, document, phone, active)
  VALUES (?, ?, ?, ?, 1)
`).run(defaultCompanyId, 'Minha Empresa Matriz', '00.000.000/0001-00', '(00) 0000-0000');

// Vincular dados órfãos à empresa padrão
db.prepare(`UPDATE clients SET companyId = ? WHERE companyId IS NULL`).run(defaultCompanyId);
db.prepare(`UPDATE certificates SET companyId = ? WHERE companyId IS NULL`).run(defaultCompanyId);

// Inicializar configurações padrão caso não existam
const defaultMsg = 'Olá, *$NomeCliente*! 👋\\n\\nInformamos que o seu certificado digital (*$TipoCertificado*) vencerá em breve, no dia *$DataVencimento* (faltam *$DiasRestantes* dias).\\n\\nPara evitar interrupções no faturamento e emissão de notas fiscais, entre em contato conosco para agendarmos a renovação.\\n\\nAtenciosamente,\\nGestão de Certificados';

const insertSetting = db.prepare(`
  INSERT OR IGNORE INTO settings (key, value, description)
  VALUES (?, ?, ?)
`);

insertSetting.run(
  'whatsapp_template',
  defaultMsg,
  'Modelo padrão de mensagem enviada via WhatsApp para certificados a vencer'
);

// Criar / Garantir super administrador
const adminId = 'admin-default';
const hashedPassword = bcrypt.hashSync('admin123', 10);
db.prepare(`
  INSERT INTO users (id, username, password, name, role, companyId)
  VALUES (?, ?, ?, ?, 'SUPER_ADMIN', ?)
  ON CONFLICT(username) DO UPDATE SET
    role = 'SUPER_ADMIN'
`).run(adminId, 'admin', hashedPassword, 'Administrador do Sistema', defaultCompanyId);

export default db;
