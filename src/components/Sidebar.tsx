'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { 
  Users, 
  Award, 
  Clock, 
  Settings, 
  LogOut, 
  ShieldCheck,
  Building2,
  UserCheck,
  Menu,
  X
} from 'lucide-react';
import { useState, useEffect } from 'react';

interface CurrentUser {
  id: string;
  username: string;
  name: string;
  role: 'SUPER_ADMIN' | 'COMPANY_ADMIN' | 'USER';
  companyId?: string | null;
  companyName?: string | null;
}

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);

  useEffect(() => {
    fetch('/api/auth/me')
      .then((res) => {
        if (res.ok) return res.json();
        return null;
      })
      .then((data) => {
        if (data?.user) {
          setCurrentUser(data.user);
        }
      })
      .catch(() => {});
  }, []);

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
    router.refresh();
  };

  const navItems = [
    { label: 'Vencimentos & Alertas', href: '/vencimentos', icon: Clock, show: true },
    { label: 'Certificados', href: '/certificados', icon: Award, show: true },
    { label: 'Clientes', href: '/clientes', icon: Users, show: true },
    { 
      label: 'Empresas', 
      href: '/empresas', 
      icon: Building2, 
      show: currentUser?.role === 'SUPER_ADMIN' 
    },
    { 
      label: 'Usuários', 
      href: '/usuarios', 
      icon: UserCheck, 
      show: currentUser?.role === 'SUPER_ADMIN' || currentUser?.role === 'COMPANY_ADMIN' 
    },
    { label: 'Configurações', href: '/configuracoes', icon: Settings, show: true },
  ];

  const getRoleBadge = (role?: string) => {
    switch (role) {
      case 'SUPER_ADMIN':
        return <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 font-semibold border border-purple-500/30">Super Admin</span>;
      case 'COMPANY_ADMIN':
        return <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 font-semibold border border-blue-500/30">Admin Empresa</span>;
      case 'USER':
      default:
        return <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-700 text-slate-300 font-medium">Operador</span>;
    }
  };

  return (
    <>
      {/* Topbar Mobile */}
      <div className="lg:hidden sticky top-0 z-40 bg-slate-900/95 backdrop-blur-md border-b border-slate-800 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="bg-emerald-500 text-slate-950 p-1.5 rounded-lg shadow-sm">
            <ShieldCheck size={20} strokeWidth={2.4} />
          </div>
          <span className="font-bold text-white text-sm">CertManager</span>
        </div>
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl border border-slate-700 transition"
          aria-label="Menu"
        >
          {mobileOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {/* Overlay Mobile */}
      {mobileOpen && (
        <div 
          className="lg:hidden fixed inset-0 bg-black/50 z-40"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed top-0 left-0 bottom-0 z-40 w-64 bg-slate-900 text-slate-200 flex flex-col justify-between
        transition-transform duration-300 ease-in-out border-r border-slate-800
        ${mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        <div>
          {/* Logo / Header */}
          <div className="flex items-center gap-3 px-6 py-5 border-b border-slate-800">
            <div className="bg-emerald-500 text-slate-950 p-2 rounded-xl shadow-lg shadow-emerald-500/20">
              <ShieldCheck size={24} strokeWidth={2.4} />
            </div>
            <div>
              <h1 className="font-bold text-white text-base leading-tight tracking-tight">CertManager</h1>
              <p className="text-[11px] text-emerald-400 font-medium tracking-wide">AIRA SAAS</p>
            </div>
          </div>

          {/* Empresa Ativa / Tenant */}
          {currentUser?.companyName && (
            <div className="mx-4 mt-4 px-3 py-2 bg-slate-800/60 rounded-xl border border-slate-800 flex items-center gap-2.5">
              <Building2 size={16} className="text-emerald-400 shrink-0" />
              <div className="min-w-0">
                <p className="text-[10px] text-slate-400 uppercase font-semibold tracking-wider truncate">Empresa Ativa</p>
                <p className="text-xs font-semibold text-white truncate" title={currentUser.companyName}>
                  {currentUser.companyName}
                </p>
              </div>
            </div>
          )}

          {/* Navegação */}
          <nav className="p-4 space-y-1">
            {navItems.filter(item => item.show).map((item) => {
              const Icon = item.icon;
              const isActive = pathname.startsWith(item.href);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-medium text-sm transition-all duration-200 ${
                    isActive
                      ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/25 font-semibold'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                  }`}
                >
                  <Icon size={18} className={isActive ? 'text-slate-950' : 'text-slate-400'} />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Rodapé com Informações do Usuário & Logout */}
        <div className="p-4 border-t border-slate-800 bg-slate-900/50">
          <div className="px-2 py-1.5 mb-2">
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs font-semibold text-slate-200 truncate" title={currentUser?.name || 'Carregando...'}>
                {currentUser?.name || 'Administrador'}
              </p>
              {getRoleBadge(currentUser?.role)}
            </div>
            <p className="text-[11px] text-slate-400 truncate">@{currentUser?.username || 'admin'}</p>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-rose-400 hover:bg-rose-950/30 hover:text-rose-300 transition"
          >
            <LogOut size={16} />
            Sair do Sistema
          </button>
        </div>
      </aside>
    </>
  );
}