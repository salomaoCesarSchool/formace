import type { ReactNode } from 'react';

type Variante = 'verde' | 'laranja' | 'vermelho' | 'cinza' | 'azul';

interface BadgeStatusProps {
  /** Texto do badge (ex.: Ocupado, Vago, Vence em breve, Pago). */
  texto: string;
  variante?: Variante;
  children?: ReactNode;
}

const variantes: Record<Variante, string> = {
  verde: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  laranja: 'bg-amber-50 text-amber-700 border-amber-200',
  vermelho: 'bg-red-50 text-red-700 border-red-200',
  cinza: 'bg-slate-50 text-slate-600 border-slate-200',
  azul: 'bg-blue-50 text-blue-700 border-blue-200',
};

/** Mapeia status conhecidos para a variante de cor do badge. */
export function varianteDoStatus(status: string): Variante {
  switch (status.toUpperCase()) {
    case 'OCUPADO':
    case 'PAGO':
    case 'ATIVO':
      return 'verde';
    case 'VENCENDO':
    case 'PENDENTE':
      return 'laranja';
    case 'ATRASADO':
    case 'VENCIDO':
    case 'CANCELADO':
      return 'vermelho';
    case 'VAGO':
    case 'ENCERRADO':
      return 'cinza';
    default:
      return 'azul';
  }
}

/** Badge de status com cores padronizadas (tambem aceita texto livre, ex.: "vence 03/2027"). */
export default function BadgeStatus({ texto, variante }: BadgeStatusProps) {
  const estilo = variantes[variante ?? varianteDoStatus(texto)];
  return (
    <span
      className={`inline-flex items-center whitespace-nowrap rounded-full border px-2.5 py-0.5 text-xs font-semibold ${estilo}`}
    >
      {texto}
    </span>
  );
}
