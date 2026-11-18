import type { ReactNode } from "react";
import { sessaoAtual } from "../api/axios";
import { rotuloRole } from "../utils/permissoes";
import { CORES } from "../theme";

interface PageHeaderProps {
  titulo: string;
  subtitulo?: ReactNode;
  /** Botoes/acoes alinhados a direita (ex.: "+ Novo imóvel"). */
  acoes?: ReactNode;
  /** Esconde o selo de papel do usuario logado (ex.: telas de login). */
  semSelo?: boolean;
}

/**
 * Cabecalho padrao das telas autenticadas, conforme o Figma:
 * titulo grande azul-marinho + subtitulo cinza a esquerda e selo de papel
 * (avatar + "Administrador"/"Gestor"/"Operador") a direita.
 */
export default function PageHeader({
  titulo,
  subtitulo,
  acoes,
  semSelo = false,
}: PageHeaderProps) {
  const usuario = sessaoAtual();

  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "flex-start",
        gap: 16,
        marginBottom: 24,
        flexWrap: "wrap",
      }}
    >
      <div style={{ minWidth: 0 }}>
        <h1
          style={{
            fontSize: 26,
            fontWeight: 700,
            color: CORES.titulo,
            margin: 0,
            letterSpacing: "-0.3px",
          }}
        >
          {titulo}
        </h1>
        {subtitulo && (
          <p style={{ color: CORES.textoSuave, fontSize: 13, margin: "5px 0 0" }}>
            {subtitulo}
          </p>
        )}
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        {acoes}
        {!semSelo && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              background: "#f1f5f9",
              border: `1px solid ${CORES.borda}`,
              borderRadius: 10,
              padding: "5px 14px 5px 6px",
              fontSize: 13,
              fontWeight: 600,
              color: CORES.texto,
              whiteSpace: "nowrap",
            }}
          >
            <span
              style={{
                width: 24,
                height: 24,
                borderRadius: "50%",
                background: `linear-gradient(135deg, ${CORES.primaria}, #3f8fdc)`,
                display: "inline-block",
                flexShrink: 0,
              }}
            />
            {rotuloRole(usuario?.role)}
          </div>
        )}
      </div>
    </div>
  );
}
