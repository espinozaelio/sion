import { useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { Lock, ArrowLeft, ShieldCheck, Eye, EyeOff, AlertCircle, CheckCircle2 } from 'lucide-react';
import api from '../api/client';
import AuthSidePanel from '../components/AuthSidePanel';

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token') || '';
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const validate = () => {
    const errs = {};
    if (password.length < 6) errs.password = 'Debe tener al menos 6 caracteres.';
    if (confirmPassword !== password) errs.confirmPassword = 'Las contraseñas no coinciden.';
    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!validate()) return;

    setSubmitting(true);
    try {
      await api.post('/auth/reset-password', { token, new_password: password });
      setSuccess(true);
      setTimeout(() => navigate('/login'), 2200);
    } catch (err) {
      setError(err.response?.data?.message || 'No se pudo restablecer la contraseña.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-tech-white">
      <AuthSidePanel compact />

      <div className="flex-1 flex items-center justify-center px-4 py-12 sm:px-8">
        <div className="w-full max-w-sm">
          <Link to="/login" className="inline-flex items-center gap-1.5 text-sm text-tech-blue font-medium hover:underline mb-6">
            <ArrowLeft size={16} /> Volver al inicio de sesión
          </Link>

          {!token ? (
            <p className="flex items-center gap-1.5 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              <AlertCircle size={14} /> Enlace inválido: falta el token de restablecimiento. Solicita uno nuevo desde "¿Olvidaste tu contraseña?".
            </p>
          ) : success ? (
            <div className="flex items-start gap-3 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-4 animate-fadeIn">
              <ShieldCheck size={20} className="text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-emerald-800">Contraseña actualizada</p>
                <p className="text-xs text-emerald-700 mt-0.5">Te redirigiremos al inicio de sesión...</p>
              </div>
            </div>
          ) : (
            <>
              <div className="mb-6">
                <div className="w-11 h-11 rounded-xl bg-tech-blue/10 flex items-center justify-center mb-4">
                  <Lock size={20} className="text-tech-blue" />
                </div>
                <h2 className="text-2xl font-display font-bold text-slate-900">Nueva contraseña</h2>
                <p className="text-sm text-tech-gray mt-1">Elige una contraseña segura para tu cuenta.</p>
              </div>
              <form onSubmit={handleSubmit} noValidate className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wide text-tech-gray mb-1.5">
                    Nueva contraseña
                  </label>
                  <div className="relative">
                    <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => { setPassword(e.target.value); if (fieldErrors.password) setFieldErrors({ ...fieldErrors, password: null }); }}
                      className={`w-full rounded-lg border bg-white px-3 py-2.5 pl-9 pr-9 text-sm text-slate-900 focus:outline-none focus:ring-2 transition-shadow ${
                        fieldErrors.password ? 'border-red-300 focus:ring-red-500/30' : 'border-slate-200 focus:ring-tech-blue/30 focus:border-tech-blue'
                      }`}
                      autoFocus
                    />
                    <button type="button" onClick={() => setShowPassword((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-500" tabIndex={-1}>
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  {fieldErrors.password && (
                    <p className="flex items-center gap-1 text-xs text-red-600 mt-1.5"><AlertCircle size={12} /> {fieldErrors.password}</p>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wide text-tech-gray mb-1.5">
                    Confirmar contraseña
                  </label>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => { setConfirmPassword(e.target.value); if (fieldErrors.confirmPassword) setFieldErrors({ ...fieldErrors, confirmPassword: null }); }}
                    className={`w-full rounded-lg border bg-white px-3 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 transition-shadow ${
                      fieldErrors.confirmPassword ? 'border-red-300 focus:ring-red-500/30' : 'border-slate-200 focus:ring-tech-blue/30 focus:border-tech-blue'
                    }`}
                  />
                  {fieldErrors.confirmPassword && (
                    <p className="flex items-center gap-1 text-xs text-red-600 mt-1.5"><AlertCircle size={12} /> {fieldErrors.confirmPassword}</p>
                  )}
                </div>
                {error && (
                  <p className="flex items-center gap-1.5 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                    <AlertCircle size={14} /> {error}
                  </p>
                )}
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full inline-flex items-center justify-center gap-2 bg-tech-blue text-white px-4 py-2.5 rounded-lg font-medium text-sm hover:bg-blue-700 transition-colors shadow-sm shadow-tech-blue/20 disabled:opacity-50"
                >
                  {submitting ? 'Guardando...' : 'Restablecer contraseña'}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
