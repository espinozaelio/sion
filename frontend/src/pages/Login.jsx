import { useState, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { User, Lock, LogIn, Eye, EyeOff, CheckCircle2, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import NetworkBackground from '../components/NetworkBackground';

/**
 * Pantalla de login. A diferencia de ForgotPassword/ResetPassword (que usan
 * el componente compartido AuthSidePanel), este panel izquierdo es propio y
 * autocontenido -- solo afecta a este módulo, sin tocar las otras pantallas
 * de autenticación ni sus componentes compartidos.
 */
export default function Login() {
  const { login, loading, error } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});
  const [success, setSuccess] = useState(false);
  const passwordRef = useRef(null);

  const validate = () => {
    const errs = {};
    if (!username.trim()) errs.username = 'El usuario es requerido.';
    if (!password) errs.password = 'La contraseña es requerida.';
    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    const ok = await login(username, password);
    if (ok) {
      setSuccess(true);
      setTimeout(() => navigate('/'), 900);
    }
  };

  return (
      <div
        className="min-h-screen flex flex-col lg:flex-row bg-tech-white"
        style={{ fontFamily: '"Segoe UI", Roboto, Helvetica, Arial, sans-serif' }}
    >
        {/* Panel izquierdo: solo logo + SION + descripción, centrados al nivel del formulario */}
      <div className="relative lg:w-1/2 bg-tech-bg flex items-center justify-center overflow-hidden min-h-[280px] lg:min-h-screen">
        <NetworkBackground className="absolute inset-0 w-full h-full" />

        <div className="absolute inset-0 bg-gradient-to-br from-tech-bg via-tech-bg/80 to-tech-bg/95" />

        <div className="relative z-10 flex flex-col items-center text-center gap-3 px-8">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-lg bg-tech-blue/15 border border-tech-blue/40 flex items-center justify-center shrink-0">
              <span className="font-mono font-bold text-tech-cyan text-lg">S</span>
            </div>
            <h1 className="font-mono font-bold text-3xl sm:text-4xl tracking-tight text-tech-white">
              SION
            </h1>
          </div>
          <p className="text-tech-gray text-xs sm:text-sm font-medium whitespace-nowrap">
            Sistema Integral de Operaciones de Negocio
          </p>
        </div>
      </div>

      {/* Panel derecho: formulario de acceso */}
      <div className="flex-1 flex items-center justify-center px-4 py-12 sm:px-8">
        <div className="w-full max-w-sm">
          <div className="mb-8 text-center lg:text-left">
            <h2 className="text-[22px] font-display font-bold text-slate-900">Iniciar sesión</h2>
               <p className="text-sm text-tech-gray mt-1">Ingresa tus credenciales para continuar</p>
          </div>

          {success ? (
            <div className="flex items-start gap-3 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-4 animate-fadeIn">
              <CheckCircle2 size={20} className="text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-emerald-800">¡Bienvenido de nuevo!</p>
                <p className="text-xs text-emerald-700 mt-0.5">Verificando credenciales, redirigiendo al panel...</p>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} noValidate className="space-y-4">
              <div>
                <label className="block text-[13px] font-semibold tracking-wide text-tech-gray mb-1.5">
                  Usuario
                </label>
                <div className="relative">
                  <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" />
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => { setUsername(e.target.value); if (fieldErrors.username) setFieldErrors({ ...fieldErrors, username: null }); }}
                    onKeyDown={(e) => { if (e.key === 'Enter') passwordRef.current?.focus(); }}
                    className={`w-full rounded-lg border bg-white px-3 py-2.5 pl-9 text-sm text-slate-900 placeholder:text-slate-300 focus:outline-none focus:ring-2 transition-shadow ${
                      fieldErrors.username ? 'border-red-300 focus:ring-red-500/30' : 'border-slate-200 focus:ring-tech-blue/30 focus:border-tech-blue'
                    }`}
                    placeholder="admin@miempresa.com"
                    autoFocus
                  />
                </div>
                {fieldErrors.username && (
                  <p className="flex items-center gap-1 text-xs text-red-600 mt-1.5">
                    <AlertCircle size={12} /> {fieldErrors.username}
                  </p>
                )}
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-[13px] font-semibold tracking-wide text-tech-gray">
                    Contraseña
                  </label>
                  <Link to="/olvide-password" className="text-[12px] font-semibold text-tech-blue hover:underline">
                    ¿Olvidaste tu contraseña?
                  </Link>
                </div>
                <div className="relative">
                  <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" />
                  <input
                    ref={passwordRef}
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => { setPassword(e.target.value); if (fieldErrors.password) setFieldErrors({ ...fieldErrors, password: null }); }}
                    className={`w-full rounded-lg border bg-white px-3 py-2.5 pl-9 pr-9 text-sm text-slate-900 placeholder:text-slate-300 focus:outline-none focus:ring-2 transition-shadow ${
                      fieldErrors.password ? 'border-red-300 focus:ring-red-500/30' : 'border-slate-200 focus:ring-tech-blue/30 focus:border-tech-blue'
                    }`}
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-500"
                    tabIndex={-1}
                    aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {fieldErrors.password && (
                  <p className="flex items-center gap-1 text-xs text-red-600 mt-1.5">
                    <AlertCircle size={12} /> {fieldErrors.password}
                  </p>
                )}
              </div>

              {error && (
                <p className="flex items-center gap-1.5 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                  <AlertCircle size={14} /> {error}
                </p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full inline-flex items-center justify-center gap-2 bg-tech-blue text-white px-4 py-2.5 rounded-lg font-medium text-[14px] hover:bg-blue-700 active:bg-blue-800 transition-colors shadow-sm shadow-tech-blue/20 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Verificando...' : <><LogIn size={16} /> Ingresar al sistema</>}
              </button>

              {/* .divider */}
              <div className="flex items-center gap-2.5 w-full mt-7">
                <span className="flex-1 border-t border-slate-200" />
                <span className="text-[11px] text-slate-400 whitespace-nowrap">TISOLUCIONESWEB, C.A</span>
                <span className="flex-1 border-t border-slate-200" />
              </div>
              {/* .footer-note */}
              <p className="text-[11px] text-slate-400 mt-3 text-center">
                © {new Date().getFullYear()}. Gerencia de Ingeniería de Software.
              </p>
              
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
