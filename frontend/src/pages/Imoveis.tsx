import { useCallback, useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { Link } from "react-router-dom";
import Button from "../components/Button";
import Input from "../components/Input";
import Select from "../components/Select";
import CadastrarLocatario from "../components/locatario";
import type { LocacaoConcluida } from "../components/locatario";
import { api, mensagemDeErro } from "../api/axios";
import { diasAte, formatBRL, rotuloVencimento } from "../utils/format";
import type { Contrato, Imovel, StatusImovel } from "../types";

type StatusLinha = "Ocupado" | "Vence em breve" | "Vago";

const statusCores: Record<StatusLinha, string> = {
  Ocupado: "#e4e0fb",
  "Vence em breve": "#c9c4f7",
  Vago: "#e4e0fb",
};

const statusOpcoes: StatusLinha[] = ["Ocupado", "Vence em breve", "Vago"];

interface ImovelNovo {
  endereco: string;
  bairro: string;
  cidade: string;
  tipo: string;
  valorAluguel: string;
  iptuMensal: string;
}

const FORM_VAZIO: ImovelNovo = {
  endereco: "",
  bairro: "",
  cidade: "",
  tipo: "Residencial",
  valorAluguel: "",
  iptuMensal: "",
};

/**
 * Tela de imoveis e clientes (visual das telas novas): busca, filtro de status,
 * cadastro de imovel (POST /api/imoveis) e assistente de locatario.
 */
export default function Imoveis() {
  const [imoveis, setImoveis] = useState<Imovel[]>([]);
  const [contratos, setContratos] = useState<Contrato[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");
  const [aviso, setAviso] = useState("");

  const [busca, setBusca] = useState("");
  const [statusFiltro, setStatusFiltro] = useState("");

  const [modalAberto, setModalAberto] = useState(false);
  const [form, setForm] = useState<ImovelNovo>(FORM_VAZIO);
  const [erroForm, setErroForm] = useState("");

  const [imovelAlvo, setImovelAlvo] = useState<Imovel | null>(null);

  const carregar = useCallback(async () => {
    setCarregando(true);
    setErro("");
    try {
      const [respostaImoveis, respostaContratos] = await Promise.all([
        api.get<Imovel[]>("/imoveis"),
        api.get<Contrato[]>("/contratos"),
      ]);
      setImoveis(respostaImoveis.data);
      setContratos(respostaContratos.data);
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
      return "Ocupado";
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

  const abrirModal = () => {
    setForm(FORM_VAZIO);
    setErroForm("");
    setModalAberto(true);
  };

  const fecharModal = () => {
    setModalAberto(false);
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
    if (imoveis.some((i) => i.endereco.toLowerCase() === endereco.toLowerCase())) {
      setErroForm("Esse imóvel já está cadastrado.");
      return;
    }

    const codigo = `IM${String(Date.now()).slice(-6)}`.slice(0, 20);
    try {
      await api.post("/imoveis", {
        codigo,
        endereco,
        bairro: form.bairro.trim(),
        cidade: form.cidade.trim(),
        tipo: form.tipo.trim() || "Residencial",
        valorAluguel: Number(form.valorAluguel.replace(",", ".")) || 0,
        iptuMensal: Number(form.iptuMensal.replace(",", ".")) || 0,
        status: "VAGO" as StatusImovel,
      });
      setAviso("Imóvel cadastrado com sucesso.");
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
            Imóveis e clientes
          </h1>
          <p style={{ color: "#999", fontSize: 12 }}>
            {carregando
              ? "Carregando imóveis..."
              : `${imoveis.length} imóveis cadastrados`}
          </p>
        </div>
        <Button variant="primary" onClick={abrirModal}>
          + Novo imóvel
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
      {aviso && (
        <div
          style={{
            background: "#f1f0ff",
            color: "rgba(14, 26, 194, 0.7)",
            borderRadius: 10,
            padding: 14,
            fontSize: 13,
            marginBottom: 16,
          }}
        >
          {aviso}
        </div>
      )}

      <div style={{ border: "1px solid #e5e5ef", borderRadius: 10, padding: 20 }}>
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
            placeholder="Nome, endereço ou código"
            style={{ width: 260 }}
          />
          <Select
            value={statusFiltro}
            onChange={(e) => setStatusFiltro(e.target.value)}
          >
            <option value="">Filtrar por status</option>
            {statusOpcoes.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </Select>
        </div>

        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ color: "#999", fontSize: 12, textAlign: "left" }}>
              <th style={{ fontWeight: 400, paddingBottom: 10 }}>Imóvel</th>
              <th style={{ fontWeight: 400, paddingBottom: 10 }}>Locatário</th>
              <th style={{ fontWeight: 400, paddingBottom: 10 }}>Contrato</th>
              <th style={{ fontWeight: 400, paddingBottom: 10 }}>Aluguel</th>
              <th style={{ fontWeight: 400, paddingBottom: 10 }}>Status</th>
              <th style={{ fontWeight: 400, paddingBottom: 10 }}></th>
            </tr>
          </thead>
          <tbody>
            {carregando && (
              <tr>
                <td
                  colSpan={6}
                  style={{ padding: "20px 0", textAlign: "center", color: "#bbb", fontSize: 13 }}
                >
                  Carregando imóveis...
                </td>
              </tr>
            )}
            {!carregando && imoveisFiltrados.map((item) => {
              const contrato = contratoPorImovel.get(item.id);
              const status = statusDaLinha(item);
              return (
                <tr
                  key={item.id}
                  style={{ fontSize: 13, color: "#999", borderTop: "1px solid #f0f0f5" }}
                >
                  <td style={{ padding: "10px 0" }}>
                    {item.endereco}, {item.numero ?? "s/n"}
                    <span style={{ display: "block", fontSize: 11, color: "#bbb" }}>
                      {item.codigo} · {item.bairro} - {item.cidade}
                    </span>
                  </td>
                  <td style={{ padding: "10px 0" }}>{item.locatario?.nome ?? "—"}</td>
                  <td style={{ padding: "10px 0" }}>
                    {contrato ? rotuloVencimento(contrato.dataFim) : "—"}
                  </td>
                  <td style={{ padding: "10px 0" }}>{formatBRL(item.valorAluguel)}</td>
                  <td style={{ padding: "10px 0" }}>
                    <span
                      style={{
                        background: statusCores[status],
                        color: "rgba(14, 26, 194, 0.5)",
                        fontWeight: 600,
                        borderRadius: 20,
                        padding: "4px 12px",
                        fontSize: 11,
                      }}
                    >
                      {status}
                    </span>
                  </td>
                  <td style={{ padding: "10px 0" }}>
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
                  </td>
                </tr>
              );
            })}
            {!carregando && imoveisFiltrados.length === 0 && (
              <tr>
                <td
                  colSpan={6}
                  style={{ padding: "20px 0", textAlign: "center", color: "#bbb", fontSize: 13 }}
                >
                  Nenhum imóvel encontrado
                </td>
              </tr>
            )}
          </tbody>
        </table>
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
              width: 460,
              maxWidth: "90%",
              maxHeight: "90vh",
              overflowY: "auto",
            }}
          >
            <h2 style={{ fontSize: 16, margin: 0, color: "#1a1a2e" }}>Novo imóvel</h2>
            <p style={{ color: "#999", fontSize: 12, margin: "2px 0 18px" }}>
              Cadastre o endereço e os dados básicos. O locatário e o contrato você
              adiciona depois.
            </p>

            <label style={{ display: "block", fontSize: 12, color: "#555", marginBottom: 6 }}>
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
                <label style={{ display: "block", fontSize: 12, color: "#555", marginBottom: 6 }}>
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
                <label style={{ display: "block", fontSize: 12, color: "#555", marginBottom: 6 }}>
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
                <label style={{ display: "block", fontSize: 12, color: "#555", marginBottom: 6 }}>
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
                <label style={{ display: "block", fontSize: 12, color: "#555", marginBottom: 6 }}>
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
                <label style={{ display: "block", fontSize: 12, color: "#555", marginBottom: 6 }}>
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
            </div>

            {erroForm && (
              <div style={{ color: "#d63031", fontSize: 12, marginTop: 8 }}>{erroForm}</div>
            )}

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 20 }}>
              <Button type="button" variant="secondary" onClick={fecharModal}>
                Cancelar
              </Button>
              <Button type="submit">Cadastrar imóvel</Button>
            </div>
          </form>
        </div>
      )}

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
