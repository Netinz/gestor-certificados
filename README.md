# Sistema de Gestão de Certificados Digitais 🔐

Sistema web completo e moderno para controle e emissão de alertas de certificados digitais, gestão de clientes com consulta automática de CNPJ na Receita Federal e disparo de avisos via WhatsApp.

---

## 🚀 Funcionalidades Principais

### 1. 👥 Cadastro de Clientes
- Cadastro completo de Pessoa Física (CPF) e Pessoa Jurídica (CNPJ).
- **Busca Automática na Receita Federal**: ao digitar o CNPJ, os dados cadastrais (Razão Social, Nome Fantasia, Telefone, E-mail e Endereço) são preenchidos instantaneamente via BrasilAPI.
- Busca e filtragem rápida por nome, documento e telefone.

### 2. 📜 Gestão de Certificados Digitais
- Vínculo direto ao cliente cadastrado.
- Suporte a múltiplos tipos (e-CNPJ A1, e-CPF A1, e-CNPJ A3, BirdID/SafeID em Nuvem, SSL/TLS, etc.).
- **Upload de anexo / backup**: envie e faça download do arquivo de certificado (.pfx, .cer, .pdf, .zip).
- Armazenamento de observações e dica de senha de instalação.
- **Fluxo de Renovação com Histórico**: mantenha o histórico de todas as validades anteriores ao renovar o certificado para novos ciclos.
- **Disparo via WhatsApp**: ação rápida para notificar o cliente sobre a necessidade de renovação.

### 3. 📊 Dashboard de Vencimentos
- Indicadores visuais em tempo real:
  - 🚨 **Vencidos**: alertas críticos que exigem renovação imediata.
  - ⚠️ **Vencendo em até 15 dias**: avisos de urgência com destaque animado.
  - 📅 **Vencendo em até 30 dias**: janela de contato antecipada recomendada.
  - ✅ **Ativos / Em dia**: controle total dos prazos.

### 4. ⚙️ Configurações & WhatsApp
- Editor de modelo de mensagem de WhatsApp totalmente customizável.
- Variáveis dinâmicas:
  - `$NomeCliente` (Nome ou Razão Social)
  - `$TipoCertificado` (Tipo do certificado)
  - `$DataVencimento` (Data formatada em DD/MM/AAAA)
  - `$DiasRestantes` (Contagem regressiva de dias)
- Pré-visualização instantânea da mensagem formatada.
- Envio direto via link oficial do WhatsApp (`wa.me`) com texto e número prontos.

### 5. 🔒 Segurança & Controle de Acesso
- Acesso protegido por login e senha com hash seguro (`bcrypt`).
- Sessões autenticadas via cookies HTTP-only (`JWT`).
- Credenciais de acesso padrão inicial:
  - **Usuário:** `admin`
  - **Senha:** `admin123`

---

## 🛠️ Como Executar o Projeto Localmente

1. **Iniciar o servidor de desenvolvimento:**
```bash
npm run dev
```

2. **Acessar o sistema no navegador:**
Abra [http://localhost:3000](http://localhost:3000) e faça login.

3. **Gerar build otimizado de produção:**
```bash
npm run build
npm start
```

---

## 🐙 Comandos para Subir ao seu Repositório do GitHub

Se você já criou um repositório vazio no GitHub (ex: `https://github.com/seu-usuario/gestao-certificados.git`), execute os seguintes comandos no terminal desta pasta:

```bash
# 1. Vincular o seu repositório remoto do GitHub
git remote add origin https://github.com/SEU_USUARIO/NOME_DO_REPOSITORIO.git

# 2. Enviar os arquivos para a branch principal (main)
git push -u origin main
```

Para futuras alterações e atualizações:
```bash
git add .
git commit -m "feat: descrição da alteração realizada"
git push
```

