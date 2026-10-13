import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Button from "../components/Button";
import NovoContrato from "../components/NovoContrato";
import type { ContratoCriado } from "../components/NovoContrato";
import { api, mensagemDeErro } from "../api/axios";
import { formatMesReferencia } from "../utils/format";
import { adicionarContrato, useContratosCriados } from "../store/contratosStore";
import type { Contrato, Imovel, Locatario } from "../types";

const cardStyle = {
  textDecoration: "none",
  display: "block",
  width: 190,
  padding: "18px 12px",
  textAlign: "center" as const,
  background: "#fff",
  border: "1px solid #ecebf7",
  borderRadius: 10,
  boxShadow: "0 2px 8px rgba(108, 92, 231, 0.12)",
};

const normalizar = (texto: string) =>
  texto
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "");

/** Deriva bairro e cidade de um endereco digitado livremente. */
function derivarBairroCidade(endereco: string): { bairro: string; cidade: string } {
  const partes = endereco.split(/\s+[-–]\s+/);
  const cauda = partes[partes.length - 1] ?? "";
  const segmentos = cauda.split(",").map((s) => s.trim());

  if (segmentos.length >= 2) {
    return {
      bairro: segmentos[0] || "Não informado",
      cidade: (segmentos[segmentos.length - 1] || "").split("/")[0].trim() || "Não informada",
    };
  }
  if (cauda.includes("/")) {
    return {
      bairro: "Não informado",
      cidade: cauda.split("/")[0].trim() || "Não informada",
    };
  }
  return { bairro: "Não informado", cidade: "Não informada" };
}

/**
 * Contratos em grade (visual das telas novas): contratos da API e os gerados
 * pelo assistente de contrato PDF.
 */
export default function Contratos() {
  const navigate = useNavigate();
  const criados = useContratosCriados();
  const [contratosApi, setContratosApi] = useState<Contrato[]>([]);
  const [imoveis, setImoveis] = useState<Imovel[]>([]);
  const [locatarios, setLocatarios] = useState<Locatario[]>([]);
  const [criando, setCriando] = useState(false);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");
  const [salvando, setSalvando] = useState(false);

  const carregar = useCallback(async () => {
    setCarregando(true);
    setErro("");
    try {
      const [respostaContratos, respostaImoveis, respostaLocatarios] =
        await Promise.all([
          api.get<Contrato[]>("/contratos"),
          api.get<Imovel[]>("/imoveis"),
          api.get<Locatario[]>("/locatarios"),
        ]);
      setContratosApi(respostaContratos.data);
      setImoveis(respostaImoveis.data);
      setLocatarios(respostaLocatarios.data);
    } catch (error) {
      setErro(mensagemDeErro(error));
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  /**
   * Conclui o assistente: primeiro tenta registrar na API (locatário, imóvel e
   * contrato). Se a API não responder, guarda localmente (comportamento do
   * protótipo das telas novas).
   */
  async function concluir(c: ContratoCriado) {
    setSalvando(true);
    setErro("");
    const [ano, mes] = c.vence.split("/");
    try {
      const locatarioExistente = locatarios.find(
        (l) => normalizar(l.nome) === normalizar(c.locatario),
      );

      // 1) locatário (se ainda não existir)
      let locatarioId = locatarioExistente?.id;
      if (!locatarioId) {
        const resposta = await api.post<Locatario>("/locatarios", {
          nome: c.locatario,
          cpfCnpj: "A informar",
          observacao: "Cadastrado pelo assistente de contrato PDF.",
        });
        locatarioId = resposta.data.id;
      }

      // 2) imóvel (reaproveita um cadastrado ou cria um novo)
      const alvo = normalizar(c.imovel);
      const imovelExistente = imoveis.find(
        (i) =>
          normalizar(`${i.endereco}${i.numero ?? ""}`).includes(alvo) ||
          alvo.includes(normalizar(`${i.endereco}${i.numero ?? ""}`)) ||
          normalizar(i.endereco) === alvo,
      );

      let imovelId = imovelExistente?.id;
      if (!imovelId) {
        const { bairro, cidade } = derivarBairroCidade(c.imovel);
        const resposta = await api.post<Imovel>("/imoveis", {
          codigo: `IM${String(Date.now()).slice(-6)}`.slice(0, 20),
          endereco: c.imovel,
          bairro,
          cidade,
          tipo: "Residencial",
          valorAluguel: 0,
          iptuMensal: 0,
          status: "OCUPADO",
          locatarioId,
        });
        imovelId = resposta.data.id;
      }

      // 3) contrato
      const dataFim = mes && ano ? `${ano}-${mes}-01` : new Date().toISOString().slice(0, 10);
      const respostaContrato = await api.post<Contrato>("/contratos", {
        imovelId,
        locatarioId,
        dataInicio: new Date().toISOString().slice(0, 10),
        dataFim,
        valorMensal: 1,
        diaVencimento: 10,
        observacao: "Contrato gerado pelo assistente de contrato PDF.",
      });

      const id = String(respostaContrato.data.id);
      // guarda o HTML assinado para a tela de detalhe exibir
      adicionarContrato({ ...c, id });
      setCriando(false);
      navigate(`/contratos/${id}`);
    } catch {
      adicionarContrato(c);
      setCriando(false);
      navigate(`/contratos/${c.id}`);
    } finally {
      setSalvando(false);
    }
  }

  const cardsApi = contratosApi.map((contrato) => ({
    id: String(contrato.id),
    locatario: contrato.locatario.nome,
    vence: formatMesReferencia(contrato.dataFim),
  }));

  const idsApi = new Set(cardsApi.map((c) => c.id));
  const cardsLocais = criados
    .filter((c) => !idsApi.has(c.id))
    .map((c) => ({ id: c.id, locatario: c.locatario, vence: c.vence }));

  const todos = [...cardsLocais, ...cardsApi];

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
            Contratos
          </h1>
          <p style={{ color: "#999", fontSize: 12 }}>
            Documentos digitalizados, sem arquivamento físico
          </p>
        </div>
        <Button variant="primary" onClick={() => setCriando(true)} disabled={salvando}>
          + Novo contrato PDF
        </Button>
      </div>

      {erro && (
        <div
          style={{
            background: "#fdecec",
            color: "#d63031",
            borderRadius: 10,
            padding: 14,
            fontSize: 13,
            marginBottom: 16,
          }}
        >
          {erro}
        </div>
      )}

      {carregando ? (
        <p style={{ color: "#999", fontSize: 13 }}>Carregando contratos...</p>
      ) : todos.length === 0 ? (
        <p style={{ color: "#999", fontSize: 13 }}>
          Nenhum contrato cadastrado. Use “+ Novo contrato PDF” para criar o
          primeiro.
        </p>
      ) : (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 16 }}>
          {todos.map((c) => (
            <Link key={c.id} to={`/contratos/${c.id}`} style={cardStyle}>
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: "50%",
                  margin: "0 auto 10px",
                  background: "linear-gradient(90deg, #6c5ce7 50%, #cfcaf5 50%)",
                }}
              />
              <p
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  color: "#1a1a2e",
                  marginBottom: 4,
                }}
              >
                {c.locatario}
              </p>
              <p style={{ fontSize: 11, color: "#999" }}>vence {c.vence}</p>
            </Link>
          ))}
        </div>
      )}

      {criando && (
        <NovoContrato onClose={() => setCriando(false)} onConcluir={concluir} />
      )}
    </main>
  );
}
