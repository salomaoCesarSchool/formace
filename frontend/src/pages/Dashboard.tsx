import { useEffect, useState } from "react";
import { api, mensagemDeErro, sessaoAtual } from "../api/axios";
import { formatBRL, formatMesReferencia } from "../utils/format";
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

const statusCores: Record<string, string> = {
  PAGO: "#e4e0fb",
  PENDENTE: "#c9c4f7",
  ATRASADO: "#f7c4c4",
  CANCELADO: "#ececef",
};

/**
 * Dashboard (visual das telas novas): indicadores, ultimos lancamentos e alertas,
 * alimentados por GET /api/dashboard.
 */
export default function Dashboard() {
  const [dados, setDados] = useState<DashboardData | null>(null);
  const [erro, setErro] = useState("");
  const [carregando, setCarregando] = useState(true);

  const usuario = sessaoAtual();

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
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          marginBottom: 24,
        }}
      >
        <div>
          <h1 style={{ fontSize: 20, marginBottom: 2, color: "#1a1a2e" }}>
            Dashboard
          </h1>
          <p style={{ color: "#999", fontSize: 12 }}>
            Visão geral da carteira · {mesExtenso(dados?.mesReferencia)}
          </p>
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            border: "1px solid #e5e5ef",
            borderRadius: 20,
            padding: "4px 12px 4px 4px",
            fontSize: 12,
            color: "#555",
          }}
        >
          <span
            style={{
              width: 20,
              height: 20,
              borderRadius: "50%",
              background: "#4b3fd6",
              display: "inline-block",
            }}
          />
          {usuario?.role ?? "Usuário"}
        </div>
      </div>

      {carregando && (
        <p style={{ color: "#999", fontSize: 13 }}>Carregando indicadores...</p>
      )}

      {erro && (
        <div
          style={{
            background: "#fdecec",
            color: "#d63031",
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
          <div style={{ display: "flex", gap: 14, marginBottom: 20 }}>
            {indicadores.map((ind, i) => (
              <div
                key={i}
                style={{
                  flex: 1,
                  border: "1px solid #e5e5ef",
                  borderRadius: 10,
                  padding: 16,
                }}
              >
                <p style={{ fontSize: 12, color: "#999", marginBottom: 6 }}>
                  {ind.titulo}
                </p>
                <h2
                  style={{
                    margin: "2px 0",
                    fontWeight: 600,
                    fontSize: 32,
                    lineHeight: "100%",
                    letterSpacing: "0.23px",
                    color: "rgba(14, 26, 194, 0.5)",
                  }}
                >
                  {ind.valor}
                </h2>
                <p style={{ fontSize: 11, color: "#aaa" }}>{ind.legenda}</p>
              </div>
            ))}
          </div>

          <div style={{ display: "flex", gap: 14 }}>
            <div
              style={{
                flex: 2,
                border: "1px solid #e5e5ef",
                borderRadius: 10,
                padding: 16,
                minWidth: 0,
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 12,
                }}
              >
                <h3 style={{ fontSize: 14, fontWeight: 600, color: "#1a1a2e" }}>
                  Últimos lançamentos financeiros
                </h3>
                <span
                  style={{
                    fontSize: 11,
                    border: "1px solid #e5e5ef",
                    borderRadius: 6,
                    padding: "3px 10px",
                    color: "#888",
                  }}
                >
                  {formatMesReferencia(dados.mesReferencia)}
                </span>
              </div>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ color: "#999", fontSize: 12, textAlign: "left" }}>
                    <th style={{ fontWeight: 400, paddingBottom: 8 }}>Imóvel</th>
                    <th style={{ fontWeight: 400, paddingBottom: 8 }}>Locatário</th>
                    <th style={{ fontWeight: 400, paddingBottom: 8 }}>Tipo</th>
                    <th style={{ fontWeight: 400, paddingBottom: 8 }}>Valor</th>
                    <th style={{ fontWeight: 400, paddingBottom: 8 }}>Status</th>
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
                          color: "#bbb",
                          fontSize: 13,
                        }}
                      >
                        Nenhum lançamento registrado.
                      </td>
                    </tr>
                  )}
                  {dados.ultimosLancamentos.map((l) => (
                    <tr
                      key={l.id}
                      style={{
                        fontSize: 13,
                        color: "#999",
                        borderTop: "1px solid #f0f0f5",
                      }}
                    >
                      <td style={{ padding: "8px 0" }}>
                        {l.imovel.codigo} · {l.imovel.endereco}
                      </td>
                      <td style={{ padding: "8px 0" }}>{l.locatario?.nome ?? "—"}</td>
                      <td style={{ padding: "8px 0" }}>
                        {l.natureza === "SAIDA" ? "Saída" : "Aluguel"}
                      </td>
                      <td style={{ padding: "8px 0" }}>{brl(l.valorTotal)}</td>
                      <td style={{ padding: "8px 0" }}>
                        <span
                          style={{
                            background: statusCores[l.status] ?? "#e4e0fb",
                            color: "rgba(14, 26, 194, 0.5)",
                            fontWeight: 600,
                            borderRadius: 20,
                            padding: "4px 12px",
                            fontSize: 11,
                          }}
                        >
                          {l.status.charAt(0) + l.status.slice(1).toLowerCase()}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div
              style={{
                flex: 1,
                border: "1px solid #e5e5ef",
                borderRadius: 10,
                padding: 16,
              }}
            >
              <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12, color: "#1a1a2e" }}>
                Alertas
              </h3>
              {dados.alertas.length === 0 && (
                <p style={{ fontSize: 12, color: "#aaa" }}>Nenhum alerta ativo.</p>
              )}
              {dados.alertas.map((a, i) => (
                <div
                  key={`${a.tipo}-${i}`}
                  style={{
                    background: a.severidade === "critico" ? "#fdecec" : "#f1f0ff",
                    color:
                      a.severidade === "critico"
                        ? "#d63031"
                        : "rgba(14, 26, 194, 0.5)",
                    fontWeight: 600,
                    padding: 10,
                    borderRadius: 8,
                    marginTop: 8,
                    fontSize: 12,
                  }}
                >
                  {a.mensagem}
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </main>
  );
}
