import { useMemo, useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import Button from "./Button";
import Input from "./Input";

/* ---------- tipos ---------- */

export interface LocacaoConcluida {
  locatario: string;
  fiador: string;
  valorAluguel: number;
  chaves: number;
  dataEntrega: string;
  primeiroVencimento: string;
}

interface Props {
  imovel: string;
  onClose: () => void;
  onConcluir: (dados: LocacaoConcluida) => void;
}

interface Pessoa {
  nome: string;
  cpf: string;
  telefone: string;
  renda: string;
}

type ChavePessoa = "locatario" | "conjuge" | "fiador" | "conjugeFiador";

interface Proposta {
  valorAluguel: string;
  locatario: Pessoa;
  temConjuge: boolean;
  conjuge: Pessoa;
  fiador: Pessoa;
  fiadorTemConjuge: boolean;
  conjugeFiador: Pessoa;
}

type Consulta = "" | "ok" | "restricao";

const pessoaVazia: Pessoa = { nome: "", cpf: "", telefone: "", renda: "" };

const PROPOSTA_VAZIA: Proposta = {
  valorAluguel: "",
  locatario: pessoaVazia,
  temConjuge: false,
  conjuge: pessoaVazia,
  fiador: pessoaVazia,
  fiadorTemConjuge: false,
  conjugeFiador: pessoaVazia,
};

const ETAPAS = ["Proposta", "Documentos", "Análise", "Aprovação", "Entrega"];

const ITENS_ENTREGA = [
  "Vistoria de entrada feita, com fotos e vídeos guardados no Drive do inquilino",
  "Termo de Vistoria elaborado e assinado pelo locatário e pelo fiador",
  "Contrato de Locação elaborado pelo Gerente Administrativo (garantia por fiador)",
  "Contrato assinado por locatário, fiador e respectivos cônjuges",
  "Firmas reconhecidas em cartório",
  "Contrato assinado pela Fundação",
  "Termo de Recebimento de Chaves assinado pelo inquilino",
];

/* ---------- utilitários ---------- */

const brl = (n: number) =>
  n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

// aceita "1200", "1200,50", "1.200,50" ou "1200.50"
const numero = (s: string) => {
  const t = s.includes(",") ? s.replace(/\./g, "").replace(",", ".") : s;
  return Number(t) || 0;
};

const soDigitos = (s: string) => s.replace(/\D/g, "");

const dataBR = (d: Date) => d.toLocaleDateString("pt-BR");

/* ---------- estilos ---------- */

const labelStyle: CSSProperties = {
  fontSize: 12,
  color: "#555",
  marginBottom: 6,
  display: "block",
};
const erroStyle: CSSProperties = {
  color: "#d63031",
  fontSize: 12,
  marginTop: 4,
};
const tituloBloco: CSSProperties = {
  fontSize: 14,
  fontWeight: 600,
  color: "#1a1a2e",
  margin: "20px 0 10px",
};
const notaStyle: CSSProperties = {
  fontSize: 12,
  color: "#777",
  margin: "4px 0 12px",
  lineHeight: 1.5,
};
const linhaStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 10,
  fontSize: 13,
  color: "#333",
  padding: "8px 0",
  borderTop: "1px solid #f0f0f5",
  cursor: "pointer",
};

/* ---------- pedaços pequenos ---------- */

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

function Marcar({
  texto,
  marcado,
  onChange,
}: {
  texto: string;
  marcado: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label style={linhaStyle}>
      <input
        type="checkbox"
        checked={marcado}
        onChange={(e) => onChange(e.target.checked)}
      />
      {texto}
    </label>
  );
}

function Opcoes({
  nome,
  valor,
  onChange,
}: {
  nome: string;
  valor: Consulta;
  onChange: (v: Consulta) => void;
}) {
  return (
    <div style={{ display: "flex", gap: 20 }}>
      {(
        [
          ["ok", "Sem restrição"],
          ["restricao", "Com restrição"],
        ] as [Consulta, string][]
      ).map(([v, texto]) => (
        <label
          key={v}
          style={{
            fontSize: 13,
            color: "#333",
            display: "flex",
            alignItems: "center",
            gap: 6,
            cursor: "pointer",
          }}
        >
          <input
            type="radio"
            name={nome}
            checked={valor === v}
            onChange={() => onChange(v)}
          />
          {texto}
        </label>
      ))}
    </div>
  );
}

