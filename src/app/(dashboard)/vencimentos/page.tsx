'use client';

import { useState, useEffect } from 'react';
import { 
  Clock, 
  AlertTriangle, 
  Calendar, 
  CheckCircle2, 
  MessageSquare, 
  RefreshCw, 
  Loader2,
  Filter,
  ShieldCheck,
  Building2,
  ExternalLink
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
  expirationDate: string;
  notes?: string;
  companyId?: string;
  companyName?: string;
  companyWhatsappTemplate?: string | null;
}

export default function VencimentosPage() {
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterTab, setFilterTab] = useState<'all' | '15days' | '30days' | 'expired'>('all');
  const [whatsappTemplate, setWhatsappTemplate] = useState('');
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [companies, setCompanies] = useState<any[]>([]);
  const [companyFilter, setCompanyFilter] = useState('ALL');

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

  const loadData = async (compFilter = companyFilter) => {
    setLoading(true);
    try {
      const certUrl = compFilter && compFilter !== 'ALL' 
        ? `/api/certificates?companyId=${encodeURIComponent(compFilter)}`
        : '/api/certificates';

      const [certRes, settingsRes] = await Promise.all([
        fetch(certUrl),
        fetch('/api/settings')
      ]);
      const [certData, settingsData] = await Promise.all([
        certRes.json(),
        settingsRes.json()
      ]);
      if (Array.isArray(certData)) setCertificates(certData);
      if (settingsData?.whatsapp_template) {
        setWhatsappTemplate(settingsData.whatsapp_template);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSendWhatsApp = (cert: Certificate) => {
    const days = getDaysRemaining(cert.expirationDate);
    const templateToUse = cert.companyWhatsappTemplate || whatsappTemplate;
    const link = generateWhatsAppLink(cert.clientPhone, templateToUse, {
      clientName: cert.clientTradeName || cert.clientName,
      certType: cert.type,
      expirationDate: cert.expirationDate,
      daysRemaining: days,
      companyName: cert.companyName || undefined,
    });
    window.open(link, '_blank');
  };

  // Contadores para o Dashboard
  const expiredCount = certificates.filter(c => getDaysRemaining(c.expirationDate) < 0).length;
  const in15DaysCount = certificates.filter(c => {
    const d = getDaysRemaining(c.expirationDate);
    return d >= 0 && d <= 15;
  }).length;
  const in30DaysCount = certificates.filter(c => {
    const d = getDaysRemaining(c.expirationDate);
    return d > 15 && d <= 30;
  }).length;
  const upToDateCount = certificates.filter(c => getDaysRemaining(c.expirationDate) > 30).length;

  // Filtragem da lista
  const filteredCerts = certificates.filter(c => {
    const days = getDaysRemaining(c.expirationDate);
    if (filterTab === 'expired') return days < 0;
    if (filterTab === '15days') return days >= 0 && days <= 15;
    if (filterTab === '30days') return days >= 0 && days <= 30;
    return true;
  });

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight flex items-center gap-3">
            <Clock className="text-emerald-400" />
            Painel de Vencimentos
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Acompanhamento inteligente e proativo do ciclo de vida dos certificados digitais.
          </p>
        </div>
        {currentUser?.role === 'SUPER_ADMIN' && companies.length > 0 && (
          <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 px-3 py-2 rounded-xl">
            <Building2 size={16} className="text-emerald-400 shrink-0" />
            <select
              value={companyFilter}
              onChange={(e) => {
                setCompanyFilter(e.target.value);
                loadData(e.target.value);
              }}
              className="bg-transparent text-sm text-slate-200 focus:outline-none cursor-pointer"
            >
              <option value="ALL" className="bg-slate-900 text-white">Todas as Empresas</option>
              {companies.map((c) => (
                <option key={c.id} value={c.id} className="bg-slate-900 text-white">{c.name}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Cards de Métricas e Alertas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card Vencidos */}
        <button
          onClick={() => setFilterTab('expired')}
          className={`p-5 rounded-2xl border text-left transition-all duration-200 ${
            filterTab === 'expired' 
              ? 'bg-red-950/40 border-red-500 shadow-lg shadow-red-950/50 scale-[1.02]' 
              : 'bg-slate-900 border-slate-800 hover:border-slate-700'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-red-400">Vencidos</span>
            <div className="p-2 bg-red-950/60 rounded-xl text-red-400 border border-red-900">
              <AlertTriangle size={20} />
            </div>
          </div>
          <div className="text-3xl font-bold text-white mt-3">{expiredCount}</div>
          <p className="text-xs text-slate-400 mt-1">Exigem renovação imediata</p>
        </button>

        {/* Card Até 15 dias */}
        <button
          onClick={() => setFilterTab('15days')}
          className={`p-5 rounded-2xl border text-left transition-all duration-200 ${
            filterTab === '15days' 
              ? 'bg-amber-950/40 border-amber-500 shadow-lg shadow-amber-950/50 scale-[1.02]' 
              : 'bg-slate-900 border-slate-800 hover:border-slate-700'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-amber-400">Vencem em até 15 dias</span>
            <div className="p-2 bg-amber-950/60 rounded-xl text-amber-400 border border-amber-900">
              <Clock size={20} />
            </div>
          </div>
          <div className="text-3xl font-bold text-white mt-3">{in15DaysCount}</div>
          <p className="text-xs text-slate-400 mt-1">Aviso urgente de renovação</p>
        </button>

        {/* Card Até 30 dias */}
        <button
          onClick={() => setFilterTab('30days')}
          className={`p-5 rounded-2xl border text-left transition-all duration-200 ${
            filterTab === '30days' 
              ? 'bg-blue-950/40 border-blue-500 shadow-lg shadow-blue-950/50 scale-[1.02]' 
              : 'bg-slate-900 border-slate-800 hover:border-slate-700'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-blue-400">Vencem em até 30 dias</span>
            <div className="p-2 bg-blue-950/60 rounded-xl text-blue-400 border border-blue-900">
              <Calendar size={20} />
            </div>
          </div>
          <div className="text-3xl font-bold text-white mt-3">{in15DaysCount + in30DaysCount}</div>
          <p className="text-xs text-slate-400 mt-1">Janela de contato recomendada</p>
        </button>

        {/* Card Em dia */}
        <button
          onClick={() => setFilterTab('all')}
          className={`p-5 rounded-2xl border text-left transition-all duration-200 ${
            filterTab === 'all' 
              ? 'bg-emerald-950/40 border-emerald-500 shadow-lg shadow-emerald-950/50 scale-[1.02]' 
              : 'bg-slate-900 border-slate-800 hover:border-slate-700'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-emerald-400">Total / Em dia</span>
            <div className="p-2 bg-emerald-950/60 rounded-xl text-emerald-400 border border-emerald-900">
              <CheckCircle2 size={20} />
            </div>
          </div>
          <div className="text-3xl font-bold text-white mt-3">{certificates.length}</div>
          <p className="text-xs text-slate-400 mt-1">{upToDateCount} ativos com mais de 30 dias</p>
        </button>
      </div>

      {/* Lista Filtrada com Ação Rápida */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="px-6 py-4 border-b border-slate-800 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Filter size={18} className="text-emerald-400" />
            <h2 className="text-base font-semibold text-white">
              {filterTab === 'expired' && 'Certificados Vencidos'}
              {filterTab === '15days' && 'Certificados Vencendo nos Próximos 15 Dias'}
              {filterTab === '30days' && 'Certificados Vencendo nos Próximos 30 Dias'}
              {filterTab === 'all' && 'Todos os Certificados'}
            </h2>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-300 font-mono">
              {filteredCerts.length}
            </span>
          </div>

          <div className="flex gap-1.5 bg-slate-800/80 p-1 rounded-xl text-xs font-medium">
            <button
              onClick={() => setFilterTab('all')}
              className={`px-3 py-1.5 rounded-lg transition ${filterTab === 'all' ? 'bg-emerald-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'}`}
            >
              Todos
            </button>
            <button
              onClick={() => setFilterTab('30days')}
              className={`px-3 py-1.5 rounded-lg transition ${filterTab === '30days' ? 'bg-blue-600 text-white font-bold' : 'text-slate-400 hover:text-white'}`}
            >
              30 Dias
            </button>
            <button
              onClick={() => setFilterTab('15days')}
              className={`px-3 py-1.5 rounded-lg transition ${filterTab === '15days' ? 'bg-amber-600 text-white font-bold' : 'text-slate-400 hover:text-white'}`}
            >
              15 Dias
            </button>
            <button
              onClick={() => setFilterTab('expired')}
              className={`px-3 py-1.5 rounded-lg transition ${filterTab === 'expired' ? 'bg-red-600 text-white font-bold' : 'text-slate-400 hover:text-white'}`}
            >
              Vencidos
            </button>
          </div>
        </div>

        {loading ? (
          <div className="py-20 text-center text-slate-500 flex flex-col items-center gap-3">
            <Loader2 className="animate-spin text-emerald-500" size={32} />
            <span>Verificando vencimentos...</span>
          </div>
        ) : filteredCerts.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            <ShieldCheck size={36} className="mx-auto text-emerald-400 mb-2" />
            <p className="font-semibold text-white">Nenhum certificado nesta faixa de vencimento!</p>
            <p className="text-xs text-slate-500 mt-1">Tudo em dia para o filtro selecionado.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-800/60">
            {filteredCerts.map((cert) => {
              const days = getDaysRemaining(cert.expirationDate);
              const isExpired = days < 0;
              const is15Days = days >= 0 && days <= 15;

              return (
                <div key={cert.id} className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-800/30 transition">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-white text-base">
                        {cert.clientTradeName || cert.clientName}
                      </span>
                      {cert.companyName && (
                        <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                          <Building2 size={10} />
                          {cert.companyName}
                        </span>
                      )}
                      <span className="text-xs px-2 py-0.5 rounded-md bg-slate-800 text-slate-400 font-mono">
                        {formatDocument(cert.clientDocument)}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400">
                      <span>Tipo: <strong className="text-slate-200">{cert.type}</strong></span>
                      <span>•</span>
                      <span>Telefone: <strong className="text-slate-200">{formatPhone(cert.clientPhone)}</strong></span>
                      {cert.issuer && (
                        <>
                          <span>•</span>
                          <span>Emissor: <strong className="text-slate-200">{cert.issuer}</strong></span>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-4 shrink-0 justify-between sm:justify-end">
                    <div className="text-right">
                      <div className="font-mono font-bold text-white text-sm">
                        {formatDateBR(cert.expirationDate)}
                      </div>
                      <div className={`text-xs font-semibold ${
                        isExpired 
                          ? 'text-red-400' 
                          : is15Days 
                          ? 'text-amber-400 animate-pulse' 
                          : 'text-blue-400'
                      }`}>
                        {isExpired ? `Vencido há ${Math.abs(days)} dias` : `Faltam ${days} dias`}
                      </div>
                    </div>

                    {/* Ação com WhatsApp */}
                    <button
                      onClick={() => handleSendWhatsApp(cert)}
                      className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold rounded-xl text-xs transition shadow-lg shadow-emerald-500/20"
                    >
                      <MessageSquare size={16} />
                      Enviar WhatsApp
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
