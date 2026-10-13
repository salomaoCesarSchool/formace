import { useState } from "react";
import Button from "../components/Button";
import Select from "../components/Select";

type Consolidado = {
  receitaMensal: number[]; // aluguéis recebidos, jan a dez
  despesas: { categoria: string; valor: number }[];
  imoveis: { total: number; ocupados: number; vagos: number };
  emAberto: {
    locatario: string;
    imovel: string;
    meses: string;
    valor: number;
  }[];
  saldos: { caixa: number; banco: number; aplicacoes: number }; // em 31/12 (ou até hoje)
};

const DADOS: Record<string, Consolidado> = {
  "2026": {
    receitaMensal: [
      9840, 9840, 10480, 10480, 10480, 10480, 10480, 10040, 10040, 10040, 0, 0,
    ],
    despesas: [
      { categoria: "Manutenção e reparos", valor: 4200 },
      { categoria: "Impostos e taxas", valor: 6150 },
      { categoria: "Serviços", valor: 2380 },
      { categoria: "Material de escritório", valor: 640 },
      { categoria: "Outros", valor: 820 },
    ],
    imoveis: { total: 6, ocupados: 4, vagos: 2 },
    emAberto: [
      {
        locatario: "Anna Sales",
        imovel: "Av. Central, 902",
        meses: "09/2026, 10/2026",
        valor: 5600,
      },
      {
        locatario: "Sabrina Alencar",
        imovel: "Rua do Sol, 23",
        meses: "09/2026, 10/2026",
        valor: 10800,
      },
      {
        locatario: "Djavan da Silva",
        imovel: "Av. Jujinho, 909",
        meses: "09/2026",
        valor: 640,
      },
    ],
    saldos: { caixa: 4250, banco: 18730, aplicacoes: 35000 },
  },
  "2025": {
    receitaMensal: [
      8900, 8900, 8900, 9200, 9200, 9200, 9200, 9200, 9840, 9840, 9840, 9840,
    ],
    despesas: [
      { categoria: "Manutenção e reparos", valor: 5100 },
      { categoria: "Impostos e taxas", valor: 5900 },
      { categoria: "Serviços", valor: 2100 },
      { categoria: "Material de escritório", valor: 520 },
      { categoria: "Outros", valor: 960 },
    ],
    imoveis: { total: 6, ocupados: 5, vagos: 1 },
    emAberto: [],
    saldos: { caixa: 3100, banco: 15400, aplicacoes: 32000 },
  },
};

const PERIODOS = Object.keys(DADOS)
  .sort()
  .reverse()
  .map((a) => `Ano de ${a}`);
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
  ${d.despesas.map((x) => linha(x.categoria, brl(x.valor))).join("")}
  <tr class="total"><td>Total</td><td class="n">${brl(despesas)}</td></tr>
</table>

<h2>4. Imóveis</h2>
<table>
  ${linha("Imóveis cadastrados", String(d.imoveis.total))}
  ${linha("Ocupados", String(d.imoveis.ocupados))}
  ${linha("Vagos", String(d.imoveis.vagos))}
</table>

<h2>5. Disponibilidade financeira</h2>
<table>
  ${linha("Caixa", brl(d.saldos.caixa))}
  ${linha("Contas bancárias", brl(d.saldos.banco))}
  ${linha("Aplicações financeiras", brl(d.saldos.aplicacoes))}
  <tr class="total"><td>Total disponível</td><td class="n">${brl(d.saldos.caixa + d.saldos.banco + d.saldos.aplicacoes)}</td></tr>
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

function baixarArquivo(nome: string, conteudo: string, tipo: string) {
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

  const gerar = () => {
    const e: { periodo?: string; formato?: string } = {};
    if (!periodo) e.periodo = "Escolha o período.";
    if (!formato) e.formato = "Escolha o formato.";
    setErros(e);
    if (Object.keys(e).length > 0) return;

    const ano = periodo.replace("Ano de ", "");
    const dados = DADOS[ano];
    const html = relatorioHTML(ano, dados);

    if (formato === "PDF") {
      setGerado({ ano, formato, html });
    } else {
      baixarArquivo(
        `relatorio-mp-${ano}.csv`,
        relatorioCSV(ano, dados),
        "text/csv;charset=utf-8",
      );
      setGerado({ ano, formato, html });
    }
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

        <div style={{ marginTop: 18 }}>
          <Button type="button" onClick={gerar}>
            Gerar relatório
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
            }}
          >
            <p style={{ fontSize: 12, color: "#555", margin: 0 }}>
              Relatório do ano de {gerado.ano} gerado
              {gerado.formato !== "PDF" ? " e baixado em Excel (CSV)" : ""}.
            </p>
            <Button type="button" onClick={() => imprimir(gerado.html)}>
              Baixar PDF
            </Button>
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
