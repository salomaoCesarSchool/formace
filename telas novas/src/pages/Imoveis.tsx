import { useState } from "react";
import type { FormEvent } from "react";
import { Link } from "react-router-dom";
import { imoveisMock } from "../mocks/imoveisMock";
import Button from "../components/Button";
import Input from "../components/Input";
import Select from "../components/Select";
import CadastrarLocatario from "../components/locatario";
import type { LocacaoConcluida } from "../components/locatario";

type ImovelItem = (typeof imoveisMock.imoveis)[number];

const statusCores: Record<string, string> = {
  Ocupado: "#e4e0fb",
  "Vence em breve": "#c9c4f7",
  Vago: "#e4e0fb",
};

const statusOpcoes = ["Ocupado", "Vence em breve", "Vago"];

function Imoveis() {
  const [imoveis, setImoveis] = useState<ImovelItem[]>(imoveisMock.imoveis);
  const [busca, setBusca] = useState("");
  const [statusFiltro, setStatusFiltro] = useState("");

  const [modalAberto, setModalAberto] = useState(false);
  const [novoEndereco, setNovoEndereco] = useState("");
  const [erro, setErro] = useState("");

  const [imovelAlvo, setImovelAlvo] = useState<ImovelItem | null>(null);

  const imoveisFiltrados = imoveis.filter((item) => {
    const buscaOk =
      item.imovel.toLowerCase().includes(busca.toLowerCase()) ||
      item.locatario.toLowerCase().includes(busca.toLowerCase());
    const statusOk = statusFiltro === "" || item.status === statusFiltro;
    return buscaOk && statusOk;
  });

  const abrirModal = () => {
    setNovoEndereco("");
    setErro("");
    setModalAberto(true);
  };

  const fecharModal = () => {
    setModalAberto(false);
    setErro("");
  };

  const cadastrarImovel = (e: FormEvent) => {
    e.preventDefault();
    const endereco = novoEndereco.trim();

    if (!endereco) {
      setErro("Informe o endereço do imóvel.");
      return;
    }
    if (
      imoveis.some((i) => i.imovel.toLowerCase() === endereco.toLowerCase())
    ) {
      setErro("Esse imóvel já está cadastrado.");
      return;
    }

    // Semana 4: trocar por um POST com Axios e só adicionar na lista depois da resposta.
    const novo = {
      imovel: endereco,
      locatario: "—",
      contrato: "—",
      status: "Vago",
    } as ImovelItem;

    setImoveis([novo, ...imoveis]);
    setBusca("");
    setStatusFiltro("");
    fecharModal();
  };

  const concluirLocacao = (dados: LocacaoConcluida) => {
    if (!imovelAlvo) return;

    // Semana 4: trocar por um POST com Axios (proposta, locatário, fiador, contrato) e atualizar a lista com a resposta.
    setImoveis((lista) =>
      lista.map((i) =>
        i === imovelAlvo
          ? ({
              ...i,
              locatario: dados.locatario,
              contrato: `Desde ${dados.dataEntrega}`,
              status: "Ocupado",
            } as ImovelItem)
          : i,
      ),
    );
    setImovelAlvo(null);
  };

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
            {imoveis.length} imóveis cadastrados
          </p>
        </div>
        <Button variant="primary" onClick={abrirModal}>
          + Novo imóvel
        </Button>
      </div>

      <div
        style={{ border: "1px solid #e5e5ef", borderRadius: 10, padding: 20 }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            marginBottom: 16,
          }}
        >
          <Input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Nome ou endereço"
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
              <th style={{ fontWeight: 400, paddingBottom: 10 }}>Status</th>
              <th style={{ fontWeight: 400, paddingBottom: 10 }}></th>
            </tr>
          </thead>
          <tbody>
            {imoveisFiltrados.map((item, i) => (
              <tr
                key={i}
                style={{
                  fontSize: 13,
                  color: "#999",
                  borderTop: "1px solid #f0f0f5",
                }}
              >
                <td style={{ padding: "10px 0" }}>{item.imovel}</td>
                <td style={{ padding: "10px 0" }}>{item.locatario}</td>
                <td style={{ padding: "10px 0" }}>{item.contrato}</td>
                <td style={{ padding: "10px 0" }}>
                  <span
                    style={{
                      background: statusCores[item.status],
                      color: "rgba(14, 26, 194, 0.5)",
                      fontWeight: 600,
                      borderRadius: 20,
                      padding: "4px 12px",
                      fontSize: 11,
                    }}
                  >
                    {item.status}
                  </span>
                </td>
                <td style={{ padding: "10px 0" }}>
                  {item.status === "Vago" ? (
                    <Button
                      variant="secondary"
                      onClick={() => setImovelAlvo(item)}
                    >
                      Cadastrar locatário
                    </Button>
                  ) : item.contratoId ? (
                    <Link
                      to={`/contratos/${item.contratoId}`}
                      style={{ textDecoration: "none" }}
                    >
                      <Button variant="secondary">Ver contrato</Button>
                    </Link>
                  ) : (
                    <Button variant="secondary" disabled>
                      Contrato em andamento
                    </Button>
                  )}
                </td>
              </tr>
            ))}
            {imoveisFiltrados.length === 0 && (
              <tr>
                <td
                  colSpan={5}
                  style={{
                    padding: "20px 0",
                    textAlign: "center",
                    color: "#bbb",
                    fontSize: 13,
                  }}
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
              width: 400,
              maxWidth: "90%",
            }}
          >
            <h2 style={{ fontSize: 16, margin: 0, color: "#1a1a2e" }}>
              Novo imóvel
            </h2>
            <p style={{ color: "#999", fontSize: 12, margin: "2px 0 18px" }}>
              Cadastre o endereço. O locatário e o contrato você adiciona
              depois.
            </p>

            <label
              style={{
                display: "block",
                fontSize: 12,
                color: "#555",
                marginBottom: 6,
              }}
            >
              Endereço do imóvel
            </label>
            <Input
              autoFocus
              value={novoEndereco}
              onChange={(e) => {
                setNovoEndereco(e.target.value);
                setErro("");
              }}
              placeholder="Ex.: Rua das Palmeiras, 45"
              style={{ width: "100%", boxSizing: "border-box" }}
            />
            {erro && (
              <div style={{ color: "#d63031", fontSize: 12, marginTop: 6 }}>
                {erro}
              </div>
            )}

            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                gap: 10,
                marginTop: 20,
              }}
            >
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
          imovel={imovelAlvo.imovel}
          onClose={() => setImovelAlvo(null)}
          onConcluir={concluirLocacao}
        />
      )}
    </main>
  );
}

export default Imoveis;