function BlocoPessoa({
  titulo,
  chave,
  pessoa,
  erros,
  onChange,
}: {
  titulo: string;
  chave: ChavePessoa;
  pessoa: Pessoa;
  erros: Record<string, string>;
  onChange: (chave: ChavePessoa, campo: keyof Pessoa, valor: string) => void;
}) {
  const campo = (
    c: keyof Pessoa,
    label: string,
    placeholder: string,
    extra?: { inputMode?: "decimal" | "numeric" | "tel" },
  ) => (
    <Campo label={label} erro={erros[`${chave}.${c}`]}>
      <Input
        style={{ width: "100%", boxSizing: "border-box" }}
        placeholder={placeholder}
        value={pessoa[c]}
        inputMode={extra?.inputMode}
        onChange={(e) => onChange(chave, c, e.target.value)}
      />
    </Campo>
  );

  return (
    <div>
      <h3 style={tituloBloco}>{titulo}</h3>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
          gap: 12,
        }}
      >
        {campo("nome", "Nome completo", "Nome")}
        {campo("cpf", "CPF", "000.000.000-00", { inputMode: "numeric" })}
        {campo("telefone", "Telefone", "(92) 90000-0000", { inputMode: "tel" })}
        {campo("renda", "Renda mensal", "R$ 0,00", { inputMode: "decimal" })}
      </div>
    </div>
  );
}

/* ---------- fluxo ---------- */

