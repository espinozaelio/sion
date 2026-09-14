import { ChevronLeft, ChevronRight } from 'lucide-react';

export default function Pagination({ page, totalPages, total, onPageChange }) {
  if (!totalPages || totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-between px-4 py-3 border-t border-petrol-900/8 flex-wrap gap-3">
      <p className="text-xs text-petrol-900/50">
        Página {page} de {totalPages} {typeof total === 'number' ? `· ${total} registro(s)` : ''}
      </p>
      <div className="flex items-center gap-1">
        <button
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          className="btn-icon disabled:opacity-30 disabled:pointer-events-none"
          aria-label="Página anterior"
        >
          <ChevronLeft size={16} />
        </button>
        <span className="text-xs font-semibold text-petrol-900 px-2 font-mono">{page} / {totalPages}</span>
        <button
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
          className="btn-icon disabled:opacity-30 disabled:pointer-events-none"
          aria-label="Página siguiente"
        >
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
}
