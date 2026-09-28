import type { LucideIcon } from 'lucide-react';

interface CardKPIProps {
  titulo: string;
  valor: string;
  legenda?: string;
  icone: LucideIcon;
  /** Cor do bloco do icone. */
  tom?: 'slate' | 'verde' | 'azul' | 'ambar' | 'vermelho';
  tendencia?: string;
}

const tons: Record<NonNullable<CardKPIProps['tom']>, string> = {
  slate: 'bg-slate-100 text-slate-700',
  verde: 'bg-emerald-100 text-emerald-700',
  azul: 'bg-blue-100 text-blue-700',
  ambar: 'bg-amber-100 text-amber-700',
  vermelho: 'bg-red-100 text-red-700',
};

/**
 * Card de KPI do dashboard (ex.: 108/124 ocupados, Receita R$ 64.200, Contratos a vencer: 7).
 */
export default function CardKPI({ titulo, valor, legenda, icone: Icone, tom = 'slate', tendencia }: CardKPIProps) {
  return (
    <div className="cartao flex items-start justify-between gap-4 p-5">
      <div className="min-w-0">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{titulo}</p>
        <p className="mt-2 truncate text-2xl font-bold text-slate-900">{valor}</p>
        {(legenda || tendencia) && (
          <p className="mt-1 text-xs text-slate-500">
            {legenda}
            {tendencia ? <span className="ml-2 font-semibold text-emerald-600">{tendencia}</span> : null}
          </p>
        )}
      </div>
      <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-lg ${tons[tom]}`}>
        <Icone size={20} />
      </div>
    </div>
  );
}
