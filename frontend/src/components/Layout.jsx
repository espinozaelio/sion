import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, ShoppingCart, Receipt, Package, Users, Settings as SettingsIcon,
  Menu, X, LogOut, Truck, ClipboardList, Landmark, Wallet, UserCog,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useModules } from '../context/ModulesContext';

const navItems = [
  { to: '/', label: 'Panel', Icon: LayoutDashboard },
  { to: '/ventas', label: 'Nueva venta', Icon: ShoppingCart },
  { to: '/facturas', label: 'Facturas', Icon: Receipt },
  { to: '/inventario', label: 'Inventario', Icon: Package },
  { to: '/clientes', label: 'Clientes', Icon: Users },
  { to: '/proveedores', label: 'Proveedores', Icon: Truck, moduleKey: 'proveedores' },
  { to: '/compras', label: 'Compras', Icon: ClipboardList, moduleKey: 'compras' },
  { to: '/cuentas-por-pagar', label: 'Cuentas por pagar', Icon: Landmark, moduleKey: 'cuentas_por_pagar'  },
  { to: '/cuentas-por-cobrar', label: 'Cuentas por cobrar', Icon: Wallet, moduleKey: 'cuentas_por_cobrar' },
  { to: '/usuarios', label: 'Usuarios', Icon: UserCog, adminOnly: true },
  { to: '/configuracion', label: 'Configuración fiscal', Icon: SettingsIcon, adminOnly: true },
];

function initials(name = '') {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join('');
}

export default function Layout({ children }) {
  const { user, logout } = useAuth();
  const { isEnabled } = useModules();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const sidebarContent = (
    <>
      {/* Encabezado: mismo color de fondo del login, sin el efecto de red */}
      <div className="px-6 py-6 border-b border-white/10 flex items-center justify-between bg-tech-bg">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-lg bg-tech-blue/15 border border-tech-blue/40 flex items-center justify-center shrink-0">
            <span className="font-mono font-bold text-tech-cyan text-base">S</span>
          </div>
          <p className="font-mono font-bold text-lg leading-tight text-white">SION</p>
        </div>
        <button
          onClick={() => setMenuOpen(false)}
          className="lg:hidden text-petrol-100/70 hover:text-white"
          aria-label="Cerrar menú"
        >
          <X size={22} />
        </button>
      </div>

      {/* Opciones: mismo color de fondo del login (sin efecto), iconos en cian (color de la "S") */}
      <nav className="flex-1 px-3 py-4 space-y-1 bg-tech-bg">
        {navItems
          .filter((item) => (!item.adminOnly || user?.role === 'admin') && (!item.moduleKey || isEnabled(item.moduleKey)))
          .map(({ to, label, Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              onClick={() => setMenuOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-white/10 text-white shadow-sm'
                    : 'text-white/70 hover:bg-white/5 hover:text-white'
                }`
              }
            >
              <Icon size={18} strokeWidth={2} className="shrink-0 text-tech-cyan" />
              {label}
            </NavLink>
          ))}
      </nav>

      <div className="px-4 py-4 border-t border-white/10 bg-tech-bg">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center text-tech-cyan text-xs font-bold shrink-0">
            {initials(user?.full_name) || '?'}
          </div>
          <div className="min-w-0">
            <p className="text-sm text-white font-medium truncate">{user?.full_name}</p>
            <p className="text-xs text-petrol-100/60 truncate">{user?.role === 'admin' ? 'Administrador' : 'Vendedor'}</p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 pl-2 text-xs font-semibold tracking-wide text-petrol-100/70 hover:text-white transition-colors"
        >
          <LogOut size={14} className="text-tech-cyan" /> Cerrar Sesión
        </button>
      </div>
    </>
  );

  return (
    <div className="min-h-screen flex bg-surface">
      {/* Barra lateral fija en escritorio */}
      <aside className="hidden lg:flex w-64 shrink-0 bg-petrol-900 text-petrol-50 flex-col">
        {sidebarContent}
      </aside>

      {/* Menú deslizable en móvil */}
      {menuOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-petrol-950/50" onClick={() => setMenuOpen(false)} />
          <aside className="absolute inset-y-0 left-0 w-72 max-w-[85%] bg-petrol-900 text-petrol-50 flex flex-col shadow-xl">
            {sidebarContent}
          </aside>
        </div>
      )}

      <div className="flex-1 min-w-0 flex flex-col">
        {/* Barra superior solo en móvil */}
        <header className="lg:hidden flex items-center justify-between px-4 py-3 bg-petrol-900 text-white sticky top-0 z-30 print:hidden">
          <button onClick={() => setMenuOpen(true)} className="p-1" aria-label="Abrir menú">
            <Menu size={22} />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-tech-blue/15 border border-tech-blue/40 flex items-center justify-center shrink-0">
              <span className="font-mono font-bold text-tech-cyan text-xs">S</span>
            </div>
            <p className="font-mono font-bold text-sm">SION</p>
          </div>
          <span className="w-6" />
        </header>

        <main className="flex-1 overflow-y-auto">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8">{children}</div>
        </main>
      </div>
    </div>
  );
}
