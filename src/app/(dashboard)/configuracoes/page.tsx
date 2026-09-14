'use client';

import { useState, useEffect } from 'react';
import { 
  Settings, 
  Save, 
  MessageSquare, 
  Smartphone, 
  Key, 
  CheckCircle2, 
  AlertCircle, 
  Loader2,
  Sparkles,
  QrCode,
  Lock
} from 'lucide-react';

export default function ConfiguracoesPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  const [whatsappTemplate, setWhatsappTemplate] = useState('');
  const [whatsappConnected, setWhatsappConnected] = useState(false);

  // Alteração de senha
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passMessage, setPassMessage] = useState('');

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/settings');
      const data = await res.json();
      if (data?.whatsapp_template) {
        setWhatsappTemplate(data.whatsapp_template);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
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
          whatsapp_template: whatsappTemplate,
        }),
      });

      if (!res.ok) throw new Error('Erro ao salvar configurações.');
      setSuccess('Configurações salvas com sucesso!');
      setTimeout(() => setSuccess(''), 4000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const insertVariable = (variable: string) => {
    setWhatsappTemplate(prev => prev + ' ' + variable);
  };

  return (
    <div className="space-y-8 max-w-4xl">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight flex items-center gap-3">
          <Settings className="text-emerald-400" />
          Configurações do Sistema
        </h1>
        <p className="text-slate-400 text-sm mt-1">
          Personalize as mensagens do WhatsApp, conectividade e preferências de acesso.
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
        <div className="flex items-center gap-3 pb-4 border-b border-slate-800">
          <div className="p-2.5 bg-emerald-500/10 text-emerald-400 rounded-xl border border-emerald-500/20">
            <MessageSquare size={22} />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">Modelo da Mensagem de WhatsApp</h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Defina o texto que será enviado aos clientes quando o certificado estiver próximo de expirar.
            </p>
          </div>
        </div>

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

        {/* Pré-visualização da mensagem */}
        <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800/80">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
            Exemplo de Pré-visualização no WhatsApp:
          </p>
          <div className="p-3 bg-emerald-950/20 border border-emerald-800/40 rounded-xl text-xs text-slate-200 whitespace-pre-wrap font-sans">
            {whatsappTemplate
              .replace(/\$NomeCliente/g, 'Empresa Exemplo Ltda')
              .replace(/\$TipoCertificado/g, 'e-CNPJ A1 (Arquivo)')
              .replace(/\$DataVencimento/g, '15/10/2026')
              .replace(/\$DiasRestantes/g, '12')}
          </div>
        </div>

        <div className="flex justify-end">
          <button
            onClick={handleSaveSettings}
            disabled={saving}
            className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold rounded-xl text-sm transition shadow-lg shadow-emerald-500/20 flex items-center gap-2"
          >
            {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            Salvar Mensagem
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
              Escolha a forma como o sistema interage com o WhatsApp.
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="p-4 bg-emerald-950/20 border border-emerald-800/40 rounded-xl flex items-start gap-3">
            <CheckCircle2 size={20} className="text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <h3 className="text-sm font-semibold text-white">Link Direto WhatsApp Ativo (Recomendado)</h3>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                Ao clicar em &quot;Enviar WhatsApp&quot; na tela de certificados ou vencimentos, o sistema abre diretamente a conversa oficial no WhatsApp Web / Desktop com o texto e o número do cliente pré-carregados. É seguro, instantâneo e não expõe seu número a bloqueios de disparos automatizados.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
