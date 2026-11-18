import { useEffect, useState } from "react";
import { api, mensagemDeErro } from "../api/axios";
import { formatBRL, formatData, formatMesReferencia } from "../utils/format";
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
          destaque: false,
        },
        {
          titulo: `Receita de aluguel (${formatMesReferencia(dados.mesReferencia)})`,
          valor: brl(dados.receitaMes),
          legenda: `${formatBRL(dados.pendentesMes)} em aberto no mês`,
          destaque: false,
        },
        {
          titulo: "Contratos a vencer (90 dias)",
          valor: String(dados.contratosAVencer),
          legenda: `${dados.contratosAtivos} contrato(s) ativo(s) · requer atenção`,
          destaque: false,
        },
        {
          titulo: "Inquilinos inadimplentes",
          valor: String(dados.inadimplentes.quantidade),
          legenda: `${formatBRL(dados.inadimplentes.valorEmAberto)} em aberto`,
          destaque: true,
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
                  border: `1px solid ${ind.destaque ? "#bfdbfe" : CORES.borda}`,
                  borderRadius: 12,
                  padding: 20,
                  background: ind.destaque ? CORES.fundoDestaque : "#fff",
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
                    color: ind.destaque ? CORES.primaria : "#16376e",
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

          {/* Gráfico de pagamentos + cobranças pendentes */}
          <div style={{ display: "flex", gap: 14, marginBottom: 20, flexWrap: "wrap" }}>
            <div
              style={{
                flex: "1 1 320px",
                border: `1px solid ${CORES.borda}`,
                borderRadius: 12,
                padding: 20,
                background: "#fff",
                minWidth: 0,
              }}
            >
              <h3 style={{ fontSize: 16, fontWeight: 600, color: CORES.titulo, margin: 0 }}>
                Pagamentos dos aluguéis
              </h3>

              {[
                { rotulo: "Pagos", valor: dados.pagamentosMes.pagos, cor: CORES.primaria },
                { rotulo: "A vencer", valor: dados.pagamentosMes.aVencer, cor: "#7da9db" },
                { rotulo: "Em atraso", valor: dados.pagamentosMes.emAtraso, cor: "#c6d9ee" },
              ].map((linha) => {
                const total = dados.pagamentosMes.total || 1;
                const pct = Math.round((linha.valor * 100) / total);
                return (
                  <div
                    key={linha.rotulo}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                      margin: "16px 0",
                    }}
                  >
                    <span style={{ width: 72, fontSize: 13, color: CORES.texto }}>
                      {linha.rotulo}
                    </span>
                    <div
                      style={{
                        flex: 1,
                        height: 12,
                        background: "#f1f5f9",
                        borderRadius: 999,
                        overflow: "hidden",
                        minWidth: 60,
                      }}
                    >
                      <div
                        style={{
                          width: `${pct}%`,
                          height: "100%",
                          background: linha.cor,
                          borderRadius: 999,
                          transition: "width 0.4s ease",
                        }}
                      />
                    </div>
                    <span
                      style={{
                        width: 104,
                        textAlign: "right",
                        fontSize: 13,
                        fontWeight: 700,
                        color: CORES.titulo,
                        whiteSpace: "nowrap",
                      }}
                    >
                      {linha.valor}{" "}
                      <span style={{ fontWeight: 400, color: CORES.textoSuave }}>
                        ≈{pct}%
                      </span>
                    </span>
                  </div>
                );
              })}

              <p style={{ fontSize: 12, color: CORES.textoSuave, margin: "18px 0 0" }}>
                {dados.pagamentosMes.total} aluguéis ·{" "}
                {Math.max(
                  0,
                  dados.pagamentosMes.total - dados.pagamentosMes.pagos,
                )}{" "}
                ainda não pagos
              </p>
            </div>

            <div
              style={{
                flex: "2 1 480px",
                border: `1px solid ${CORES.borda}`,
                borderRadius: 12,
                padding: 20,
                background: "#fff",
                minWidth: 0,
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  gap: 12,
                  flexWrap: "wrap",
                }}
              >
                <div>
                  <h3 style={{ fontSize: 16, fontWeight: 600, color: CORES.titulo, margin: 0 }}>
                    Cobranças pendentes
                  </h3>
                  <p style={{ fontSize: 12, color: CORES.textoSuave, margin: "4px 0 0" }}>
                    {dados.inadimplentes.quantidade} inquilino
                    {dados.inadimplentes.quantidade === 1 ? "" : "s"} em atraso ·{" "}
                    {formatBRL(dados.inadimplentes.valorEmAberto)} a receber
                  </p>
                </div>
              </div>

              <table style={{ width: "100%", borderCollapse: "collapse", marginTop: 12 }}>
                <thead>
                  <tr style={{ color: "#64748b", fontSize: 12, textAlign: "left" }}>
                    <th style={{ fontWeight: 600, paddingBottom: 8 }}>Inquilino/imóvel</th>
                    <th style={{ fontWeight: 600, paddingBottom: 8 }}>Vencimento</th>
                    <th style={{ fontWeight: 600, paddingBottom: 8, textAlign: "right" }}>
                      Valor
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {(dados.cobrancasPendentes ?? []).length === 0 && (
                    <tr>
                      <td
                        colSpan={3}
                        style={{
                          padding: "16px 0",
                          textAlign: "center",
                          color: CORES.textoSuave,
                          fontSize: 13,
                        }}
                      >
                        Nenhuma cobrança vencida neste mês.
                      </td>
                    </tr>
                  )}
                  {(dados.cobrancasPendentes ?? []).map((c, i) => (
                    <tr
                      key={`${c.locatario}-${i}`}
                      style={{
                        fontSize: 13,
                        color: "#334155",
                        borderTop: "1px solid #f1f5f9",
                      }}
                    >
                      <td style={{ padding: "10px 0" }}>
                        <strong style={{ fontWeight: 600 }}>{c.locatario}</strong>
                        <span style={{ display: "block", fontSize: 11, color: "#94a3b8" }}>
                          {c.imovel}
                        </span>
                      </td>
                      <td style={{ padding: "10px 0", whiteSpace: "nowrap" }}>
                        {formatData(c.dataVencimento)}
                        <span
                          style={{
                            display: "block",
                            fontSize: 11,
                            fontWeight: 600,
                            color: c.diasAtraso > 0 ? CORES.vermelho.texto : CORES.ambar.texto,
                          }}
                        >
                          {c.diasAtraso > 0
                            ? `${c.diasAtraso} dia${c.diasAtraso === 1 ? "" : "s"} em atraso`
                            : "vence hoje"}
                        </span>
                      </td>
                      <td
                        style={{
                          padding: "10px 0",
                          textAlign: "right",
                          fontWeight: 600,
                          whiteSpace: "nowrap",
                        }}
                      >
                        {formatBRL(c.valor)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
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
