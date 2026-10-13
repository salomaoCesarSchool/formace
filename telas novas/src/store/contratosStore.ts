import { useSyncExternalStore } from "react";
import type { ContratoCriado } from "../components/NovoContrato";

/* Guarda os contratos criados no navegador (localStorage), pra todas as telas enxergarem
   e pra não sumirem ao recarregar. Semana 4: trocar por chamadas Axios na API. */

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
  lista = [c, ...lista];
  emitir();
}

export function buscarContrato(id: string | undefined) {
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
