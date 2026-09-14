import { Zap } from 'lucide-react';
import NetworkBackground from './NetworkBackground';
import { useLiveClock } from '../hooks/useLiveClock';

/**
 * Panel izquierdo compartido por las pantallas de autenticación (login,
 * olvidé mi contraseña, restablecer contraseña). Fondo oscuro técnico con
 * red de nodos animada, logo monospace y reloj en vivo.
 */
export default function AuthSidePanel({ compact = false }) {
  const { date, time } = useLiveClock();

  return (
    <div className="relative lg:w-1/2 bg-tech-bg text-tech-white flex flex-col overflow-hidden">
      <NetworkBackground className="absolute inset-0 w-full h-full" />
      {/* Viñeta para legibilidad del texto sobre la animación */}
      <div className="absolute inset-0 bg-gradient-to-br from-tech-bg via-tech-bg/80 to-tech-bg/95" />

      <div className={`relative z-10 flex flex-col ${compact ? 'justify-center items-center gap-6 flex-1' : 'justify-between flex-1'} px-8 py-10 sm:px-14 sm:py-14`}>
        {!compact && (
          <div className="flex items-center gap-2 text-tech-cyan">
            <Zap size={14} className="fill-tech-cyan" />
            <p className="text-xs font-mono font-semibold tracking-[0.25em] uppercase">Panel administrativo</p>
          </div>
        )}

        <div className={`flex flex-col ${compact ? 'items-center text-center' : 'items-center lg:items-start text-center lg:text-left'} gap-3`}>
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-lg bg-tech-blue/15 border border-tech-blue/40 flex items-center justify-center">
              <span className="font-mono font-bold text-tech-cyan text-lg">S</span>
            </div>
            <h1 className="font-mono font-bold text-3xl sm:text-4xl tracking-tight text-tech-white">
              SION
            </h1>
          </div>
          <p className="text-tech-gray text-sm sm:text-base max-w-xs font-medium">
            Sistema Integral de Operaciones de Negocio
          </p>
        </div>

        {!compact && (
          <div className="flex flex-col items-center lg:items-start gap-1">
            <p className="text-xs text-tech-gray font-mono capitalize">{date}</p>
            <p className="font-mono text-2xl sm:text-3xl font-semibold tracking-wide text-tech-white">
              {time}
            </p>
          </div>
        )}

        {!compact && (
          <div className="text-xs text-tech-gray font-mono">
            ventas · inventario · facturación · compras · cuentas_por_pagar · cuentas_por_cobrar
          </div>
        )}
      </div>
    </div>
  );
}
