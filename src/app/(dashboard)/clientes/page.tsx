'use client';

import { useState, useEffect } from 'react';
import { 
  Users, 
  Plus, 
  Search, 
  Building2, 
  User, 
  Phone, 
  Mail, 
  MapPin, 
  FileText, 
  Edit3, 
  Trash2, 
  Loader2, 
  CheckCircle2, 
  AlertCircle,
  X,
  Sparkles
} from 'lucide-react';
import { formatDocument, formatPhone } from '@/lib/utils';

interface Client {
  id: string;
  type: string;
  document: string;
  name: string;
  tradeName?: string;
  email?: string;
  phone: string;
  zipCode?: string;
  address?: string;
  number?: string;
  neighborhood?: string;
  city?: string;
  state?: string;
  notes?: string;
  certificateCount?: number;
  companyId?: string;
  companyName?: string;
}

export default function ClientesPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [companies, setCompanies] = useState<any[]>([]);
  const [companyFilter, setCompanyFilter] = useState('ALL');
  
  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [fetchingCnpj, setFetchingCnpj] = useState(false);
  const [fetchingCep, setFetchingCep] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Form fields
  const [formData, setFormData] = useState({
    type: 'PJ',
    document: '',
    name: '',
    tradeName: '',
    email: '',
    phone: '',
    zipCode: '',
    address: '',
    number: '',
    neighborhood: '',
    city: '',
    state: '',
    notes: '',
    companyId: '',
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

    loadClients();
  }, []);

  const loadClients = async (search = searchTerm, compFilter = companyFilter) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.append('q', search);
      if (compFilter && compFilter !== 'ALL') params.append('companyId', compFilter);

      const queryStr = params.toString() ? `?${params.toString()}` : '';
      const res = await fetch(`/api/clients${queryStr}`);
      const data = await res.json();
      if (Array.isArray(data)) {
        setClients(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    loadClients(searchTerm, companyFilter);
  };

  const openNewModal = () => {
    setEditingClient(null);
    setFormData({
      type: 'PJ',
      document: '',
      name: '',
      tradeName: '',
      email: '',
      phone: '',
      zipCode: '',
      address: '',
      number: '',
      neighborhood: '',
      city: '',
      state: '',
      notes: '',
      companyId: companies[0]?.id || '',
    });
    setError('');
    setSuccess('');
    setIsModalOpen(true);
  };

  const openEditModal = (client: Client) => {
    setEditingClient(client);
    setFormData({
      type: client.type || 'PJ',
      document: client.document || '',
      name: client.name || '',
      tradeName: client.tradeName || '',
      email: client.email || '',
      phone: client.phone || '',
      zipCode: client.zipCode || '',
      address: client.address || '',
      number: client.number || '',
      neighborhood: client.neighborhood || '',
      city: client.city || '',
      state: client.state || '',
      notes: client.notes || '',
      companyId: client.companyId || '',
    });
    setError('');
    setSuccess('');
    setIsModalOpen(true);
  };

  // Busca automática de endereço ao preencher CEP
  const handleCepLookup = async (cepValue: string) => {
    const cleanCep = cepValue.replace(/\D/g, '');
    if (cleanCep.length !== 8) return;

    setFetchingCep(true);
    try {
      const res = await fetch(`/api/cep?cep=${cleanCep}`);
      if (res.ok) {
        const data = await res.json();
        setFormData(prev => ({
          ...prev,
          zipCode: cleanCep,
          address: data.address || prev.address,
          neighborhood: data.neighborhood || prev.neighborhood,
          city: data.city || prev.city,
          state: data.state || prev.state,
        }));
      }
    } catch (e) {
      console.error('Erro na consulta do CEP:', e);
    } finally {
      setFetchingCep(false);
    }
  };

  const handleZipCodeChange = (val: string) => {
    setFormData(prev => ({ ...prev, zipCode: val }));
    const clean = val.replace(/\D/g, '');
    if (clean.length === 8) {
      handleCepLookup(clean);
    }
  };

  // Busca automática na Receita Federal via BrasilAPI + ReceitaWS ao digitar CNPJ
  const handleCnpjLookup = async (cnpjToSearch?: string) => {
    const raw = cnpjToSearch || formData.document;
    const clean = raw.replace(/\D/g, '');

    if (clean.length !== 14) {
      setError('Informe um CNPJ válido com 14 dígitos para buscar na Receita.');
      return;
    }

    setFetchingCnpj(true);
    setError('');

    try {
      const res = await fetch(`/api/clients/cnpj?cnpj=${clean}`);
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Falha ao buscar dados do CNPJ');
      }

      setFormData(prev => ({
        ...prev,
        type: 'PJ',
        document: clean,
        name: data.name || prev.name,
        tradeName: data.tradeName || prev.tradeName,
        email: data.email || prev.email,
        phone: data.phone || prev.phone,
        zipCode: data.zipCode || prev.zipCode,
        address: data.address || prev.address,
        number: data.number || prev.number,
        neighborhood: data.neighborhood || prev.neighborhood,
        city: data.city || prev.city,
        state: data.state || prev.state,
      }));

      setSuccess('Dados carregados com sucesso da Receita Federal!');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setFetchingCnpj(false);
    }
  };

  const handleDocumentChange = (val: string) => {
    const clean = val.replace(/\D/g, '');
    const isPj = clean.length > 11;
    setFormData(prev => ({
      ...prev,
      document: val,
      type: isPj ? 'PJ' : 'PF'
    }));

    // Se preencheu os 14 dígitos do CNPJ automaticamente na digitação ou colagem
    if (clean.length === 14 && !editingClient) {
      handleCnpjLookup(clean);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setSaving(true);

    try {
      const url = editingClient ? `/api/clients/${editingClient.id}` : '/api/clients';
      const method = editingClient ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Erro ao salvar cliente');
      }

      setIsModalOpen(false);
      loadClients(searchTerm);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Deseja realmente excluir o cliente "${name}" e todos os seus certificados?`)) {
      return;
    }

    try {
      const res = await fetch(`/api/clients/${id}`, { method: 'DELETE' });
      if (res.ok) {
        loadClients(searchTerm);
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-6">
      {/* Cabeçalho da Página */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight flex items-center gap-3">
            <Users className="text-emerald-400" />
            Clientes
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Gerencie o cadastro de pessoas físicas e jurídicas com consulta automática de CNPJ.
          </p>
        </div>
        <button
          onClick={openNewModal}
          className="inline-flex items-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 px-4 py-2.5 rounded-xl font-semibold text-sm transition shadow-lg shadow-emerald-500/20 shrink-0"
        >
          <Plus size={18} />
          Novo Cliente
        </button>
      </div>

      {/* Barra de Pesquisa */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
        <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por nome, razão social, CPF, CNPJ ou telefone..."
              className="w-full pl-10 pr-4 py-2 bg-slate-800/80 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
            />
          </div>
          {currentUser?.role === 'SUPER_ADMIN' && companies.length > 0 && (
            <select
              value={companyFilter}
              onChange={(e) => {
                setCompanyFilter(e.target.value);
                loadClients(searchTerm, e.target.value);
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
              onClick={() => { setSearchTerm(''); loadClients('', companyFilter); }}
              className="px-3 py-2 bg-slate-800/50 hover:bg-slate-800 text-slate-400 hover:text-white text-sm rounded-xl transition"
            >
              Limpar
            </button>
          )}
        </form>
      </div>

      {/* Lista de Clientes */}
      {loading ? (
        <div className="py-20 text-center text-slate-500 flex flex-col items-center gap-3">
          <Loader2 className="animate-spin text-emerald-500" size={32} />
          <span>Carregando clientes...</span>
        </div>
      ) : clients.length === 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center">
          <div className="inline-flex p-3 bg-slate-800 text-slate-400 rounded-2xl mb-3">
            <Users size={32} />
          </div>
          <h3 className="text-lg font-semibold text-white">Nenhum cliente cadastrado</h3>
          <p className="text-slate-400 text-sm mt-1 max-w-md mx-auto">
            Cadastre seu primeiro cliente para começar a vincular e gerenciar certificados digitais.
          </p>
          <button
            onClick={openNewModal}
            className="mt-5 inline-flex items-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 px-4 py-2 rounded-xl font-semibold text-sm transition"
          >
            <Plus size={16} />
            Cadastrar Cliente
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {clients.map((client) => (
            <div
              key={client.id}
              className="bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-2xl p-5 transition-all duration-200 flex flex-col justify-between group shadow-sm hover:shadow-md"
            >
              <div>
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 bg-slate-800 rounded-xl text-emerald-400">
                      {client.type === 'PJ' ? <Building2 size={20} /> : <User size={20} />}
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700">
                          {client.type === 'PJ' ? 'Pessoa Jurídica' : 'Pessoa Física'}
                        </span>
                        {client.companyName && (
                          <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                            <Building2 size={10} />
                            {client.companyName}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition">
                    <button
                      onClick={() => openEditModal(client)}
                      title="Editar Cliente"
                      className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-white rounded-lg transition"
                    >
                      <Edit3 size={16} />
                    </button>
                    <button
                      onClick={() => handleDelete(client.id, client.name)}
                      title="Excluir Cliente"
                      className="p-1.5 hover:bg-red-950/50 text-slate-400 hover:text-red-400 rounded-lg transition"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>

                <h3 className="font-semibold text-white text-base leading-snug line-clamp-1" title={client.name}>
                  {client.name}
                </h3>
                {client.tradeName && (
                  <p className="text-xs text-emerald-400 font-medium mt-0.5 line-clamp-1" title={client.tradeName}>
                    {client.tradeName}
                  </p>
                )}

                <div className="mt-4 space-y-1.5 text-xs text-slate-400">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-slate-300">{formatDocument(client.document)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone size={14} className="text-slate-500 shrink-0" />
                    <span>{formatPhone(client.phone)}</span>
                  </div>
                  {client.email && (
                    <div className="flex items-center gap-2 truncate">
                      <Mail size={14} className="text-slate-500 shrink-0" />
                      <span className="truncate">{client.email}</span>
                    </div>
                  )}
                  {(client.city || client.state) && (
                    <div className="flex items-center gap-2">
                      <MapPin size={14} className="text-slate-500 shrink-0" />
                      <span>{[client.city, client.state].filter(Boolean).join(' - ')}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-5 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
                <span className="flex items-center gap-1.5">
                  <FileText size={14} className="text-emerald-400" />
                  {client.certificateCount ?? 0} {client.certificateCount === 1 ? 'certificado' : 'certificados'}
                </span>
                <button
                  onClick={() => openEditModal(client)}
                  className="text-emerald-400 hover:text-emerald-300 font-medium"
                >
                  Ver detalhes &rarr;
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal de Criação / Edição */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden my-auto">
            {/* Cabeçalho Modal */}
            <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/50">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                {editingClient ? <Edit3 size={20} className="text-emerald-400" /> : <Plus size={20} className="text-emerald-400" />}
                {editingClient ? 'Editar Cliente' : 'Novo Cliente'}
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
              >
                <X size={20} />
              </button>
            </div>

            {/* Corpo do Formulário com Scroll */}
            <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-6 space-y-4">
              {error && (
                <div className="p-3.5 bg-red-950/50 border border-red-800/80 rounded-xl text-red-200 text-xs flex items-center gap-2">
                  <AlertCircle size={16} className="shrink-0 text-red-400" />
                  <span>{error}</span>
                </div>
              )}
              {success && (
                <div className="p-3.5 bg-emerald-950/50 border border-emerald-800/80 rounded-xl text-emerald-200 text-xs flex items-center gap-2">
                  <CheckCircle2 size={16} className="shrink-0 text-emerald-400" />
                  <span>{success}</span>
                </div>
              )}

              {/* Seletor de Empresa para Super Admin */}
              {currentUser?.role === 'SUPER_ADMIN' && !editingClient && (
                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-400 mb-1.5">
                    Empresa Vinculada (Tenant) <span className="text-emerald-400">*</span>
                  </label>
                  <div className="relative">
                    <Building2 size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                    <select
                      value={formData.companyId}
                      onChange={(e) => setFormData({ ...formData, companyId: e.target.value })}
                      className="w-full pl-9 pr-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    >
                      {companies.map((c) => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              {/* Tipo e Documento */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-400 mb-1.5">
                    Tipo de Cadastro
                  </label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                    className="w-full px-3 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  >
                    <option value="PJ">Pessoa Jurídica (CNPJ)</option>
                    <option value="PF">Pessoa Física (CPF)</option>
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold uppercase text-slate-400 mb-1.5">
                    {formData.type === 'PJ' ? 'CNPJ' : 'CPF'} <span className="text-emerald-400">*</span>
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      required
                      placeholder={formData.type === 'PJ' ? '00.000.000/0000-00' : '000.000.000-00'}
                      value={formData.document}
                      onChange={(e) => handleDocumentChange(e.target.value)}
                      className="flex-1 px-3 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none font-mono"
                    />
                    {formData.type === 'PJ' && (
                      <button
                        type="button"
                        onClick={() => handleCnpjLookup()}
                        disabled={fetchingCnpj}
                        className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition disabled:opacity-50 shrink-0"
                        title="Buscar dados diretamente na Receita Federal"
                      >
                        {fetchingCnpj ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                        Buscar Receita
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Razão Social / Nome e Nome Fantasia */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-400 mb-1.5">
                    {formData.type === 'PJ' ? 'Razão Social' : 'Nome Completo'} <span className="text-emerald-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Nome principal"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
                {formData.type === 'PJ' && (
                  <div>
                    <label className="block text-xs font-semibold uppercase text-slate-400 mb-1.5">
                      Nome Fantasia
                    </label>
                    <input
                      type="text"
                      placeholder="Nome fantasia (se houver)"
                      value={formData.tradeName}
                      onChange={(e) => setFormData({ ...formData, tradeName: e.target.value })}
                      className="w-full px-3 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    />
                  </div>
                )}
              </div>

              {/* Contatos */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-400 mb-1.5">
                    Telefone / WhatsApp <span className="text-emerald-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="(00) 00000-0000"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-3 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-400 mb-1.5">
                    E-mail
                  </label>
                  <input
                    type="email"
                    placeholder="email@empresa.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-3 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Endereço */}
              <div className="pt-2 border-t border-slate-800">
                <p className="text-xs font-bold uppercase text-slate-400 mb-3">Endereço (opcional)</p>
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1 flex items-center justify-between">
                      <span>CEP</span>
                      {fetchingCep && <span className="text-[10px] text-emerald-400 animate-pulse">Buscando...</span>}
                    </label>
                    <input
                      type="text"
                      placeholder="00000-000"
                      value={formData.zipCode}
                      onChange={(e) => handleZipCodeChange(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-[11px] text-slate-400 mb-1">Logradouro</label>
                    <input
                      type="text"
                      placeholder="Rua, Avenida, etc."
                      value={formData.address}
                      onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">Número</label>
                    <input
                      type="text"
                      placeholder="Nº"
                      value={formData.number}
                      onChange={(e) => setFormData({ ...formData, number: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-[11px] text-slate-400 mb-1">Bairro</label>
                    <input
                      type="text"
                      placeholder="Bairro"
                      value={formData.neighborhood}
                      onChange={(e) => setFormData({ ...formData, neighborhood: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">Cidade</label>
                    <input
                      type="text"
                      placeholder="Cidade"
                      value={formData.city}
                      onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">UF</label>
                    <input
                      type="text"
                      placeholder="UF"
                      maxLength={2}
                      value={formData.state}
                      onChange={(e) => setFormData({ ...formData, state: e.target.value.toUpperCase() })}
                      className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Observações */}
              <div>
                <label className="block text-xs font-semibold uppercase text-slate-400 mb-1.5">
                  Observações
                </label>
                <textarea
                  rows={2}
                  placeholder="Informações adicionais do cliente..."
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              {/* Rodapé do Modal */}
              <div className="pt-4 border-t border-slate-800 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-700 hover:bg-slate-800 text-slate-300 text-sm font-medium transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold rounded-xl text-sm transition shadow-lg shadow-emerald-500/20 flex items-center gap-2 disabled:opacity-50"
                >
                  {saving && <Loader2 size={16} className="animate-spin" />}
                  {editingClient ? 'Atualizar Cliente' : 'Salvar Cliente'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}