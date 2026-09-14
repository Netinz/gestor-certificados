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
  Menu,
  X
} from 'lucide-react';
import { useState } from 'react';

const navItems = [
  { label: 'Vencimentos & Alertas', href: '/vencimentos', icon: Clock },
  { label: 'Certificados', href: '/certificados', icon: Award },
  { label: 'Clientes', href: '/clientes', icon: Users },
  { label: 'Configurações', href: '/configuracoes', icon: Settings },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
    router.refresh();
  };

  return (
    <>
      {/* Topbar Mobile elegante (evita sobreposição no título da página) */}
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
        transition-transform duration-300 ease-in-out
        ${mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        <div>
          {/* Logo / Header */}
          <div className="flex items-center gap-3 px-6 py-6 border-b border-slate-800">
            <div className="bg-emerald-500 text-slate-950 p-2 rounded-xl shadow-lg shadow-emerald-500/20">
              <ShieldCheck size={26} strokeWidth={2.4} />
            </div>
            <div>
              <h1 className="font-bold text-white text-base leading-tight tracking-tight">CertManager</h1>
              <p className="text-xs text-slate-400">Gestão de Certificados</p>
            </div>
          </div>

          {/* Navegação */}
          <nav className="p-4 space-y-1.5">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname.startsWith(item.href);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  className={`flex items-center gap-3.5 px-4 py-3 rounded-xl font-medium text-sm transition-all duration-200 ${
                    isActive
                      ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/25 font-semibold'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                  }`}
                >
                  <Icon size={19} className={isActive ? 'text-slate-950' : 'text-slate-400'} />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Rodapé do Menu com Logout */}
        <div className="p-4 border-t border-slate-800">
          <div className="px-4 py-2 mb-2">
            <p className="text-xs font-medium text-slate-400">Logado como</p>
            <p className="text-sm font-semibold text-slate-200">Administrador</p>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium text-red-400 hover:bg-red-950/30 hover:text-red-300 transition"
          >
            <LogOut size={18} />
            Sair do Sistema
          </button>
        </div>
      </aside>
    </>
  );
}