import { Bell } from 'lucide-react';
import { sessaoAtual } from '../api/axios';

interface HeaderProps {
  titulo: string;
  subtitulo?: string;
  /** Quantidade de alertas pendentes exibidos no sino. */
  alertas?: number;
}

/**
 * Cabecalho superior da area logada: titulo da pagina, data e usuario.
 */
export default function Header({ titulo, subtitulo, alertas = 0 }: HeaderProps) {
  const usuario = sessaoAtual();
  const hoje = new Date().toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });

  return (
    <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/90 px-8 py-4 backdrop-blur">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">{titulo}</h1>
          {subtitulo ? (
            <p className="mt-0.5 text-xs text-slate-500">{subtitulo}</p>
          ) : (
            <p className="mt-0.5 text-xs capitalize text-slate-500">{hoje}</p>
          )}
        </div>

        <div className="flex items-center gap-4">
          <div className="relative">
            <button
              type="button"
              className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 text-slate-600 transition hover:bg-slate-50"
              title={alertas > 0 ? `${alertas} alerta(s) ativo(s)` : 'Nenhum alerta novo'}
            >
              <Bell size={18} />
            </button>
            {alertas > 0 && (
              <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
                {alertas}
              </span>
            )}
          </div>

          <div className="flex items-center gap-3 border-l border-slate-200 pl-4">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-900 text-sm font-semibold text-white">
              {(usuario?.nome ?? 'U').charAt(0).toUpperCase()}
            </div>
            <div className="hidden sm:block">
              <p className="text-sm font-semibold text-slate-800">{usuario?.nome ?? 'Usuario'}</p>
              <p className="text-[11px] text-slate-500">{usuario?.username ?? ''}</p>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
