import { useState } from "react";
import Button from "../components/Button";
import Select from "../components/Select";
import { api, mensagemDeErro, baixarArquivo } from "../api/axios";
import type { FluxoDiario, LancamentoFinanceiro, RelatorioResumo } from "../types";

/* Relatório consolidado para prestação de contas ao Ministério Público.
   O visual é o do design; os dados vêm da API:
   - GET /relatorios/mp-se/resumo?ano=  (imóveis, contratos, totais)
   - GET /financeiro/lancamentos        (receitas, despesas e em aberto por mês)
   - GET /financeiro/fluxo-caixa        (entradas, saídas e saldo acumulado)
   - GET /relatorios/mp-se?ano=         (PDF oficial do backend) */

type Consolidado = {
  receitaMensal: number[]; // aluguéis recebidos, jan a dez
  despesas: { categoria: string; valor: number }[];
  imoveis: { total: number; ocupados: number; vagos: number; contratosAtivos: number };
  emAberto: {
    locatario: string;
    imovel: string;
    meses: string;
    valor: number;
  }[];
  fluxo: { entradas: number; saidas: number; saldo: number }; // saldo acumulado no período
  multasEJuros: number;
};

const ANO_ATUAL = new Date().getFullYear();
const PERIODOS = Array.from({ length: 6 }, (_, i) => `Ano de ${ANO_ATUAL - i}`);
const FORMATOS = ["PDF", "Excel (CSV)"];
const MESES = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];

const brl = (n: number) =>
  n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const soma = (v: number[]) => v.reduce((s, n) => s + n, 0);

/* ---------- leitura dos dados na API ---------- */

const CATEGORIAS: Record<string, string> = {
  MANUTENCAO: "Manutenção e reparos",
  IPTU: "Impostos e taxas",
  TAXA_CONDOMINIO: "Serviços (condomínio)",
  REPUBLICACAO: "República / publicação",
  DESPESA: "Despesas",
  OUTROS: "Outros",
};

async function carregarDados(ano: string): Promise<Consolidado> {
  const [resumoResp, lancResp] = await Promise.all([
    api.get<RelatorioResumo>(`/relatorios/mp-se/resumo?ano=${ano}`),
    api.get<LancamentoFinanceiro[]>("/financeiro/lancamentos"),
  ]);
  const resumo = resumoResp.data;

  const doAno = lancResp.data.filter(
    (l) =>
      l.status !== "CANCELADO" &&
      (l.dataPagamento ?? l.dataVencimento).slice(0, 4) === ano,
  );

  const receitaMensal = Array(12).fill(0);
  const despesasMap = new Map<string, number>();
  const abertosMap = new Map<
    string,
    { locatario: string; imovel: string; meses: Set<string>; valor: number }
  >();

  for (const l of doAno) {
    const nomeLocatario = l.locatario?.nome ?? l.imovel?.locatario?.nome ?? "—";
    const imovel = l.imovel
      ? `${l.imovel.endereco}${l.imovel.numero ? ", " + l.imovel.numero : ""}`
      : "—";

    if (l.status === "PAGO") {
      const mes = Number((l.dataPagamento ?? l.dataVencimento).slice(5, 7)) - 1;
      if (l.natureza === "SAIDA") {
        const categoria = CATEGORIAS[l.tipo] ?? "Outros";
        despesasMap.set(categoria, (despesasMap.get(categoria) ?? 0) + l.valorTotal);
      } else if (mes >= 0 && mes < 12) {
        receitaMensal[mes] += l.valorTotal;
      }
    } else {
      const chave = `${nomeLocatario}||${imovel}`;
      const item =
        abertosMap.get(chave) ??
        {
          locatario: nomeLocatario,
          imovel,
          meses: new Set<string>(),
          valor: 0,
        };
      item.meses.add(
        `${l.mesReferencia.slice(5, 7)}/${l.mesReferencia.slice(0, 4)}`,
      );
      item.valor += l.valorTotal;
      abertosMap.set(chave, item);
    }
  }

  // fluxo de caixa do exercício (máx. 12 meses por chamada)
  const hoje = new Date().toISOString().slice(0, 10);
  const de = `${ano}-01-01`;
  const ate = Number(ano) === ANO_ATUAL ? hoje : `${ano}-12-31`;
  let fluxo = { entradas: 0, saidas: 0, saldo: 0 };
  try {
    const fluxoResp = await api.get<FluxoDiario[]>("/financeiro/fluxo-caixa", {
      params: { de, ate },
    });
    const dias = fluxoResp.data;
    fluxo = {
      entradas: soma(dias.map((d) => d.entradas)),
      saidas: soma(dias.map((d) => d.saidas)),
      saldo: dias.length ? dias[dias.length - 1].saldoAcumulado : 0,
    };
  } catch {
    // período sem fluxo (ex.: futuro): segue com zeros
  }

  return {
    receitaMensal,
    despesas: [...despesasMap.entries()]
      .map(([categoria, valor]) => ({ categoria, valor }))
      .sort((a, b) => b.valor - a.valor),
    imoveis: {
      total: resumo.totalImoveis,
      ocupados: resumo.imoveisOcupados,
      vagos: resumo.imoveisVagos,
      contratosAtivos: resumo.contratosAtivos,
    },
    emAberto: [...abertosMap.values()]
      .map((x) => ({
        locatario: x.locatario,
        imovel: x.imovel,
        meses: [...x.meses].sort().join(", "),
        valor: x.valor,
      }))
      .sort((a, b) => a.locatario.localeCompare(b.locatario)),
    fluxo,
    multasEJuros: resumo.multasEJuros ?? 0,
  };
}

