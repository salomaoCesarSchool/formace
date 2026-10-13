import { useSyncExternalStore } from "react";
import type { ContratoCriado } from "../components/NovoContrato";

/* Guarda os contratos gerados pelo assistente "+ Novo contrato PDF" no navegador
   (localStorage), para todas as telas enxergarem e para nao sumirem ao recarregar.
   Contratos criados na API tambem ficam aqui, guardando o HTML assinado. */

const CHAVE = "contratos-criados";

function ler(): ContratoCriado[] {
  try {
    const t = localStorage.getItem(CHAVE);
    return t ? (JSON.parse(t) as ContratoCriado[]) : [];
  } catch {
    return [];
  }
}

let lista: ContratoCriado[] = ler();
const ouvintes = new Set<() => void>();

function emitir() {
  try {
    localStorage.setItem(CHAVE, JSON.stringify(lista));
  } catch {
    /* sem espaço ou bloqueado: segue só em memória */
  }
  ouvintes.forEach((f) => f());
}

export function adicionarContrato(c: ContratoCriado) {
  lista = [c, ...lista.filter((x) => x.id !== c.id)];
  emitir();
}

/** Substitui (ou insere) um contrato pelo id — usado ao sincronizar com a API. */
export function definirContrato(c: ContratoCriado) {
  const existe = lista.some((x) => x.id === c.id);
  lista = existe ? lista.map((x) => (x.id === c.id ? c : x)) : [c, ...lista];
  emitir();
}

export function buscarContrato(id: string | undefined) {
  if (!id) return undefined;
  return lista.find((c) => c.id === id);
}

export function useContratosCriados(): ContratoCriado[] {
  return useSyncExternalStore(
    (f) => {
      ouvintes.add(f);
      return () => ouvintes.delete(f);
    },
    () => lista,
  );
}
