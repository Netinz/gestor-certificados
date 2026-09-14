'use client';

import { useState, useEffect } from 'react';
import { 
  Building2, 
  Plus, 
  Search, 
  Edit, 
  Trash2, 
  CheckCircle, 
  XCircle, 
  Users, 
  Award, 
  Phone, 
  Mail, 
  FileText,
  AlertTriangle,
  Loader2
} from 'lucide-react';

interface Company {
  id: string;
  name: string;
  document: string | null;
  email: string | null;
  phone: string | null;
  active: number;
  createdAt: string;
  userCount?: number;
  clientCount?: number;
  certificateCount?: number;
}

export default function CompaniesPage() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCompany, setEditingCompany] = useState<Company | null>(null);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    document: '',
    email: '',
    phone: '',
    active: 1
  });

  const fetchCompanies = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/companies');
      if (res.ok) {
        const data = await res.json();
        setCompanies(data);
      }
    } catch (err) {
      console.error('Erro ao buscar empresas:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCompanies();
  }, []);

  const openCreateModal = () => {
    setEditingCompany(null);
    setFormData({
      name: '',
      document: '',
      email: '',
      phone: '',
      active: 1
    });
    setErrorMsg('');
    setIsModalOpen(true);
  };

  const openEditModal = (comp: Company) => {
    setEditingCompany(comp);
    setFormData({
      name: comp.name,
      document: comp.document || '',
      email: comp.email || '',
      phone: comp.phone || '',
      active: comp.active
    });
    setErrorMsg('');
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      setErrorMsg('O nome da empresa é obrigatório.');
      return;
    }

    try {
      setSaving(true);
      setErrorMsg('');

      const url = editingCompany ? `/api/companies/${editingCompany.id}` : '/api/companies';
      const method = editingCompany ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      const resData = await res.json();
      if (!res.ok) {
        setErrorMsg(resData.error || 'Erro ao salvar empresa.');
        return;
      }

      setIsModalOpen(false);
      fetchCompanies();
    } catch (err: any) {
      setErrorMsg(err.message || 'Erro inesperado.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/companies/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setDeleteConfirmId(null);
        fetchCompanies();
      } else {
        const data = await res.json();
        alert(data.error || 'Erro ao excluir empresa.');
      }
    } catch (err) {
      alert('Erro ao excluir empresa.');
    }
  };

  const toggleStatus = async (comp: Company) => {
    try {
      const res = await fetch(`/api/companies/${comp.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: comp.active === 1 ? 0 : 1 })
      });
      if (res.ok) {
        fetchCompanies();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const filtered = companies.filter((c) => {
    const term = search.toLowerCase();
    return (
      c.name.toLowerCase().includes(term) ||
      (c.document && c.document.includes(term)) ||
      (c.email && c.email.toLowerCase().includes(term))
    );
  });

  const totalClients = companies.reduce((acc, c) => acc + (c.clientCount || 0), 0);
  const totalCertificates = companies.reduce((acc, c) => acc + (c.certificateCount || 0), 0);
  const totalActive = companies.filter(c => c.active === 1).length;

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2.5">
            <Building2 className="text-emerald-400" size={28} />
            Gestão de Empresas (Tenants)
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Controle os parceiros e empresas clientes que utilizam o sistema para gerenciar seus próprios certificados.
          </p>
        </div>
        <button
          onClick={openCreateModal}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-semibold rounded-xl transition duration-150 shadow-md shadow-emerald-500/20"
        >
          <Plus size={18} />
          Nova Empresa
        </button>
      </div>

      {/* Cards de Métricas */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
          <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Total de Empresas</p>
          <p className="text-2xl font-bold text-white mt-1">{companies.length}</p>
          <p className="text-xs text-emerald-400 mt-1">{totalActive} ativas no sistema</p>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
          <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Total de Clientes Registrados</p>
          <p className="text-2xl font-bold text-white mt-1">{totalClients}</p>
          <p className="text-xs text-slate-400 mt-1">Distribuídos entre empresas</p>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
          <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Certificados Monitorados</p>
          <p className="text-2xl font-bold text-white mt-1">{totalCertificates}</p>
          <p className="text-xs text-slate-400 mt-1">Em todas as empresas cadastradas</p>
        </div>
      </div>

      {/* Busca */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
        <div className="relative">
          <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            placeholder="Buscar por nome da empresa, CNPJ ou e-mail..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500"
          />
        </div>
      </div>

      {/* Tabela de Empresas */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-400 flex flex-col items-center justify-center gap-3">
            <Loader2 size={32} className="animate-spin text-emerald-500" />
            <p>Carregando empresas cadastradas...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            <Building2 size={40} className="mx-auto text-slate-600 mb-3" />
            <p className="font-semibold text-slate-300">Nenhuma empresa encontrada</p>
            <p className="text-xs text-slate-500 mt-1">Cadastre uma nova empresa parceira para começar.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="bg-slate-950/70 border-b border-slate-800 text-xs text-slate-400 uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-4">Empresa / Documento</th>
                  <th className="px-6 py-4">Contato</th>
                  <th className="px-6 py-4 text-center">Estatísticas</th>
                  <th className="px-6 py-4 text-center">Status</th>
                  <th className="px-6 py-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filtered.map((comp) => (
                  <tr key={comp.id} className="hover:bg-slate-800/40 transition">
                    <td className="px-6 py-4">
                      <div className="font-semibold text-white flex items-center gap-2">
                        {comp.name}
                        {comp.id === 'company-default' && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30">
                            MATRIZ
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-slate-400 mt-0.5 flex items-center gap-1.5">
                        <FileText size={12} className="text-slate-500" />
                        {comp.document || 'Sem CNPJ informado'}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-xs text-slate-300 flex items-center gap-1.5">
                        <Mail size={12} className="text-slate-500" />
                        {comp.email || '—'}
                      </div>
                      <div className="text-xs text-slate-400 mt-1 flex items-center gap-1.5">
                        <Phone size={12} className="text-slate-500" />
                        {comp.phone || '—'}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="inline-flex items-center gap-3 bg-slate-950/80 px-3 py-1.5 rounded-xl border border-slate-800 text-xs">
                        <span title="Clientes" className="flex items-center gap-1 text-slate-300">
                          <Users size={13} className="text-blue-400" />
                          {comp.clientCount || 0}
                        </span>
                        <span className="text-slate-700">|</span>
                        <span title="Certificados" className="flex items-center gap-1 text-slate-300">
                          <Award size={13} className="text-emerald-400" />
                          {comp.certificateCount || 0}
                        </span>
                        <span className="text-slate-700">|</span>
                        <span title="Usuários do Sistema" className="flex items-center gap-1 text-slate-300">
                          <Users size={13} className="text-purple-400" />
                          {comp.userCount || 0}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <button
                        onClick={() => toggleStatus(comp)}
                        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold transition ${
                          comp.active === 1
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/30'
                            : 'bg-rose-500/20 text-rose-400 border border-rose-500/30 hover:bg-rose-500/30'
                        }`}
                      >
                        {comp.active === 1 ? (
                          <>
                            <CheckCircle size={13} />
                            Ativa
                          </>
                        ) : (
                          <>
                            <XCircle size={13} />
                            Inativa
                          </>
                        )}
                      </button>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => openEditModal(comp)}
                          className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition"
                          title="Editar Empresa"
                        >
                          <Edit size={16} />
                        </button>
                        {comp.id !== 'company-default' && (
                          <button
                            onClick={() => setDeleteConfirmId(comp.id)}
                            className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-950/30 rounded-lg transition"
                            title="Excluir Empresa"
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Criar / Editar */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Building2 className="text-emerald-400" size={20} />
                {editingCompany ? 'Editar Empresa' : 'Cadastrar Nova Empresa Parceira'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            {errorMsg && (
              <div className="p-3 bg-rose-950/50 border border-rose-800 text-rose-300 text-xs rounded-xl flex items-center gap-2">
                <AlertTriangle size={16} className="shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Nome da Empresa / Razão Social *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Ex: Alfa Certificados Digitais"
                  className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-200 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  CNPJ (opcional)
                </label>
                <input
                  type="text"
                  value={formData.document}
                  onChange={(e) => setFormData({ ...formData, document: e.target.value })}
                  placeholder="00.000.000/0000-00"
                  className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-200 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    E-mail de Contato
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="contato@empresa.com"
                    className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-200 focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Telefone / WhatsApp
                  </label>
                  <input
                    type="text"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="(11) 99999-9999"
                    className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-200 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Status de Acesso
                </label>
                <select
                  value={formData.active}
                  onChange={(e) => setFormData({ ...formData, active: Number(e.target.value) })}
                  className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-200 focus:outline-none focus:border-emerald-500"
                >
                  <option value={1}>Ativa (Acesso Liberado)</option>
                  <option value={0}>Inativa (Acesso Bloqueado)</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-medium rounded-xl transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 bg-emerald-500 hover:bg-emerald-600 text-slate-950 text-sm font-semibold rounded-xl transition flex items-center gap-2"
                >
                  {saving && <Loader2 size={16} className="animate-spin" />}
                  {editingCompany ? 'Salvar Alterações' : 'Cadastrar Empresa'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirmação de Exclusão */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-sm w-full p-6 text-center space-y-4 shadow-2xl">
            <div className="w-12 h-12 bg-rose-950/60 border border-rose-800 rounded-full flex items-center justify-center mx-auto text-rose-400">
              <Trash2 size={24} />
            </div>
            <div>
              <h4 className="text-base font-bold text-white">Excluir esta empresa?</h4>
              <p className="text-xs text-slate-400 mt-1">
                Esta ação removerá a empresa do sistema. Se houver clientes ou usuários associados, certifique-se antes de continuar.
              </p>
            </div>
            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                onClick={() => setDeleteConfirmId(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-medium rounded-xl transition"
              >
                Cancelar
              </button>
              <button
                onClick={() => handleDelete(deleteConfirmId)}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-sm font-semibold rounded-xl transition"
              >
                Sim, Excluir
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
