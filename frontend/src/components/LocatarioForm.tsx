import { useState } from "react";
import type { FormEvent } from "react";
import Button from "./Button";
import { api, mensagemDeErro } from "../api/axios";
import {
  validaCPF,
  validaEmail,
  validaTelefone,
  documentoPreenchido,
  mascaraCPF,
  mascaraTelefone,
} from "../utils/validacao";
import type { Locatario } from "../types";

const ESTADOS_CIVIS = [
  "Solteiro(a)",
  "Casado(a)",
  "Divorciado(a)",
  "Separado(a)",
  "Viúvo(a)",
  "União estável",
];

interface Form {
  nome: string;
  cpfCnpj: string;
  rg: string;
  dataNascimento: string;
  estadoCivil: string;
  profissao: string;
  telefone: string;
  email: string;
  endereco: string;
  cidade: string;
  observacao: string;
}

const VAZIO: Form = {
  nome: "",
  cpfCnpj: "",
  rg: "",
  dataNascimento: "",
  estadoCivil: "",
  profissao: "",
  telefone: "",
  email: "",
  endereco: "",
  cidade: "",
  observacao: "",
};

const rotulo: React.CSSProperties = {
  display: "block",
  fontSize: 12,
  color: "#64748b",
  fontWeight: 600,
  marginBottom: 6,
};

const campo: React.CSSProperties = {
  width: "100%",
  padding: "10px 12px",
  fontSize: 14,
  border: "1px solid #e2e8f0",
  borderRadius: 8,
  background: "#fff",
  color: "#16233b",
};

const erroTexto: React.CSSProperties = {
  color: "#b91c1c",
  fontSize: 12,
  marginTop: 4,
};

interface Props {
  /** Se vier, o modal entra em modo de edicao (PUT em vez de POST). */
  locatario?: Locatario | null;
  onClose: () => void;
  onSalvo: () => void;
}

/**
 * Formulario proprio de cliente/locatario (nome, CPF, RG, nascimento, estado
 * civil, profissao, telefone e e-mail) com validacao de CPF, e-mail e
 * telefone, como pedido nos requisitos de cadastro.
 */