function CadastrarLocatario({ imovel, onClose, onConcluir }: Props) {
  const [etapa, setEtapa] = useState(0);
  const [proposta, setProposta] = useState<Proposta>(PROPOSTA_VAZIA);
  const [erros, setErros] = useState<Record<string, string>>({});

  const [entregues, setEntregues] = useState<Record<string, boolean>>({});

  const [consultaLoc, setConsultaLoc] = useState<Consulta>("");
  const [consultaFiador, setConsultaFiador] = useState<Consulta>("");
  const [comprovanteArquivado, setComprovanteArquivado] = useState(false);
  const [erroAnalise, setErroAnalise] = useState("");

  const [feitos, setFeitos] = useState<Record<string, boolean>>({});
  const [chaves, setChaves] = useState("");
  const [erroEntrega, setErroEntrega] = useState("");

  const [encerrado, setEncerrado] = useState<string | null>(null);

  const aluguel = numero(proposta.valorAluguel);

  const setPessoa = (chave: ChavePessoa, campo: keyof Pessoa, valor: string) =>
    setProposta((p) => ({ ...p, [chave]: { ...p[chave], [campo]: valor } }));

  /* documentos esperados, conforme quem entrou na proposta */
  const documentos = useMemo(() => {
    const lista = [
      "Proposta de Locação preenchida",
      "Identificação e CPF do locatário",
    ];
    if (proposta.temConjuge)
      lista.push("Identificação e CPF do cônjuge do locatário");
    lista.push("Identificação e CPF do fiador");
    if (proposta.fiadorTemConjuge)
      lista.push("Identificação e CPF do cônjuge do fiador");
    lista.push(
      "Comprovante de renda do locatário (contracheque ou Imposto de Renda)",
    );
    if (proposta.temConjuge)
      lista.push("Comprovante de renda do cônjuge do locatário");
    lista.push("Comprovante de renda do fiador");
    lista.push("Demais comprovantes exigidos no modelo de proposta");
    return lista;
  }, [proposta.temConjuge, proposta.fiadorTemConjuge]);

  const pendentes = documentos.filter((d) => !entregues[d]);

  /* renda familiar: locatário + cônjuge */
  const rendaFamiliar =
    numero(proposta.locatario.renda) +
    (proposta.temConjuge ? numero(proposta.conjuge.renda) : 0);
  const rendaMinima = aluguel * 3;
  const rendaOk = rendaFamiliar >= rendaMinima;

  const temRestricao =
    consultaLoc === "restricao" || consultaFiador === "restricao";

  /* ---------- validações por etapa ---------- */

  const validarProposta = () => {
    const e: Record<string, string> = {};
    const checar = (chave: ChavePessoa, comRenda: boolean) => {
      const p = proposta[chave];
      if (!p.nome.trim()) e[`${chave}.nome`] = "Informe o nome.";
      if (soDigitos(p.cpf).length !== 11)
        e[`${chave}.cpf`] = "O CPF precisa ter 11 números.";
      if (comRenda && numero(p.renda) <= 0)
        e[`${chave}.renda`] = "Informe a renda.";
    };

    if (aluguel <= 0) e.valorAluguel = "Informe o valor do aluguel.";
    checar("locatario", true);
    if (proposta.temConjuge) checar("conjuge", false);
    checar("fiador", true);
    if (proposta.fiadorTemConjuge) checar("conjugeFiador", false);

    setErros(e);
    return Object.keys(e).length === 0;
  };

  const avancar = () => {
    if (etapa === 0) {
      if (!validarProposta()) return;
    }

    if (etapa === 1 && pendentes.length > 0) return;

    if (etapa === 2) {
      if (!consultaLoc || !consultaFiador) {
        setErroAnalise(
          "Registre o resultado da consulta do locatário e do fiador.",
        );
        return;
      }
      if (!comprovanteArquivado) {
        setErroAnalise(
          "Confirme que o comprovante da consulta foi arquivado na pasta física do inquilino.",
        );
        return;
      }
      setErroAnalise("");

      if (temRestricao) {
        setEncerrado(
          "Há restrição financeira impeditiva. A Fundação comunica o retorno ao interessado e a solicitação é encerrada.",
        );
        return;
      }
      if (!rendaOk) {
        setEncerrado(
          `A renda familiar (${brl(rendaFamiliar)}) é menor que o mínimo de três vezes o aluguel (${brl(rendaMinima)}). A Fundação comunica o retorno ao interessado e o processo é encerrado.`,
        );
        return;
      }
    }

    setEtapa((n) => n + 1);
  };

  const naoAprovar = () =>
    setEncerrado(
      "O Gerente Administrativo não aprovou o candidato. O interessado é comunicado e a locação não é formalizada.",
    );

  const concluir = () => {
    const qtd = Math.floor(numero(chaves));
    if (ITENS_ENTREGA.some((i) => !feitos[i])) {
      setErroEntrega("Marque todas as etapas antes de concluir.");
      return;
    }
    if (qtd <= 0) {
      setErroEntrega("Informe a quantidade de chaves entregues.");
      return;
    }

    const hoje = new Date();
    const venc = new Date(hoje);
    venc.setDate(venc.getDate() + 30);

    onConcluir({
      locatario: proposta.locatario.nome.trim(),
      fiador: proposta.fiador.nome.trim(),
      valorAluguel: aluguel,
      chaves: qtd,
      dataEntrega: dataBR(hoje),
      primeiroVencimento: dataBR(venc),
    });
  };

  /* ---------- conteúdo de cada etapa ---------- */

  const conteudo = () => {
    if (encerrado) {
      return (
        <div>
          <h3 style={tituloBloco}>Processo encerrado</h3>
          <p style={{ fontSize: 13, color: "#333", lineHeight: 1.6 }}>
            {encerrado}
          </p>
          <p style={notaStyle}>O imóvel continua vago e nada foi cadastrado.</p>
        </div>
      );
    }

    if (etapa === 0) {
      return (
        <div>
          <p style={notaStyle}>
            Dados da Proposta de Locação. A Fundação trabalha exclusivamente com
            garantia por fiador, então o fiador é obrigatório.
          </p>

          <div style={{ maxWidth: 260 }}>
            <Campo label="Valor do aluguel" erro={erros.valorAluguel}>
              <Input
                style={{ width: "100%", boxSizing: "border-box" }}
                placeholder="R$ 0,00"
                inputMode="decimal"
                value={proposta.valorAluguel}
                onChange={(e) =>
                  setProposta((p) => ({ ...p, valorAluguel: e.target.value }))
                }
              />
            </Campo>
          </div>

          <BlocoPessoa
            titulo="Locatário"
            chave="locatario"
            pessoa={proposta.locatario}
            erros={erros}
            onChange={setPessoa}
          />
          <Marcar
            texto="O locatário tem cônjuge"
            marcado={proposta.temConjuge}
            onChange={(v) => setProposta((p) => ({ ...p, temConjuge: v }))}
          />
          {proposta.temConjuge && (
            <BlocoPessoa
              titulo="Cônjuge do locatário"
              chave="conjuge"
              pessoa={proposta.conjuge}
              erros={erros}
              onChange={setPessoa}
            />
          )}

          <BlocoPessoa
            titulo="Fiador"
            chave="fiador"
            pessoa={proposta.fiador}
            erros={erros}
            onChange={setPessoa}
          />
          <Marcar
            texto="O fiador tem cônjuge"
            marcado={proposta.fiadorTemConjuge}
            onChange={(v) =>
              setProposta((p) => ({ ...p, fiadorTemConjuge: v }))
            }
          />
          {proposta.fiadorTemConjuge && (
            <BlocoPessoa
              titulo="Cônjuge do fiador"
              chave="conjugeFiador"
              pessoa={proposta.conjugeFiador}
              erros={erros}
              onChange={setPessoa}
            />
          )}
        </div>
      );
    }

    if (etapa === 1) {
      return (
        <div>
          <p style={notaStyle}>
            Confira a proposta e os documentos entregues pelo interessado e pelo
            fiador. Marque o que a Secretaria já recebeu.
          </p>
          {documentos.map((d) => (
            <Marcar
              key={d}
              texto={d}
              marcado={!!entregues[d]}
              onChange={(v) => setEntregues((s) => ({ ...s, [d]: v }))}
            />
          ))}
          {pendentes.length > 0 && (
            <p style={{ ...notaStyle, marginTop: 14 }}>
              Faltam {pendentes.length}{" "}
              {pendentes.length === 1 ? "documento" : "documentos"}. O
              interessado precisa providenciar e reapresentar para nova
              conferência, e só então o processo segue.
            </p>
          )}
        </div>
      );
    }

    if (etapa === 2) {
      return (
        <div>
          <p style={notaStyle}>
            Consulta de restrições financeiras do locatário e do fiador, e
            verificação da renda familiar.
          </p>

          <h3 style={tituloBloco}>Consulta de CPF</h3>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
              gap: 16,
            }}
          >
            <Campo label={`Locatário: ${proposta.locatario.nome}`}>
              <Opcoes
                nome="consulta-locatario"
                valor={consultaLoc}
                onChange={setConsultaLoc}
              />
            </Campo>
            <Campo label={`Fiador: ${proposta.fiador.nome}`}>
              <Opcoes
                nome="consulta-fiador"
                valor={consultaFiador}
                onChange={setConsultaFiador}
              />
            </Campo>
          </div>
          <Marcar
            texto="Comprovante da consulta arquivado na pasta física do inquilino"
            marcado={comprovanteArquivado}
            onChange={setComprovanteArquivado}
          />

          <h3 style={tituloBloco}>Renda familiar</h3>
          <div
            style={{
              background: "#f1f2fc",
              borderRadius: 8,
              padding: "12px 16px",
              fontSize: 13,
              color: "#333",
              lineHeight: 1.7,
            }}
          >
            <div>
              Renda familiar (locatário{proposta.temConjuge ? " e cônjuge" : ""}
              ): <strong>{brl(rendaFamiliar)}</strong>
            </div>
            <div>
              Mínimo exigido (3 vezes o aluguel de {brl(aluguel)}):{" "}
              <strong>{brl(rendaMinima)}</strong>
            </div>
            <div
              style={{ color: rendaOk ? "#2d7a4f" : "#d63031", marginTop: 4 }}
            >
              {rendaOk
                ? "A renda atende ao critério."
                : "A renda não atende ao critério."}
            </div>
          </div>

          {temRestricao && (
            <p style={{ ...erroStyle, fontSize: 13, marginTop: 14 }}>
              Há restrição impeditiva. Ao continuar, a solicitação será
              encerrada.
            </p>
          )}
          {erroAnalise && (
            <div style={{ ...erroStyle, fontSize: 13, marginTop: 14 }}>
              {erroAnalise}
            </div>
          )}
        </div>
      );
    }

    if (etapa === 3) {
      const linha = (rotulo: string, valor: string) => (
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            fontSize: 13,
            padding: "8px 0",
            borderTop: "1px solid #f0f0f5",
          }}
        >
          <span style={{ color: "#777" }}>{rotulo}</span>
          <span style={{ color: "#333" }}>{valor}</span>
        </div>
      );
      return (
        <div>
          <p style={notaStyle}>
            Decisão final do Gerente Administrativo, considerando documentação,
            ausência de restrições e capacidade de renda.
          </p>
          {linha("Imóvel", imovel)}
          {linha("Locatário", proposta.locatario.nome)}
          {linha("Fiador", proposta.fiador.nome)}
          {linha("Aluguel", brl(aluguel))}
          {linha("Documentação", "Completa")}
          {linha("Restrições financeiras", "Nenhuma")}
          {linha(
            "Renda familiar",
            `${brl(rendaFamiliar)} (mínimo ${brl(rendaMinima)})`,
          )}
        </div>
      );
    }

    return (
      <div>
        <p style={notaStyle}>
          Candidato aprovado. Marque cada etapa conforme for concluída. Ao
          registrar a entrega das chaves, o inquilino está autorizado a fazer a
          mudança.
        </p>
        {ITENS_ENTREGA.map((i) => (
          <Marcar
            key={i}
            texto={i}
            marcado={!!feitos[i]}
            onChange={(v) => setFeitos((s) => ({ ...s, [i]: v }))}
          />
        ))}
        <div style={{ maxWidth: 260, marginTop: 14 }}>
          <Campo label="Quantidade de chaves entregues">
            <Input
              style={{ width: "100%", boxSizing: "border-box" }}
              inputMode="numeric"
              placeholder="0"
              value={chaves}
              onChange={(e) => setChaves(e.target.value)}
            />
          </Campo>
        </div>
        <p style={notaStyle}>
          O primeiro aluguel vence 30 dias após a mudança.
        </p>
        {erroEntrega && (
          <div style={{ ...erroStyle, fontSize: 13 }}>{erroEntrega}</div>
        )}
      </div>
    );
  };

  /* ---------- rodapé ---------- */

  const rodape = () => {
    if (encerrado) {
      return (
        <Button type="button" onClick={onClose}>
          Fechar
        </Button>
      );
    }
    return (
      <>
        {etapa > 0 && (
          <Button
            type="button"
            variant="secondary"
            onClick={() => setEtapa((n) => n - 1)}
          >
            Voltar
          </Button>
        )}
        {etapa === 3 && (
          <Button type="button" variant="secondary" onClick={naoAprovar}>
            Não aprovar
          </Button>
        )}
        {etapa < 3 && (
          <Button
            type="button"
            onClick={avancar}
            disabled={etapa === 1 && pendentes.length > 0}
            style={
              etapa === 1 && pendentes.length > 0
                ? { opacity: 0.5, cursor: "not-allowed" }
                : undefined
            }
          >
            Continuar
          </Button>
        )}
        {etapa === 3 && (
          <Button type="button" onClick={() => setEtapa(4)}>
            Aprovar candidato
          </Button>
        )}
        {etapa === 4 && (
          <Button type="button" onClick={concluir}>
            Concluir locação
          </Button>
        )}
      </>
    );
  };

  return (
    <div
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
        role="dialog"
        aria-modal="true"
        style={{
          background: "#fff",
          borderRadius: 12,
          padding: 24,
          width: 760,
          maxWidth: "94%",
          maxHeight: "90vh",
          overflowY: "auto",
          fontFamily: "'Nunito', sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
          }}
        >
          <div>
            <h2 style={{ fontSize: 18, margin: 0, color: "#1a1a2e" }}>
              Cadastrar locatário
            </h2>
            <p style={{ fontSize: 12, color: "#999", margin: "2px 0 0" }}>
              {imovel}
            </p>
          </div>
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
        </div>

        {!encerrado && (
          <div
            style={{
              display: "flex",
              gap: 18,
              margin: "18px 0 6px",
              borderBottom: "1px solid #f0f0f5",
              paddingBottom: 10,
            }}
          >
            {ETAPAS.map((nome, i) => (
              <span
                key={nome}
                style={{
                  fontSize: 12,
                  fontWeight: i === etapa ? 700 : 400,
                  color: i === etapa ? "#6c5ce7" : i < etapa ? "#555" : "#bbb",
                }}
              >
                {i + 1}. {nome}
              </span>
            ))}
          </div>
        )}

        {conteudo()}

        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            gap: 10,
            marginTop: 24,
          }}
        >
          {rodape()}
        </div>
      </div>
    </div>
  );
}

export default CadastrarLocatario;
