'use client';

import { useState, useEffect } from 'react';
import { 
  Award, 
  Plus, 
  Search, 
  Upload, 
  FileText, 
  RefreshCw, 
  MessageSquare, 
  Trash2, 
  History, 
  AlertTriangle, 
  X, 
  Loader2,
  Calendar,
  Phone,
  ShieldCheck,
  Building2
} from 'lucide-react';
import { formatDocument, formatPhone, formatDateBR, getDaysRemaining, generateWhatsAppLink } from '@/lib/utils';

interface Certificate {
  id: string;
  clientId: string;
  clientName: string;
  clientTradeName?: string;
  clientDocument: string;
  clientPhone: string;
  type: string;
  issuer?: string;
  status: string;
  issueDate?: string;
  expirationDate: string;
  attachmentUrl?: string;
  attachmentName?: string;
  passwordHint?: string;
  notes?: string;
  companyId?: string;
  companyName?: string;
}

interface ClientOption {
  id: string;
  name: string;
  document: string;
  phone: string;
}

export default function CertificadosPage() {
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [clients, setClients] = useState<ClientOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [whatsappTemplate, setWhatsappTemplate] = useState('');
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [companies, setCompanies] = useState<any[]>([]);
  const [companyFilter, setCompanyFilter] = useState('ALL');

  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [isRenewModalOpen, setIsRenewModalOpen] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [selectedCert, setSelectedCert] = useState<Certificate | null>(null);
  const [certHistories, setCertHistories] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  const [formData, setFormData] = useState({
    clientId: '',
    type: 'e-CNPJ A1 (Arquivo)',
    issuer: 'Certisign',
    issueDate: '',
    expirationDate: '',
    attachmentUrl: '',
    attachmentName: '',
    passwordHint: '',
    notes: '',
  });

  const [renewData, setRenewData] = useState({
    newExpirationDate: '',
    newIssueDate: new Date().toISOString().split('T')[0],
    notes: '',
    attachmentUrl: '',
    attachmentName: '',
  });

  useEffect(() => {
    fetch('/api/auth/me')
      .then(r => r.json())
      .then(d => {
        if (d?.user) {
          setCurrentUser(d.user);
          if (d.user.role === 'SUPER_ADMIN') {
            fetch('/api/companies')
              .then(cr => cr.json())
              .then(cd => {
                if (Array.isArray(cd)) setCompanies(cd);
              })
              .catch(() => {});
          }
        }
      })
      .catch(() => {});

    loadData();
  }, []);

  const loadData = async (search = searchTerm, compFilter = companyFilter) => {
    setLoading(true);
    try {
      const certParams = new URLSearchParams();
      if (search) certParams.append('q', search);
      if (compFilter && compFilter !== 'ALL') certParams.append('companyId', compFilter);

      const clientParams = new URLSearchParams();
      if (compFilter && compFilter !== 'ALL') clientParams.append('companyId', compFilter);

      const certUrl = `/api/certificates${certParams.toString() ? `?${certParams.toString()}` : ''}`;
      const clientUrl = `/api/clients${clientParams.toString() ? `?${clientParams.toString()}` : ''}`;

      const [certRes, clientRes, settingsRes] = await Promise.all([
        fetch(certUrl),
        fetch(clientUrl),
        fetch('/api/settings')
      ]);

      const [certData, clientData, settingsData] = await Promise.all([
        certRes.json(),
        clientRes.json(),
        settingsRes.json()
      ]);

      if (Array.isArray(certData)) setCertificates(certData);
      if (Array.isArray(clientData)) setClients(clientData);
      if (settingsData?.whatsapp_template) {
        setWhatsappTemplate(settingsData.whatsapp_template);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, isRenewal = false) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const body = new FormData();
      body.append('file', file);

      const res = await fetch('/api/upload', {
        method: 'POST',
        body,
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro no upload');

      if (isRenewal) {
        setRenewData(prev => ({
          ...prev,
          attachmentUrl: data.url,
          attachmentName: data.originalName,
        }));
      } else {
        setFormData(prev => ({
          ...prev,
          attachmentUrl: data.url,
          attachmentName: data.originalName,
        }));
      }
    } catch (err: any) {
      alert(`Falha no upload: ${err.message}`);
    } finally {
      setUploading(false);
    }
  };

  const handleSaveCert = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');

    try {
      const res = await fetch('/api/certificates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao cadastrar certificado');

      setIsNewModalOpen(false);
      loadData(searchTerm);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleRenewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCert) return;

    setSaving(true);
    setError('');

    try {
      const res = await fetch(`/api/certificates/${selectedCert.id}/renew`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(renewData),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao renovar certificado');

      setIsRenewModalOpen(false);
      loadData(searchTerm);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const openHistory = async (cert: Certificate) => {
    setSelectedCert(cert);
    setIsHistoryModalOpen(true);
    setLoadingHistory(true);
    try {
      const res = await fetch(`/api/certificates/${cert.id}`);
      const data = await res.json();
      setCertHistories(data.histories || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingHistory(false);
    }
  };

  const openRenewModal = (cert: Certificate) => {
    setSelectedCert(cert);
    const currentExp = new Date(cert.expirationDate);
    currentExp.setFullYear(currentExp.getFullYear() + 1);
    const suggestedNewDate = currentExp.toISOString().split('T')[0];

    setRenewData({
      newExpirationDate: suggestedNewDate,
      newIssueDate: new Date().toISOString().split('T')[0],
      notes: '',
      attachmentUrl: '',
      attachmentName: '',
    });
    setError('');
    setIsRenewModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Deseja realmente excluir este certificado e todo o histórico?')) return;
    try {
      await fetch(`/api/certificates/${id}`, { method: 'DELETE' });
      loadData(searchTerm);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSendWhatsApp = (cert: Certificate) => {
    const days = getDaysRemaining(cert.expirationDate);
    const link = generateWhatsAppLink(cert.clientPhone, whatsappTemplate, {
      clientName: cert.clientTradeName || cert.clientName,
      certType: cert.type,
      expirationDate: cert.expirationDate,
      daysRemaining: days,
    });
    window.open(link, '_blank');
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight flex items-center gap-3">
            <Award className="text-emerald-400" />
            Certificados Digitais
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Cadastro, anexo de arquivos, histórico de renovações e avisos via WhatsApp.
          </p>
        </div>
        <button
          onClick={() => {
            setFormData({
              clientId: clients[0]?.id || '',
              type: 'e-CNPJ A1 (Arquivo)',
              issuer: 'Certisign',
              issueDate: new Date().toISOString().split('T')[0],
              expirationDate: '',
              attachmentUrl: '',
              attachmentName: '',
              passwordHint: '',
              notes: '',
            });
            setError('');
            setIsNewModalOpen(true);
          }}
          disabled={clients.length === 0}
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 px-4 py-2.5 rounded-xl font-semibold text-sm transition shadow-lg shadow-emerald-500/20 shrink-0 disabled:opacity-50"
        >
          <Plus size={18} />
          Cadastrar Certificado
        </button>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
        <form onSubmit={(e) => { e.preventDefault(); loadData(searchTerm, companyFilter); }} className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por cliente, documento ou tipo de certificado..."
              className="w-full pl-10 pr-4 py-2 bg-slate-800/80 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
            />
          </div>
          {currentUser?.role === 'SUPER_ADMIN' && companies.length > 0 && (
            <select
              value={companyFilter}
              onChange={(e) => {
                setCompanyFilter(e.target.value);
                loadData(searchTerm, e.target.value);
              }}
              className="px-3.5 py-2 bg-slate-800/80 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 max-w-xs"
            >
              <option value="ALL">Todas as Empresas</option>
              {companies.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          )}
          <button
            type="submit"
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-medium rounded-xl transition border border-slate-700"
          >
            Buscar
          </button>
          {searchTerm && (
            <button
              type="button"
              onClick={() => { setSearchTerm(''); loadData('', companyFilter); }}
              className="px-3 py-2 bg-slate-800/50 hover:bg-slate-800 text-slate-400 hover:text-white text-sm rounded-xl transition"
            >
              Limpar
            </button>
          )}
        </form>
      </div>

      {loading ? (
        <div className="py-20 text-center text-slate-500 flex flex-col items-center gap-3">
          <Loader2 className="animate-spin text-emerald-500" size={32} />
          <span>Carregando certificados...</span>
        </div>
      ) : certificates.length === 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center">
          <div className="inline-flex p-3 bg-slate-800 text-slate-400 rounded-2xl mb-3">
            <Award size={32} />
          </div>
          <h3 className="text-lg font-semibold text-white">Nenhum certificado registrado</h3>
          <p className="text-slate-400 text-sm mt-1 max-w-md mx-auto">
            {clients.length === 0 
              ? 'Primeiro cadastre um cliente na aba Clientes para depois vincular um certificado.'
              : 'Clique em Cadastrar Certificado para adicionar o primeiro certificado com data de vencimento.'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Visualização em Cards (Mobile e Telas Menores) */}
          <div className="lg:hidden space-y-4">
            {certificates.map((cert) => {
              const days = getDaysRemaining(cert.expirationDate);
              const isExpired = days < 0;
              const is15Days = days >= 0 && days <= 15;
              const is30Days = days > 15 && days <= 30;

              let badgeColor = 'bg-slate-800 text-slate-300 border-slate-700';
              let statusText = `${days} dias restantes`;

              if (isExpired) {
                badgeColor = 'bg-red-950/60 text-red-300 border-red-800';
                statusText = `Vencido há ${Math.abs(days)} dias`;
              } else if (is15Days) {
                badgeColor = 'bg-amber-950/60 text-amber-300 border-amber-800 animate-pulse';
                statusText = `Vence em ${days} dias (Urgente)`;
              } else if (is30Days) {
                badgeColor = 'bg-blue-950/60 text-blue-300 border-blue-800';
                statusText = `Vence em ${days} dias`;
              }

              return (
                <div
                  key={cert.id}
                  className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 space-y-4 shadow-lg"
                >
                  {/* Cabeçalho do Card */}
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-bold text-white text-base leading-tight">
                          {cert.clientTradeName || cert.clientName}
                        </h3>
                        {cert.companyName && (
                          <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                            <Building2 size={10} />
                            {cert.companyName}
                          </span>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400 mt-1">
                        <span className="font-mono text-slate-300">{formatDocument(cert.clientDocument)}</span>
                        {cert.clientPhone && (
                          <>
                            <span>•</span>
                            <span className="flex items-center gap-1">
                              <Phone size={12} className="text-slate-500" />
                              {formatPhone(cert.clientPhone)}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Detalhes do Certificado */}
                  <div className="grid grid-cols-2 gap-3 p-3 bg-slate-800/40 rounded-xl border border-slate-800/80 text-xs">
                    <div>
                      <span className="text-slate-400 text-[11px] block">Certificado</span>
                      <strong className="text-slate-200 font-medium">{cert.type}</strong>
                      <span className="text-slate-400 block text-[11px] mt-0.5">{cert.issuer || 'AC Geral'}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 text-[11px] block">Vencimento</span>
                      <strong className="text-white font-mono">{formatDateBR(cert.expirationDate)}</strong>
                      <div className={`mt-1 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium border ${badgeColor}`}>
                        {isExpired && <AlertTriangle size={10} />}
                        {statusText}
                      </div>
                    </div>
                  </div>

                  {/* Anexo / Senha se houver */}
                  {(cert.attachmentUrl || cert.passwordHint) && (
                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs pt-1">
                      {cert.attachmentUrl ? (
                        <a
                          href={cert.attachmentUrl}
                          download
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-emerald-400 rounded-xl font-medium border border-slate-700 transition"
                        >
                          <FileText size={14} />
                          Baixar Anexo
                        </a>
                      ) : <div />}
                      {cert.passwordHint && (
                        <span className="text-slate-400 text-[11px]">
                          Senha: <strong className="font-mono text-slate-200">{cert.passwordHint}</strong>
                        </span>
                      )}
                    </div>
                  )}

                  {/* Barra de Ações Mobile */}
                  <div className="grid grid-cols-4 gap-2 pt-2 border-t border-slate-800">
                    <button
                      onClick={() => handleSendWhatsApp(cert)}
                      className="flex flex-col items-center justify-center gap-1 py-2 px-1 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 rounded-xl border border-emerald-500/30 text-xs font-medium transition"
                    >
                      <MessageSquare size={16} />
                      <span className="text-[10px]">WhatsApp</span>
                    </button>
                    <button
                      onClick={() => openRenewModal(cert)}
                      className="flex flex-col items-center justify-center gap-1 py-2 px-1 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 rounded-xl border border-blue-500/30 text-xs font-medium transition"
                    >
                      <RefreshCw size={16} />
                      <span className="text-[10px]">Renovar</span>
                    </button>
                    <button
                      onClick={() => openHistory(cert)}
                      className="flex flex-col items-center justify-center gap-1 py-2 px-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl border border-slate-700 text-xs font-medium transition"
                    >
                      <History size={16} />
                      <span className="text-[10px]">Histórico</span>
                    </button>
                    <button
                      onClick={() => handleDelete(cert.id)}
                      className="flex flex-col items-center justify-center gap-1 py-2 px-1 bg-red-950/30 hover:bg-red-950/60 text-red-400 rounded-xl border border-red-800/40 text-xs font-medium transition"
                    >
                      <Trash2 size={16} />
                      <span className="text-[10px]">Excluir</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Visualização em Tabela Completa (Telas Maiores: lg+) */}
          <div className="hidden lg:block bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-800/50 text-slate-400 text-xs uppercase font-semibold border-b border-slate-800">
                  <tr>
                    <th className="px-6 py-4">Cliente & Documento</th>
                    <th className="px-6 py-4">Certificado & Emissor</th>
                    <th className="px-6 py-4">Vencimento & Prazo</th>
                    <th className="px-6 py-4">Anexo / Backup</th>
                    <th className="px-6 py-4 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {certificates.map((cert) => {
                    const days = getDaysRemaining(cert.expirationDate);
                    const isExpired = days < 0;
                    const is15Days = days >= 0 && days <= 15;
                    const is30Days = days > 15 && days <= 30;

                    let badgeColor = 'bg-slate-800 text-slate-300 border-slate-700';
                    let statusText = `${days} dias restantes`;

                    if (isExpired) {
                      badgeColor = 'bg-red-950/60 text-red-300 border-red-800';
                      statusText = `Vencido há ${Math.abs(days)} dias`;
                    } else if (is15Days) {
                      badgeColor = 'bg-amber-950/60 text-amber-300 border-amber-800 animate-pulse';
                      statusText = `Vence em ${days} dias (Urgente)`;
                    } else if (is30Days) {
                      badgeColor = 'bg-blue-950/60 text-blue-300 border-blue-800';
                      statusText = `Vence em ${days} dias`;
                    }

                    return (
                      <tr key={cert.id} className="hover:bg-slate-800/30 transition">
                        <td className="px-6 py-4">
                          <div className="font-semibold text-white">
                            {cert.clientTradeName || cert.clientName}
                          </div>
                          <div className="text-xs text-slate-400 flex items-center gap-2 mt-0.5">
                            <span className="font-mono">{formatDocument(cert.clientDocument)}</span>
                            <span>•</span>
                            <span>{formatPhone(cert.clientPhone)}</span>
                          </div>
                        </td>

                        <td className="px-6 py-4">
                          <div className="font-medium text-slate-200">{cert.type}</div>
                          <div className="text-xs text-slate-400">
                            {cert.issuer || 'Autoridade Certificadora'}
                          </div>
                        </td>

                        <td className="px-6 py-4">
                          <div className="font-mono font-semibold text-white text-sm">
                            {formatDateBR(cert.expirationDate)}
                          </div>
                          <div className={`mt-1 inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border ${badgeColor}`}>
                            {isExpired && <AlertTriangle size={12} />}
                            {statusText}
                          </div>
                        </td>

                        <td className="px-6 py-4">
                          {cert.attachmentUrl ? (
                            <a
                              href={cert.attachmentUrl}
                              download
                              className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-emerald-400 rounded-lg text-xs font-medium transition border border-slate-700"
                            >
                              <FileText size={13} />
                              Baixar Arquivo
                            </a>
                          ) : (
                            <span className="text-xs text-slate-500 italic">Sem anexo</span>
                          )}
                          {cert.passwordHint && (
                            <div className="text-[11px] text-slate-400 mt-1">
                              Senha/Dica: <span className="text-slate-300 font-mono">{cert.passwordHint}</span>
                            </div>
                          )}
                        </td>

                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => handleSendWhatsApp(cert)}
                              title="Enviar WhatsApp de Renovação"
                              className="p-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 rounded-xl transition border border-emerald-500/30"
                            >
                              <MessageSquare size={16} />
                            </button>

                            <button
                              onClick={() => openRenewModal(cert)}
                              title="Renovar Certificado (Novo Ciclo)"
                              className="p-2 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 rounded-xl transition border border-blue-500/30"
                            >
                              <RefreshCw size={16} />
                            </button>

                            <button
                              onClick={() => openHistory(cert)}
                              title="Ver Histórico de Renovações"
                              className="p-2 hover:bg-slate-800 text-slate-400 hover:text-white rounded-xl transition"
                            >
                              <History size={16} />
                            </button>

                            <button
                              onClick={() => handleDelete(cert.id)}
                              title="Excluir Certificado"
                              className="p-2 hover:bg-red-950/40 text-slate-400 hover:text-red-400 rounded-xl transition"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Modal Novo */}
      {isNewModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden my-auto">
            <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Award size={20} className="text-emerald-400" />
                Cadastrar Certificado Digital
              </h2>
              <button onClick={() => setIsNewModalOpen(false)} className="text-slate-400 hover:text-white">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveCert} className="p-6 space-y-4">
              {error && (
                <div className="p-3 bg-red-950/50 border border-red-800 rounded-xl text-red-300 text-xs">
                  {error}
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold uppercase text-slate-400 mb-1.5">
                  Cliente Vinculado <span className="text-emerald-400">*</span>
                </label>
                <select
                  required
                  value={formData.clientId}
                  onChange={(e) => setFormData({ ...formData, clientId: e.target.value })}
                  className="w-full px-3 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                >
                  <option value="">Selecione um cliente...</option>
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({formatDocument(c.document)})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-400 mb-1.5">
                    Tipo do Certificado <span className="text-emerald-400">*</span>
                  </label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                    className="w-full px-3 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  >
                    <option value="e-CNPJ A1 (Arquivo)">e-CNPJ A1 (Arquivo)</option>
                    <option value="e-CPF A1 (Arquivo)">e-CPF A1 (Arquivo)</option>
                    <option value="e-CNPJ A3 (Token/Cartão)">e-CNPJ A3 (Token/Cartão)</option>
                    <option value="e-CPF A3 (Token/Cartão)">e-CPF A3 (Token/Cartão)</option>
                    <option value="Certificado em Nuvem (BirdID/SafeID)">Certificado em Nuvem (BirdID/SafeID)</option>
                    <option value="SSL / TLS Servidor">SSL / TLS Servidor</option>
                    <option value="NF-e / NFC-e">NF-e / NFC-e</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-400 mb-1.5">
                    Autoridade Certificadora
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: Certisign, Serasa, Soluti..."
                    value={formData.issuer}
                    onChange={(e) => setFormData({ ...formData, issuer: e.target.value })}
                    className="w-full px-3 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-400 mb-1.5">
                    Data de Emissão
                  </label>
                  <input
                    type="date"
                    value={formData.issueDate}
                    onChange={(e) => setFormData({ ...formData, issueDate: e.target.value })}
                    className="w-full px-3 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-400 mb-1.5">
                    Data de Vencimento <span className="text-emerald-400">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.expirationDate}
                    onChange={(e) => setFormData({ ...formData, expirationDate: e.target.value })}
                    className="w-full px-3 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none font-semibold text-emerald-400"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-slate-400 mb-1.5">
                  Anexo do Certificado / Termo (.pfx, .cer, .pdf, zip)
                </label>
                <div className="flex items-center gap-3">
                  <label className="cursor-pointer px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-sm font-medium border border-slate-700 flex items-center gap-2 transition">
                    <Upload size={16} />
                    {uploading ? 'Enviando arquivo...' : 'Escolher Arquivo'}
                    <input
                      type="file"
                      disabled={uploading}
                      onChange={(e) => handleFileUpload(e, false)}
                      className="hidden"
                    />
                  </label>
                  {formData.attachmentName && (
                    <span className="text-xs text-emerald-400 font-medium truncate max-w-xs">
                      ✓ {formData.attachmentName}
                    </span>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-slate-400 mb-1.5">
                  Dica / Senha de Instalação (opcional)
                </label>
                <input
                  type="text"
                  placeholder="Senha do arquivo ou anotação confidencial..."
                  value={formData.passwordHint}
                  onChange={(e) => setFormData({ ...formData, passwordHint: e.target.value })}
                  className="w-full px-3 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-slate-400 mb-1.5">
                  Observações Gerais
                </label>
                <textarea
                  rows={2}
                  placeholder="Detalhes ou orientações do certificado..."
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div className="pt-4 border-t border-slate-800 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsNewModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-700 hover:bg-slate-800 text-slate-300 text-sm"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving || uploading}
                  className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold rounded-xl text-sm flex items-center gap-2"
                >
                  {saving && <Loader2 size={16} className="animate-spin" />}
                  Salvar Certificado
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Renovação */}
      {isRenewModalOpen && selectedCert && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <RefreshCw size={18} className="text-blue-400" />
                  Renovar Certificado
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  {selectedCert.clientTradeName || selectedCert.clientName} - {selectedCert.type}
                </p>
              </div>
              <button onClick={() => setIsRenewModalOpen(false)} className="text-slate-400 hover:text-white">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleRenewSubmit} className="space-y-4">
              <div className="p-3 bg-slate-800/60 rounded-xl border border-slate-700 text-xs text-slate-300 space-y-1">
                <p>Data de Vencimento Anterior: <strong className="text-white">{formatDateBR(selectedCert.expirationDate)}</strong></p>
                <p className="text-slate-400 text-[11px]">O sistema manterá o histórico permanente das renovações anteriores para consultas futuras.</p>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-slate-400 mb-1.5">
                  Nova Data de Vencimento <span className="text-emerald-400">*</span>
                </label>
                <input
                  type="date"
                  required
                  value={renewData.newExpirationDate}
                  onChange={(e) => setRenewData({ ...renewData, newExpirationDate: e.target.value })}
                  className="w-full px-3 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm focus:ring-2 focus:ring-emerald-500 font-semibold text-emerald-400"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-slate-400 mb-1.5">
                  Novo Arquivo / Comprovante (opcional)
                </label>
                <label className="cursor-pointer px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-sm font-medium border border-slate-700 flex items-center gap-2 transition w-fit">
                  <Upload size={16} />
                  {uploading ? 'Enviando...' : 'Anexar Novo Arquivo'}
                  <input
                    type="file"
                    disabled={uploading}
                    onChange={(e) => handleFileUpload(e, true)}
                    className="hidden"
                  />
                </label>
                {renewData.attachmentName && (
                  <p className="text-xs text-emerald-400 mt-1">✓ {renewData.attachmentName}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-slate-400 mb-1.5">
                  Notas sobre a Renovação
                </label>
                <textarea
                  rows={2}
                  placeholder="Ex: Renovado por mais 1 ano junto à Serasa..."
                  value={renewData.notes}
                  onChange={(e) => setRenewData({ ...renewData, notes: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="pt-3 border-t border-slate-800 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsRenewModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-700 text-slate-300 text-sm"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving || uploading}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-xl text-sm flex items-center gap-2"
                >
                  {saving && <Loader2 size={16} className="animate-spin" />}
                  Confirmar Renovação
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Histórico */}
      {isHistoryModalOpen && selectedCert && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <History size={18} className="text-emerald-400" />
                Histórico de Ciclos e Renovações
              </h3>
              <button onClick={() => setIsHistoryModalOpen(false)} className="text-slate-400 hover:text-white">
                <X size={20} />
              </button>
            </div>

            <div className="text-xs text-slate-400">
              Cliente: <strong className="text-white">{selectedCert.clientTradeName || selectedCert.clientName}</strong>
            </div>

            {loadingHistory ? (
              <div className="py-8 text-center text-slate-500">
                <Loader2 className="animate-spin mx-auto text-emerald-500" size={24} />
              </div>
            ) : certHistories.length === 0 ? (
              <p className="text-xs text-slate-500 py-4 text-center">Nenhum histórico registrado até o momento.</p>
            ) : (
              <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
                {certHistories.map((hist, idx) => (
                  <div key={hist.id || idx} className="p-3 bg-slate-800/60 rounded-xl border border-slate-700/80 text-xs space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-emerald-400">
                        {hist.action === 'RENEWAL' ? 'Renovação Efetuada' : 'Criação Inicial'}
                      </span>
                      <span className="text-slate-500 text-[11px]">
                        {new Date(hist.createdAt).toLocaleDateString('pt-BR')}
                      </span>
                    </div>
                    {hist.previousDate && (
                      <p className="text-slate-400">
                        Vencimento anterior: <span className="line-through">{formatDateBR(hist.previousDate)}</span>
                      </p>
                    )}
                    <p className="text-slate-200">
                      Novo Vencimento: <strong className="text-white font-mono">{formatDateBR(hist.newDate)}</strong>
                    </p>
                    {hist.notes && <p className="text-slate-400 italic text-[11px] mt-1">{hist.notes}</p>}
                  </div>
                ))}
              </div>
            )}

            <div className="pt-3 border-t border-slate-800 flex justify-end">
              <button
                type="button"
                onClick={() => setIsHistoryModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
