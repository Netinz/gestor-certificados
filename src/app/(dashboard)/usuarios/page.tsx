'use client';

import { useState, useEffect } from 'react';
import { 
  UserCheck, 
  Plus, 
  Search, 
  Edit, 
  Trash2, 
  Building2, 
  Shield, 
  KeyRound, 
  User, 
  AlertTriangle,
  Loader2,
  Lock
} from 'lucide-react';

interface SystemUser {
  id: string;
  username: string;
  name: string;
  role: 'SUPER_ADMIN' | 'COMPANY_ADMIN' | 'USER';
  companyId: string | null;
  companyName: string | null;
  createdAt: string;
}

interface CompanyOption {
  id: string;
  name: string;
}

interface CurrentUserSession {
  id: string;
  username: string;
  name: string;
  role: 'SUPER_ADMIN' | 'COMPANY_ADMIN' | 'USER';
  companyId?: string | null;
  companyName?: string | null;
}

export default function UsersPage() {
  const [users, setUsers] = useState<SystemUser[]>([]);
  const [companies, setCompanies] = useState<CompanyOption[]>([]);
  const [currentSession, setCurrentSession] = useState<CurrentUserSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [companyFilter, setCompanyFilter] = useState('ALL');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<SystemUser | null>(null);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Form
  const [formData, setFormData] = useState({
    name: '',
    username: '',
    password: '',
    role: 'USER' as 'SUPER_ADMIN' | 'COMPANY_ADMIN' | 'USER',
    companyId: ''
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      const [sessRes, usersRes, compRes] = await Promise.all([
        fetch('/api/auth/me'),
        fetch('/api/users'),
        fetch('/api/companies')
      ]);

      if (sessRes.ok) {
        const sessData = await sessRes.json();
        setCurrentSession(sessData.user);
      }

      if (usersRes.ok) {
        const usersData = await usersRes.json();
        setUsers(usersData);
      }

      if (compRes.ok) {
        const compData = await compRes.json();
        setCompanies(compData);
      }
    } catch (err) {
      console.error('Erro ao carregar dados:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const openCreateModal = () => {
    setEditingUser(null);
    setFormData({
      name: '',
      username: '',
      password: '',
      role: 'USER',
      companyId: currentSession?.role === 'SUPER_ADMIN' ? (companies[0]?.id || '') : (currentSession?.companyId || '')
    });
    setErrorMsg('');
    setIsModalOpen(true);
  };

  const openEditModal = (u: SystemUser) => {
    setEditingUser(u);
    setFormData({
      name: u.name,
      username: u.username,
      password: '', // em branco para não alterar
      role: u.role,
      companyId: u.companyId || ''
    });
    setErrorMsg('');
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.username.trim()) {
      setErrorMsg('Nome e Usuário de Login são obrigatórios.');
      return;
    }

    if (!editingUser && !formData.password.trim()) {
      setErrorMsg('A senha é obrigatória ao cadastrar um novo usuário.');
      return;
    }

    try {
      setSaving(true);
      setErrorMsg('');

      const url = editingUser ? `/api/users/${editingUser.id}` : '/api/users';
      const method = editingUser ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      const resData = await res.json();
      if (!res.ok) {
        setErrorMsg(resData.error || 'Erro ao salvar usuário.');
        return;
      }

      setIsModalOpen(false);
      fetchData();
    } catch (err: any) {
      setErrorMsg(err.message || 'Erro inesperado.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/users/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setDeleteConfirmId(null);
        fetchData();
      } else {
        const data = await res.json();
        alert(data.error || 'Erro ao excluir usuário.');
      }
    } catch (err) {
      alert('Erro ao excluir usuário.');
    }
  };

  const filtered = users.filter((u) => {
    const term = search.toLowerCase();
    const matchesSearch = 
      u.name.toLowerCase().includes(term) ||
      u.username.toLowerCase().includes(term) ||
      (u.companyName && u.companyName.toLowerCase().includes(term));

    const matchesRole = roleFilter === 'ALL' || u.role === roleFilter;
    const matchesCompany = companyFilter === 'ALL' || u.companyId === companyFilter;

    return matchesSearch && matchesRole && matchesCompany;
  });

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'SUPER_ADMIN':
        return { label: 'Super Admin', class: 'bg-purple-500/20 text-purple-300 border-purple-500/30' };
      case 'COMPANY_ADMIN':
        return { label: 'Admin da Empresa', class: 'bg-blue-500/20 text-blue-300 border-blue-500/30' };
      case 'USER':
      default:
        return { label: 'Operador', class: 'bg-slate-700/60 text-slate-300 border-slate-600/30' };
    }
  };

  const isSuperAdmin = currentSession?.role === 'SUPER_ADMIN';

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2.5">
            <UserCheck className="text-emerald-400" size={28} />
            Gestão de Usuários e Acessos
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            {isSuperAdmin 
              ? 'Gerencie os operadores e administradores de todas as empresas cadastradas no sistema.'
              : `Gerencie os membros e operadores com acesso à sua empresa (${currentSession?.companyName || 'Sua Empresa'}).`
            }
          </p>
        </div>
        <button
          onClick={openCreateModal}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-semibold rounded-xl transition duration-150 shadow-md shadow-emerald-500/20"
        >
          <Plus size={18} />
          Novo Usuário
        </button>
      </div>

      {/* Barra de Filtros */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            placeholder="Buscar por nome, usuário ou empresa..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500"
          />
        </div>

        <div className="flex gap-2.5">
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-300 focus:outline-none focus:border-emerald-500"
          >
            <option value="ALL">Todos os Níveis</option>
            {isSuperAdmin && <option value="SUPER_ADMIN">Super Admin</option>}
            <option value="COMPANY_ADMIN">Admin da Empresa</option>
            <option value="USER">Operador</option>
          </select>

          {isSuperAdmin && companies.length > 0 && (
            <select
              value={companyFilter}
              onChange={(e) => setCompanyFilter(e.target.value)}
              className="px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-300 focus:outline-none focus:border-emerald-500 max-w-[200px] truncate"
            >
              <option value="ALL">Todas as Empresas</option>
              {companies.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* Tabela de Usuários */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-400 flex flex-col items-center justify-center gap-3">
            <Loader2 size={32} className="animate-spin text-emerald-500" />
            <p>Carregando lista de usuários...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            <UserCheck size={40} className="mx-auto text-slate-600 mb-3" />
            <p className="font-semibold text-slate-300">Nenhum usuário encontrado</p>
            <p className="text-xs text-slate-500 mt-1">Cadastre novos operadores ou administradores.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="bg-slate-950/70 border-b border-slate-800 text-xs text-slate-400 uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-4">Usuário</th>
                  <th className="px-6 py-4">Nível de Acesso</th>
                  <th className="px-6 py-4">Empresa Vinculada</th>
                  <th className="px-6 py-4">Data de Cadastro</th>
                  <th className="px-6 py-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filtered.map((u) => {
                  const roleBadge = getRoleLabel(u.role);
                  const isCurrentLogged = currentSession?.id === u.id;
                  const isMasterAdmin = u.username === 'admin';

                  return (
                    <tr key={u.id} className="hover:bg-slate-800/40 transition">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300 font-bold text-sm shrink-0">
                            {u.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="font-semibold text-white flex items-center gap-2">
                              {u.name}
                              {isCurrentLogged && (
                                <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 font-medium">
                                  Você
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-slate-400">@{u.username}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full font-semibold border ${roleBadge.class}`}>
                          <Shield size={12} />
                          {roleBadge.label}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-1.5 text-xs text-slate-300 font-medium">
                          <Building2 size={14} className="text-emerald-400 shrink-0" />
                          <span className="truncate max-w-[200px]" title={u.companyName || 'Empresa Matriz'}>
                            {u.companyName || (u.companyId ? 'Empresa Desconhecida' : 'Matriz Global')}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-xs text-slate-400">
                        {u.createdAt ? new Date(u.createdAt).toLocaleDateString('pt-BR') : '—'}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => openEditModal(u)}
                            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition"
                            title="Editar Usuário"
                          >
                            <Edit size={16} />
                          </button>
                          {!isMasterAdmin && !isCurrentLogged && (
                            <button
                              onClick={() => setDeleteConfirmId(u.id)}
                              className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-950/30 rounded-lg transition"
                              title="Excluir Usuário"
                            >
                              <Trash2 size={16} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Criar / Editar */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <UserCheck className="text-emerald-400" size={20} />
                {editingUser ? 'Editar Usuário' : 'Cadastrar Novo Usuário'}
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
                  Nome Completo *
                </label>
                <div className="relative">
                  <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Ex: João da Silva"
                    className="w-full pl-9 pr-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-200 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Nome de Usuário (Login de Acesso) *
                </label>
                <input
                  type="text"
                  required
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  placeholder="Ex: joaosilva"
                  className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-200 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  {editingUser ? 'Nova Senha (deixe em branco para manter a atual)' : 'Senha de Acesso *'}
                </label>
                <div className="relative">
                  <KeyRound size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    type="password"
                    required={!editingUser}
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    placeholder={editingUser ? '•••••••• (manter inalterada)' : 'Defina a senha do usuário'}
                    className="w-full pl-9 pr-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-200 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Nível de Permissão *
                </label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value as any })}
                  className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-200 focus:outline-none focus:border-emerald-500"
                >
                  <option value="USER">Operador (Apenas Certificados e Clientes)</option>
                  <option value="COMPANY_ADMIN">Administrador da Empresa (Gerencia Clientes e Usuários da Empresa)</option>
                  {isSuperAdmin && (
                    <option value="SUPER_ADMIN">Super Administrador (Acesso Global a Todas as Empresas)</option>
                  )}
                </select>
              </div>

              {isSuperAdmin && (
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Empresa Vinculada *
                  </label>
                  <div className="relative">
                    <Building2 size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                    <select
                      value={formData.companyId}
                      onChange={(e) => setFormData({ ...formData, companyId: e.target.value })}
                      className="w-full pl-9 pr-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-200 focus:outline-none focus:border-emerald-500"
                    >
                      {companies.map((c) => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

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
                  {editingUser ? 'Salvar Alterações' : 'Cadastrar Usuário'}
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
              <h4 className="text-base font-bold text-white">Excluir este usuário?</h4>
              <p className="text-xs text-slate-400 mt-1">
                O acesso deste usuário ao sistema será revogado permanentemente.
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
