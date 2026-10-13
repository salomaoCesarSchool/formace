import { useEffect, useMemo, useState } from "react";
import type {
  ChangeEvent,
  CSSProperties,
  FormEvent,
  InputHTMLAttributes,
  ReactNode,
} from "react";
import Button from "../components/Button";
import Input from "../components/Input";
import Select from "../components/Select";
import Table from "../components/Table";
import { api, mensagemDeErro, baixarArquivo } from "../api/axios";
import type {
  Imovel,
  LancamentoFinanceiro,
  LancamentoRequest,
  Locatario,
} from "../types";
import { formatBRL, formatMesReferencia, mesAtual } from "../utils/format";

/* ========== Tipos, dados e cálculos ========== */

/* ---------- tipos ---------- */

type FormaPagamento = "Dinheiro" | "Pix" | "Transferência";
type Conta = "caixa" | "banco";

/* uma opção de select pode ser só o texto ou um par valor/rótulo (ids reais) */
type OpcaoSelect = string | { valor: string; rotulo: string };

interface Recebimento {
  id: string; // id do lançamento na API
  data: string; // AAAA-MM-DD
  recibo: string;
  locatario: string;
  locatarioId: string;
  imovel: string;
  imovelId: string;
  mesReferencia: string; // MM/AAAA
  status: "Pago" | "Pendente";
  forma: FormaPagamento | "—";
  valor: number;
  encargos?: number;
}

interface Movimento {
  id: string;
  data: string; // AAAA-MM-DD
  conta: Conta;
  tipo: "entrada" | "saida";
  origem: "recibo" | "deposito" | "despesa";
  historico: string;
  documento: string;
  valor: number;
  categoria?: string;
}

interface NovaDespesa {
  data: string;
  descricao: string;
  categoria: string;
  valor: number;
  conta: Conta;
  documento: string;
}

interface MesAberto {
  id: string;
  locatario: string;
  imovel: string;
  mesReferencia: string; // MM/AAAA
  vencimento: string; // AAAA-MM-DD
  valor: number;
}

interface Contato {
  data: string;
  nota: string;
}

/* ---------- dados locais ---------- */

// saldos de 01/08/2026, antes dos movimentos abaixo (os totais de hoje batem com o Figma)
const SALDOS_INICIAIS = { caixa: 3610, banco: 9330, aplicacoes: 35000 };

// a API não guarda a forma de pagamento: fica no navegador, por lançamento
const CHAVE_FORMAS = "formace-formas-pagamento";

const carregarFormas = (): Record<string, FormaPagamento> => {
  try {
    const bruto = localStorage.getItem(CHAVE_FORMAS);
    return bruto ? (JSON.parse(bruto) as Record<string, FormaPagamento>) : {};
  } catch {
    return {};
  }
};

/* ---------- utilitários ---------- */

const brl = (n: number) => formatBRL(n);

// aceita "1200", "1200,50", "1.200,50" ou "1200.50"
const numero = (s: string) => {
  const t = s.includes(",") ? s.replace(/\./g, "").replace(",", ".") : s;
  return Number(t) || 0;
};

const arred = (n: number) => Math.round(n * 100) / 100;

const idUnico = () =>
  Math.random().toString(36).slice(2) + Date.now().toString(36);

const dois = (n: number) => String(n).padStart(2, "0");

const hojeISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${dois(d.getMonth() + 1)}-${dois(d.getDate())}`;
};

const dataBR = (iso: string) => iso.split("-").reverse().join("/");
const mesDe = (iso: string) => `${iso.slice(5, 7)}/${iso.slice(0, 4)}`;
const inicioDoMes = (mes: string) => `${mes.slice(3)}-${mes.slice(0, 2)}-01`;
const fimDoMes = (mes: string) => `${mes.slice(3)}-${mes.slice(0, 2)}-31`;

const diasEntre = (de: string, ate: string) => {
  const [a, b, c] = de.split("-").map(Number);
  const [x, y, z] = ate.split("-").map(Number);
  return Math.round((Date.UTC(x, y - 1, z) - Date.UTC(a, b - 1, c)) / 86400000);
};

const sinal = (m: Movimento) => (m.tipo === "entrada" ? m.valor : -m.valor);

/* ---------- rótulos vindos da API ---------- */

const rotuloImovel = (imovel?: Imovel) =>
  imovel ? `${imovel.endereco}${imovel.numero ? ", " + imovel.numero : ""}` : "—";

const nomeLocatario = (l: LancamentoFinanceiro) =>
  l.locatario?.nome ?? l.imovel?.locatario?.nome ?? "—";

/* ---------- lançamento da API → linha da tela ---------- */

const paraRecebimento = (
  l: LancamentoFinanceiro,
  formas: Record<string, FormaPagamento>,
): Recebimento => ({
  id: String(l.id),
  data: l.dataPagamento ?? l.dataVencimento,
  recibo: l.recibo ? String(l.recibo.numero).padStart(6, "0") : "—",
  locatario: nomeLocatario(l),
  locatarioId: l.locatario
    ? String(l.locatario.id)
    : l.imovel?.locatario
      ? String(l.imovel.locatario.id)
      : "",
  imovel: rotuloImovel(l.imovel),
  imovelId: l.imovel ? String(l.imovel.id) : "",
  mesReferencia: formatMesReferencia(l.mesReferencia),
  status: l.status === "PAGO" ? "Pago" : "Pendente",
  forma: formas[String(l.id)] ?? "—",
  valor: l.valorTotal,
  encargos: l.multa + l.juros > 0 ? l.multa + l.juros : undefined,
});

/* ---------- meses em aberto (Cobranças) ---------- */

const paraMesAberto = (l: LancamentoFinanceiro): MesAberto => ({
  id: String(l.id),
  locatario: nomeLocatario(l),
  imovel: rotuloImovel(l.imovel),
  mesReferencia: formatMesReferencia(l.mesReferencia),
  vencimento: l.dataVencimento,
  valor: l.valorTotal,
});

/* ---------- saldos e RDD ---------- */

const saldoAte = (
  movs: Movimento[],
  conta: Conta,
  inicial: number,
  ateISO: string,
) =>
  arred(
    inicial +
      movs
        .filter((m) => m.conta === conta && m.data <= ateISO)
        .reduce((s, m) => s + sinal(m), 0),
  );

// aplicações financeiras: vale o último valor informado até a data
const aplicacoesEm = (aplic: Record<string, number>, ateISO: string) => {
  const datas = Object.keys(aplic)
    .filter((d) => d <= ateISO)
    .sort();
  return datas.length
    ? aplic[datas[datas.length - 1]]
    : SALDOS_INICIAIS.aplicacoes;
};

const rddEm = (
  movs: Movimento[],
  aplic: Record<string, number>,
  ateISO: string,
) => {
  const caixa = saldoAte(movs, "caixa", SALDOS_INICIAIS.caixa, ateISO);
  const banco = saldoAte(movs, "banco", SALDOS_INICIAIS.banco, ateISO);
  const aplicacoes = aplicacoesEm(aplic, ateISO);
  return { caixa, banco, aplicacoes, total: arred(caixa + banco + aplicacoes) };
};

/* ---------- lançamentos pagos viram movimento (dinheiro vai para o caixa; o resto, para o banco) ---------- */

function movimentosDeLancamentos(
  lancamentos: LancamentoFinanceiro[],
  formas: Record<string, FormaPagamento>,
): Movimento[] {
  const lista: Movimento[] = [];

  lancamentos.forEach((l) => {
    if (l.status !== "PAGO") return;

    const conta: Conta = formas[String(l.id)] === "Dinheiro" ? "caixa" : "banco";
    const base = {
      id: `api-${l.id}`,
      data: l.dataPagamento ?? l.dataVencimento,
      conta,
      valor: l.valorTotal,
    };

    if (l.natureza === "ENTRADA") {
      lista.push({
        ...base,
        tipo: "entrada",
        origem: "recibo",
        historico: `Aluguel ${formatMesReferencia(l.mesReferencia)}: ${nomeLocatario(l)}, ${rotuloImovel(l.imovel)}`,
        documento: l.recibo
          ? `Recibo ${String(l.recibo.numero).padStart(6, "0")}`
          : "Lançamento",
      });
    } else {
      // despesas (DESPESA, IPTU, MANUTENCAO...) pagas entram como saída
      lista.push({
        ...base,
        tipo: "saida",
        origem: "despesa",
        historico: l.descricao || l.tipo,
        documento: "Lançamento",
        categoria: l.tipo,
      });
    }
  });

  return lista;
}

/* ---------- encargos de atraso ---------- */

// Multa única sobre o valor e juros simples ao mês, proporcionais aos dias de atraso.
// Os percentuais devem seguir o contrato de locação.
function calcularEncargos(
  valor: number,
  vencimento: string,
  ate: string,
  multaPct: number,
  jurosMesPct: number,
) {
  const dias = Math.max(0, diasEntre(vencimento, ate));
  if (dias === 0) return { dias: 0, multa: 0, juros: 0 };
  return {
    dias,
    multa: arred((valor * multaPct) / 100),
    juros: arred(((valor * jurosMesPct) / 100 / 30) * dias),
  };
}

/* ========== Campos e estilos compartilhados ========== */

/* ---------- estilos compartilhados ---------- */

const card: CSSProperties = {
  background: "#fff",
  border: "1px solid #e8e8f2",
  borderRadius: 12,
  padding: 20,
  marginBottom: 20,
};

const tituloCard: CSSProperties = { fontSize: 14, fontWeight: 500, margin: 0 };
const subCard: CSSProperties = {
  fontSize: 10,
  color: "#777",
  margin: "2px 0 14px",
};
const labelStyle: CSSProperties = {
  fontSize: 11,
  color: "#555",
  marginBottom: 6,
  display: "block",
};
const erroStyle: CSSProperties = {
  color: "#d63031",
  fontSize: 11,
  marginTop: 4,
};
const larguraTotal: CSSProperties = { width: "100%", boxSizing: "border-box" };
const grade = (colunas: number, espaco = 14): CSSProperties => ({
  display: "grid",
  gridTemplateColumns: `repeat(${colunas}, minmax(0, 1fr))`,
  gap: espaco,
});

/* ---------- campos (label e erro em volta dos componentes do projeto) ---------- */

function Campo({
  label,
  erro,
  children,
}: {
  label: string;
  erro?: string;
  children: ReactNode;
}) {
  return (
    <div>
      <label style={labelStyle}>{label}</label>
      {children}
      {erro && <div style={erroStyle}>{erro}</div>}
    </div>
  );
}

function CampoTexto({
  label,
  erro,
  ...props
}: { label: string; erro?: string } & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <Campo label={label} erro={erro}>
      <Input style={larguraTotal} {...props} />
    </Campo>
  );
}

function CampoSelect({
  label,
  erro,
  placeholder,
  opcoes,
  value,
  onChange,
}: {
  label: string;
  erro?: string;
  placeholder: string;
  opcoes: OpcaoSelect[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <Campo label={label} erro={erro}>
      <Select
        style={larguraTotal}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        <option value="">{placeholder}</option>
        {opcoes.map((o) =>
          typeof o === "string" ? (
            <option key={o} value={o}>
              {o}
            </option>
          ) : (
            <option key={o.valor} value={o.valor}>
              {o.rotulo}
            </option>
          ),
        )}
      </Select>
    </Campo>
  );
}

/* ---------- bloco de valor (igual aos cards do topo) ---------- */

function Tile({
  rotulo,
  valor,
  destaque,
}: {
  rotulo: string;
  valor: string;
  destaque?: boolean;
}) {
  return (
    <div
      style={{
        background: destaque ? "#8689de" : "#f1f2fc",
        borderRadius: 8,
        padding: 14,
      }}
    >
      <div style={{ fontSize: 11, color: destaque ? "#fff" : "#333" }}>
        {rotulo}
      </div>
      <div
        style={{
          fontSize: 20,
          color: destaque ? "#fff" : "#6c6fd0",
          marginTop: 6,
        }}
      >
        {valor}
      </div>
    </div>
  );
}

function Opcao({
  nome,
  texto,
  marcado,
  onChange,
}: {
  nome: string;
  texto: string;
  marcado: boolean;
  onChange: () => void;
}) {
  return (
    <label
      style={{
        fontSize: 11,
        color: "#333",
        display: "flex",
        alignItems: "center",
        gap: 6,
        cursor: "pointer",
      }}
    >
      <input type="radio" name={nome} checked={marcado} onChange={onChange} />
      {texto}
    </label>
  );
}

/* ========== Aba Caixa e Aba Banco ========== */

interface PropsMovimento {
  conta: Conta;
  movimentos: Movimento[];
  saldoInicial: number;
  onDepositar?: (d: {
    data: string;
    valor: number;
    comprovante: string;
  }) => void;
}

function AbaMovimento({
  conta,
  movimentos,
  saldoInicial,
  onDepositar,
}: PropsMovimento) {
  const nome = conta === "caixa" ? "Caixa" : "Banco";

  const [mes, setMes] = useState("");
  const [dep, setDep] = useState({
    data: hojeISO(),
    valor: "",
    comprovante: "",
  });
  const [erros, setErros] = useState<Record<string, string>>({});

  // livro do dia a dia, em ordem de data, com o saldo depois de cada lançamento
  const linhas = useMemo(() => {
    const ordenados = movimentos
      .filter((m) => m.conta === conta)
      .slice()
      .sort((a, b) => (a.data < b.data ? -1 : a.data > b.data ? 1 : 0));

    return ordenados.reduce<(Movimento & { saldo: number })[]>((acc, m) => {
      const anterior = acc.length ? acc[acc.length - 1].saldo : saldoInicial;
      acc.push({ ...m, saldo: anterior + sinal(m) });
      return acc;
    }, []);
  }, [movimentos, conta, saldoInicial]);
  const meses = Array.from(new Set(linhas.map((l) => mesDe(l.data))));
  const visiveis = mes ? linhas.filter((l) => mesDe(l.data) === mes) : linhas;

  const anterior = mes
    ? saldoInicial +
      linhas
        .filter((l) => l.data < inicioDoMes(mes))
        .reduce((s, l) => s + sinal(l), 0)
    : saldoInicial;
  const entradas = visiveis
    .filter((l) => l.tipo === "entrada")
    .reduce((s, l) => s + l.valor, 0);
  const saidas = visiveis
    .filter((l) => l.tipo === "saida")
    .reduce((s, l) => s + l.valor, 0);

  const depositar = (ev: FormEvent<HTMLFormElement>) => {
    ev.preventDefault();
    const e: Record<string, string> = {};
    const valor = numero(dep.valor);

    if (!dep.data) e.data = "Informe a data.";
    if (valor <= 0) e.valor = "Informe o valor.";
    else if (
      dep.data &&
      valor > saldoAte(movimentos, "caixa", saldoInicial, dep.data)
    ) {
      e.valor = "O valor é maior que o saldo do caixa nessa data.";
    }
    if (!dep.comprovante.trim())
      e.comprovante = "Informe o número do comprovante do depósito.";

    setErros(e);
    if (Object.keys(e).length > 0) return;

    onDepositar?.({
      data: dep.data,
      valor,
      comprovante: dep.comprovante.trim(),
    });
    setDep({ data: hojeISO(), valor: "", comprovante: "" });
  };

  return (
    <>
      <section style={card}>
        <h2 style={tituloCard}>Movimento de {nome}</h2>
        <p style={subCard}>
          {conta === "caixa"
            ? "Pagamentos em dinheiro entram aqui pelo recibo. As saídas precisam de documento de suporte."
            : "Pix, transferência e depósitos entram aqui. As saídas precisam de documento de suporte."}
        </p>

        <div style={grade(4, 16)}>
          <Tile
            rotulo={mes ? "Saldo anterior" : "Saldo inicial"}
            valor={brl(anterior)}
          />
          <Tile rotulo="Entradas" valor={brl(entradas)} />
          <Tile rotulo="Saídas" valor={brl(saidas)} />
          <Tile
            rotulo="Saldo"
            valor={brl(anterior + entradas - saidas)}
            destaque
          />
        </div>
      </section>

      <section style={card}>
        <div style={{ maxWidth: 240, marginBottom: 16 }}>
          <CampoSelect
            label="Mês"
            placeholder="Todos os meses"
            opcoes={meses}
            value={mes}
            onChange={setMes}
          />
        </div>

        <Table
          data={visiveis}
          emptyMessage="Nenhum lançamento neste período."
          columns={[
            { header: "Data", render: (l) => dataBR(l.data) },
            { header: "Histórico", render: (l) => l.historico },
            { header: "Documento", render: (l) => l.documento },
            {
              header: "Entrada",
              render: (l) => (l.tipo === "entrada" ? brl(l.valor) : ""),
            },
            {
              header: "Saída",
              render: (l) => (l.tipo === "saida" ? brl(l.valor) : ""),
            },
            { header: "Saldo", render: (l) => brl(l.saldo) },
          ]}
        />
      </section>

      {onDepositar && (
        <form onSubmit={depositar} style={card} noValidate>
          <h2 style={tituloCard}>Depositar dinheiro do cofre</h2>
          <p style={subCard}>
            Registra a saída no caixa e a entrada correspondente no banco, com o
            comprovante do depósito.
          </p>

          <div style={{ ...grade(3), maxWidth: 720 }}>
            <CampoTexto
              label="Data"
              type="date"
              value={dep.data}
              onChange={(e) => setDep({ ...dep, data: e.target.value })}
              erro={erros.data}
            />
            <CampoTexto
              label="Valor"
              placeholder="R$ 0,00"
              inputMode="decimal"
              value={dep.valor}
              onChange={(e) => setDep({ ...dep, valor: e.target.value })}
              erro={erros.valor}
            />
            <CampoTexto
              label="Nº do comprovante"
              placeholder="Número"
              value={dep.comprovante}
              onChange={(e) => setDep({ ...dep, comprovante: e.target.value })}
              erro={erros.comprovante}
            />
          </div>

          <div style={{ marginTop: 16 }}>
            <Button type="submit">Registrar depósito</Button>
          </div>
        </form>
      )}
    </>
  );
}

/* ========== Aba Gastos e despesas ========== */

interface PropsGastos {
  movimentos: Movimento[];
  onRegistrar: (d: NovaDespesa) => void;
}

const CATEGORIAS = [
  "Manutenção e reparos",
  "Impostos e taxas",
  "Serviços",
  "Material de escritório",
  "Outros",
];
const DOCUMENTOS = ["Nota fiscal", "Recibo", "Comprovante bancário"];

const GASTO_VAZIO = {
  data: hojeISO(),
  descricao: "",
  categoria: "",
  valor: "",
  conta: "" as Conta | "",
  tipoDoc: "",
  numeroDoc: "",
};

function AbaGastos({ movimentos, onRegistrar }: PropsGastos) {
  const [form, setForm] = useState(GASTO_VAZIO);
  const [erros, setErros] = useState<Record<string, string>>({});
  const [filtroMes, setFiltroMes] = useState("");
  const [filtroConta, setFiltroConta] = useState("");

  const set = (campo: keyof typeof GASTO_VAZIO) => (valor: string) =>
    setForm((f) => ({ ...f, [campo]: valor }));

  const saldoConta = (c: Conta) =>
    saldoAte(movimentos, c, SALDOS_INICIAIS[c], "9999-12-31");

  const registrar = (ev: FormEvent<HTMLFormElement>) => {
    ev.preventDefault();
    const e: Record<string, string> = {};
    const valor = numero(form.valor);

    if (!form.data) e.data = "Informe a data.";
    if (!form.descricao.trim()) e.descricao = "Descreva o gasto.";
    if (!form.categoria) e.categoria = "Escolha a categoria.";
    if (valor <= 0) e.valor = "Informe o valor.";
    if (!form.conta) e.conta = "Escolha de onde saiu o dinheiro.";
    if (!form.tipoDoc)
      e.tipoDoc = "Toda saída precisa de documento de suporte.";
    if (!form.numeroDoc.trim()) e.numeroDoc = "Informe o número do documento.";

    if (
      valor > 0 &&
      form.conta &&
      form.data &&
      valor >
        saldoAte(movimentos, form.conta, SALDOS_INICIAIS[form.conta], form.data)
    ) {
      e.valor = `Saldo insuficiente no ${form.conta === "caixa" ? "caixa" : "banco"} nessa data.`;
    }

    setErros(e);
    if (Object.keys(e).length > 0 || !form.conta) return;

    onRegistrar({
      data: form.data,
      descricao: form.descricao.trim(),
      categoria: form.categoria,
      valor,
      conta: form.conta,
      documento: `${form.tipoDoc} nº ${form.numeroDoc.trim()}`,
    });
    setForm({ ...GASTO_VAZIO, data: hojeISO() });
  };

  const despesas = movimentos
    .filter((m) => m.origem === "despesa")
    .slice()
    .reverse()
    .sort((a, b) => (a.data < b.data ? 1 : a.data > b.data ? -1 : 0));

  const meses = Array.from(new Set(despesas.map((d) => mesDe(d.data))));
  const filtradas = despesas.filter(
    (d) =>
      (!filtroMes || mesDe(d.data) === filtroMes) &&
      (!filtroConta ||
        d.conta === (filtroConta === "Caixa" ? "caixa" : "banco")),
  );
  const total = filtradas.reduce((s, d) => s + d.valor, 0);

  return (
    <>
      <form onSubmit={registrar} style={card} noValidate>
        <h2 style={tituloCard}>Registrar gasto ou despesa</h2>
        <p style={subCard}>
          A saída é lançada no Caixa ou no Banco e precisa de documento de
          suporte.
        </p>

        <div style={{ ...grade(3), maxWidth: 720 }}>
          <CampoTexto
            label="Data"
            type="date"
            value={form.data}
            onChange={(e) => set("data")(e.target.value)}
            erro={erros.data}
          />
          <CampoSelect
            label="Categoria"
            placeholder="Selecione a categoria"
            opcoes={CATEGORIAS}
            value={form.categoria}
            onChange={set("categoria")}
            erro={erros.categoria}
          />
          <CampoTexto
            label="Valor"
            placeholder="R$ 0,00"
            inputMode="decimal"
            value={form.valor}
            onChange={(e) => set("valor")(e.target.value)}
            erro={erros.valor}
          />
        </div>

        <div style={{ maxWidth: 720, marginTop: 14 }}>
          <CampoTexto
            label="Descrição"
            placeholder="Ex.: troca do cano da cozinha, Av. Central, 902"
            value={form.descricao}
            onChange={(e) => set("descricao")(e.target.value)}
            erro={erros.descricao}
          />
        </div>

        <div style={{ ...grade(3), maxWidth: 720, marginTop: 14 }}>
          <CampoSelect
            label="Documento de suporte"
            placeholder="Selecione o documento"
            opcoes={DOCUMENTOS}
            value={form.tipoDoc}
            onChange={set("tipoDoc")}
            erro={erros.tipoDoc}
          />
          <CampoTexto
            label="Número do documento"
            placeholder="Número"
            value={form.numeroDoc}
            onChange={(e) => set("numeroDoc")(e.target.value)}
            erro={erros.numeroDoc}
          />
          <Campo label="Saiu de onde?">
            <div style={{ display: "flex", gap: 20, paddingTop: 8 }}>
              <Opcao
                nome="conta-gasto"
                texto="Caixa"
                marcado={form.conta === "caixa"}
                onChange={() => set("conta")("caixa")}
              />
              <Opcao
                nome="conta-gasto"
                texto="Banco"
                marcado={form.conta === "banco"}
                onChange={() => set("conta")("banco")}
              />
            </div>
            {form.conta && (
              <div style={{ fontSize: 10, color: "#777", marginTop: 4 }}>
                Saldo atual: {brl(saldoConta(form.conta))}
              </div>
            )}
            {erros.conta && <div style={erroStyle}>{erros.conta}</div>}
          </Campo>
        </div>

        <div style={{ marginTop: 18 }}>
          <Button type="submit">Registrar gasto</Button>
        </div>
      </form>

      <section style={card}>
        <h2 style={tituloCard}>Gastos registrados</h2>
        <p style={subCard}>Total no filtro: {brl(total)}</p>

        <div style={{ ...grade(3, 12), marginBottom: 16, maxWidth: 520 }}>
          <CampoSelect
            label="Mês"
            placeholder="Todos os meses"
            opcoes={meses}
            value={filtroMes}
            onChange={setFiltroMes}
          />
          <CampoSelect
            label="Saiu de"
            placeholder="Caixa e banco"
            opcoes={["Caixa", "Banco"]}
            value={filtroConta}
            onChange={setFiltroConta}
          />
        </div>

        <Table
          data={filtradas}
          emptyMessage="Nenhum gasto registrado."
          columns={[
            { header: "Data", render: (d) => dataBR(d.data) },
            { header: "Descrição", render: (d) => d.historico },
            { header: "Categoria", render: (d) => d.categoria ?? "" },
            {
              header: "Saiu de",
              render: (d) => (d.conta === "caixa" ? "Caixa" : "Banco"),
            },
            { header: "Documento", render: (d) => d.documento },
            { header: "Valor", render: (d) => brl(d.valor) },
          ]}
        />
      </section>
    </>
  );
}

/* ========== Aba RDD ========== */

interface PropsRDD {
  movimentos: Movimento[];
  aplicacoes: Record<string, number>;
  onAtualizarAplicacoes: (data: string, valor: number) => void;
}

function AbaRDD({ movimentos, aplicacoes, onAtualizarAplicacoes }: PropsRDD) {
  const [data, setData] = useState(hojeISO());
  const [valorAplic, setValorAplic] = useState("");
  const [erro, setErro] = useState("");

  const rdd = rddEm(movimentos, aplicacoes, data);

  const datas = useMemo(() => {
    const todas = new Set<string>([
      ...movimentos.map((m) => m.data),
      ...Object.keys(aplicacoes),
      hojeISO(),
    ]);
    return Array.from(todas).sort().reverse().slice(0, 15);
  }, [movimentos, aplicacoes]);

  const atualizar = (ev: FormEvent<HTMLFormElement>) => {
    ev.preventDefault();
    if (!data) {
      setErro("Escolha a data.");
      return;
    }
    if (!/\d/.test(valorAplic)) {
      setErro("Informe o valor das aplicações.");
      return;
    }
    onAtualizarAplicacoes(data, numero(valorAplic));
    setValorAplic("");
    setErro("");
  };

  return (
    <>
      <section style={card}>
        <h2 style={tituloCard}>Relatório Diário de Disponibilidade (RDD)</h2>
        <p style={subCard}>
          Consolida a disponibilidade do dia: caixa, contas bancárias e
          aplicações financeiras.
        </p>

        <div style={{ maxWidth: 200, marginBottom: 16 }}>
          <CampoTexto
            label="Data"
            type="date"
            value={data}
            onChange={(e) => setData(e.target.value)}
          />
        </div>

        <div style={grade(4, 16)}>
          <Tile rotulo="Caixa" valor={brl(rdd.caixa)} />
          <Tile rotulo="Contas Bancárias" valor={brl(rdd.banco)} />
          <Tile rotulo="Aplicações financeiras" valor={brl(rdd.aplicacoes)} />
          <Tile rotulo="Total disponível" valor={brl(rdd.total)} destaque />
        </div>
      </section>

      <form onSubmit={atualizar} style={card} noValidate>
        <h2 style={tituloCard}>Atualizar aplicações financeiras</h2>
        <p style={subCard}>
          Caixa e banco vêm sozinhos dos movimentos. As aplicações você informa
          quando o saldo mudar, e o valor vale a partir da data escolhida acima.
        </p>

        <div style={{ ...grade(2), maxWidth: 480 }}>
          <CampoTexto
            label={`Valor em ${data ? dataBR(data) : "—"}`}
            placeholder="R$ 0,00"
            inputMode="decimal"
            value={valorAplic}
            onChange={(e) => setValorAplic(e.target.value)}
          />
        </div>
        {erro && <div style={erroStyle}>{erro}</div>}

        <div style={{ marginTop: 16 }}>
          <Button type="submit">Atualizar aplicações</Button>
        </div>
      </form>

      <section style={card}>
        <h2 style={tituloCard}>Histórico diário</h2>
        <p style={subCard}>Últimos dias com movimento.</p>

        <Table
          data={datas}
          columns={[
            { header: "Data", render: (d) => dataBR(d) },
            {
              header: "Caixa",
              render: (d) => brl(rddEm(movimentos, aplicacoes, d).caixa),
            },
            {
              header: "Contas bancárias",
              render: (d) => brl(rddEm(movimentos, aplicacoes, d).banco),
            },
            {
              header: "Aplicações",
              render: (d) => brl(rddEm(movimentos, aplicacoes, d).aplicacoes),
            },
            {
              header: "Total",
              render: (d) => brl(rddEm(movimentos, aplicacoes, d).total),
            },
          ]}
        />
      </section>
    </>
  );
}

/* ========== Aba Cobranças ========== */

interface PropsCobrancas {
  abertos: MesAberto[];
  contatos: Record<string, Contato[]>;
  onContato: (locatario: string, nota: string) => void;
  onReceber: (
    pagamentos: { mes: MesAberto; encargos: number }[],
    forma: FormaPagamento,
  ) => void;
}

const soma = (valores: number[]) => arred(valores.reduce((s, v) => s + v, 0));

function AbaCobrancas({
  abertos,
  contatos,
  onContato,
  onReceber,
}: PropsCobrancas) {
  const hoje = hojeISO();

  const [multa, setMulta] = useState("2");
  const [juros, setJuros] = useState("1");
  const [aberto, setAberto] = useState<string | null>(null);
  const [desmarcados, setDesmarcados] = useState<Record<string, boolean>>({});
  const [nota, setNota] = useState("");
  const [forma, setForma] = useState<FormaPagamento | "">("");
  const [creditoOk, setCreditoOk] = useState(false);
  const [erroContato, setErroContato] = useState("");
  const [erroPagamento, setErroPagamento] = useState("");

  const calcular = (m: MesAberto) => {
    const e = calcularEncargos(
      m.valor,
      m.vencimento,
      hoje,
      numero(multa),
      numero(juros),
    );
    return {
      ...m,
      ...e,
      encargos: arred(e.multa + e.juros),
      total: arred(m.valor + e.multa + e.juros),
    };
  };

  const resumo = useMemo(() => {
    const mapa = new Map<string, MesAberto[]>();
    abertos.forEach((m) =>
      mapa.set(m.locatario, [...(mapa.get(m.locatario) ?? []), m]),
    );
    return Array.from(mapa, ([locatario, meses]) => ({
      locatario,
      imovel: meses[0].imovel,
      meses: meses
        .slice()
        .sort((a, b) => (a.vencimento < b.vencimento ? -1 : 1)),
    }));
  }, [abertos]);

  const grupos = resumo.map((g) => {
    const linhas = g.meses.map(calcular);
    return {
      ...g,
      linhas,
      original: soma(linhas.map((l) => l.valor)),
      encargos: soma(linhas.map((l) => l.encargos)),
      total: soma(linhas.map((l) => l.total)),
    };
  });

  const totalGeral = soma(grupos.map((g) => g.total));
  const emCobranca = grupos.filter((g) => g.meses.length > 1).length;

  const sel = grupos.find((g) => g.locatario === aberto);
  const selecionados = sel ? sel.linhas.filter((l) => !desmarcados[l.id]) : [];
  const totalSelecionado = soma(selecionados.map((l) => l.total));

  const abrir = (locatario: string) => {
    setAberto(aberto === locatario ? null : locatario);
    setNota("");
    setErroContato("");
    setErroPagamento("");
  };

  const registrarContato = () => {
    if (!sel) return;
    if (!nota.trim()) {
      setErroContato("Escreva o que foi conversado com o inquilino.");
      return;
    }
    onContato(sel.locatario, nota.trim());
    setNota("");
    setErroContato("");
  };

  const receber = () => {
    if (selecionados.length === 0) {
      setErroPagamento("Marque pelo menos um mês para receber.");
      return;
    }
    if (!forma) {
      setErroPagamento("Escolha a forma de pagamento.");
      return;
    }
    if (forma !== "Dinheiro" && !creditoOk) {
      setErroPagamento(
        "Confirme que o crédito já está na conta antes de emitir o recibo.",
      );
      return;
    }
    onReceber(
      selecionados.map((l) => ({ mes: l, encargos: l.encargos })),
      forma,
    );
    setForma("");
    setCreditoOk(false);
    setErroPagamento("");
    setAberto(null);
  };

  return (
    <>
      <section style={card}>
        <h2 style={tituloCard}>Cobrança de aluguel em atraso</h2>
        <p style={subCard}>
          A cobrança começa, em regra, quando o inquilino tem mais de um mês em
          aberto. Com um só mês, ele fica em atenção.
        </p>

        <div style={{ ...grade(4, 16), marginBottom: 16 }}>
          <Tile rotulo="Inquilinos em cobrança" valor={String(emCobranca)} />
          <Tile
            rotulo="Inquilinos em atenção"
            valor={String(grupos.length - emCobranca)}
          />
          <Tile
            rotulo="Valor atualizado em aberto"
            valor={brl(totalGeral)}
            destaque
          />
        </div>

        <div style={{ ...grade(4, 12), maxWidth: 520 }}>
          <CampoTexto
            label="Multa (%)"
            inputMode="decimal"
            value={multa}
            onChange={(e) => setMulta(e.target.value)}
          />
          <CampoTexto
            label="Juros ao mês (%)"
            inputMode="decimal"
            value={juros}
            onChange={(e) => setJuros(e.target.value)}
          />
        </div>
        <p style={{ ...subCard, margin: "6px 0 0" }}>
          Percentuais de exemplo. Use os que estão no contrato de locação. Os
          juros são proporcionais aos dias de atraso.
        </p>
      </section>

      <section style={card}>
        <Table
          data={grupos}
          emptyMessage="Nenhum aluguel em aberto."
          columns={[
            { header: "Locatário", render: (g) => g.locatario },
            { header: "Imóvel", render: (g) => g.imovel },
            {
              header: "Meses em aberto",
              render: (g) => g.meses.map((m) => m.mesReferencia).join(", "),
            },
            { header: "Valor original", render: (g) => brl(g.original) },
            { header: "Encargos", render: (g) => brl(g.encargos) },
            { header: "Valor atualizado", render: (g) => brl(g.total) },
            {
              header: "Situação",
              render: (g) => (g.meses.length > 1 ? "Em cobrança" : "Atenção"),
            },
            {
              header: "",
              render: (g) => (
                <Button
                  variant="secondary"
                  type="button"
                  onClick={() => abrir(g.locatario)}
                >
                  {aberto === g.locatario ? "Fechar" : "Abrir"}
                </Button>
              ),
            },
          ]}
        />
      </section>

      {sel && (
        <section style={card}>
          <h2 style={tituloCard}>{sel.locatario}</h2>
          <p style={subCard}>
            {sel.imovel}. Valores calculados até {dataBR(hoje)}.
          </p>

          <Table
            data={sel.linhas}
            columns={[
              {
                header: "Mês",
                render: (l) => (
                  <label
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      cursor: "pointer",
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={!desmarcados[l.id]}
                      onChange={(e) =>
                        setDesmarcados((d) => ({
                          ...d,
                          [l.id]: !e.target.checked,
                        }))
                      }
                    />
                    {l.mesReferencia}
                  </label>
                ),
              },
              { header: "Vencimento", render: (l) => dataBR(l.vencimento) },
              { header: "Dias de atraso", render: (l) => String(l.dias) },
              { header: "Aluguel", render: (l) => brl(l.valor) },
              { header: "Multa", render: (l) => brl(l.multa) },
              { header: "Juros", render: (l) => brl(l.juros) },
              { header: "Total", render: (l) => brl(l.total) },
            ]}
          />

          <div style={{ ...grade(3, 16), marginTop: 16, maxWidth: 720 }}>
            <Tile
              rotulo="Valor a informar ao inquilino"
              valor={brl(totalSelecionado)}
              destaque
            />
          </div>

          <h3 style={{ fontSize: 13, fontWeight: 600, margin: "22px 0 8px" }}>
            Contatos com o inquilino
          </h3>
          {(contatos[sel.locatario] ?? []).length === 0 ? (
            <p style={{ fontSize: 11, color: "#777", margin: "0 0 10px" }}>
              Nenhum contato registrado. Se não houver pagamento, a pendência
              fica aberta em acompanhamento.
            </p>
          ) : (
            (contatos[sel.locatario] ?? []).map((c, i) => (
              <div
                key={i}
                style={{
                  fontSize: 12,
                  color: "#333",
                  padding: "6px 0",
                  borderTop: "1px solid #f0f0f5",
                }}
              >
                <span style={{ color: "#777" }}>{dataBR(c.data)}: </span>
                {c.nota}
              </div>
            ))
          )}
          <div
            style={{
              display: "flex",
              gap: 10,
              alignItems: "flex-start",
              maxWidth: 720,
              marginTop: 10,
            }}
          >
            <div style={{ flex: 1 }}>
              <CampoTexto
                label="Novo contato"
                placeholder="Motivo do atraso e o que ficou combinado"
                value={nota}
                onChange={(e) => setNota(e.target.value)}
                erro={erroContato}
              />
            </div>
            <div style={{ paddingTop: 22 }}>
              <Button type="button" onClick={registrarContato}>
                Registrar contato
              </Button>
            </div>
          </div>

          <h3 style={{ fontSize: 13, fontWeight: 600, margin: "22px 0 8px" }}>
            Receber o pagamento
          </h3>
          <p style={{ fontSize: 11, color: "#777", margin: "0 0 10px" }}>
            Vale para os meses marcados acima. Cada mês gera um recibo com os
            encargos, e o valor entra no Caixa ou no Banco.
          </p>
          <Campo label="Forma de pagamento">
            <div style={{ display: "flex", gap: 20 }}>
              {(["Dinheiro", "Pix", "Transferência"] as FormaPagamento[]).map(
                (f) => (
                  <Opcao
                    key={f}
                    nome="forma-cobranca"
                    texto={f}
                    marcado={forma === f}
                    onChange={() => setForma(f)}
                  />
                ),
              )}
            </div>
          </Campo>
          {forma && forma !== "Dinheiro" && (
            <label
              style={{
                fontSize: 11,
                color: "#333",
                display: "flex",
                alignItems: "center",
                gap: 8,
                marginTop: 10,
                cursor: "pointer",
              }}
            >
              <input
                type="checkbox"
                checked={creditoOk}
                onChange={(e) => setCreditoOk(e.target.checked)}
              />
              Crédito confirmado na conta bancária
            </label>
          )}
          {erroPagamento && <div style={erroStyle}>{erroPagamento}</div>}
          <div style={{ marginTop: 16 }}>
            <Button type="button" onClick={receber}>
              Registrar pagamento e gerar recibo
            </Button>
          </div>
        </section>
      )}
    </>
  );
}

/* ========== Aba Fechamento final ========== */

interface PropsFechamento {
  movimentos: Movimento[];
  recebimentos: Recebimento[];
  aplicacoes: Record<string, number>;
  fechamentos: Record<string, string[]>;
  onMarcar: (mes: string, passo: number, marcado: boolean) => void;
}

const PASSOS = [
  "Documentação do mês carimbada e separada por dia (recibos, comprovantes de entrada e saída, notas fiscais)",
  "Registros do mês impressos: Movimento de Caixa, Movimento de Banco e RDD",
  "Conjunto mensal enviado à contabilidade",
  "Documentação devolvida pela contabilidade",
  "Documentos digitalizados e arquivados nas pastas físicas e digitais (a digitalização é necessária para o envio ao MPS/SE)",
];

function AbaFechamento({
  movimentos,
  recebimentos,
  aplicacoes,
  fechamentos,
  onMarcar,
}: PropsFechamento) {
  const mesDoSistema = mesDe(`${mesAtual()}-01`);
  const [mes, setMes] = useState(mesDoSistema);

  const meses = Array.from(
    new Set([mesDoSistema, ...movimentos.map((m) => mesDe(m.data))]),
  ).sort((a, b) => (inicioDoMes(a) < inicioDoMes(b) ? 1 : -1));

  const doMes = movimentos.filter((m) => mesDe(m.data) === mes);
  const entradas = doMes
    .filter((m) => m.tipo === "entrada")
    .reduce((s, m) => s + m.valor, 0);
  const saidas = doMes
    .filter((m) => m.tipo === "saida")
    .reduce((s, m) => s + m.valor, 0);
  const fim = fimDoMes(mes);
  const caixa = saldoAte(movimentos, "caixa", SALDOS_INICIAIS.caixa, fim);
  const banco = saldoAte(movimentos, "banco", SALDOS_INICIAIS.banco, fim);
  const rdd = rddEm(movimentos, aplicacoes, fim);

  const recibos = recebimentos.filter((r) => mesDe(r.data) === mes).length;
  const despesas = doMes.filter((m) => m.origem === "despesa").length;

  const estado = fechamentos[mes] ?? [];
  const feitos = PASSOS.filter((_, i) => !!estado[i]).length;

  return (
    <>
      <section style={card}>
        <h2 style={tituloCard}>Fechamento do mês</h2>
        <p style={subCard}>
          Resumo do mês e acompanhamento do envio da documentação à
          contabilidade.
        </p>

        <div style={{ maxWidth: 240, marginBottom: 16 }}>
          <CampoSelect
            label="Mês"
            placeholder="Selecione o mês"
            opcoes={meses}
            value={mes}
            onChange={(v) => setMes(v || mesDoSistema)}
          />
        </div>

        <div style={grade(4, 16)}>
          <Tile rotulo="Entradas do mês" valor={brl(entradas)} />
          <Tile rotulo="Saídas do mês" valor={brl(saidas)} />
          <Tile rotulo="Caixa no fim do mês" valor={brl(caixa)} />
          <Tile rotulo="Banco no fim do mês" valor={brl(banco)} />
        </div>

        <p style={{ fontSize: 11, color: "#555", margin: "14px 0 0" }}>
          {recibos} {recibos === 1 ? "recibo emitido" : "recibos emitidos"},{" "}
          {despesas}{" "}
          {despesas === 1 ? "despesa registrada" : "despesas registradas"}.
          Aplicações financeiras: {brl(rdd.aplicacoes)}. Total disponível no fim
          do mês: {brl(rdd.total)}.
        </p>
      </section>

      <section style={card}>
        <h2 style={tituloCard}>Envio à contabilidade</h2>
        <p style={subCard}>
          {feitos === PASSOS.length
            ? "Mês fechado, documentação devolvida e arquivada."
            : `${feitos} de ${PASSOS.length} etapas concluídas. Cada etapa só libera depois da anterior.`}
        </p>

        {PASSOS.map((texto, i) => {
          const feito = !!estado[i];
          const liberado = i === 0 || !!estado[i - 1];
          return (
            <label
              key={texto}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                fontSize: 12,
                color: liberado ? "#333" : "#bbb",
                padding: "10px 0",
                borderTop: "1px solid #f0f0f5",
                cursor: liberado ? "pointer" : "not-allowed",
              }}
            >
              <input
                type="checkbox"
                checked={feito}
                disabled={!liberado}
                onChange={(e) => onMarcar(mes, i, e.target.checked)}
              />
              <span style={{ flex: 1 }}>
                {i + 1}. {texto}
              </span>
              {feito && (
                <span style={{ color: "#777", fontSize: 11 }}>
                  {dataBR(estado[i])}
                </span>
              )}
            </label>
          );
        })}
      </section>
    </>
  );
}

/* ========== Tela Financeiro ========== */

const ABAS = [
  "Recebimentos",
  "Caixa",
  "Banco",
  "RDD",
  "Gastos e despesas",
  "Cobranças",
  "Fechamento final",
];

const MES_REGEX = /^(0[1-9]|1[0-2])\/\d{4}$/;

interface FormState {
  imovel: string; // id do imóvel (string)
  locatario: string; // id do locatário (string)
  mesReferencia: string;
  vencimento: string;
  aluguel: string;
  iptu: string;
  outros: string;
  correcao: string;
  juros: string;
  multa: string;
  forma: FormaPagamento | "";
}

const FORM_VAZIO: FormState = {
  imovel: "",
  locatario: "",
  mesReferencia: "",
  vencimento: "",
  aluguel: "",
  iptu: "",
  outros: "",
  correcao: "",
  juros: "",
  multa: "",
  forma: "",
};

function Financeiro() {
  const [aba, setAba] = useState("Recebimentos");

  // dados da API
  const [imoveis, setImoveis] = useState<Imovel[]>([]);
  const [locatarios, setLocatarios] = useState<Locatario[]>([]);
  const [lancamentos, setLancamentos] = useState<LancamentoFinanceiro[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");
  const [aviso, setAviso] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [emitindo, setEmitindo] = useState<string | null>(null);

  // forma de pagamento guardada no navegador por lançamento
  const [formas, setFormas] = useState<Record<string, FormaPagamento>>(
    carregarFormas,
  );

  // estado compartilhado entre as abas
  const [movimentosLocais, setMovimentosLocais] = useState<Movimento[]>([]);
  const [contatos, setContatos] = useState<Record<string, Contato[]>>({});
  const [aplicacoes, setAplicacoes] = useState<Record<string, number>>({});
  const [fechamentos, setFechamentos] = useState<Record<string, string[]>>({});

  // formulário de recebimento
  const [form, setForm] = useState<FormState>(FORM_VAZIO);
  const [erros, setErros] = useState<
    Partial<Record<keyof FormState | "credito", string>>
  >({});
  const [creditoOk, setCreditoOk] = useState(false);
  const [reciboAberto, setReciboAberto] = useState<Recebimento | null>(null);

  const [filtroImovel, setFiltroImovel] = useState("");
  const [filtroLocatario, setFiltroLocatario] = useState("");
  const [filtroStatus, setFiltroStatus] = useState("");

  /* ---------- carga inicial e recarga ---------- */

  const recarregar = async () => {
    try {
      const resposta = await api.get<LancamentoFinanceiro[]>(
        "/financeiro/lancamentos",
      );
      setLancamentos(resposta.data);
    } catch (e) {
      setErro(mensagemDeErro(e));
    }
  };

  useEffect(() => {
    let ativo = true;
    (async () => {
      try {
        const [rImoveis, rLocatarios, rLancamentos] = await Promise.all([
          api.get<Imovel[]>("/imoveis"),
          api.get<Locatario[]>("/locatarios"),
          api.get<LancamentoFinanceiro[]>("/financeiro/lancamentos"),
        ]);
        if (!ativo) return;
        setImoveis(rImoveis.data);
        setLocatarios(rLocatarios.data);
        setLancamentos(rLancamentos.data);
      } catch (e) {
        if (ativo) setErro(mensagemDeErro(e));
      } finally {
        if (ativo) setCarregando(false);
      }
    })();
    return () => {
      ativo = false;
    };
  }, []);

  const gravarFormas = (novo: Record<string, FormaPagamento>) => {
    setFormas(novo);
    try {
      localStorage.setItem(CHAVE_FORMAS, JSON.stringify(novo));
    } catch {
      // sem armazenamento local a forma fica só em memória
    }
  };

  /* ---------- listas derivadas ---------- */

  // lançamentos → linhas da tela (CANCELADO fica de fora)
  const recebimentos = useMemo(
    () =>
      lancamentos
        .filter((l) => l.status !== "CANCELADO")
        .map((l) => paraRecebimento(l, formas))
        .sort((a, b) =>
          a.data === b.data
            ? Number(b.id) - Number(a.id)
            : b.data.localeCompare(a.data),
        ),
    [lancamentos, formas],
  );

  // meses em aberto (PENDENTE ou ATRASADO) alimentam a aba Cobranças
  const abertos = useMemo(
    () =>
      lancamentos
        .filter((l) => l.status === "PENDENTE" || l.status === "ATRASADO")
        .map(paraMesAberto),
    [lancamentos],
  );

  // movimentos: os vindos da API + os criados localmente (depósitos e despesas)
  const movimentos = useMemo(
    () => [
      ...movimentosLocais,
      ...movimentosDeLancamentos(lancamentos, formas),
    ],
    [movimentosLocais, lancamentos, formas],
  );

  const set = (campo: keyof FormState) => (valor: string) =>
    setForm((f) => ({ ...f, [campo]: valor }));
  const setInput =
    (campo: keyof FormState) => (e: ChangeEvent<HTMLInputElement>) =>
      set(campo)(e.target.value);

  const total = useMemo(
    () =>
      numero(form.aluguel) +
      numero(form.iptu) +
      numero(form.outros) +
      numero(form.correcao) +
      numero(form.juros) +
      numero(form.multa),
    [form],
  );

  // Disponibilidade de hoje: caixa e banco vêm dos movimentos
  const rdd = rddEm(movimentos, aplicacoes, hojeISO());

  /* ---------- ações compartilhadas ---------- */

  const depositar = ({
    data,
    valor,
    comprovante,
  }: {
    data: string;
    valor: number;
    comprovante: string;
  }) => {
    const base = {
      data,
      tipo: "saida" as const,
      origem: "deposito" as const,
      historico: "Depósito do cofre no banco",
      documento: `Comprovante ${comprovante}`,
      valor,
    };
    setMovimentosLocais((m) => [
      ...m,
      { ...base, id: idUnico(), conta: "caixa" as const },
      {
        ...base,
        id: idUnico(),
        conta: "banco" as const,
        tipo: "entrada" as const,
      },
    ]);
  };

  const registrarGasto = (d: NovaDespesa) =>
    setMovimentosLocais((m) => [
      ...m,
      {
        id: idUnico(),
        data: d.data,
        conta: d.conta,
        tipo: "saida" as const,
        origem: "despesa" as const,
        historico: d.descricao,
        documento: d.documento,
        valor: d.valor,
        categoria: d.categoria,
      },
    ]);

  const atualizarAplicacoes = (data: string, valor: number) =>
    setAplicacoes((a) => ({ ...a, [data]: valor }));

  const registrarContato = (locatario: string, nota: string) =>
    setContatos((c) => ({
      ...c,
      [locatario]: [...(c[locatario] ?? []), { data: hojeISO(), nota }],
    }));

  // quita cada mês em aberto na API (a backend calcula multa e juros) e recarrega
  const receberAtrasados = async (
    pagamentos: { mes: MesAberto; encargos: number }[],
    forma: FormaPagamento,
  ) => {
    setErro("");
    setAviso("");
    try {
      const hoje = hojeISO();
      const novo = { ...formas };
      for (const p of pagamentos) {
        await api.post(`/financeiro/lancamentos/${p.mes.id}/pagar`, {
          dataPagamento: hoje,
        });
        novo[p.mes.id] = forma;
      }
      gravarFormas(novo);
      setAviso(
        pagamentos.length === 1
          ? "Pagamento registrado e recibo gerado com sucesso."
          : `${pagamentos.length} pagamentos registrados e recibos gerados com sucesso.`,
      );
    } catch (e) {
      setErro(mensagemDeErro(e));
    } finally {
      await recarregar();
    }
  };

  const marcarFechamento = (mes: string, passo: number, marcado: boolean) =>
    setFechamentos((f) => {
      const atual = (f[mes] ?? []).slice();
      if (marcado) atual[passo] = hojeISO();
      else for (let i = passo; i < 5; i++) atual[i] = "";
      return { ...f, [mes]: atual };
    });

  /* ---------- recibo ---------- */

  const verRecibo = async (r: Recebimento) => {
    if (r.status === "Pago") {
      setErro("");
      setEmitindo(r.id);
      try {
        // o backend numera o recibo no primeiro download (lazy) e devolve o PDF
        await baixarArquivo(
          `/financeiro/lancamentos/${r.id}/recibo`,
          `recibo-${r.recibo !== "—" ? r.recibo : r.id}.pdf`,
        );
        if (r.recibo === "—") await recarregar(); // passa a exibir o número
      } catch (e) {
        setErro(mensagemDeErro(e));
      } finally {
        setEmitindo(null);
      }
      return;
    }
    // pendente: mostra os dados no modal do design
    setReciboAberto(r);
  };

  /* ---------- formulário de recebimento ---------- */

  const validar = () => {
    const e: Partial<Record<keyof FormState | "credito", string>> = {};
    if (!form.imovel) e.imovel = "Selecione o imóvel.";
    if (!form.locatario) e.locatario = "Selecione o locatário.";
    if (!MES_REGEX.test(form.mesReferencia))
      e.mesReferencia = "Use o formato MM/AAAA.";
    if (!MES_REGEX.test(form.vencimento))
      e.vencimento = "Use o formato MM/AAAA.";
    if (numero(form.aluguel) <= 0) e.aluguel = "Informe o valor do aluguel.";
    if (!form.forma) e.forma = "Escolha a forma de pagamento.";
    if (
      (form.forma === "Pix" || form.forma === "Transferência") &&
      !creditoOk
    ) {
      e.credito = "Confirme o crédito na conta antes de emitir o recibo.";
    }
    setErros(e);
    return Object.keys(e).length === 0;
  };

  const registrar = async (ev: FormEvent<HTMLFormElement>) => {
    ev.preventDefault();
    if (!validar() || !form.forma) return;
    const forma = form.forma;

    setEnviando(true);
    setErro("");
    setAviso("");
    try {
      // MM/AAAA → AAAA-MM e vencimento no primeiro dia do mês informado
      const payload: LancamentoRequest = {
        imovelId: Number(form.imovel),
        locatarioId: Number(form.locatario),
        tipo: "ALUGUEL",
        natureza: "ENTRADA",
        valorAluguel: numero(form.aluguel),
        valorIptu: numero(form.iptu),
        mesReferencia: `${form.mesReferencia.slice(3)}-${form.mesReferencia.slice(0, 2)}`,
        dataVencimento: `${form.vencimento.slice(3)}-${form.vencimento.slice(0, 2)}-01`,
      };

      const criado = await api.post<LancamentoFinanceiro>(
        "/financeiro/lancamentos",
        payload,
      );
      // já sai quitado, com recibo (o backend recalcula multa e juros)
      await api.post(`/financeiro/lancamentos/${criado.data.id}/pagar`, {
        dataPagamento: hojeISO(),
      });
      gravarFormas({ ...formas, [String(criado.data.id)]: forma });

      setAviso("Recebimento registrado e recibo gerado com sucesso.");
      setForm(FORM_VAZIO);
      setCreditoOk(false);
      setErros({});
      await recarregar();
    } catch (e) {
      setErro(mensagemDeErro(e));
    } finally {
      setEnviando(false);
    }
  };

  const filtrados = recebimentos.filter(
    (r) =>
      (!filtroImovel || r.imovelId === filtroImovel) &&
      (!filtroLocatario || r.locatarioId === filtroLocatario) &&
      (!filtroStatus || r.status === filtroStatus),
  );

  // inquilinos com mais de um mês em aberto (os que entram em cobrança)
  const mesesPorLocatario = abertos.reduce<Record<string, number>>(
    (mapa, a) => ({ ...mapa, [a.locatario]: (mapa[a.locatario] ?? 0) + 1 }),
    {},
  );
  const emCobranca = Object.values(mesesPorLocatario).filter(
    (n) => n > 1,
  ).length;

  const opcoesImovel = imoveis.map((i) => ({
    valor: String(i.id),
    rotulo: rotuloImovel(i),
  }));
  const opcoesLocatario = locatarios.map((l) => ({
    valor: String(l.id),
    rotulo: l.nome,
  }));

  return (
    <div
      style={{
        fontFamily: "'Nunito', sans-serif",
        padding: 24,
        background: "#fcfcf6",
        minHeight: "100%",
      }}
    >
      <h1 style={{ fontSize: 16, fontWeight: 600, margin: 0 }}>Financeiro</h1>
      <p style={{ fontSize: 10, color: "#666", margin: "2px 0 20px" }}>
        Lançamento de aluguéis, recibos e gastos
      </p>

      {/* feedback de sucesso/erro */}
      {(erro || aviso) && (
        <div style={{ margin: "-10px 0 16px", fontSize: 11 }}>
          {erro && <div style={{ color: "#d63031" }}>{erro}</div>}
          {aviso && <div style={{ color: "#2f9e44" }}>{aviso}</div>}
        </div>
      )}

      {carregando ? (
        <p style={{ fontSize: 12, color: "#777" }}>Carregando…</p>
      ) : (
        <>
          {/* Disponibilidade financeira */}
          <section style={card}>
            <h2 style={{ fontSize: 14, fontWeight: 500, margin: 0 }}>
              Disponibilidade financeira (RDD)
            </h2>
            <p style={{ fontSize: 9, color: "#777", margin: "2px 0 14px" }}>
              {dataBR(hojeISO())}
            </p>
            <div style={grade(4, 16)}>
              <Tile rotulo="Caixa" valor={brl(rdd.caixa)} />
              <Tile rotulo="Contas Bancárias" valor={brl(rdd.banco)} />
              <Tile rotulo="Aplicações financeiras" valor={brl(rdd.aplicacoes)} />
              <Tile rotulo="Total disponível" valor={brl(rdd.total)} destaque />
            </div>
          </section>

          {/* Abas */}
          <nav
            style={{
              display: "grid",
              gridTemplateColumns: `repeat(${ABAS.length}, 1fr)`,
              background: "#fff",
              border: "1px solid #e8e8f2",
              borderRadius: 8,
              marginBottom: 20,
              overflow: "hidden",
            }}
          >
            {ABAS.map((nome) => (
              <button
                key={nome}
                onClick={() => setAba(nome)}
                style={{
                  border: "none",
                  background: aba === nome ? "#dcdcf7" : "transparent",
                  color: aba === nome ? "#4a4cb0" : "#444",
                  fontFamily: "'Nunito', sans-serif",
                  fontSize: 10,
                  padding: "12px 4px",
                  cursor: "pointer",
                }}
              >
                {nome}
                {nome === "Cobranças" && emCobranca > 0 ? ` (${emCobranca})` : ""}
              </button>
            ))}
          </nav>

          {aba === "Caixa" && (
            <AbaMovimento
              conta="caixa"
              movimentos={movimentos}
              saldoInicial={SALDOS_INICIAIS.caixa}
              onDepositar={depositar}
            />
          )}
          {aba === "Banco" && (
            <AbaMovimento
              conta="banco"
              movimentos={movimentos}
              saldoInicial={SALDOS_INICIAIS.banco}
            />
          )}
          {aba === "RDD" && (
            <AbaRDD
              movimentos={movimentos}
              aplicacoes={aplicacoes}
              onAtualizarAplicacoes={atualizarAplicacoes}
            />
          )}
          {aba === "Gastos e despesas" && (
            <AbaGastos movimentos={movimentos} onRegistrar={registrarGasto} />
          )}
          {aba === "Cobranças" && (
            <AbaCobrancas
              abertos={abertos}
              contatos={contatos}
              onContato={registrarContato}
              onReceber={receberAtrasados}
            />
          )}
          {aba === "Fechamento final" && (
            <AbaFechamento
              movimentos={movimentos}
              recebimentos={recebimentos.filter((r) => r.status === "Pago")}
              aplicacoes={aplicacoes}
              fechamentos={fechamentos}
              onMarcar={marcarFechamento}
            />
          )}

          {aba === "Recebimentos" && (
            <>
              {/* Lançar recebimento */}
              <form onSubmit={registrar} style={card} noValidate>
                <h2 style={{ fontSize: 14, fontWeight: 500, margin: 0 }}>
                  Lançar recebimento de aluguel
                </h2>
                <p style={{ fontSize: 9, color: "#777", margin: "2px 0 16px" }}>
                  Registre o pagamento do aluguel e gere o recibo automaticamente.
                </p>

                <div style={{ ...grade(2), maxWidth: 720 }}>
                  <CampoSelect
                    label="Imóvel"
                    placeholder="Selecione o imóvel"
                    opcoes={opcoesImovel}
                    value={form.imovel}
                    onChange={set("imovel")}
                    erro={erros.imovel}
                  />
                  <CampoSelect
                    label="Locatário"
                    placeholder="Selecione o locatário"
                    opcoes={opcoesLocatario}
                    value={form.locatario}
                    onChange={set("locatario")}
                    erro={erros.locatario}
                  />
                  <CampoTexto
                    label="Mês de referência"
                    placeholder="MM/AAAA"
                    value={form.mesReferencia}
                    onChange={setInput("mesReferencia")}
                    erro={erros.mesReferencia}
                  />
                  <CampoTexto
                    label="Vencimento"
                    placeholder="MM/AAAA"
                    value={form.vencimento}
                    onChange={setInput("vencimento")}
                    erro={erros.vencimento}
                  />
                </div>

                <div style={{ ...grade(3), marginTop: 18 }}>
                  <CampoTexto
                    label="Valor do aluguel"
                    placeholder="R$ 0,00"
                    inputMode="decimal"
                    value={form.aluguel}
                    onChange={setInput("aluguel")}
                    erro={erros.aluguel}
                  />
                  <CampoTexto
                    label="IPTU"
                    placeholder="R$ 0,00"
                    inputMode="decimal"
                    value={form.iptu}
                    onChange={setInput("iptu")}
                  />
                  <CampoTexto
                    label="Outros valores"
                    placeholder="R$ 0,00"
                    inputMode="decimal"
                    value={form.outros}
                    onChange={setInput("outros")}
                  />
                  <CampoTexto
                    label="Correção monetária"
                    placeholder="R$ 0,00"
                    inputMode="decimal"
                    value={form.correcao}
                    onChange={setInput("correcao")}
                  />
                  <CampoTexto
                    label="Juros"
                    placeholder="R$ 0,00"
                    inputMode="decimal"
                    value={form.juros}
                    onChange={setInput("juros")}
                  />
                  <CampoTexto
                    label="Multa"
                    placeholder="R$ 0,00"
                    inputMode="decimal"
                    value={form.multa}
                    onChange={setInput("multa")}
                  />
                </div>

                <p style={{ fontSize: 9, color: "#999", margin: "8px 0 0" }}>
                  Multa e juros de atraso são recalculados automaticamente no
                  momento da quitação. Os campos "Outros valores", "Correção
                  monetária", "Juros" e "Multa" são apenas informativos: o
                  lançamento enviado considera somente aluguel e IPTU.
                </p>

                <div
                  style={{
                    display: "flex",
                    gap: 40,
                    alignItems: "flex-start",
                    marginTop: 18,
                  }}
                >
                  <div
                    style={{
                      background: "#f1f2fc",
                      borderRadius: 8,
                      padding: "10px 16px",
                      minWidth: 220,
                    }}
                  >
                    <div style={{ fontSize: 12, color: "#333" }}>Total</div>
                    <div style={{ fontSize: 20, color: "#6c6fd0" }}>
                      {brl(total)}
                    </div>
                  </div>

                  <div>
                    <span style={labelStyle}>Forma de pagamento</span>
                    <div style={{ display: "flex", gap: 20 }}>
                      {(
                        ["Dinheiro", "Pix", "Transferência"] as FormaPagamento[]
                      ).map((f) => (
                        <label
                          key={f}
                          style={{
                            fontSize: 11,
                            color: "#333",
                            display: "flex",
                            alignItems: "center",
                            gap: 6,
                            cursor: "pointer",
                          }}
                        >
                          <input
                            type="radio"
                            name="forma"
                            checked={form.forma === f}
                            onChange={() => set("forma")(f)}
                          />
                          {f}
                        </label>
                      ))}
                    </div>
                    {erros.forma && <div style={erroStyle}>{erros.forma}</div>}

                    {(form.forma === "Pix" || form.forma === "Transferência") && (
                      <label
                        style={{
                          fontSize: 11,
                          color: "#333",
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                          marginTop: 10,
                          cursor: "pointer",
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={creditoOk}
                          onChange={(e) => setCreditoOk(e.target.checked)}
                        />
                        Crédito confirmado na conta bancária
                      </label>
                    )}
                    {erros.credito && (
                      <div style={erroStyle}>{erros.credito}</div>
                    )}
                  </div>
                </div>

                <div style={{ marginTop: 18 }}>
                  <Button type="submit" disabled={enviando}>
                    Registrar e gerar recibo
                  </Button>
                </div>
              </form>

              {/* Últimos recebimentos */}
              <section style={card}>
                <h2 style={{ fontSize: 14, fontWeight: 500, margin: 0 }}>
                  Últimos recebimentos
                </h2>
                <p style={{ fontSize: 9, color: "#777", margin: "2px 0 14px" }}>
                  Consulte pagamentos registrados e os status dos recibos
                </p>

                <div style={{ ...grade(3, 12), marginBottom: 16 }}>
                  <CampoSelect
                    label="Imóvel"
                    placeholder="Todos os imóveis"
                    opcoes={opcoesImovel}
                    value={filtroImovel}
                    onChange={setFiltroImovel}
                  />
                  <CampoSelect
                    label="Locatário"
                    placeholder="Todos os locatários"
                    opcoes={opcoesLocatario}
                    value={filtroLocatario}
                    onChange={setFiltroLocatario}
                  />
                  <CampoSelect
                    label="Status"
                    placeholder="Todos os status"
                    opcoes={["Pago", "Pendente"]}
                    value={filtroStatus}
                    onChange={setFiltroStatus}
                  />
                </div>

                <Table
                  data={filtrados}
                  emptyMessage="Nenhum recebimento encontrado."
                  columns={[
                    { header: "Data", render: (r) => dataBR(r.data).slice(0, 5) },
                    { header: "Recibo", render: (r) => r.recibo },
                    { header: "Locatário", render: (r) => r.locatario },
                    { header: "Imóvel", render: (r) => r.imovel },
                    {
                      header: "Status",
                      render: (r) => (
                        <Button variant="secondary" type="button">
                          {r.status}
                        </Button>
                      ),
                    },
                    { header: "Forma de pagamento", render: (r) => r.forma },
                    { header: "Valor", render: (r) => brl(r.valor) },
                    {
                      header: "",
                      render: (r) => (
                        <Button
                          variant="secondary"
                          type="button"
                          disabled={emitindo === r.id}
                          onClick={() => void verRecibo(r)}
                        >
                          Ver recibo
                        </Button>
                      ),
                    },
                  ]}
                />
              </section>
            </>
          )}

          {/* Recibo do cliente */}
          {reciboAberto && (
            <div
              onClick={() => setReciboAberto(null)}
              style={{
                position: "fixed",
                inset: 0,
                background: "rgba(0,0,0,0.35)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                zIndex: 1000,
              }}
            >
              <div
                onClick={(e) => e.stopPropagation()}
                style={{
                  background: "#fff",
                  borderRadius: 12,
                  padding: 24,
                  width: 380,
                  maxWidth: "90%",
                }}
              >
                <h2 style={{ fontSize: 16, fontWeight: 600, margin: 0 }}>
                  Recibo nº {reciboAberto.recibo}
                </h2>
                <p style={{ fontSize: 11, color: "#777", margin: "2px 0 18px" }}>
                  Pagamento registrado em {dataBR(reciboAberto.data)}
                </p>

                {[
                  ["Locatário", reciboAberto.locatario],
                  ["Imóvel", reciboAberto.imovel],
                  ["Mês de referência", reciboAberto.mesReferencia],
                  ["Forma de pagamento", reciboAberto.forma],
                  ["Status", reciboAberto.status],
                  ...(reciboAberto.encargos
                    ? [
                        [
                          "Encargos (multa, juros e correção)",
                          brl(reciboAberto.encargos),
                        ],
                      ]
                    : []),
                ].map(([rotulo, valor]) => (
                  <div
                    key={rotulo}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      fontSize: 12,
                      padding: "8px 0",
                      borderTop: "1px solid #f0f0f5",
                    }}
                  >
                    <span style={{ color: "#777" }}>{rotulo}</span>
                    <span style={{ color: "#333" }}>{valor}</span>
                  </div>
                ))}

                <div
                  style={{
                    background: "#f1f2fc",
                    borderRadius: 8,
                    padding: "10px 16px",
                    marginTop: 14,
                  }}
                >
                  <div style={{ fontSize: 12, color: "#333" }}>Total pago</div>
                  <div style={{ fontSize: 20, color: "#6c6fd0" }}>
                    {brl(reciboAberto.valor)}
                  </div>
                </div>

                <div style={{ marginTop: 18, textAlign: "right" }}>
                  <Button type="button" onClick={() => setReciboAberto(null)}>
                    Fechar
                  </Button>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default Financeiro;
