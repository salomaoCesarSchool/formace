// Helpers de formatacao (pt-BR).

const moeda = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
});

/** Formata um valor monetario (R$ 1.234,56). */
export function formatBRL(valor: number | null | undefined): string {
  if (valor === null || valor === undefined || Number.isNaN(valor)) {
    return moeda.format(0);
  }
  return moeda.format(valor);
}

/** Converte '2026-09-10' em '10/09/2026'. */
export function formatData(iso: string | null | undefined): string {
  if (!iso) return '-';
  const [ano, mes, dia] = iso.slice(0, 10).split('-');
  if (!ano || !mes || !dia) return iso;
  return `${dia}/${mes}/${ano}`;
}

/** Converte '2026-09-10T14:33:01' em '10/09/2026 14:33'. */
export function formatDataHora(iso: string | null | undefined): string {
  if (!iso) return '-';
  const [data, hora] = iso.split('T');
  return hora ? `${formatData(data)} ${hora.slice(0, 5)}` : formatData(data);
}

/** Converte '2026-09' em '09/2026'. */
export function formatMesReferencia(mes: string | null | undefined): string {
  if (!mes || mes.length < 7) return '-';
  return `${mes.slice(5, 7)}/${mes.slice(0, 4)}`;
}

/** Data atual no formato AAAA-MM (mes de referencia corrente). */
export function mesAtual(): string {
  const hoje = new Date();
  return `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}`;
}

/** Primeiro dia do mes no formato AAAA-MM-DD. */
export function primeiroDiaDoMes(mes: string): string {
  return `${mes}-01`;
}

/** Ultimo dia do mes no formato AAAA-MM-DD. */
export function ultimoDiaDoMes(mes: string): string {
  const [ano, m] = mes.split('-').map(Number);
  const ultimo = new Date(ano, m, 0).getDate();
  return `${mes}-${String(ultimo).padStart(2, '0')}`;
}

/** Dias ate uma data (negativo se ja passou). */
export function diasAte(iso: string): number {
  const alvo = new Date(`${iso.slice(0, 10)}T00:00:00`);
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  return Math.round((alvo.getTime() - hoje.getTime()) / 86400000);
}

/** Rotulo curto de vencimento, ex.: 'vence 03/2027'. */
export function rotuloVencimento(dataFim: string): string {
  const [ano, mes] = dataFim.slice(0, 10).split('-');
  return `vence ${mes}/${ano}`;
}