export default function LocatarioForm({ locatario, onClose, onSalvo }: Props) {
  const edicao = Boolean(locatario);
  const [form, setForm] = useState<Form>({
    ...VAZIO,
    nome: locatario?.nome ?? "",
    cpfCnpj: locatario?.cpfCnpj ?? "",
    rg: locatario?.rg ?? "",
    dataNascimento: locatario?.dataNascimento?.slice(0, 10) ?? "",
    estadoCivil: locatario?.estadoCivil ?? "",
    profissao: locatario?.profissao ?? "",
    telefone: locatario?.telefone ?? "",
    email: locatario?.email ?? "",
    endereco: locatario?.endereco ?? "",
    cidade: locatario?.cidade ?? "",
    observacao: locatario?.observacao ?? "",
  });
  const [erros, setErros] = useState<Partial<Record<keyof Form, string>>>({});
  const [salvando, setSalvando] = useState(false);
  const [erroApi, setErroApi] = useState("");

  const alterar = (campo: keyof Form, valor: string) => {
    setForm((f) => ({ ...f, [campo]: valor }));
    setErros((e) => ({ ...e, [campo]: undefined }));
  };

  function validar(): boolean {
    const e: Partial<Record<keyof Form, string>> = {};

    if (!form.nome.trim()) e.nome = "Informe o nome completo.";
    if (!form.cpfCnpj.trim()) {
      e.cpfCnpj = "Informe o CPF (ou CNPJ).";
    } else if (!documentoPreenchido(form.cpfCnpj)) {
      e.cpfCnpj = "CPF deve ter 11 digitos (ou CNPJ 14).";
    } else if (
      !edicao &&
      form.cpfCnpj.replace(/\D/g, "").length === 11 &&
      !validaCPF(form.cpfCnpj)
    ) {
      // Digitos verificadores conferidos apenas no cadastro novo:
      // registros de demonstracao possuem CPF sintetico.
      e.cpfCnpj = "CPF invalido — confira os digitos.";
    }

    if (!form.telefone.trim()) {
      e.telefone = "Informe o telefone (DDD + numero).";
    } else if (!validaTelefone(form.telefone)) {
      e.telefone = "Telefone invalido — use DDD + numero (10 ou 11 digitos).";
    }

    if (!form.email.trim()) {
      e.email = "Informe o e-mail.";
    } else if (!validaEmail(form.email)) {
      e.email = "E-mail invalido (ex.: nome@dominio.com).";
    }

    if (!form.endereco.trim()) e.endereco = "Informe o endereço.";
    if (!form.cidade.trim()) e.cidade = "Informe a cidade.";

    setErros(e);
    return Object.keys(e).length === 0;
  }

  async function salvar(evento: FormEvent) {
    evento.preventDefault();
    setErroApi("");
    if (!validar()) return;

    setSalvando(true);
    const payload = {
      nome: form.nome.trim(),
      cpfCnpj: form.cpfCnpj.trim(),
      rg: form.rg.trim() || null,
      dataNascimento: form.dataNascimento || null,
      estadoCivil: form.estadoCivil || null,
      profissao: form.profissao.trim() || null,
      telefone: form.telefone.trim(),
      email: form.email.trim(),
      endereco: form.endereco.trim(),
      cidade: form.cidade.trim(),
      observacao: form.observacao.trim() || null,
    };
    try {
      if (edicao && locatario) {
        await api.put(`/locatarios/${locatario.id}`, payload);
      } else {
        await api.post("/locatarios", payload);
      }
      onSalvo();
      onClose();
    } catch (error) {
      setErroApi(mensagemDeErro(error));
    } finally {
      setSalvando(false);
    }
  }

  const textoAcao = edicao ? "Salvar alterações" : "Cadastrar cliente";

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(22, 35, 59, 0.45)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 60,
        padding: 20,
      }}
      onClick={onClose}
    >
      <form
        onClick={(e) => e.stopPropagation()}
        onSubmit={salvar}
        style={{
          background: "#fff",
          borderRadius: 14,
          padding: 26,
          width: "min(760px, 100%)",
          maxHeight: "90vh",
          overflowY: "auto",
          boxShadow: "0 18px 50px rgba(22, 35, 59, 0.25)",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            marginBottom: 18,
          }}
        >
          <div>
            <h2 style={{ margin: 0, fontSize: 18, color: "#16233b" }}>
              {edicao ? "Editar cliente" : "Novo cliente"}
            </h2>
            <p style={{ margin: "4px 0 0", fontSize: 12, color: "#94a3b8" }}>
              Dados do locatário — campos com * são obrigatórios
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            style={{
              border: "none",
              background: "transparent",
              fontSize: 20,
              color: "#94a3b8",
              cursor: "pointer",
              lineHeight: 1,
            }}
          >
            ×
          </button>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))",
            gap: 14,
          }}
        >
          <div style={{ gridColumn: "1 / -1" }}>
            <label style={rotulo}>
              Nome completo <span style={{ color: "#b91c1c" }}>*</span>
            </label>
            <input
              style={campo}
              value={form.nome}
              onChange={(e) => alterar("nome", e.target.value)}
              placeholder="Ex.: Maria da Silva"
            />
            {erros.nome && <div style={erroTexto}>{erros.nome}</div>}
          </div>

          <div>
            <label style={rotulo}>
              CPF <span style={{ color: "#b91c1c" }}>*</span>
            </label>
            <input
              style={campo}
              value={form.cpfCnpj}
              onChange={(e) =>
                alterar("cpfCnpj", mascaraCPF(e.target.value))
              }
              placeholder="000.000.000-00"
              inputMode="numeric"
            />
            {erros.cpfCnpj && <div style={erroTexto}>{erros.cpfCnpj}</div>}
          </div>

          <div>
            <label style={rotulo}>RG / documento oficial</label>
            <input
              style={campo}
              value={form.rg}
              onChange={(e) => alterar("rg", e.target.value)}
              placeholder="Ex.: 12.345.678-9"
            />
          </div>

          <div>
            <label style={rotulo}>Data de nascimento</label>
            <input
              type="date"
              style={campo}
              value={form.dataNascimento}
              onChange={(e) => alterar("dataNascimento", e.target.value)}
            />
          </div>

          <div>
            <label style={rotulo}>Estado civil</label>
            <select
              style={campo}
              value={form.estadoCivil}
              onChange={(e) => alterar("estadoCivil", e.target.value)}
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
              style={campo}
              value={form.profissao}
              onChange={(e) => alterar("profissao", e.target.value)}
              placeholder="Ex.: Professora"
            />
          </div>

          <div>
            <label style={rotulo}>
              Telefone <span style={{ color: "#b91c1c" }}>*</span>
            </label>
            <input
              style={campo}
              value={form.telefone}
              onChange={(e) =>
                alterar("telefone", mascaraTelefone(e.target.value))
              }
              placeholder="(79) 98888-7777"
              inputMode="tel"
            />
            {erros.telefone && <div style={erroTexto}>{erros.telefone}</div>}
          </div>

          <div>
            <label style={rotulo}>
              E-mail <span style={{ color: "#b91c1c" }}>*</span>
            </label>
            <input
              style={campo}
              value={form.email}
              onChange={(e) => alterar("email", e.target.value)}
              placeholder="nome@dominio.com"
              inputMode="email"
            />
            {erros.email && <div style={erroTexto}>{erros.email}</div>}
          </div>

          <div>
            <label style={rotulo}>
              Endereço <span style={{ color: "#b91c1c" }}>*</span>
            </label>
            <input
              style={campo}
              value={form.endereco}
              onChange={(e) => alterar("endereco", e.target.value)}
              placeholder="Rua, número"
            />
            {erros.endereco && <div style={erroTexto}>{erros.endereco}</div>}
          </div>

          <div>
            <label style={rotulo}>
              Cidade <span style={{ color: "#b91c1c" }}>*</span>
            </label>
            <input
              style={campo}
              value={form.cidade}
              onChange={(e) => alterar("cidade", e.target.value)}
              placeholder="Ex.: Aracaju"
            />
            {erros.cidade && <div style={erroTexto}>{erros.cidade}</div>}
          </div>

          <div style={{ gridColumn: "1 / -1" }}>
            <label style={rotulo}>Observações</label>
            <textarea
              style={{ ...campo, minHeight: 70, resize: "vertical" }}
              value={form.observacao}
              onChange={(e) => alterar("observacao", e.target.value)}
              placeholder="Informações complementares do cadastro"
            />
          </div>
        </div>

        {erroApi && (
          <div
            style={{
              background: "#fee2e2",
              color: "#b91c1c",
              borderRadius: 8,
              padding: 12,
              fontSize: 13,
              marginTop: 16,
            }}
          >
            {erroApi}
          </div>
        )}

        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            gap: 10,
            marginTop: 22,
          }}
        >
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" variant="primary" disabled={salvando}>
            {salvando ? "Salvando..." : textoAcao}
          </Button>
        </div>
      </form>
    </div>
  );
}
