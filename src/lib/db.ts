import Database from 'better-sqlite3';
import path from 'path';
import bcrypt from 'bcryptjs';

const dbPath = path.resolve(process.cwd(), 'database.sqlite');
const db = new Database(dbPath);

// Ativar foreign keys
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// Criação das tabelas
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    name TEXT NOT NULL,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS clients (
    id TEXT PRIMARY KEY,
    type TEXT DEFAULT 'PJ',
    document TEXT UNIQUE NOT NULL,
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
    updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS certificates (
    id TEXT PRIMARY KEY,
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
    FOREIGN KEY(clientId) REFERENCES clients(id) ON DELETE CASCADE
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
`);

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

// Criar usuário inicial administrador se não houver
const adminId = 'admin-default';
const hashedPassword = bcrypt.hashSync('admin123', 10);
db.prepare(`
  INSERT OR IGNORE INTO users (id, username, password, name)
  VALUES (?, ?, ?, ?)
`).run(adminId, 'admin', hashedPassword, 'Administrador');

export default db;
