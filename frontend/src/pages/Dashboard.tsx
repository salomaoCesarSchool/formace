import { useEffect, useState } from "react";
import { api, mensagemDeErro } from "../api/axios";
import { formatBRL, formatMesReferencia } from "../utils/format";
import PageHeader from "../components/PageHeader";
import { CORES } from "../theme";
import type { DashboardData } from "../types";

const brl = (n: number) =>
  n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

/** Converte '2026-08' em 'agosto de 2026'. */
function mesExtenso(mes: string | undefined): string {
  if (!mes || mes.length < 7) return "";
  const nomes = [
    "janeiro",
    "fevereiro",
    "março",
    "abril",
    "maio",
    "junho",
    "julho",
    "agosto",
    "setembro",
    "outubro",
    "novembro",
    "dezembro",
  ];
  const indice = Number(mes.slice(5, 7)) - 1;
  return `${nomes[indice] ?? ""} de ${mes.slice(0, 4)}`;
}

/** Cores dos chips de status conforme o Figma (pago verde, atraso vermelho...). */
const statusCores: Record<string, { bg: string; texto: string }> = {
  PAGO: CORES.verde,
  PENDENTE: CORES.azul,
  ATRASADO: CORES.vermelho,
  CANCELADO: CORES.cinza,
};

/**
 * Dashboard (visual do Figma): indicadores, ultimos lancamentos e alertas,
 * alimentados por GET /api/dashboard.
 */
