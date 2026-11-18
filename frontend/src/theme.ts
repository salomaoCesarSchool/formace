// Tokens de design extraidos do Figma (Formace).
// Uso: import { CORES } from '../theme' — evita cores soltas nos componentes.
import type { CSSProperties } from "react";

export const CORES = {
  /** Azul dos botoes e destaques (primario do Figma). */
  primaria: "#1a5fa8",
  primariaEscura: "#15508f",
  /** Azul-marinho escuro dos titulos. */
  titulo: "#16233b",
  /** Texto de corpo. */
  texto: "#475569",
  /** Texto secundario / legendas. */
  textoSuave: "#94a3b8",
  /** Bordas de cartoes e campos. */
  borda: "#e2e8f0",
  /** Fundo de painéis e cabecalhos de tabela. */
  fundoPainel: "#f8fafc",
  /** Fundo de destaque azul claro (cartao/aba ativa). */
  fundoDestaque: "#eff6ff",
  /** Links (indigo do Figma). */
  link: "#4457d9",
  /** Chips de status. */
  verde: { bg: "#dcfce7", texto: "#15803d" },
  azul: { bg: "#dbeafe", texto: "#1e40af" },
  vermelho: { bg: "#fee2e2", texto: "#b91c1c" },
  cinza: { bg: "#f1f5f9", texto: "#64748b" },
  ambar: { bg: "#fef3c7", texto: "#b45309" },
} as const;

/** Chip de status generico ( fundo + texto ). */
export function chip(cor: { bg: string; texto: string }): CSSProperties {
  return {
    background: cor.bg,
    color: cor.texto,
    fontWeight: 600,
    borderRadius: 999,
    padding: "4px 12px",
    fontSize: 11,
    display: "inline-block",
    whiteSpace: "nowrap",
  };
}

/** Cartao branco padrao do Figma. */
export const cartao: CSSProperties = {
  background: "#fff",
  border: `1px solid ${CORES.borda}`,
  borderRadius: 12,
  padding: 20,
};
