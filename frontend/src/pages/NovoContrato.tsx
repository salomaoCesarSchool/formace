import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Button from "../components/Button";
import PageHeader from "../components/PageHeader";
import { api, mensagemDeErro } from "../api/axios";
import { CORES } from "../theme";
import {
  contratoHTML,
  imprimirContrato,
  mesesEntre,
} from "../utils/contratoDocumento";
import type { Assinaturas, Dados } from "../utils/contratoDocumento";
import {
  mascaraCPF,
  mascaraTelefone,
  validaCPF,
  validaEmail,
  validaTelefone,
} from "../utils/validacao";
import { formatBRL, formatData } from "../utils/format";
import type { Contrato, DocumentoObrigatorio, Imovel, Locatario } from "../types";

/* ───────── Constantes do formulário ───────── */

const PASSOS = [
  "1. Selecionar locatário e imóvel",
  "2. Definir condições",
  "3. Gerar e revisar contrato",
];

const GARANTIAS: { valor: string; rotulo: string }[] = [
  { valor: "SEM_GARANTIA", rotulo: "Sem garantia" },
  { valor: "FIADOR", rotulo: "Fiador" },
  { valor: "CAUCAO", rotulo: "Caução" },
  { valor: "SEGURO", rotulo: "Seguro-fiança" },
];

const MODELOS = [
  "Locação residencial",
  "Locação comercial",
  "Locação mista",
];
const INDICES = ["IPCA", "IGPM", "INPC", "IGP-DI", "Sem reajuste"];
const PERIODOS = ["Anual", "Semestral", "Trimestral", "Mensal"];
const ESTADOS_CIVIS = [
  "Solteiro(a)",
  "Casado(a)",
  "Divorciado(a)",
  "Separado(a)",
  "Viúvo(a)",
  "União estável",
];
const DIAS = Array.from({ length: 28 }, (_, i) => i + 1);

const rotuloGarantia = (valor: string) =>
  GARANTIAS.find((g) => g.valor === valor)?.rotulo ?? "—";

/* ───────── Estilos ───────── */

const rotulo: React.CSSProperties = {
  display: "block",
  fontSize: 12,
  color: "#64748b",
  fontWeight: 600,
  marginBottom: 6,
};

const campo = (erro?: boolean): React.CSSProperties => ({
  width: "100%",
  boxSizing: "border-box",
  padding: "10px 12px",
  fontSize: 14,
  border: erro ? "1px solid #b91c1c" : "1px solid #e2e8f0",
  background: erro ? "#fff5f5" : "#fff",
  borderRadius: 8,
  color: "#16233b",
  fontFamily: "'Nunito', sans-serif",
});

const erroTexto: React.CSSProperties = {
  color: "#b91c1c",
  fontSize: 12,
  marginTop: 4,
};

const card: React.CSSProperties = {
  background: "#fff",
  border: `1px solid ${CORES.borda}`,
  borderRadius: 12,
  padding: 22,
};

const tituloCard: React.CSSProperties = {
  margin: "0 0 4px",
  fontSize: 15,
  color: CORES.titulo,
  fontWeight: 700,
};

const hint: React.CSSProperties = {
  margin: "0 0 18px",
  fontSize: 12,
  color: "#94a3b8",
};

interface FiadorForm {
  nome: string;
  cpf: string;
  rg: string;
  dataNascimento: string;
  estadoCivil: string;
  profissao: string;
  telefone: string;
  email: string;
  endereco: string;
}

const FIADOR_VAZIO: FiadorForm = {
  nome: "",
  cpf: "",
  rg: "",
  dataNascimento: "",
  estadoCivil: "",
  profissao: "",
  telefone: "",
  email: "",
  endereco: "",
};

/** Msg no estilo do assistente antigo: primeiro campo + contagem. */
const msgFalta = (itens: string[]) =>
  itens.length === 0
    ? ""
    : `Informe ${itens[0]}.${
        itens.length > 1
          ? ` Mais ${itens.length - 1} campo(s) destacado(s) em vermelho.`
          : ""
      }`;

/* ───────── Campo de assinatura (desenhar na tela) ───────── */

function Assinar({
  titulo,
  valor,
  onChange,
  bloqueado,
  erro,
}: {
  titulo: string;
  valor: string;
  onChange: (img: string) => void;
  bloqueado?: boolean;
  erro?: boolean;
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  const desenhando = useRef(false);

  const pos = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };
  const ctx = () => {
    const c = ref.current?.getContext("2d");
    if (c) {
      c.lineWidth = 2;
      c.lineCap = "round";
      c.strokeStyle = "#1a1a2e";
    }
    return c;
  };

  const limpar = () => {
    const c = ref.current;
    if (c) c.getContext("2d")?.clearRect(0, 0, c.width, c.height);
    onChange("");
  };

  return (
    <div
      style={{
        border: erro ? "1px solid #b91c1c" : "1px solid #e2e8f0",
        background: erro ? "#fff5f5" : undefined,
        borderRadius: 10,
        padding: 12,
        opacity: bloqueado ? 0.5 : 1,
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          fontSize: 12,
          color: erro ? "#b91c1c" : "#555",
          marginBottom: 6,
        }}
      >
        <span>
          {titulo}
          {erro ? " — falta assinar" : ""}
        </span>
        {valor && !bloqueado && (
          <button
            type="button"
            onClick={limpar}
            style={{
              border: "none",
              background: "none",
              color: "#1a5fa8",
              cursor: "pointer",
              fontSize: 12,
            }}
          >
            Limpar
          </button>
        )}
      </div>
      <canvas
        ref={ref}
        width={420}
        height={110}
        aria-label={`Assinatura: ${titulo}`}
        style={{
          width: "100%",
          height: 110,
          background: "#eff6ff",
          borderRadius: 8,
          touchAction: "none",
          cursor: bloqueado ? "not-allowed" : "crosshair",
        }}
        onPointerDown={(e) => {
          if (bloqueado) return;
          desenhando.current = true;
          e.currentTarget.setPointerCapture(e.pointerId);
          const { x, y } = pos(e);
          const c = ctx();
          c?.beginPath();
          c?.moveTo(x, y);
        }}
        onPointerMove={(e) => {
          if (!desenhando.current) return;
          const { x, y } = pos(e);
          const c = ctx();
          c?.lineTo(x, y);
          c?.stroke();
        }}
        onPointerUp={() => {
          if (!desenhando.current) return;
          desenhando.current = false;
          if (ref.current) onChange(ref.current.toDataURL("image/png"));
        }}
      />
    </div>
  );
}