/* ---------- geração do relatório ---------- */

function relatorioHTML(ano: string, d: Consolidado): string {
  const receitas = soma(d.receitaMensal);
  const despesas = soma(d.despesas.map((x) => x.valor));
  const aberto = soma(d.emAberto.map((x) => x.valor));
  const hoje = new Date().toLocaleDateString("pt-BR");

  const linha = (a: string, b: string) =>
    `<tr><td>${a}</td><td class="n">${b}</td></tr>`;

  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8">
<title>Prestação de contas ${ano}</title>
<style>
  @page { size: A4; margin: 20mm; }
  body { font-family: "Nunito", Arial, sans-serif; font-size: 12px; line-height: 1.5; color: #1a1a2e; margin: 0; }
  .topo { text-align: center; font-size: 10.5px; line-height: 1.4; margin-bottom: 18px; }
  .topo b { font-size: 13px; }
  h1 { font-size: 16px; text-align: center; margin: 0 0 2px; }
  .sub { text-align: center; color: #777; margin: 0 0 20px; font-size: 11px; }
  h2 { font-size: 13px; margin: 20px 0 6px; color: #4a4cb0; }
  table { width: 100%; border-collapse: collapse; }
  td, th { padding: 6px 8px; border-bottom: 1px solid #e5e5ef; text-align: left; }
  th { color: #777; font-weight: 600; font-size: 11px; }
  .n { text-align: right; white-space: nowrap; }
  .total td { font-weight: 700; border-bottom: 2px solid #1a1a2e; }
  .rodape { margin-top: 28px; color: #777; font-size: 10.5px; }
</style></head><body>
<div class="topo">
  <b>FUNDAÇÃO MANUEL CRUZ</b><br>ADMINISTRADA PELA ARQUIDIOCESE DE ARACAJU<br>CNPJ: 13.043.047/0001-84
</div>
<h1>Relatório consolidado para prestação de contas</h1>
<p class="sub">Ministério Público · Ano de ${ano}</p>

<h2>1. Resumo do ano</h2>
<table>
  ${linha("Receitas (aluguéis recebidos)", brl(receitas))}
  ${linha("Despesas", brl(despesas))}
  <tr class="total"><td>Resultado</td><td class="n">${brl(receitas - despesas)}</td></tr>
  ${linha("Aluguéis em aberto", brl(aberto))}
  ${linha("Multas e juros cobrados", brl(d.multasEJuros))}
</table>

<h2>2. Receitas por mês</h2>
<table>
  <tr><th>Mês</th><th class="n">Aluguéis recebidos</th></tr>
  ${d.receitaMensal.map((v, i) => linha(MESES[i], v ? brl(v) : "—")).join("")}
  <tr class="total"><td>Total</td><td class="n">${brl(receitas)}</td></tr>
</table>

<h2>3. Despesas por categoria</h2>
<table>
  <tr><th>Categoria</th><th class="n">Valor</th></tr>
  ${
    d.despesas.length === 0
      ? "<tr><td colspan='2'>Nenhuma despesa registrada no período.</td></tr>"
      : d.despesas.map((x) => linha(x.categoria, brl(x.valor))).join("")
  }
  <tr class="total"><td>Total</td><td class="n">${brl(despesas)}</td></tr>
</table>

<h2>4. Imóveis</h2>
<table>
  ${linha("Imóveis cadastrados", String(d.imoveis.total))}
  ${linha("Ocupados", String(d.imoveis.ocupados))}
  ${linha("Vagos", String(d.imoveis.vagos))}
  ${linha("Contratos ativos", String(d.imoveis.contratosAtivos))}
</table>

<h2>5. Disponibilidade financeira</h2>
<table>
  ${linha("Entradas no período", brl(d.fluxo.entradas))}
  ${linha("Saídas no período", brl(d.fluxo.saidas))}
  <tr class="total"><td>Saldo acumulado</td><td class="n">${brl(d.fluxo.saldo)}</td></tr>
</table>

<h2>6. Aluguéis em aberto</h2>
${
  d.emAberto.length === 0
    ? "<p>Nenhum aluguel em aberto no período.</p>"
    : `<table><tr><th>Locatário</th><th>Imóvel</th><th>Meses</th><th class="n">Valor</th></tr>
  ${d.emAberto
    .map(
      (x) =>
        `<tr><td>${x.locatario}</td><td>${x.imovel}</td><td>${x.meses}</td><td class="n">${brl(x.valor)}</td></tr>`,
    )
    .join("")}</table>`
}

<p class="rodape">Relatório gerado em ${hoje}. Documentação de suporte digitalizada e arquivada pela Fundação.</p>
</body></html>`;
}

function relatorioCSV(ano: string, d: Consolidado): string {
  const linhas: string[][] = [
    ["Relatório consolidado", `Ano de ${ano}`],
    [],
    ["Receitas por mês", "Valor"],
    ...d.receitaMensal.map((v, i) => [
      MESES[i],
      v.toFixed(2).replace(".", ","),
    ]),
    ["Total de receitas", soma(d.receitaMensal).toFixed(2).replace(".", ",")],
    [],
    ["Despesas por categoria", "Valor"],
    ...d.despesas.map((x) => [
      x.categoria,
      x.valor.toFixed(2).replace(".", ","),
    ]),
    [
      "Total de despesas",
      soma(d.despesas.map((x) => x.valor))
        .toFixed(2)
        .replace(".", ","),
    ],
    [],
    ["Disponibilidade financeira", "Valor"],
    ["Entradas no período", d.fluxo.entradas.toFixed(2).replace(".", ",")],
    ["Saídas no período", d.fluxo.saidas.toFixed(2).replace(".", ",")],
    ["Saldo acumulado", d.fluxo.saldo.toFixed(2).replace(".", ",")],
    [],
    ["Aluguéis em aberto", "Imóvel", "Meses", "Valor"],
    ...d.emAberto.map((x) => [
      x.locatario,
      x.imovel,
      x.meses,
      x.valor.toFixed(2).replace(".", ","),
    ]),
  ];
  return (
    "\ufeff" + linhas.map((l) => l.map((c) => `"${c}"`).join(";")).join("\r\n")
  );
}

function baixarTexto(nome: string, conteudo: string, tipo: string) {
  const url = URL.createObjectURL(new Blob([conteudo], { type: tipo }));
  const a = document.createElement("a");
  a.href = url;
  a.download = nome;
  a.click();
  URL.revokeObjectURL(url);
}

function imprimir(html: string) {
  const f = document.createElement("iframe");
  f.style.cssText = "position:fixed;right:0;bottom:0;width:0;height:0;border:0";
  document.body.appendChild(f);
  const doc = f.contentWindow?.document;
  if (!doc) return;
  doc.open();
  doc.write(html);
  doc.close();
  setTimeout(() => {
    f.contentWindow?.focus();
    f.contentWindow?.print();
    setTimeout(() => f.remove(), 1500);
  }, 300);
}

type Gerado = { ano: string; formato: string; html: string };

const rotulo = {
  display: "block",
  fontSize: 11,
  color: "#555",
  marginBottom: 6,
} as const;
const campoLargo = { width: "100%", boxSizing: "border-box" } as const;

function Relatorio() {
  const [periodo, setPeriodo] = useState("");
  const [formato, setFormato] = useState("");
  const [erros, setErros] = useState<{ periodo?: string; formato?: string }>(
    {},
  );
  const [gerado, setGerado] = useState<Gerado | null>(null);
  const [carregando, setCarregando] = useState(false);
  const [aviso, setAviso] = useState("");

  const gerar = async () => {
    const e: { periodo?: string; formato?: string } = {};
    if (!periodo) e.periodo = "Escolha o período.";
    if (!formato) e.formato = "Escolha o formato.";
    setErros(e);
    if (Object.keys(e).length > 0) return;

    const ano = periodo.replace("Ano de ", "");
    setCarregando(true);
    setAviso("");
    try {
      const dados = await carregarDados(ano);
      const html = relatorioHTML(ano, dados);

      if (formato !== "PDF") {
        baixarTexto(
          `relatorio-mp-${ano}.csv`,
          relatorioCSV(ano, dados),
          "text/csv;charset=utf-8",
        );
      }
      setGerado({ ano, formato, html });
    } catch (error) {
      setAviso(mensagemDeErro(error));
    } finally {
      setCarregando(false);
    }
  };

  const baixarPdfOficial = () => {
    const ano = (gerado?.ano ?? periodo.replace("Ano de ", "")) || String(ANO_ATUAL);
    baixarArquivo(
      `/relatorios/mp-se?ano=${ano}`,
      `relatorio-mp-se-${ano}.pdf`,
    ).catch((error) => setAviso(mensagemDeErro(error)));
  };

  return (
    <main style={{ padding: "28px 36px", fontFamily: "'Nunito', sans-serif" }}>
      <h1 style={{ fontSize: 20, marginBottom: 2, color: "#1a1a2e" }}>
        Relatórios / Ministério Público
      </h1>
      <p style={{ color: "#999", fontSize: 12, marginBottom: 24 }}>
        Exportação para prestação de contas anual
      </p>

      <section
        style={{
          background: "#fff",
          border: "1px solid #e5e5ef",
          borderRadius: 12,
          padding: 20,
          maxWidth: 900,
        }}
      >
        <h2 style={{ fontSize: 14, fontWeight: 500, margin: "0 0 14px" }}>
          Gerar relatório consolidado
        </h2>

        <div
          style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}
        >
          <div>
            <label style={rotulo}>Período</label>
            <Select
              style={campoLargo}
              value={periodo}
              onChange={(e) => {
                setPeriodo(e.target.value);
                setErros((x) => ({ ...x, periodo: undefined }));
              }}
            >
              <option value="">Selecione o período</option>
              {PERIODOS.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </Select>
            {erros.periodo && (
              <div style={{ color: "#d63031", fontSize: 11, marginTop: 4 }}>
                {erros.periodo}
              </div>
            )}
          </div>

          <div>
            <label style={rotulo}>Formato</label>
            <Select
              style={campoLargo}
              value={formato}
              onChange={(e) => {
                setFormato(e.target.value);
                setErros((x) => ({ ...x, formato: undefined }));
              }}
            >
              <option value="">Selecione o formato</option>
              {FORMATOS.map((f) => (
                <option key={f} value={f}>
                  {f}
                </option>
              ))}
            </Select>
            {erros.formato && (
              <div style={{ color: "#d63031", fontSize: 11, marginTop: 4 }}>
                {erros.formato}
              </div>
            )}
          </div>
        </div>

        {aviso && (
          <div style={{ color: "#d63031", fontSize: 11, marginTop: 10 }}>
            {aviso}
          </div>
        )}

        <div style={{ marginTop: 18 }}>
          <Button type="button" onClick={gerar} disabled={carregando}>
            {carregando ? "Gerando…" : "Gerar relatório"}
          </Button>
        </div>
      </section>

      {gerado && (
        <section style={{ maxWidth: 900, marginTop: 20 }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 10,
              gap: 10,
              flexWrap: "wrap",
            }}
          >
            <p style={{ fontSize: 12, color: "#555", margin: 0 }}>
              Relatório do ano de {gerado.ano} gerado
              {gerado.formato !== "PDF" ? " e baixado em Excel (CSV)" : ""}.
            </p>
            <div style={{ display: "flex", gap: 10 }}>
              <Button type="button" onClick={baixarPdfOficial}>
                PDF oficial (MP-SE)
              </Button>
              <Button type="button" onClick={() => imprimir(gerado.html)}>
                Baixar PDF
              </Button>
            </div>
          </div>
          <iframe
            title="Relatório"
            srcDoc={gerado.html}
            style={{
              width: "100%",
              height: "70vh",
              border: "1px solid #e5e5ef",
              borderRadius: 10,
              background: "#fff",
            }}
          />
        </section>
      )}
    </main>
  );
}

export default Relatorio;
