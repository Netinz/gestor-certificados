'use client';

import { useState, useEffect } from 'react';
import { 
  Settings, 
  Save, 
  MessageSquare, 
  Smartphone, 
  CheckCircle2, 
  AlertCircle, 
  Loader2,
  Sparkles,
  Building2,
  RotateCcw,
  Globe,
  Info
} from 'lucide-react';

interface CompanyOption {
  id: string;
  name: string;
}

interface CurrentUser {
  id: string;
  username: string;
  name: string;
  role: 'SUPER_ADMIN' | 'COMPANY_ADMIN' | 'USER';
  companyId?: string | null;
  companyName?: string | null;
}

export default function ConfiguracoesPage() {
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [companies, setCompanies] = useState<CompanyOption[]>([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>('global');

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  const [whatsappTemplate, setWhatsappTemplate] = useState('');
  const [isCustomTemplate, setIsCustomTemplate] = useState(false);
  const [defaultTemplate, setDefaultTemplate] = useState('');
  const [targetCompanyName, setTargetCompanyName] = useState('');

  useEffect(() => {
    init();
  }, []);

  const init = async () => {
    try {
      setLoading(true);
      const sessionRes = await fetch('/api/auth/me');
      const sessionData = await sessionRes.json();
      const user: CurrentUser = sessionData?.user;
      setCurrentUser(user);

      let initialCompanyId = 'global';
      if (user?.role === 'SUPER_ADMIN') {
        const compRes = await fetch('/api/companies');
        const compData = await compRes.json();
        if (Array.isArray(compData)) {
          setCompanies(compData);
        }
        initialCompanyId = 'global';
      } else if (user?.companyId) {
        initialCompanyId = user.companyId;
      }

      setSelectedCompanyId(initialCompanyId);
      await loadSettingsForCompany(initialCompanyId);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadSettingsForCompany = async (companyId: string) => {
    setLoading(true);
    setError('');
    try {
      const url = companyId === 'global' ? '/api/settings' : `/api/settings?companyId=${encodeURIComponent(companyId)}`;
      const res = await fetch(url);
      const data = await res.json();

      if (data?.whatsapp_template) {
        setWhatsappTemplate(data.whatsapp_template);
      }
      setIsCustomTemplate(Boolean(data?._meta?.isCustom));
      setDefaultTemplate(data?._meta?.defaultTemplate || '');
      setTargetCompanyName(data?._meta?.companyName || '');
    } catch (err) {
      console.error(err);
      setError('Erro ao carregar configurações da empresa selecionada.');
    } finally {
      setLoading(false);
    }
  };

  const handleCompanyChange = (compId: string) => {
    setSelectedCompanyId(compId);
    loadSettingsForCompany(compId);
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSuccess('');
    setError('');

    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyId: selectedCompanyId,
          whatsapp_template: whatsappTemplate,
        }),
      });

      if (!res.ok) throw new Error('Erro ao salvar configurações.');
      setSuccess('Modelo de mensagem do WhatsApp salvo com sucesso!');
      if (selectedCompanyId !== 'global') {
        setIsCustomTemplate(true);
      }
      setTimeout(() => setSuccess(''), 4000);
    } catch (err: any) {
      setError(err.message || 'Erro ao salvar configurações.');
    } finally {
      setSaving(false);
    }
  };

  const handleResetToDefault = async () => {
    if (!confirm('Deseja restaurar a mensagem desta empresa para o modelo padrão global?')) {
      return;
    }

    setResetting(true);
    setError('');
    setSuccess('');

    try {
      const res = await fetch(`/api/settings?companyId=${encodeURIComponent(selectedCompanyId)}&key=whatsapp_template`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao restaurar modelo.');

      setWhatsappTemplate(data.defaultValue || defaultTemplate);
      setIsCustomTemplate(false);
      setSuccess('Modelo restaurado para o padrão global com sucesso!');
      setTimeout(() => setSuccess(''), 4000);
    } catch (err: any) {
      setError(err.message || 'Erro ao restaurar modelo.');
    } finally {
      setResetting(false);
    }
  };

  const insertVariable = (variable: string) => {
    setWhatsappTemplate((prev) => prev + ' ' + variable);
  };

  const previewCompanyName = 
    targetCompanyName || 
    currentUser?.companyName || 
    'Certificados Express Ltda';

  return (
    <div className="space-y-8 max-w-4xl">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight flex items-center gap-3">
          <Settings className="text-emerald-400" />
          Configurações do Sistema
        </h1>
        <p className="text-slate-400 text-sm mt-1">
          Personalize mensagens de WhatsApp por empresa parceira, conectividade e preferências.
        </p>
      </div>

      {success && (
        <div className="p-4 bg-emerald-950/60 border border-emerald-800 rounded-2xl text-emerald-200 text-sm flex items-center gap-2.5">
          <CheckCircle2 size={18} className="text-emerald-400 shrink-0" />
          <span>{success}</span>
        </div>
      )}

      {error && (
        <div className="p-4 bg-red-950/60 border border-red-800 rounded-2xl text-red-200 text-sm flex items-center gap-2.5">
          <AlertCircle size={18} className="text-red-400 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Seção Template WhatsApp */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-xl space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-500/10 text-emerald-400 rounded-xl border border-emerald-500/20 shrink-0">
              <MessageSquare size={22} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Modelo de Mensagem do WhatsApp</h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Defina o texto que será enviado aos clientes quando o certificado estiver próximo de expirar.
              </p>
            </div>
          </div>

          {/* Seletor de Empresa para Super Admin */}
          {currentUser?.role === 'SUPER_ADMIN' ? (
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400 font-medium whitespace-nowrap">Configurar para:</span>
              <select
                value={selectedCompanyId}
                onChange={(e) => handleCompanyChange(e.target.value)}
                className="px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white font-medium focus:outline-none focus:border-emerald-500"
              >
                <option value="global">🌍 Modelo Padrão Global</option>
                {companies.map((c) => (
                  <option key={c.id} value={c.id}>
                    🏢 {c.name}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div className="flex items-center gap-2 bg-slate-800/80 px-3 py-1.5 rounded-xl border border-slate-700">
              <Building2 size={16} className="text-emerald-400" />
              <span className="text-xs font-semibold text-slate-200">
                {currentUser?.companyName || 'Sua Empresa'}
              </span>
            </div>
          )}
        </div>

        {/* Indicador de Status do Modelo (Personalizado vs Padrão) */}
        {selectedCompanyId !== 'global' && (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 bg-slate-950/70 border border-slate-800 rounded-xl text-xs">
            <div className="flex items-center gap-2">
              {isCustomTemplate ? (
                <>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-semibold border border-emerald-500/30">
                    Personalizado
                  </span>
                  <span className="text-slate-300">
                    Esta empresa possui uma mensagem exclusiva personalizada.
                  </span>
                </>
              ) : (
                <>
                  <span className="px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400 font-semibold border border-blue-500/30">
                    Padrão Global
                  </span>
                  <span className="text-slate-400 flex items-center gap-1">
                    <Info size={13} className="text-blue-400" />
                    Utilizando modelo padrão. Salve para criar uma versão exclusiva para esta empresa.
                  </span>
                </>
              )}
            </div>

            {isCustomTemplate && (
              <button
                type="button"
                onClick={handleResetToDefault}
                disabled={resetting}
                className="inline-flex items-center gap-1.5 text-xs text-rose-400 hover:text-rose-300 hover:underline transition self-start sm:self-auto"
              >
                <RotateCcw size={13} />
                Restaurar Modelo Padrão
              </button>
            )}
          </div>
        )}

        {selectedCompanyId === 'global' && (
          <div className="p-3 bg-blue-950/30 border border-blue-900/50 rounded-xl text-xs text-blue-300 flex items-center gap-2">
            <Globe size={15} className="shrink-0 text-blue-400" />
            <span>
              Você está editando o <strong>Modelo Padrão Global</strong>. Todas as empresas parceiras que não configurarem uma mensagem própria utilizarão este texto.
            </span>
          </div>
        )}

        {loading ? (
          <div className="py-12 flex flex-col items-center justify-center gap-2 text-slate-400">
            <Loader2 size={24} className="animate-spin text-emerald-500" />
            <span className="text-xs">Carregando configurações...</span>
          </div>
        ) : (
          <div>
            <label className="block text-xs font-semibold uppercase text-slate-400 mb-2">
              Variáveis Dinâmicas Disponíveis (Clique para inserir)
            </label>
            <div className="flex flex-wrap gap-2 mb-3">
              {[
                { tag: '$NomeCliente', desc: 'Nome ou Razão Social' },
                { tag: '$TipoCertificado', desc: 'Ex: e-CNPJ A1' },
                { tag: '$DataVencimento', desc: 'Data no formato DD/MM/AAAA' },
                { tag: '$DiasRestantes', desc: 'Quantidade de dias restantes' },
                { tag: '$NomeEmpresa', desc: 'Nome da Empresa Emissora' },
              ].map((v) => (
                <button
                  key={v.tag}
                  type="button"
                  onClick={() => insertVariable(v.tag)}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-emerald-400 hover:text-emerald-300 rounded-xl text-xs font-mono font-medium border border-slate-700 transition flex items-center gap-1.5"
                >
                  <Sparkles size={12} />
                  {v.tag}
                  <span className="text-[10px] text-slate-400 font-sans">({v.desc})</span>
                </button>
              ))}
            </div>

            <textarea
              rows={7}
              value={whatsappTemplate}
              onChange={(e) => setWhatsappTemplate(e.target.value)}
              placeholder="Digite aqui o modelo da mensagem..."
              className="w-full p-4 bg-slate-800/80 border border-slate-700 rounded-xl text-white text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none font-sans leading-relaxed"
            />
          </div>
        )}

        {/* Pré-visualização da mensagem */}
        <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800/80">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <span>Pré-visualização do Envio:</span>
            {targetCompanyName && (
              <span className="text-emerald-400 normal-case font-medium">({targetCompanyName})</span>
            )}
          </p>
          <div className="p-3 bg-emerald-950/20 border border-emerald-800/40 rounded-xl text-xs text-slate-200 whitespace-pre-wrap font-sans leading-relaxed">
            {whatsappTemplate
              .replace(/\$NomeCliente/gi, 'Alfa Transportes Ltda')
              .replace(/\$TipoCertificado/gi, 'e-CNPJ A1 (Arquivo)')
              .replace(/\$DataVencimento/gi, '15/10/2026')
              .replace(/\$DiasRestantes/gi, '12')
              .replace(/\$NomeEmpresa/gi, previewCompanyName)}
          </div>
        </div>

        <div className="flex justify-end">
          <button
            onClick={handleSaveSettings}
            disabled={saving || loading}
            className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold rounded-xl text-sm transition shadow-lg shadow-emerald-500/20 flex items-center gap-2 disabled:opacity-50"
          >
            {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            Salvar Mensagem {selectedCompanyId !== 'global' ? 'da Empresa' : 'Padrão'}
          </button>
        </div>
      </div>

      {/* Conexão WhatsApp */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-xl space-y-6">
        <div className="flex items-center gap-3 pb-4 border-b border-slate-800">
          <div className="p-2.5 bg-blue-500/10 text-blue-400 rounded-xl border border-blue-500/20">
            <Smartphone size={22} />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">Conexão WhatsApp (Modo de Envio)</h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Forma como o sistema realiza os avisos aos clientes.
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="p-4 bg-emerald-950/20 border border-emerald-800/40 rounded-xl flex items-start gap-3">
            <CheckCircle2 size={20} className="text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <h3 className="text-sm font-semibold text-white">Link Direto WhatsApp Ativo (Recomendado)</h3>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                Ao clicar em &quot;WhatsApp&quot; na tela de certificados ou vencimentos, o sistema abre diretamente a conversa oficial no WhatsApp com o texto exclusivo da empresa correspondente e o número do cliente pré-carregados. É seguro, instantâneo e não expõe seu número a bloqueios de disparos automatizados.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