/* ───────── Página ───────── */

/**
 * "Gerar contrato de locação" (Figma): 3 passos (selecionar cadastros,
 * definir condições com garantia/fiador, revisar documentos e gerar),
 * preenchimento automático a partir dos cadastros e exportação em PDF.
 */
export default function NovoContrato() {
  const navigate = useNavigate();

  const [locatarios, setLocatarios] = useState<Locatario[]>([]);
  const [imoveisLivres, setImoveisLivres] = useState<Imovel[]>([]);
  const [docs, setDocs] = useState<DocumentoObrigatorio[]>([]);
  const [carregando, setCarregando] = useState(true);

  const [passo, setPasso] = useState(0);
  const [erro, setErro] = useState("");
  const [gerando, setGerando] = useState(false);

  // Passo 1 — cadastros vinculados
  const [textoLocatario, setTextoLocatario] = useState("");
  const [textoImovel, setTextoImovel] = useState("");
  const [errLoc, setErrLoc] = useState(false);
  const [errImo, setErrImo] = useState(false);

  // Passo 2 — condições da locação
  const [modelo, setModelo] = useState(MODELOS[0]);
  const [garantia, setGarantia] = useState("");
  const [dataInicio, setDataInicio] = useState("");
  const [dataFim, setDataFim] = useState("");
  const [diaVenc, setDiaVenc] = useState("10");
  const [indice, setIndice] = useState("");
  const [periodicidade, setPeriodicidade] = useState(PERIODOS[0]);
  const [errCond, setErrCond] = useState<Record<string, boolean>>({});
  const [fiador, setFiador] = useState<FiadorForm>(FIADOR_VAZIO);

  // Passo 3 — checklist de documentos
  const [marcados, setMarcados] = useState<Record<number, boolean>>({});

  // Pós-geração
  const [gerado, setGerado] = useState<Contrato | null>(null);
  const [ass, setAss] = useState<Assinaturas>({
    locatario: "",
    fiador: "",
    conjuge: "",
    fundacao: "",
  });
  const [errAss, setErrAss] = useState<Record<string, boolean>>({});
  const [firmas, setFirmas] = useState(false);

  useEffect(() => {
    let vivo = true;
    (async () => {
      try {
        const [respostaLocatarios, respostaImoveis] = await Promise.all([
          api.get<Locatario[]>("/locatarios"),
          api.get<Imovel[]>("/imoveis"),
        ]);
        if (!vivo) return;
        setLocatarios(respostaLocatarios.data);
        setImoveisLivres(respostaImoveis.data.filter((i) => i.status === "VAGO"));
      } catch (error) {
        if (vivo) setErro(mensagemDeErro(error));
      } finally {
        if (vivo) setCarregando(false);
      }
    })();
    return () => {
      vivo = false;
    };
  }, []);

  // Documentos obrigatórios da modalidade escolhida (alimentam o checklist)
  useEffect(() => {
    if (!garantia) {
      setDocs([]);
      return;
    }
    let vivo = true;
    api
      .get<DocumentoObrigatorio[]>("/documentos-obrigatorios", {
        params: { modalidade: garantia },
      })
      .then((r) => vivo && setDocs(r.data))
      .catch(() => vivo && setDocs([]));
    return () => {
      vivo = false;
    };
  }, [garantia]);

  const rotuloLoc = (l: Locatario) => `${l.nome} — ${l.cpfCnpj}`;
  const rotuloImovel = (i: Imovel) =>
    `${i.endereco}, ${i.numero ?? "s/n"} — ${i.codigo}`;

  const locatarioSel =
    locatarios.find(
      (l) =>
        rotuloLoc(l) === textoLocatario ||
        l.nome === textoLocatario ||
        l.cpfCnpj === textoLocatario,
    ) ?? null;
  const imovelSel =
    imoveisLivres.find(
      (i) =>
        rotuloImovel(i) === textoImovel ||
        i.codigo === textoImovel ||
        i.endereco === textoImovel,
    ) ?? null;

  const temFiador = garantia === "FIADOR";

  /** Dados completos para o HTML do contrato (a partir dos cadastros). */
  const dados: Dados | null = useMemo(() => {
    if (!locatarioSel || !imovelSel || !dataInicio) return null;
    const loc = locatarioSel;
    const im = imovelSel;
    const prazo = mesesEntre(dataInicio, dataFim || dataInicio);
    return {
      imovel: `${im.endereco}, ${im.numero ?? "s/n"} - ${im.bairro}, ${im.cidade}`,
      aluguel: String(im.valorAluguel ?? 0),
      diaVencimento: diaVenc,
      dataInicio,
      dataFim: dataFim || undefined,
      prazoMeses: String(prazo),
      locatario: loc.nome,
      qualLocatario: `brasileiro(a), ${loc.estadoCivil ?? "não informado"}, ${loc.profissao ?? "não informada"}`,
      rgLocatario: loc.rg ?? "não informado",
      cpfLocatario: loc.cpfCnpj,
      enderecoLocatario: loc.endereco ?? "não informado",
      emailLocatario: loc.email ?? "",
      fiador: temFiador ? fiador.nome : "",
      qualFiador: temFiador
        ? `brasileiro(a), ${fiador.estadoCivil || "não informado"}, ${fiador.profissao || "não informada"}`
        : "",
      rgFiador: fiador.rg || "não informado",
      cpfFiador: fiador.cpf,
      enderecoFiador: fiador.endereco,
      emailFiador: fiador.email,
      conjuge: "",
      rgConjuge: "",
      cpfConjuge: "",
      garantia: rotuloGarantia(garantia),
    };
  }, [
    locatarioSel,
    imovelSel,
    dataInicio,
    dataFim,
    diaVenc,
    garantia,
    temFiador,
    fiador,
  ]);

  const html = dados ? contratoHTML(dados, ass) : "";

  const emails = [
    ...new Set(
      [
        locatarioSel?.email?.trim() ?? "",
        temFiador ? fiador.email.trim() : "",
      ].filter(Boolean),
    ),
  ];

  /* ── Validações e navegação ── */

  function avancar() {
    if (passo === 0) {
      const semLoc = !locatarioSel;
      const semImo = !imovelSel;
      setErrLoc(semLoc);
      setErrImo(semImo);
      if (semLoc || semImo) {
        setErro(
          "Selecione o cliente/locatário e o imóvel disponíveis para continuar.",
        );
        return;
      }
      if (!locatarioSel?.endereco?.trim()) {
        setErro(
          "O locatário selecionado não tem endereço no cadastro — edite o cadastro do cliente antes de gerar o contrato.",
        );
        return;
      }
      setErro("");
      setPasso(1);
      return;
    }

    if (passo === 1) {
      const novos: Record<string, boolean> = {};
      const faltas: string[] = [];
      if (!garantia) {
        novos.garantia = true;
        faltas.push("a garantia locatícia");
      }
      if (!dataInicio) {
        novos.dataInicio = true;
        faltas.push("a data de início");
      }
      if (!dataFim) {
        novos.dataFim = true;
        faltas.push("a data de término");
      } else if (dataInicio && dataFim <= dataInicio) {
        novos.dataFim = true;
        faltas.push("um término posterior ao início");
      }
      if (!indice) {
        novos.indice = true;
        faltas.push("o índice de reajuste");
      }
      if (temFiador) {
        if (!fiador.nome.trim()) {
          novos.fNome = true;
          faltas.push("o nome do fiador");
        }
        if (fiador.cpf.replace(/\D/g, "").length !== 11 || !validaCPF(fiador.cpf)) {
          novos.fCpf = true;
          faltas.push("o CPF do fiador");
        }
        if (!fiador.telefone.trim() || !validaTelefone(fiador.telefone)) {
          novos.fTelefone = true;
          faltas.push("o telefone do fiador");
        }
        if (!fiador.email.trim() || !validaEmail(fiador.email)) {
          novos.fEmail = true;
          faltas.push("o e-mail do fiador");
        }
        if (!fiador.endereco.trim()) {
          novos.fEndereco = true;
          faltas.push("o endereço do fiador");
        }
      }
      setErrCond(novos);
      setErro(msgFalta(faltas));
      if (faltas.length > 0) return;
      setPasso(2);
      return;
    }

    void gerar();
  }

  async function gerar() {
    if (!locatarioSel || !imovelSel) return;

    const pendentes = docs.filter((d) => d.obrigatorio && !marcados[d.id]);
    if (pendentes.length > 0) {
      setErro(
        `Confirme o recebimento de ${pendentes.length} documento(s) obrigatório(s): ${pendentes
          .map((d) => d.nome)
          .join(", ")}.`,
      );
      return;
    }

    setGerando(true);
    setErro("");
    try {
      const recebidos = docs
        .filter((d) => marcados[d.id])
        .map((d) => d.nome);
      const resposta = await api.post<Contrato>("/contratos", {
        imovelId: imovelSel.id,
        locatarioId: locatarioSel.id,
        dataInicio,
        dataFim,
        valorMensal: imovelSel.valorAluguel,
        diaVencimento: Number(diaVenc),
        modelo,
        modalidadeGarantia: garantia,
        indiceReajuste: indice,
        periodicidadeReajuste: periodicidade,
        observacao: recebidos.length
          ? `Documentos recebidos na geração: ${recebidos.join(", ")}.`
          : null,
        fiador: temFiador
          ? {
              nome: fiador.nome.trim(),
              cpf: fiador.cpf.trim(),
              rg: fiador.rg.trim() || null,
              dataNascimento: fiador.dataNascimento || null,
              estadoCivil: fiador.estadoCivil || null,
              profissao: fiador.profissao.trim() || null,
              telefone: fiador.telefone.trim(),
              email: fiador.email.trim(),
              endereco: fiador.endereco.trim() || null,
            }
          : null,
      });
      setGerado(resposta.data);
      setAss({ locatario: "", fiador: "", conjuge: "", fundacao: "" });
      setErrAss({});
      setFirmas(false);
      setPasso(3);
    } catch (error) {
      setErro(mensagemDeErro(error));
    } finally {
      setGerando(false);
    }
  }

  function enviarPorEmail() {
    const faltas: string[] = [];
    const novos: Record<string, boolean> = {};
    if (!ass.locatario) {
      faltas.push("a assinatura do locatário");
      novos.locatario = true;
    }
    if (temFiador && !ass.fiador) {
      faltas.push("a assinatura do fiador");
      novos.fiador = true;
    }
    if (!ass.fundacao) {
      faltas.push("a assinatura da Fundação");
      novos.fundacao = true;
    }
    if (faltas.length > 0) {
      setErrAss(novos);
      setErro(msgFalta(faltas));
      return;
    }
    if (!firmas) {
      setErro("Confirme que as firmas foram reconhecidas em cartório.");
      return;
    }
    if (emails.length === 0) {
      setErro("Os cadastros não têm e-mail disponível para envio.");
      return;
    }
    setErrAss({});
    setErro("");
    window.location.href = `mailto:${emails.join(",")}?subject=${encodeURIComponent(
      `Contrato de locação – ${imovelSel?.endereco ?? ""}`,
    )}&body=${encodeURIComponent(
      `Olá! Segue o contrato de locação do imóvel ${imovelSel?.endereco ?? ""}, já assinado. O PDF está em anexo.\n\nFundação Manuel Cruz`,
    )}`;
  }

  function reiniciar() {
    setTextoLocatario("");
    setTextoImovel("");
    setGarantia("");
    setDataInicio("");
    setDataFim("");
    setIndice("");
    setModelo(MODELOS[0]);
    setDiaVenc("10");
    setPeriodicidade(PERIODOS[0]);
    setFiador(FIADOR_VAZIO);
    setErrCond({});
    setErrLoc(false);
    setErrImo(false);
    setMarcados({});
    setGerado(null);
    setErro("");
    setPasso(0);
  }

  const docsVisiveis = temFiador
    ? docs
    : docs.filter((d) => d.destinatario !== "FIADOR");
  const docsCliente = docsVisiveis.filter((d) => d.destinatario !== "FIADOR");
  const docsFiador = docsVisiveis.filter((d) => d.destinatario === "FIADOR");

  const linhasResumo: [string, string][] = [
    [
      "Cliente / locatário",
      locatarioSel ? `${locatarioSel.nome} — ${locatarioSel.cpfCnpj}` : "—",
    ],
    [
      "Imóvel",
      imovelSel
        ? `${imovelSel.endereco}, ${imovelSel.numero ?? "s/n"} — ${imovelSel.codigo}`
        : "—",
    ],
    ["Aluguel", imovelSel ? formatBRL(imovelSel.valorAluguel) : "—"],
    [
      "Período",
      dataInicio && dataFim
        ? `${formatData(dataInicio)} a ${formatData(dataFim)}`
        : "—",
    ],
    ["Vencimento", `Dia ${diaVenc} de cada mês`],
    ["Modelo", modelo],
    ["Garantia", rotuloGarantia(garantia)],
    ["Reajuste", `${indice || "—"} · ${periodicidade}`],
    ...(temFiador ? ([["Fiador", `${fiador.nome} — ${fiador.cpf}`]] as [string, string][]) : []),
  ];

  const faltaAlguem =
    !ass.locatario || (temFiador && !ass.fiador) || !ass.fundacao;

  return (
    <main style={{ padding: "28px 36px" }}>
      <p style={{ fontSize: 12, color: CORES.textoSuave, margin: "0 0 10px" }}>
        <Link
          to="/contratos"
          style={{ color: CORES.primaria, textDecoration: "none" }}
        >
          Contratos
        </Link>{" "}
        / Novo contrato
      </p>

      <PageHeader
        titulo="Gerar contrato de locação"
        subtitulo="Vincule os cadastros e revise as condições antes de gerar o documento."
        acoes={
          <Button variant="secondary" onClick={() => navigate("/contratos")}>
            Voltar aos cadastros
          </Button>
        }
      />

      {erro && (
        <div
          style={{
            background: "#fee2e2",
            color: "#b91c1c",
            borderRadius: 10,
            padding: 14,
            fontSize: 13,
            marginBottom: 16,
          }}
        >
          {erro}
        </div>
      )}
      {gerado && passo === 3 && !erro && (
        <div
          style={{
            background: "#dcfce7",
            color: "#15803d",
            borderRadius: 10,
            padding: 14,
            fontSize: 13,
            marginBottom: 16,
            fontWeight: 600,
          }}
        >
          Contrato {gerado.codigo} gerado com sucesso. Revise o documento
          abaixo, colete as assinaturas e exporte em PDF.
        </div>
      )}

      {/* Barra de passos (Figma) */}
      <div
        style={{
          display: "flex",
          background: "#eef4fc",
          borderRadius: 10,
          padding: 6,
          gap: 6,
          marginBottom: 18,
          flexWrap: "wrap",
        }}
      >
        {PASSOS.map((texto, i) => {
          const ativo = passo === i || (passo === 3 && i === 2);
          return (
            <div
              key={texto}
              style={{
                flex: "1 1 200px",
                textAlign: "center",
                padding: "10px 12px",
                borderRadius: 8,
                fontSize: 13,
                fontWeight: ativo ? 700 : 600,
                color: ativo ? CORES.primaria : "#94a3b8",
                background: ativo ? "#fff" : "transparent",
                boxShadow: ativo ? "0 1px 4px rgba(26,95,168,0.18)" : "none",
              }}
            >
              {texto}
            </div>
          );
        })}
      </div>

      {passo < 3 && (
        <>
          <div style={{ display: "flex", gap: 16, alignItems: "flex-start", flexWrap: "wrap" }}>
            {/* Coluna principal — conteúdo do passo */}
            <section style={{ ...card, flex: "1 1 480px", minWidth: 0 }}>
              {passo === 0 && (
                <>
                  <h2 style={tituloCard}>Cadastros vinculados</h2>
                  <p style={hint}>
                    Os dados pessoais, documentos e informações do imóvel serão
                    importados.
                  </p>

                  <label style={rotulo}>
                    Cliente / locatário <span style={{ color: "#b91c1c" }}>*</span>
                  </label>
                  <input
                    list="lista-locatarios"
                    value={textoLocatario}
                    onChange={(e) => {
                      setTextoLocatario(e.target.value);
                      setErrLoc(false);
                      setErro("");
                    }}
                    placeholder="Busque pelo nome ou CPF / CNPJ"
                    style={campo(errLoc)}
                    disabled={carregando}
                  />
                  <datalist id="lista-locatarios">
                    {locatarios.map((l) => (
                      <option key={l.id} value={rotuloLoc(l)} />
                    ))}
                  </datalist>
                  {errLoc && (
                    <div style={erroTexto}>Selecione um cliente/locatário.</div>
                  )}
                  {locatarioSel && (
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 8 }}>
                      {[
                        locatarioSel.telefone,
                        locatarioSel.email,
                        locatarioSel.profissao,
                      ]
                        .filter(Boolean)
                        .map((chip, i) => (
                          <span
                            key={i}
                            style={{
                              background: "#eef4fc",
                              color: "#1a5fa8",
                              borderRadius: 999,
                              padding: "3px 10px",
                              fontSize: 11,
                              fontWeight: 600,
                            }}
                          >
                            {chip}
                          </span>
                        ))}
                    </div>
                  )}

                  <div style={{ height: 18 }} />

                  <label style={rotulo}>
                    Imóvel disponível <span style={{ color: "#b91c1c" }}>*</span>
                  </label>
                  <input
                    list="lista-imoveis"
                    value={textoImovel}
                    onChange={(e) => {
                      setTextoImovel(e.target.value);
                      setErrImo(false);
                      setErro("");
                    }}
                    placeholder="Busque pelo endereço ou identificação"
                    style={campo(errImo)}
                    disabled={carregando}
                  />
                  <datalist id="lista-imoveis">
                    {imoveisLivres.map((i) => (
                      <option key={i.id} value={rotuloImovel(i)} />
                    ))}
                  </datalist>
                  {errImo && (
                    <div style={erroTexto}>Selecione um imóvel disponível.</div>
                  )}
                  {imovelSel && (
                    <p
                      style={{
                        margin: "8px 0 0",
                        fontSize: 12,
                        color: "#64748b",
                      }}
                    >
                      Aluguel {formatBRL(imovelSel.valorAluguel)} · Condomínio{" "}
                      {imovelSel.condominio
                        ? formatBRL(imovelSel.condominio)
                        : "—"}{" "}
                      · IPTU {formatBRL(imovelSel.iptuMensal)}
                    </p>
                  )}
                  {!carregando && imoveisLivres.length === 0 && (
                    <div style={{ ...erroTexto, marginTop: 10 }}>
                      Nenhum imóvel disponível — libere um imóvel vago antes de
                      gerar o contrato.
                    </div>
                  )}
                </>
              )}

              {passo === 1 && (
                <>
                  <h2 style={tituloCard}>Condições da locação</h2>
                  <p style={hint}>
                    Prazo, vencimento, garantia e reajuste do contrato.
                  </p>

                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))",
                      gap: 14,
                    }}
                  >
                    <div>
                      <label style={rotulo}>
                        Modelo de contrato{" "}
                        <span style={{ color: "#b91c1c" }}>*</span>
                      </label>
                      <select
                        style={campo()}
                        value={modelo}
                        onChange={(e) => setModelo(e.target.value)}
                      >
                        {MODELOS.map((m) => (
                          <option key={m} value={m}>
                            {m}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label style={rotulo}>
                        Garantia locatícia{" "}
                        <span style={{ color: "#b91c1c" }}>*</span>
                      </label>
                      <select
                        style={campo(errCond.garantia)}
                        value={garantia}
                        onChange={(e) => {
                          setGarantia(e.target.value);
                          setErrCond((c) => ({ ...c, garantia: false }));
                          setErro("");
                        }}
                      >
                        <option value="">Selecione a modalidade</option>
                        {GARANTIAS.map((g) => (
                          <option key={g.valor} value={g.valor}>
                            {g.rotulo}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label style={rotulo}>
                        Início da locação{" "}
                        <span style={{ color: "#b91c1c" }}>*</span>
                      </label>
                      <input
                        type="date"
                        style={campo(errCond.dataInicio)}
                        value={dataInicio}
                        onChange={(e) => {
                          setDataInicio(e.target.value);
                          setErrCond((c) => ({ ...c, dataInicio: false }));
                          setErro("");
                        }}
                      />
                    </div>

                    <div>
                      <label style={rotulo}>
                        Término da locação{" "}
                        <span style={{ color: "#b91c1c" }}>*</span>
                      </label>
                      <input
                        type="date"
                        style={campo(errCond.dataFim)}
                        value={dataFim}
                        onChange={(e) => {
                          setDataFim(e.target.value);
                          setErrCond((c) => ({ ...c, dataFim: false }));
                          setErro("");
                        }}
                      />
                    </div>

                    <div>
                      <label style={rotulo}>
                        Dia do vencimento{" "}
                        <span style={{ color: "#b91c1c" }}>*</span>
                      </label>
                      <select
                        style={campo()}
                        value={diaVenc}
                        onChange={(e) => setDiaVenc(e.target.value)}
                      >
                        {DIAS.map((d) => (
                          <option key={d} value={String(d)}>
                            {d}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label style={rotulo}>
                        Índice de reajuste{" "}
                        <span style={{ color: "#b91c1c" }}>*</span>
                      </label>
                      <select
                        style={campo(errCond.indice)}
                        value={indice}
                        onChange={(e) => {
                          setIndice(e.target.value);
                          setErrCond((c) => ({ ...c, indice: false }));
                          setErro("");
                        }}
                      >
                        <option value="">Selecione o índice</option>
                        {INDICES.map((i) => (
                          <option key={i} value={i}>
                            {i}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label style={rotulo}>
                        Periodicidade{" "}
                        <span style={{ color: "#b91c1c" }}>*</span>
                      </label>
                      <select
                        style={campo()}
                        value={periodicidade}
                        onChange={(e) => setPeriodicidade(e.target.value)}
                      >
                        {PERIODOS.map((p) => (
                          <option key={p} value={p}>
                            {p}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {temFiador && (
                    <div style={{ marginTop: 22 }}>
                      <h3 style={{ ...tituloCard, fontSize: 14 }}>
                        Dados do fiador
                      </h3>
                      <p style={hint}>
                        Campos obrigatórios com <span style={{ color: "#b91c1c" }}>*</span>{" "}
                        — usados na qualificação e nas assinaturas do contrato.
                      </p>

                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns:
                            "repeat(auto-fit, minmax(210px, 1fr))",
                          gap: 14,
                        }}
                      >
                        <div style={{ gridColumn: "1 / -1" }}>
                          <label style={rotulo}>
                            Nome completo{" "}
                            <span style={{ color: "#b91c1c" }}>*</span>
                          </label>
                          <input
                            style={campo(errCond.fNome)}
                            value={fiador.nome}
                            onChange={(e) => {
                              setFiador({ ...fiador, nome: e.target.value });
                              setErrCond((c) => ({ ...c, fNome: false }));
                              setErro("");
                            }}
                            placeholder="Ex.: João da Silva"
                          />
                          {errCond.fNome && (
                            <div style={erroTexto}>Informe o nome do fiador.</div>
                          )}
                        </div>

                        <div>
                          <label style={rotulo}>
                            CPF <span style={{ color: "#b91c1c" }}>*</span>
                          </label>
                          <input
                            style={campo(errCond.fCpf)}
                            value={fiador.cpf}
                            onChange={(e) => {
                              setFiador({
                                ...fiador,
                                cpf: mascaraCPF(e.target.value),
                              });
                              setErrCond((c) => ({ ...c, fCpf: false }));
                              setErro("");
                            }}
                            placeholder="000.000.000-00"
                            inputMode="numeric"
                          />
                          {errCond.fCpf && (
                            <div style={erroTexto}>
                              CPF inválido — confira os dígitos.
                            </div>
                          )}
                        </div>

                        <div>
                          <label style={rotulo}>RG / documento oficial</label>
                          <input
                            style={campo()}
                            value={fiador.rg}
                            onChange={(e) =>
                              setFiador({ ...fiador, rg: e.target.value })
                            }
                            placeholder="Ex.: 12.345.678-9"
                          />
                        </div>

                        <div>
                          <label style={rotulo}>Data de nascimento</label>
                          <input
                            type="date"
                            style={campo()}
                            value={fiador.dataNascimento}
                            onChange={(e) =>
                              setFiador({
                                ...fiador,
                                dataNascimento: e.target.value,
                              })
                            }
                          />
                        </div>

                        <div>
                          <label style={rotulo}>Estado civil</label>
                          <select
                            style={campo()}
                            value={fiador.estadoCivil}
                            onChange={(e) =>
                              setFiador({ ...fiador, estadoCivil: e.target.value })
                            }
                          >
                            <option value="">Selecione</option>
                            {ESTADOS_CIVIS.map((ec) => (
                              <option key={ec} value={ec}>
                                {ec}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label style={rotulo}>Profissão</label>
                          <input
                            style={campo()}
                            value={fiador.profissao}
                            onChange={(e) =>
                              setFiador({ ...fiador, profissao: e.target.value })
                            }
                            placeholder="Ex.: Comerciante"
                          />
                        </div>

                        <div>
                          <label style={rotulo}>
                            Telefone <span style={{ color: "#b91c1c" }}>*</span>
                          </label>
                          <input
                            style={campo(errCond.fTelefone)}
                            value={fiador.telefone}
                            onChange={(e) => {
                              setFiador({
                                ...fiador,
                                telefone: mascaraTelefone(e.target.value),
                              });
                              setErrCond((c) => ({ ...c, fTelefone: false }));
                              setErro("");
                            }}
                            placeholder="(79) 98888-7777"
                            inputMode="tel"
                          />
                          {errCond.fTelefone && (
                            <div style={erroTexto}>
                              Telefone inválido — DDD + número.
                            </div>
                          )}
                        </div>

                        <div>
                          <label style={rotulo}>
                            E-mail <span style={{ color: "#b91c1c" }}>*</span>
                          </label>
                          <input
                            style={campo(errCond.fEmail)}
                            value={fiador.email}
                            onChange={(e) => {
                              setFiador({ ...fiador, email: e.target.value });
                              setErrCond((c) => ({ ...c, fEmail: false }));
                              setErro("");
                            }}
                            placeholder="nome@dominio.com"
                            inputMode="email"
                          />
                          {errCond.fEmail && (
                            <div style={erroTexto}>E-mail inválido.</div>
                          )}
                        </div>

                        <div>
                          <label style={rotulo}>
                            Endereço <span style={{ color: "#b91c1c" }}>*</span>
                          </label>
                          <input
                            style={campo(errCond.fEndereco)}
                            value={fiador.endereco}
                            onChange={(e) => {
                              setFiador({ ...fiador, endereco: e.target.value });
                              setErrCond((c) => ({ ...c, fEndereco: false }));
                              setErro("");
                            }}
                            placeholder="Rua, número"
                          />
                          {errCond.fEndereco && (
                            <div style={erroTexto}>Informe o endereço do fiador.</div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}

              {passo === 2 && (
                <>
                  <h2 style={tituloCard}>Revisão e documentos</h2>
                  <p style={hint}>
                    Confirme a entrega dos documentos da modalidade{" "}
                    <b>{rotuloGarantia(garantia)}</b> e confira o resumo antes de
                    gerar.
                  </p>

                  <div
                    style={{
                      border: "1px solid #e2e8f0",
                      borderRadius: 10,
                      padding: 16,
                      marginBottom: 18,
                    }}
                  >
                    <p
                      style={{
                        margin: "0 0 12px",
                        fontSize: 12,
                        fontWeight: 700,
                        color: CORES.primaria,
                        textTransform: "uppercase",
                        letterSpacing: "0.6px",
                      }}
                    >
                      Documentos obrigatórios
                    </p>

                    {docsVisiveis.length === 0 && (
                      <p
                        style={{
                          margin: 0,
                          fontSize: 13,
                          color: "#94a3b8",
                        }}
                      >
                        Nenhum documento configurado para esta modalidade.
                      </p>
                    )}

                    {docsCliente.length > 0 && (
                      <div style={{ marginBottom: 12 }}>
                        <p
                          style={{
                            margin: "0 0 8px",
                            fontSize: 12,
                            fontWeight: 600,
                            color: "#64748b",
                          }}
                        >
                          Cliente / locatário
                        </p>
                        {docsCliente.map((doc) => (
                          <label
                            key={doc.id}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 8,
                              fontSize: 13,
                              color: "#334155",
                              padding: "5px 0",
                              cursor: "pointer",
                            }}
                          >
                            <input
                              type="checkbox"
                              checked={!!marcados[doc.id]}
                              onChange={(e) =>
                                setMarcados({
                                  ...marcados,
                                  [doc.id]: e.target.checked,
                                })
                              }
                            />
                            <span>
                              {doc.nome}
                              {doc.obrigatorio && (
                                <span style={{ color: "#b91c1c" }}> *</span>
                              )}
                            </span>
                          </label>
                        ))}
                      </div>
                    )}

                    {docsFiador.length > 0 && (
                      <div>
                        <p
                          style={{
                            margin: "0 0 8px",
                            fontSize: 12,
                            fontWeight: 600,
                            color: "#64748b",
                          }}
                        >
                          Fiador
                        </p>
                        {docsFiador.map((doc) => (
                          <label
                            key={doc.id}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 8,
                              fontSize: 13,
                              color: "#334155",
                              padding: "5px 0",
                              cursor: "pointer",
                            }}
                          >
                            <input
                              type="checkbox"
                              checked={!!marcados[doc.id]}
                              onChange={(e) =>
                                setMarcados({
                                  ...marcados,
                                  [doc.id]: e.target.checked,
                                })
                              }
                            />
                            <span>
                              {doc.nome}
                              {doc.obrigatorio && (
                                <span style={{ color: "#b91c1c" }}> *</span>
                              )}
                            </span>
                          </label>
                        ))}
                      </div>
                    )}
                  </div>

                  <div
                    style={{
                      border: "1px solid #e2e8f0",
                      borderRadius: 10,
                      padding: 16,
                    }}
                  >
                    <p
                      style={{
                        margin: "0 0 10px",
                        fontSize: 12,
                        fontWeight: 700,
                        color: CORES.primaria,
                        textTransform: "uppercase",
                        letterSpacing: "0.6px",
                      }}
                    >
                      Resumo do contrato
                    </p>
                    {linhasResumo.map(([rot, valor]) => (
                      <div
                        key={rot}
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          gap: 12,
                          fontSize: 13,
                          color: "#334155",
                          padding: "5px 0",
                          borderTop: "1px solid #f1f5f9",
                        }}
                      >
                        <span style={{ color: "#64748b" }}>{rot}</span>
                        <span style={{ textAlign: "right" }}>{valor}</span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </section>

            {/* Painel lateral — preenchimento automático (Figma) */}
            <aside style={{ ...card, flex: "0 1 320px" }}>
              <h2 style={tituloCard}>Preenchimento automático</h2>
              <p style={hint}>
                Um único contrato, sem redigitar os cadastros.
              </p>

              {[
                [
                  "Locatário",
                  "Nome/razão social, CPF/CNPJ, endereço e documentos de identificação.",
                ],
                [
                  "Locador e imóvel",
                  "Qualificação do locador, endereço, matrícula e características do imóvel selecionado.",
                ],
                [
                  "Valores da locação",
                  "Aluguel, condomínio e IPTU importados do cadastro do imóvel.",
                ],
                [
                  "Prazo e condições",
                  "Datas, vencimento, garantia e reajuste definidos neste formulário.",
                ],
              ].map(([titulo, descricao]) => (
                <div key={titulo} style={{ marginBottom: 12 }}>
                  <p
                    style={{
                      margin: 0,
                      fontSize: 13,
                      fontWeight: 700,
                      color: CORES.titulo,
                    }}
                  >
                    {titulo}
                  </p>
                  <p
                    style={{
                      margin: "2px 0 0",
                      fontSize: 12,
                      color: CORES.textoSuave,
                      lineHeight: 1.5,
                    }}
                  >
                    {descricao}
                  </p>
                </div>
              ))}

              <div
                style={{
                  background: "#eef4fc",
                  border: "1px solid #dbeafe",
                  borderRadius: 8,
                  padding: 12,
                  fontSize: 12,
                  color: "#1d4ed8",
                  lineHeight: 1.5,
                  marginTop: 16,
                }}
              >
                Após gerar, revise o documento antes de exportar em PDF ou
                encaminhar para assinatura.
              </div>
            </aside>
          </div>

          {/* Rodapé com ações (Figma) */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: 12,
              marginTop: 18,
              flexWrap: "wrap",
            }}
          >
            <span style={{ fontSize: 12, color: CORES.textoSuave }}>
              Preencha os campos obrigatórios para gerar o contrato.
            </span>
            <div style={{ display: "flex", gap: 10 }}>
              <Button
                variant="secondary"
                onClick={() =>
                  passo === 0 ? navigate("/contratos") : setPasso(passo - 1)
                }
              >
                {passo === 0 ? "Cancelar" : "Voltar"}
              </Button>
              <Button onClick={avancar} disabled={gerando}>
                {passo === 2
                  ? gerando
                    ? "Gerando..."
                    : "Gerar contrato"
                  : "Continuar"}
              </Button>
            </div>
          </div>
        </>
      )}

      {passo === 3 && gerado && (
        <>
          <section style={card}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: 12,
                marginBottom: 14,
                flexWrap: "wrap",
              }}
            >
              <div>
                <h2 style={tituloCard}>
                  Contrato {gerado.codigo} · {rotuloGarantia(garantia)}
                </h2>
                <p style={{ ...hint, margin: 0 }}>
                  {locatarioSel?.nome} · {imovelSel?.endereco}
                </p>
              </div>
              <div style={{ display: "flex", gap: 10 }}>
                <Button
                  variant="primary"
                  onClick={() => html && imprimirContrato(html)}
                >
                  Exportar PDF
                </Button>
                <Button variant="secondary" onClick={enviarPorEmail}>
                  Enviar por e-mail
                </Button>
              </div>
            </div>

            <iframe
              title="Pré-visualização do contrato"
              srcDoc={html}
              style={{
                width: "100%",
                height: 460,
                border: "1px solid #e2e8f0",
                borderRadius: 8,
              }}
            />
          </section>

          <section style={{ ...card, marginTop: 16 }}>
            <h2 style={tituloCard}>Assinaturas</h2>
            <p style={hint}>
              Desenhe as assinaturas, exporte o PDF e reconheça as firmas em
              cartório antes do envio.
            </p>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
                gap: 12,
              }}
            >
              <Assinar
                titulo={`Locatário — ${locatarioSel?.nome ?? ""}`}
                valor={ass.locatario}
                erro={errAss.locatario}
                onChange={(img) => {
                  setAss({ ...ass, locatario: img });
                  setErrAss((c) => ({ ...c, locatario: false }));
                  setErro("");
                }}
              />
              {temFiador && (
                <Assinar
                  titulo={`Fiador — ${fiador.nome}`}
                  valor={ass.fiador}
                  erro={errAss.fiador}
                  onChange={(img) => {
                    setAss({ ...ass, fiador: img });
                    setErrAss((c) => ({ ...c, fiador: false }));
                    setErro("");
                  }}
                />
              )}
              <Assinar
                titulo="Fundação Manuel Cruz"
                valor={ass.fundacao}
                erro={errAss.fundacao}
                bloqueado={faltaAlguem && !ass.fundacao}
                onChange={(img) => {
                  setAss({ ...ass, fundacao: img });
                  setErrAss((c) => ({ ...c, fundacao: false }));
                  setErro("");
                }}
              />
            </div>

            <label
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                fontSize: 13,
                color: "#334155",
                marginTop: 14,
                cursor: "pointer",
              }}
            >
              <input
                type="checkbox"
                checked={firmas}
                onChange={(e) => {
                  setFirmas(e.target.checked);
                  setErro("");
                }}
              />
              Firmas reconhecidas em cartório
            </label>
          </section>

          <div
            style={{
              display: "flex",
              justifyContent: "flex-end",
              gap: 10,
              marginTop: 18,
            }}
          >
            <Button variant="secondary" onClick={reiniciar}>
              Novo contrato
            </Button>
            <Button variant="primary" onClick={() => navigate("/contratos")}>
              Voltar aos contratos
            </Button>
          </div>
        </>
      )}
    </main>
  );
}
