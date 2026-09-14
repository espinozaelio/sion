import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, ArrowLeft, KeyRound, AlertCircle, CheckCircle2 } from 'lucide-react';
import api from '../api/client';
import NetworkBackground from '../components/NetworkBackground';

/**
 * Misma identidad visual autocontenida que Login.jsx (panel izquierdo propio,
 * sin depender de AuthSidePanel) para que ambas pantallas luzcan idénticas.
 */
export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [fieldError, setFieldError] = useState('');
  const [status, setStatus] = useState('idle'); // idle | sending | sent
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setFieldError('');

    if (!email.trim()) {
      setFieldError('El correo es requerido.');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setFieldError('Ingresa un correo válido.');
      return;
    }

    setStatus('sending');
    try {
      await api.post('/auth/forgot-password', { email });
      setStatus('sent');
    } catch (err) {
      setError(err.response?.data?.message || 'No se pudo procesar la solicitud.');
      setStatus('idle');
    }
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-tech-white">
      {/* Panel izquierdo: idéntico al de Login.jsx */}
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

      {/* Panel derecho: formulario */}
      <div className="flex-1 flex items-center justify-center px-4 py-12 sm:px-8">
        <div className="w-full max-w-sm">
          <Link to="/login" className="inline-flex items-center gap-1.5 text-sm text-tech-blue font-medium hover:underline mb-6">
            <ArrowLeft size={16} /> Volver al inicio de sesión
          </Link>

          <div className="mb-8 text-center lg:text-left">
            <div className="w-11 h-11 rounded-xl bg-tech-blue/10 flex items-center justify-center mb-4 mx-auto lg:mx-0">
              <KeyRound size={20} className="text-tech-blue" />
            </div>
            <h2 className="text-lg font-display font-bold text-slate-900">¿Olvidaste tu contraseña?</h2>
            <p className="text-sm text-tech-gray mt-1">Ingresa tu correo y te enviaremos un enlace para restablecerla.</p>
          </div>

          {status === 'sent' ? (
            <div className="flex items-start gap-3 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-4 animate-fadeIn">
              <CheckCircle2 size={20} className="text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-emerald-800">Solicitud enviada</p>
                <p className="text-xs text-emerald-700 mt-0.5">
                  Si el correo existe en el sistema, se generó un enlace de restablecimiento. Si tu negocio no tiene correo configurado, pide a tu administrador que te lo genere desde el módulo de Usuarios.
                </p>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} noValidate className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wide text-tech-gray mb-1.5">
                  Correo electrónico
                </label>
                <div className="relative">
                  <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => { setEmail(e.target.value); setFieldError(''); }}
                    className={`w-full rounded-lg border bg-white px-3 py-2.5 pl-9 text-sm text-slate-900 placeholder:text-slate-300 focus:outline-none focus:ring-2 transition-shadow ${
                      fieldError ? 'border-red-300 focus:ring-red-500/30' : 'border-slate-200 focus:ring-tech-blue/30 focus:border-tech-blue'
                    }`}
                    placeholder="tu@correo.com"
                    autoFocus
                  />
                </div>
                {fieldError && (
                  <p className="flex items-center gap-1 text-xs text-red-600 mt-1.5">
                    <AlertCircle size={12} /> {fieldError}
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
                disabled={status === 'sending'}
                className="w-full inline-flex items-center justify-center gap-2 bg-tech-blue text-white px-4 py-2.5 rounded-lg font-medium text-sm hover:bg-blue-700 active:bg-blue-800 transition-colors shadow-sm shadow-tech-blue/20 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {status === 'sending' ? 'Enviando...' : 'Enviar enlace de recuperación'}
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