export default function Dashboard() {
  const [dados, setDados] = useState<DashboardData | null>(null);
  const [erro, setErro] = useState("");
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    api
      .get<DashboardData>("/dashboard")
      .then((resposta) => setDados(resposta.data))
      .catch((error) => setErro(mensagemDeErro(error)))
      .finally(() => setCarregando(false));
  }, []);

  const taxaOcupacao =
    dados && dados.totalImoveis > 0
      ? Math.round((dados.imoveisOcupados * 100) / dados.totalImoveis)
      : 0;

  const indicadores = dados
    ? [
        {
          titulo: "Imóveis ocupados",
          valor: `${dados.imoveisOcupados}/${dados.totalImoveis}`,
          legenda: `${taxaOcupacao}% de ocupação · ${dados.imoveisVagos} vago(s)`,
        },
        {
          titulo: `Receita de aluguel (${formatMesReferencia(dados.mesReferencia)})`,
          valor: brl(dados.receitaMes),
          legenda: `${formatBRL(dados.pendentesMes)} em aberto no mês`,
        },
        {
          titulo: "Contratos a vencer (90 dias)",
          valor: String(dados.contratosAVencer),
          legenda: `${dados.contratosAtivos} contrato(s) ativo(s) · requer atenção`,
        },
      ]
    : [];

  return (
    <main style={{ padding: "28px 36px" }}>
      <PageHeader
        titulo="Visão geral"
        subtitulo={`Visão gerencial da fundação · ${mesExtenso(dados?.mesReferencia)}`}
      />

      {carregando && (
        <p style={{ color: CORES.textoSuave, fontSize: 13 }}>
          Carregando indicadores...
        </p>
      )}

      {erro && (
        <div
          style={{
            background: "#fee2e2",
            color: "#b91c1c",
            borderRadius: 10,
            padding: 16,
            fontSize: 13,
            marginBottom: 20,
          }}
        >
          {erro}
        </div>
      )}

      {!carregando && !erro && dados && (
        <>
          <div style={{ display: "flex", gap: 14, marginBottom: 20, flexWrap: "wrap" }}>
            {indicadores.map((ind, i) => (
              <div
                key={i}
                style={{
                  flex: "1 1 220px",
                  border: `1px solid ${CORES.borda}`,
                  borderRadius: 12,
                  padding: 20,
                  background: "#fff",
                }}
              >
                <p style={{ fontSize: 13, color: CORES.textoSuave, marginBottom: 8 }}>
                  {ind.titulo}
                </p>
                <h2
                  style={{
                    margin: "2px 0",
                    fontWeight: 700,
                    fontSize: 34,
                    lineHeight: "100%",
                    letterSpacing: "-0.5px",
                    color: "#16376e",
                  }}
                >
                  {ind.valor}
                </h2>
                <p style={{ fontSize: 12, color: CORES.textoSuave, marginTop: 8 }}>
                  {ind.legenda}
                </p>
              </div>
            ))}
          </div>

          <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
            <div
              style={{
                flex: "2 1 420px",
                border: `1px solid ${CORES.borda}`,
                borderRadius: 12,
                padding: 20,
                minWidth: 0,
                background: "#fff",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 14,
                }}
              >
                <h3 style={{ fontSize: 16, fontWeight: 600, color: CORES.titulo, margin: 0 }}>
                  Últimos lançamentos financeiros
                </h3>
                <span
                  style={{
                    fontSize: 12,
                    border: `1px solid ${CORES.borda}`,
                    borderRadius: 8,
                    padding: "4px 12px",
                    color: CORES.textoSuave,
                  }}
                >
                  {formatMesReferencia(dados.mesReferencia)}
                </span>
              </div>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ color: "#64748b", fontSize: 12, textAlign: "left" }}>
                    <th style={{ fontWeight: 600, paddingBottom: 10 }}>Imóvel</th>
                    <th style={{ fontWeight: 600, paddingBottom: 10 }}>Locatário</th>
                    <th style={{ fontWeight: 600, paddingBottom: 10 }}>Tipo</th>
                    <th style={{ fontWeight: 600, paddingBottom: 10 }}>Valor</th>
                    <th style={{ fontWeight: 600, paddingBottom: 10 }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {dados.ultimosLancamentos.length === 0 && (
                    <tr>
                      <td
                        colSpan={5}
                        style={{
                          padding: "16px 0",
                          textAlign: "center",
                          color: CORES.textoSuave,
                          fontSize: 13,
                        }}
                      >
                        Nenhum lançamento registrado.
                      </td>
                    </tr>
                  )}
                  {dados.ultimosLancamentos.map((l) => {
                    const cor = statusCores[l.status] ?? CORES.azul;
                    return (
                      <tr
                        key={l.id}
                        style={{
                          fontSize: 13,
                          color: "#334155",
                          borderTop: `1px solid #f1f5f9`,
                        }}
                      >
                        <td style={{ padding: "10px 0" }}>
                          {l.imovel.codigo} · {l.imovel.endereco}
                        </td>
                        <td style={{ padding: "10px 0" }}>{l.locatario?.nome ?? "—"}</td>
                        <td style={{ padding: "10px 0" }}>
                          {l.natureza === "SAIDA" ? "Saída" : "Aluguel"}
                        </td>
                        <td style={{ padding: "10px 0" }}>{brl(l.valorTotal)}</td>
                        <td style={{ padding: "10px 0" }}>
                          <span
                            style={{
                              background: cor.bg,
                              color: cor.texto,
                              fontWeight: 600,
                              borderRadius: 999,
                              padding: "4px 12px",
                              fontSize: 11,
                              display: "inline-block",
                            }}
                          >
                            {l.status.charAt(0) + l.status.slice(1).toLowerCase()}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div
              style={{
                flex: "1 1 280px",
                border: `1px solid ${CORES.borda}`,
                borderRadius: 12,
                padding: 20,
                background: "#fff",
              }}
            >
              <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 14, color: CORES.titulo, margin: 0 }}>
                Alertas
              </h3>
              {dados.alertas.length === 0 && (
                <p style={{ fontSize: 13, color: CORES.textoSuave, marginTop: 12 }}>
                  Nenhum alerta ativo.
                </p>
              )}
              {dados.alertas.map((a, i) => {
                const critico = a.severidade === "critico";
                return (
                  <div
                    key={`${a.tipo}-${i}`}
                    style={{
                      background: critico ? "#fee2e2" : CORES.fundoDestaque,
                      border: `1px solid ${critico ? "#fecaca" : "#dbeafe"}`,
                      color: critico ? "#b91c1c" : CORES.titulo,
                      padding: "12px 14px",
                      borderRadius: 10,
                      marginTop: 10,
                      fontSize: 13,
                      lineHeight: 1.45,
                    }}
                  >
                    <span
                      style={{
                        display: "block",
                        fontSize: 11,
                        fontWeight: 600,
                        color: critico ? "#b91c1c" : CORES.textoSuave,
                        marginBottom: 4,
                        textTransform: "uppercase",
                        letterSpacing: "0.4px",
                      }}
                    >
                      {a.tipo}
                    </span>
                    {a.mensagem}
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}
    </main>
  );
}
