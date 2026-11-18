import { useCallback, useEffect, useState } from "react";
import type { FormEvent } from "react";
import Button from "./Button";
import { api, mensagemDeErro } from "../api/axios";
import type { DocumentoObrigatorio } from "../types";

const MODALIDADES: { valor: string; rotulo: string }[] = [
  { valor: "SEM_GARANTIA", rotulo: "Sem garantia" },
  { valor: "FIADOR", rotulo: "Fiador" },
  { valor: "CAUCAO", rotulo: "Caução" },
  { valor: "SEGURO", rotulo: "Seguro-fiança" },
];

const rotulo: React.CSSProperties = {
  display: "block",
  fontSize: 12,
  color: "#64748b",
  fontWeight: 600,
  marginBottom: 6,
};

const campo: React.CSSProperties = {
  padding: "9px 12px",
  fontSize: 14,
  border: "1px solid #e2e8f0",
  borderRadius: 8,
  background: "#fff",
  color: "#16233b",
};

interface Props {
  onClose: () => void;
}

/**
 * Configuracao dos campos/documentos obrigatorios por modalidade de garantia
 * (fiador, caucao, seguro ou sem garantia), para o cliente e para o fiador.
 * Os documentos cadastrados aqui alimentam o checklist do contrato.
 */
export default function DocumentosConfig({ onClose }: Props) {
  const [modalidade, setModalidade] = useState("FIADOR");
  const [documentos, setDocumentos] = useState<DocumentoObrigatorio[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");

  const [novoNome, setNovoNome] = useState("");
  const [novoDestinatario, setNovoDestinatario] = useState("CLIENTE");
  const [novoObrigatorio, setNovoObrigatorio] = useState(true);
  const [salvando, setSalvando] = useState(false);

  const carregar = useCallback(async (mod: string) => {
    setCarregando(true);
    setErro("");
    try {
      const resposta = await api.get<DocumentoObrigatorio[]>(
        "/documentos-obrigatorios",
        { params: { modalidade: mod } },
      );
      setDocumentos(resposta.data);
    } catch (error) {
      setErro(mensagemDeErro(error));
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    void carregar(modalidade);
  }, [modalidade, carregar]);

  async function adicionar(evento: FormEvent) {
    evento.preventDefault();
    if (!novoNome.trim()) {
      setErro("Informe o nome do documento.");
      return;
    }
    setSalvando(true);
    setErro("");
    try {
      await api.post("/documentos-obrigatorios", {
        modalidade,
        destinatario: novoDestinatario,
        nome: novoNome.trim(),
        obrigatorio: novoObrigatorio,
      });
      setNovoNome("");
      await carregar(modalidade);
    } catch (error) {
      setErro(mensagemDeErro(error));
    } finally {
      setSalvando(false);
    }
  }

  async function alternarObrigatorio(doc: DocumentoObrigatorio) {
    try {
      await api.put(`/documentos-obrigatorios/${doc.id}`, {
        modalidade: doc.modalidade,
        destinatario: doc.destinatario,
        nome: doc.nome,
        obrigatorio: !doc.obrigatorio,
      });
      await carregar(modalidade);
    } catch (error) {
      setErro(mensagemDeErro(error));
    }
  }

  async function remover(doc: DocumentoObrigatorio) {
    try {
      await api.delete(`/documentos-obrigatorios/${doc.id}`);
      await carregar(modalidade);
    } catch (error) {
      setErro(mensagemDeErro(error));
    }
  }

  const rotuloModalidade = MODALIDADES.find((m) => m.valor === modalidade)
    ?.rotulo;

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
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "#fff",
          borderRadius: 14,
          padding: 26,
          width: "min(720px, 100%)",
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
            gap: 12,
            marginBottom: 18,
          }}
        >
          <div>
            <h2 style={{ margin: 0, fontSize: 18, color: "#16233b" }}>
              Documentos obrigatórios
            </h2>
            <p style={{ margin: "4px 0 0", fontSize: 12, color: "#94a3b8" }}>
              A lista varia conforme a modalidade de garantia do contrato
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

        <div style={{ marginBottom: 16 }}>
          <label style={rotulo}>Modalidade de garantia</label>
          <select
            style={{ ...campo, width: "100%", maxWidth: 320 }}
            value={modalidade}
            onChange={(e) => setModalidade(e.target.value)}
          >
            {MODALIDADES.map((m) => (
              <option key={m.valor} value={m.valor}>
                {m.rotulo}
              </option>
            ))}
          </select>
        </div>

        {erro && (
          <div
            style={{
              background: "#fee2e2",
              color: "#b91c1c",
              borderRadius: 8,
              padding: 12,
              fontSize: 13,
              marginBottom: 14,
            }}
          >
            {erro}
          </div>
        )}

        <div
          style={{
            border: "1px solid #e2e8f0",
            borderRadius: 10,
            overflow: "hidden",
          }}
        >
          <div
            style={{
              background: "#eef4fc",
              padding: "10px 14px",
              fontSize: 12,
              fontWeight: 600,
              color: "#334155",
              display: "flex",
              justifyContent: "space-between",
            }}
          >
            <span>Documentos de {rotuloModalidade}</span>
            <span>Para quem / obrigatório</span>
          </div>

          {carregando && (
            <p
              style={{
                margin: 0,
                padding: "18px 14px",
                fontSize: 13,
                color: "#94a3b8",
                textAlign: "center",
              }}
            >
              Carregando documentos...
            </p>
          )}

          {!carregando && documentos.length === 0 && (
            <p
              style={{
                margin: 0,
                padding: "18px 14px",
                fontSize: 13,
                color: "#94a3b8",
                textAlign: "center",
              }}
            >
              Nenhum documento cadastrado para esta modalidade.
            </p>
          )}

          {!carregando &&
            documentos.map((doc) => (
              <div
                key={doc.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 12,
                  padding: "10px 14px",
                  borderTop: "1px solid #f1f5f9",
                  fontSize: 13,
                  color: "#334155",
                  flexWrap: "wrap",
                }}
              >
                <span>{doc.nome}</span>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    flexWrap: "wrap",
                  }}
                >
                  <span
                    style={{
                      background: doc.destinatario === "FIADOR" ? "#f5eef9" : "#eef4fc",
                      color: doc.destinatario === "FIADOR" ? "#7c3aed" : "#1a5fa8",
                      borderRadius: 999,
                      padding: "3px 10px",
                      fontSize: 11,
                      fontWeight: 600,
                    }}
                  >
                    {doc.destinatario === "FIADOR" ? "Fiador" : "Cliente"}
                  </span>
                  <button
                    type="button"
                    onClick={() => void alternarObrigatorio(doc)}
                    style={{
                      border: "none",
                      borderRadius: 999,
                      padding: "3px 10px",
                      fontSize: 11,
                      fontWeight: 600,
                      cursor: "pointer",
                      background: doc.obrigatorio ? "#dcfce7" : "#f1f5f9",
                      color: doc.obrigatorio ? "#15803d" : "#64748b",
                    }}
                    title="Alternar entre obrigatório e opcional"
                  >
                    {doc.obrigatorio ? "Obrigatório" : "Opcional"}
                  </button>
                  <button
                    type="button"
                    onClick={() => void remover(doc)}
                    style={{
                      border: "1px solid #fecaca",
                      background: "#fff",
                      color: "#b91c1c",
                      borderRadius: 6,
                      padding: "3px 10px",
                      fontSize: 11,
                      fontWeight: 600,
                      cursor: "pointer",
                    }}
                  >
                    Remover
                  </button>
                </div>
              </div>
            ))}
        </div>

        <form
          onSubmit={adicionar}
          style={{
            display: "flex",
            gap: 10,
            marginTop: 16,
            flexWrap: "wrap",
            alignItems: "flex-end",
          }}
        >
          <div style={{ flex: "1 1 220px" }}>
            <label style={rotulo}>Novo documento</label>
            <input
              style={{ ...campo, width: "100%" }}
              value={novoNome}
              onChange={(e) => setNovoNome(e.target.value)}
              placeholder="Ex.: Comprovante de renda"
            />
          </div>
          <div>
            <label style={rotulo}>Para quem</label>
            <select
              style={campo}
              value={novoDestinatario}
              onChange={(e) => setNovoDestinatario(e.target.value)}
            >
              <option value="CLIENTE">Cliente</option>
              <option value="FIADOR">Fiador</option>
            </select>
          </div>
          <label
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              fontSize: 13,
              color: "#334155",
              height: 38,
            }}
          >
            <input
              type="checkbox"
              checked={novoObrigatorio}
              onChange={(e) => setNovoObrigatorio(e.target.checked)}
            />
            Obrigatório
          </label>
          <Button type="submit" variant="primary" disabled={salvando}>
            {salvando ? "Adicionando..." : "+ Adicionar"}
          </Button>
        </form>
      </div>
    </div>
  );
}
