import { useCallback, useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { Link } from "react-router-dom";
import Button from "../components/Button";
import Input from "../components/Input";
import Select from "../components/Select";
import CadastrarLocatario from "../components/locatario";
import type { LocacaoConcluida } from "../components/locatario";
import LocatarioForm from "../components/LocatarioForm";
import DocumentosConfig from "../components/DocumentosConfig";
import { api, mensagemDeErro } from "../api/axios";
import { diasAte, rotuloVencimento } from "../utils/format";
import PageHeader from "../components/PageHeader";
import { CORES } from "../theme";
import type { Contrato, Imovel, Locatario, StatusImovel } from "../types";

type StatusLinha = "Alugado" | "Vence em breve" | "Vago";
type Aba = "imoveis" | "locatarios";

/** Chips conforme o Figma: alugado/vence em breve em azul, vago em cinza. */
const statusCores: Record<StatusLinha, { bg: string; texto: string }> = {
  Alugado: { bg: "#dbeafe", texto: "#1e40af" },
  "Vence em breve": { bg: "#dbeafe", texto: "#1e40af" },
  Vago: { bg: "#f1f5f9", texto: "#64748b" },
};

const statusOpcoes: StatusLinha[] = ["Alugado", "Vence em breve", "Vago"];

interface ImovelNovo {
  endereco: string;
  bairro: string;
  cidade: string;
  tipo: string;
  metragem: string;
  quartos: string;
  banheiros: string;
  valorAluguel: string;
  iptuMensal: string;
  condominio: string;
}

const FORM_VAZIO: ImovelNovo = {
  endereco: "",
  bairro: "",
  cidade: "",
  tipo: "Residencial",
  metragem: "",
  quartos: "",
  banheiros: "",
  valorAluguel: "",
  iptuMensal: "",
  condominio: "",
};

const numero = (valor: string) =>
  Number(valor.replace(",", ".")) || 0;

/**
 * Tela de imoveis e locatarios (Figma): abas separadas para os cadastros de
 * imoveis e de clientes, com criacao e edicao em ambos, atalho para gerar
 * contrato e configuracao dos documentos obrigatorios.
 */
export default function Imoveis() {
  const [aba, setAba] = useState<Aba>("imoveis");
  const [imoveis, setImoveis] = useState<Imovel[]>([]);
  const [locatarios, setLocatarios] = useState<Locatario[]>([]);
  const [contratos, setContratos] = useState<Contrato[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");
  const [aviso, setAviso] = useState("");

  const [busca, setBusca] = useState("");
  const [buscaLocatario, setBuscaLocatario] = useState("");
  const [statusFiltro, setStatusFiltro] = useState("");

  const [modalAberto, setModalAberto] = useState(false);
  const [imovelEditando, setImovelEditando] = useState<Imovel | null>(null);
  const [form, setForm] = useState<ImovelNovo>(FORM_VAZIO);
  const [erroForm, setErroForm] = useState("");

  const [imovelAlvo, setImovelAlvo] = useState<Imovel | null>(null);

  const [formLocatarioAberto, setFormLocatarioAberto] = useState(false);
  const [locatarioEditando, setLocatarioEditando] = useState<Locatario | null>(
    null,
  );
  const [docsAberto, setDocsAberto] = useState(false);

  const carregar = useCallback(async () => {
    setCarregando(true);
    setErro("");
    try {
      const [respostaImoveis, respostaContratos, respostaLocatarios] =
        await Promise.all([
          api.get<Imovel[]>("/imoveis"),
          api.get<Contrato[]>("/contratos"),
          api.get<Locatario[]>("/locatarios"),
        ]);
      setImoveis(respostaImoveis.data);
      setContratos(respostaContratos.data);
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

  const contratoPorImovel = useMemo(() => {
    const mapa = new Map<number, Contrato>();
    contratos.forEach((contrato) => mapa.set(contrato.imovel.id, contrato));
    return mapa;
  }, [contratos]);

  const statusDaLinha = (imovel: Imovel): StatusLinha => {
    if (imovel.status === "OCUPADO") {
      const contrato = contratoPorImovel.get(imovel.id);
      if (contrato && diasAte(contrato.dataFim) <= 90 && diasAte(contrato.dataFim) >= 0) {
        return "Vence em breve";
      }
      return "Alugado";
    }
    return "Vago";
  };

  const imoveisFiltrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    return imoveis.filter((imovel) => {
      const status = statusDaLinha(imovel);
      if (statusFiltro && status !== statusFiltro) return false;
      if (!termo) return true;
      const alvo = [
        imovel.codigo,
        imovel.endereco,
        imovel.bairro,
        imovel.cidade,
        imovel.tipo,
        imovel.locatario?.nome ?? "",
      ]
        .join(" ")
        .toLowerCase();
      return alvo.includes(termo);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [imoveis, contratoPorImovel, busca, statusFiltro]);

  const locatariosFiltrados = useMemo(() => {
    const termo = buscaLocatario.trim().toLowerCase();
    if (!termo) return locatarios;
    return locatarios.filter((l) =>
      [l.nome, l.cpfCnpj, l.email ?? "", l.telefone ?? "", l.cidade ?? ""]
        .join(" ")
        .toLowerCase()
        .includes(termo),
    );
  }, [locatarios, buscaLocatario]);

  const abrirModal = (imovel?: Imovel) => {
    if (imovel) {
      setImovelEditando(imovel);
      setForm({
        endereco: imovel.endereco,
        bairro: imovel.bairro,
        cidade: imovel.cidade,
        tipo: imovel.tipo,
        metragem: imovel.metragem != null ? String(imovel.metragem) : "",
        quartos: imovel.quartos != null ? String(imovel.quartos) : "",
        banheiros: imovel.banheiros != null ? String(imovel.banheiros) : "",
        valorAluguel: String(imovel.valorAluguel ?? ""),
        iptuMensal: String(imovel.iptuMensal ?? ""),
        condominio:
          imovel.condominio != null ? String(imovel.condominio) : "",
      });
    } else {
      setImovelEditando(null);
      setForm(FORM_VAZIO);
    }
    setErroForm("");
    setModalAberto(true);
  };

  const fecharModal = () => {
    setModalAberto(false);
    setImovelEditando(null);
    setErroForm("");
  };

  async function cadastrarImovel(evento: FormEvent) {
    evento.preventDefault();
    const endereco = form.endereco.trim();
    if (!endereco) {
      setErroForm("Informe o endereço do imóvel.");
      return;
    }
    if (!form.bairro.trim()) {
      setErroForm("Informe o bairro.");
      return;
    }
    if (!form.cidade.trim()) {
      setErroForm("Informe a cidade.");
      return;
    }
    const duplicado = imoveis.some(
      (i) =>
        i.id !== imovelEditando?.id &&
        i.endereco.toLowerCase() === endereco.toLowerCase(),
    );
    if (duplicado) {
      setErroForm("Esse imóvel já está cadastrado.");
      return;
    }

    try {
      if (imovelEditando) {
        await api.put(`/imoveis/${imovelEditando.id}`, {
          codigo: imovelEditando.codigo,
          endereco,
          numero: imovelEditando.numero,
          bairro: form.bairro.trim(),
          cidade: form.cidade.trim(),
          cep: imovelEditando.cep,
          tipo: form.tipo.trim() || "Residencial",
          quartos: form.quartos ? Number(form.quartos) : null,
          banheiros: form.banheiros ? Number(form.banheiros) : null,
          metragem: form.metragem ? Number(form.metragem.replace(",", ".")) : null,
          valorAluguel: numero(form.valorAluguel),
          iptuMensal: numero(form.iptuMensal),
          condominio: form.condominio ? numero(form.condominio) : null,
          status: imovelEditando.status,
          locatarioId: imovelEditando.locatario?.id ?? null,
          observacao: imovelEditando.observacao,
        });
        setAviso("Imóvel atualizado com sucesso.");
      } else {
        const codigo = `IM${String(Date.now()).slice(-6)}`.slice(0, 20);
        await api.post("/imoveis", {
          codigo,
          endereco,
          bairro: form.bairro.trim(),
          cidade: form.cidade.trim(),
          tipo: form.tipo.trim() || "Residencial",
          quartos: form.quartos ? Number(form.quartos) : null,
          banheiros: form.banheiros ? Number(form.banheiros) : null,
          metragem: form.metragem ? numero(form.metragem) : null,
          valorAluguel: numero(form.valorAluguel),
          iptuMensal: numero(form.iptuMensal),
          condominio: form.condominio ? numero(form.condominio) : null,
          status: "VAGO" as StatusImovel,
        });
        setAviso("Imóvel cadastrado com sucesso.");
      }
      fecharModal();
      setBusca("");
      setStatusFiltro("");
      await carregar();
    } catch (error) {
      setErroForm(mensagemDeErro(error));
    }
  }

  async function concluirLocacao(dados: LocacaoConcluida) {
    if (!imovelAlvo) return;
    try {
      const resposta = await api.post("/locatarios", {
        nome: dados.locatario,
        cpfCnpj: dados.cpfLocatario || dados.locatario,
        telefone: dados.telefoneLocatario,
        email: "",
        endereco: "",
        cidade: "",
        observacao: `Fiador: ${dados.fiador}. Chaves entregues: ${dados.chaves}. Entrega em ${dados.dataEntrega}. Primeiro vencimento: ${dados.primeiroVencimento}.`,
      });
      const locatario = resposta.data as { id: number };

      await api.put(`/imoveis/${imovelAlvo.id}`, {
        codigo: imovelAlvo.codigo,
        endereco: imovelAlvo.endereco,
        numero: imovelAlvo.numero,
        bairro: imovelAlvo.bairro,
        cidade: imovelAlvo.cidade,
        cep: imovelAlvo.cep,
        tipo: imovelAlvo.tipo,
        quartos: imovelAlvo.quartos,
        banheiros: imovelAlvo.banheiros,
        metragem: imovelAlvo.metragem,
        valorAluguel: dados.valorAluguel,
        iptuMensal: imovelAlvo.iptuMensal,
        condominio: imovelAlvo.condominio,
        status: "OCUPADO" as StatusImovel,
        locatarioId: locatario.id,
        observacao: imovelAlvo.observacao,
      });

      setAviso(
        `Locatário ${dados.locatario} cadastrado e imóvel ocupado. Formalize o contrato em Contratos.`,
      );
      setImovelAlvo(null);
      await carregar();
    } catch (error) {
      setErro(mensagemDeErro(error));
      setImovelAlvo(null);
    }
  }

  const abas: { chave: Aba; rotulo: string }[] = [
    { chave: "imoveis", rotulo: "Imóveis" },
    { chave: "locatarios", rotulo: "Locatários" },
  ];

  const cardSecao = (
    numeroCard: string,
    titulo: string,
    descricao: string,
    acao: React.ReactNode,
  ) => (
    <div
      style={{
        flex: "1 1 220px",
        border: `1px solid ${CORES.borda}`,
        borderRadius: 12,
        padding: 20,
        background: "#fff",
      }}
    >
      <p
        style={{
          margin: 0,
          fontSize: 12,
          fontWeight: 700,
          color: CORES.primaria,
          letterSpacing: "1px",
        }}
      >
        {numeroCard}
      </p>
      <h3 style={{ margin: "8px 0 4px", fontSize: 15, color: CORES.titulo }}>
        {titulo}
      </h3>
      <p style={{ margin: "0 0 14px", fontSize: 12, color: CORES.textoSuave }}>
        {descricao}
      </p>
      {acao}
    </div>
  );

  return (
    <main style={{ padding: "28px 36px" }}>
      <PageHeader
        titulo="Imóveis e locatários"
        subtitulo={
          carregando
            ? "Carregando cadastros..."
            : `${imoveis.length} imóveis · ${locatarios.length} clientes cadastrados`
        }
        acoes={
          <>
            <Button
              variant="secondary"
              onClick={() => {
                setLocatarioEditando(null);
                setFormLocatarioAberto(true);
              }}
            >
              + Novo locatário
            </Button>
            <Button variant="primary" onClick={() => abrirModal()}>
              + Novo imóvel
            </Button>
          </>
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
      {aviso && (
        <div
          style={{
            background: "#eff6ff",
            color: "#1d4ed8",
            borderRadius: 10,
            padding: 14,
            fontSize: 13,
            marginBottom: 16,
          }}
        >
          {aviso}
        </div>
      )}

      {/* Abas: cadastros separados de imoveis e locatarios */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          background: "#eef4fc",
          borderRadius: 10,
          padding: 6,
          marginBottom: 16,
          flexWrap: "wrap",
        }}
      >
        <div style={{ display: "flex", gap: 6 }}>
          {abas.map((item) => {
            const ativa = aba === item.chave;
            return (
              <button
                key={item.chave}
                type="button"
                onClick={() => setAba(item.chave)}
                style={{
                  border: "none",
                  borderRadius: 8,
                  padding: "9px 22px",
                  fontSize: 13,
                  fontWeight: ativa ? 700 : 600,
                  fontFamily: "'Nunito', sans-serif",
                  cursor: "pointer",
                  background: ativa ? "#fff" : "transparent",
                  color: ativa ? CORES.primaria : "#64748b",
                  boxShadow: ativa ? "0 1px 4px rgba(26,95,168,0.18)" : "none",
                }}
              >
                {item.rotulo}
              </button>
            );
          })}
        </div>
        <span
          style={{
            fontSize: 12,
            color: "#64748b",
            flex: 1,
            minWidth: 180,
            textAlign: "right",
          }}
        >
          Cadastros separados, informações conectadas
        </span>
        <Link to="/contratos" style={{ textDecoration: "none" }}>
          <Button variant="secondary">Gerar contrato</Button>
        </Link>
      </div>

      <div style={{ border: "1px solid #e2e8f0", borderRadius: 10, padding: 20 }}>
        {aba === "imoveis" && (
          <>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginBottom: 16,
                gap: 12,
                flexWrap: "wrap",
              }}
            >
              <Input
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder="Buscar imóvel"
                style={{ width: 260 }}
              />
              <Select
                value={statusFiltro}
                onChange={(e) => setStatusFiltro(e.target.value)}
              >
                <option value="">Todos os status</option>
                {statusOpcoes.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </Select>
            </div>

            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ color: "#64748b", fontSize: 12, textAlign: "left" }}>
                  <th style={{ fontWeight: 600, paddingBottom: 10 }}>Imóvel</th>
                  <th style={{ fontWeight: 600, paddingBottom: 10 }}>Locatário</th>
                  <th style={{ fontWeight: 600, paddingBottom: 10 }}>Contrato</th>
                  <th style={{ fontWeight: 600, paddingBottom: 10 }}>Status</th>
                  <th style={{ fontWeight: 600, paddingBottom: 10 }}>Ações</th>
                </tr>
              </thead>
              <tbody>
                {carregando && (
                  <tr>
                    <td
                      colSpan={5}
                      style={{ padding: "20px 0", textAlign: "center", color: "#94a3b8", fontSize: 13 }}
                    >
                      Carregando imóveis...
                    </td>
                  </tr>
                )}
                {!carregando && imoveisFiltrados.map((item) => {
                  const contrato = contratoPorImovel.get(item.id);
                  const status = statusDaLinha(item);
                  const cor = statusCores[status];
                  return (
                    <tr
                      key={item.id}
                      style={{ fontSize: 13, color: "#334155", borderTop: "1px solid #f1f5f9" }}
                    >
                      <td style={{ padding: "10px 0" }}>
                        {item.endereco}, {item.numero ?? "s/n"}
                        <span style={{ display: "block", fontSize: 11, color: "#94a3b8" }}>
                          {item.codigo} · {item.bairro} - {item.cidade}
                        </span>
                      </td>
                      <td style={{ padding: "10px 0" }}>{item.locatario?.nome ?? "—"}</td>
                      <td style={{ padding: "10px 0" }}>
                        {contrato ? rotuloVencimento(contrato.dataFim) : "—"}
                      </td>
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
                          {status}
                        </span>
                      </td>
                      <td style={{ padding: "10px 0" }}>
                        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                          <Button variant="secondary" onClick={() => abrirModal(item)}>
                            Editar
                          </Button>
                          {item.status === "VAGO" ? (
                            <Button variant="secondary" onClick={() => setImovelAlvo(item)}>
                              Cadastrar locatário
                            </Button>
                          ) : contrato ? (
                            <Link to={`/contratos/${contrato.id}`} style={{ textDecoration: "none" }}>
                              <Button variant="secondary">Ver contrato</Button>
                            </Link>
                          ) : (
                            <Button variant="secondary" disabled>
                              Contrato em andamento
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {!carregando && imoveisFiltrados.length === 0 && (
                  <tr>
                    <td
                      colSpan={5}
                      style={{ padding: "20px 0", textAlign: "center", color: "#94a3b8", fontSize: 13 }}
                    >
                      Nenhum imóvel encontrado
                    </td>
                  </tr>
                )}
              </tbody>
            </table>

            {!carregando && (
              <p
                style={{
                  margin: "14px 0 0",
                  fontSize: 12,
                  color: CORES.textoSuave,
                }}
              >
                {imoveisFiltrados.length} registro{imoveisFiltrados.length === 1 ? "" : "s"}{" "}
                exibido{imoveisFiltrados.length === 1 ? "" : "s"} · {imoveis.length} imóveis
                cadastrados
              </p>
            )}
          </>
        )}

        {aba === "locatarios" && (
          <>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginBottom: 16,
                gap: 12,
                flexWrap: "wrap",
              }}
            >
              <Input
                value={buscaLocatario}
                onChange={(e) => setBuscaLocatario(e.target.value)}
                placeholder="Buscar locatário"
                style={{ width: 260 }}
              />
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <Button variant="secondary" onClick={() => setDocsAberto(true)}>
                  Documentos obrigatórios
                </Button>
                <Button
                  variant="primary"
                  onClick={() => {
                    setLocatarioEditando(null);
                    setFormLocatarioAberto(true);
                  }}
                >
                  + Novo locatário
                </Button>
              </div>
            </div>

            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ color: "#64748b", fontSize: 12, textAlign: "left" }}>
                  <th style={{ fontWeight: 600, paddingBottom: 10 }}>Nome</th>
                  <th style={{ fontWeight: 600, paddingBottom: 10 }}>CPF</th>
                  <th style={{ fontWeight: 600, paddingBottom: 10 }}>Telefone</th>
                  <th style={{ fontWeight: 600, paddingBottom: 10 }}>E-mail</th>
                  <th style={{ fontWeight: 600, paddingBottom: 10 }}>Ações</th>
                </tr>
              </thead>
              <tbody>
                {carregando && (
                  <tr>
                    <td
                      colSpan={5}
                      style={{ padding: "20px 0", textAlign: "center", color: "#94a3b8", fontSize: 13 }}
                    >
                      Carregando locatários...
                    </td>
                  </tr>
                )}
                {!carregando &&
                  locatariosFiltrados.map((item) => (
                    <tr
                      key={item.id}
                      style={{ fontSize: 13, color: "#334155", borderTop: "1px solid #f1f5f9" }}
                    >
                      <td style={{ padding: "10px 0" }}>
                        {item.nome}
                        <span style={{ display: "block", fontSize: 11, color: "#94a3b8" }}>
                          {[item.profissao, item.cidade].filter(Boolean).join(" · ")}
                        </span>
                      </td>
                      <td style={{ padding: "10px 0", whiteSpace: "nowrap" }}>
                        {item.cpfCnpj}
                      </td>
                      <td style={{ padding: "10px 0", whiteSpace: "nowrap" }}>
                        {item.telefone || "—"}
                      </td>
                      <td style={{ padding: "10px 0" }}>{item.email || "—"}</td>
                      <td style={{ padding: "10px 0" }}>
                        <Button
                          variant="secondary"
                          onClick={() => {
                            setLocatarioEditando(item);
                            setFormLocatarioAberto(true);
                          }}
                        >
                          Editar
                        </Button>
                      </td>
                    </tr>
                  ))}
                {!carregando && locatariosFiltrados.length === 0 && (
                  <tr>
                    <td
                      colSpan={5}
                      style={{ padding: "20px 0", textAlign: "center", color: "#94a3b8", fontSize: 13 }}
                    >
                      Nenhum locatário encontrado
                    </td>
                  </tr>
                )}
              </tbody>
            </table>

            {!carregando && (
              <p
                style={{
                  margin: "14px 0 0",
                  fontSize: 12,
                  color: CORES.textoSuave,
                }}
              >
                {locatariosFiltrados.length} registro
                {locatariosFiltrados.length === 1 ? "" : "s"} exibido
                {locatariosFiltrados.length === 1 ? "" : "s"} · {locatarios.length}{" "}
                clientes cadastrados
              </p>
            )}
          </>
        )}
      </div>

      {/* Secao Cadastros e contratos (Figma) */}
      <h2
        style={{
          margin: "26px 0 14px",
          fontSize: 16,
          color: CORES.titulo,
          fontWeight: 700,
        }}
      >
        Cadastros e contratos
      </h2>
      <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
        {cardSecao(
          "01",
          "Locatários",
          "Pessoas que ocupam os imóveis: dados pessoais e documentos.",
          <Button
            variant="primary"
            onClick={() => {
              setLocatarioEditando(null);
              setFormLocatarioAberto(true);
            }}
          >
            Cadastrar locatário
          </Button>,
        )}
        {cardSecao(
          "02",
          "Imóveis",
          "Endereços, características, valores e situação de ocupação.",
          <Button variant="primary" onClick={() => abrirModal()}>
            Cadastrar imóvel
          </Button>,
        )}
        {cardSecao(
          "03",
          "Contratos",
          "Geração e assinatura dos contratos de locação em PDF.",
          <Link to="/contratos" style={{ textDecoration: "none" }}>
            <Button variant="primary">Gerar contrato</Button>
          </Link>,
        )}
      </div>

      {modalAberto && (
        <div
          onClick={fecharModal}
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
          <form
            onClick={(e) => e.stopPropagation()}
            onSubmit={cadastrarImovel}
            noValidate
            style={{
              background: "#fff",
              borderRadius: 12,
              padding: 24,
              width: 520,
              maxWidth: "90%",
              maxHeight: "90vh",
              overflowY: "auto",
            }}
          >
            <h2 style={{ fontSize: 16, margin: 0, color: "#16233b" }}>
              {imovelEditando ? "Editar imóvel" : "Novo imóvel"}
            </h2>
            <p style={{ color: "#94a3b8", fontSize: 12, margin: "2px 0 18px" }}>
              {imovelEditando
                ? "Atualize os dados do imóvel."
                : "Cadastre o endereço e os dados básicos. O locatário e o contrato você adiciona depois."}
            </p>

            <label style={{ display: "block", fontSize: 12, color: "#64748b", marginBottom: 6 }}>
              Endereço do imóvel
            </label>
            <Input
              autoFocus
              value={form.endereco}
              onChange={(e) => {
                setForm({ ...form, endereco: e.target.value });
                setErroForm("");
              }}
              placeholder="Ex.: Rua das Palmeiras, 45"
              style={{ width: "100%", boxSizing: "border-box", marginBottom: 12 }}
            />

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div>
                <label style={{ display: "block", fontSize: 12, color: "#64748b", marginBottom: 6 }}>
                  Bairro
                </label>
                <Input
                  value={form.bairro}
                  onChange={(e) => setForm({ ...form, bairro: e.target.value })}
                  placeholder="Ex.: Espinheiro"
                  style={{ width: "100%", boxSizing: "border-box" }}
                />
              </div>
              <div>
                <label style={{ display: "block", fontSize: 12, color: "#64748b", marginBottom: 6 }}>
                  Cidade
                </label>
                <Input
                  value={form.cidade}
                  onChange={(e) => setForm({ ...form, cidade: e.target.value })}
                  placeholder="Ex.: Aracaju"
                  style={{ width: "100%", boxSizing: "border-box" }}
                />
              </div>
              <div>
                <label style={{ display: "block", fontSize: 12, color: "#64748b", marginBottom: 6 }}>
                  Tipo
                </label>
                <Select
                  value={form.tipo}
                  onChange={(e) => setForm({ ...form, tipo: e.target.value })}
                  style={{ width: "100%", boxSizing: "border-box" }}
                >
                  {["Residencial", "Comercial", "Misto", "Terreno"].map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </Select>
              </div>
              <div>
                <label style={{ display: "block", fontSize: 12, color: "#64748b", marginBottom: 6 }}>
                  Área (m²)
                </label>
                <Input
                  inputMode="decimal"
                  value={form.metragem}
                  onChange={(e) => setForm({ ...form, metragem: e.target.value })}
                  placeholder="Ex.: 85"
                  style={{ width: "100%", boxSizing: "border-box" }}
                />
              </div>
              <div>
                <label style={{ display: "block", fontSize: 12, color: "#64748b", marginBottom: 6 }}>
                  Quartos
                </label>
                <Input
                  inputMode="numeric"
                  value={form.quartos}
                  onChange={(e) => setForm({ ...form, quartos: e.target.value })}
                  placeholder="Ex.: 3"
                  style={{ width: "100%", boxSizing: "border-box" }}
                />
              </div>
              <div>
                <label style={{ display: "block", fontSize: 12, color: "#64748b", marginBottom: 6 }}>
                  Banheiros
                </label>
                <Input
                  inputMode="numeric"
                  value={form.banheiros}
                  onChange={(e) => setForm({ ...form, banheiros: e.target.value })}
                  placeholder="Ex.: 2"
                  style={{ width: "100%", boxSizing: "border-box" }}
                />
              </div>
              <div>
                <label style={{ display: "block", fontSize: 12, color: "#64748b", marginBottom: 6 }}>
                  Valor do aluguel (R$)
                </label>
                <Input
                  inputMode="decimal"
                  value={form.valorAluguel}
                  onChange={(e) => setForm({ ...form, valorAluguel: e.target.value })}
                  placeholder="0,00"
                  style={{ width: "100%", boxSizing: "border-box" }}
                />
              </div>
              <div>
                <label style={{ display: "block", fontSize: 12, color: "#64748b", marginBottom: 6 }}>
                  IPTU mensal (R$)
                </label>
                <Input
                  inputMode="decimal"
                  value={form.iptuMensal}
                  onChange={(e) => setForm({ ...form, iptuMensal: e.target.value })}
                  placeholder="0,00"
                  style={{ width: "100%", boxSizing: "border-box" }}
                />
              </div>
              <div>
                <label style={{ display: "block", fontSize: 12, color: "#64748b", marginBottom: 6 }}>
                  Condomínio (R$)
                </label>
                <Input
                  inputMode="decimal"
                  value={form.condominio}
                  onChange={(e) => setForm({ ...form, condominio: e.target.value })}
                  placeholder="0,00"
                  style={{ width: "100%", boxSizing: "border-box" }}
                />
              </div>
            </div>

            {erroForm && (
              <div style={{ color: "#b91c1c", fontSize: 12, marginTop: 8 }}>{erroForm}</div>
            )}

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 20 }}>
              <Button type="button" variant="secondary" onClick={fecharModal}>
                Cancelar
              </Button>
              <Button type="submit">
                {imovelEditando ? "Salvar alterações" : "Cadastrar imóvel"}
              </Button>
            </div>
          </form>
        </div>
      )}

      {formLocatarioAberto && (
        <LocatarioForm
          locatario={locatarioEditando}
          onClose={() => {
            setFormLocatarioAberto(false);
            setLocatarioEditando(null);
          }}
          onSalvo={() => {
            setAviso(
              locatarioEditando
                ? "Cliente atualizado com sucesso."
                : "Cliente cadastrado com sucesso.",
            );
            void carregar();
          }}
        />
      )}

      {docsAberto && <DocumentosConfig onClose={() => setDocsAberto(false)} />}

      {imovelAlvo && (
        <CadastrarLocatario
          imovel={`${imovelAlvo.endereco}, ${imovelAlvo.numero ?? "s/n"} — ${imovelAlvo.codigo}`}
          onClose={() => setImovelAlvo(null)}
          onConcluir={concluirLocacao}
        />
      )}
    </main>
  );
}
