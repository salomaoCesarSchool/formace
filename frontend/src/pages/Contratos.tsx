import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Button from "../components/Button";
import Input from "../components/Input";
import { api, mensagemDeErro } from "../api/axios";
import { diasAte, formatMesReferencia } from "../utils/format";
import PageHeader from "../components/PageHeader";
import { CORES } from "../theme";
import { useContratosCriados } from "../store/contratosStore";
import type { Contrato } from "../types";

const normalizar = (texto: string) =>
  texto
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "");

/**
 * Contratos em grade (visual das telas novas): contratos da API e os
 * gerados localmente pelo assistente (legado do protótipo).
 */
export default function Contratos() {
  const navigate = useNavigate();
  const criados = useContratosCriados();
  const [contratosApi, setContratosApi] = useState<Contrato[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");
  const [busca, setBusca] = useState("");

  const carregar = useCallback(async () => {
    setCarregando(true);
    setErro("");
    try {
      const respostaContratos = await api.get<Contrato[]>("/contratos");
      setContratosApi(respostaContratos.data);
    } catch (error) {
      setErro(mensagemDeErro(error));
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  const idsApi = new Set(contratosApi.map((contrato) => String(contrato.id)));

  /** Linhas da tabela: contratos da API + os gerados pelo assistente (local). */
  const linhas = [
    ...criados
      .filter((c) => !idsApi.has(c.id))
      .map((c) => ({
        id: c.id,
        imovel: c.imovel,
        locatario: c.locatario,
        vence: c.vence,
        venceEmBreve: false,
      })),
    ...contratosApi.map((contrato) => {
      const dias = diasAte(contrato.dataFim);
      return {
        id: String(contrato.id),
        imovel: `${contrato.imovel.endereco}, ${contrato.imovel.numero ?? "s/n"}`,
        locatario: contrato.locatario.nome,
        vence: formatMesReferencia(contrato.dataFim),
        venceEmBreve: dias >= 0 && dias <= 30,
      };
    }),
  ];

  const termo = normalizar(busca);
  const linhasFiltradas = termo
    ? linhas.filter((l) =>
        normalizar(`${l.imovel} ${l.locatario} ${l.vence}`).includes(termo),
      )
    : linhas;

  const plural = (n: number, singular: string, plural_: string) =>
    `${n} ${n === 1 ? singular : plural_}`;

  return (
    <main style={{ padding: "28px 36px" }}>
      <PageHeader
        titulo="Contratos"
        subtitulo="Documentos digitalizados, sem arquivamento físico"
        acoes={
          <Button variant="primary" onClick={() => navigate("/contratos/novo")}>
            + Novo contrato PDF
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

      <div style={{ border: `1px solid ${CORES.borda}`, borderRadius: 10, padding: 20 }}>
        <div style={{ marginBottom: 16 }}>
          <Input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar contrato"
            style={{ width: 260 }}
          />
        </div>

        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr
              style={{
                background: "#eef4fc",
                color: "#334155",
                fontSize: 12,
                textAlign: "left",
              }}
            >
              <th style={{ fontWeight: 600, padding: "10px 12px" }}>Imóvel</th>
              <th style={{ fontWeight: 600, padding: "10px 12px" }}>Vencimento</th>
              <th style={{ fontWeight: 600, padding: "10px 12px" }}>Ações</th>
            </tr>
          </thead>
          <tbody>
            {carregando && (
              <tr>
                <td
                  colSpan={3}
                  style={{
                    padding: "20px 12px",
                    textAlign: "center",
                    color: "#94a3b8",
                    fontSize: 13,
                  }}
                >
                  Carregando contratos...
                </td>
              </tr>
            )}
            {!carregando &&
              linhasFiltradas.map((c) => (
                <tr
                  key={c.id}
                  style={{
                    fontSize: 13,
                    color: "#334155",
                    borderTop: "1px solid #f1f5f9",
                  }}
                >
                  <td style={{ padding: "12px" }}>
                    {c.imovel}
                    <span style={{ display: "block", fontSize: 11, color: "#94a3b8" }}>
                      {c.locatario}
                    </span>
                  </td>
                  <td
                    style={{
                      padding: "12px",
                      color: c.venceEmBreve ? CORES.primaria : undefined,
                      fontWeight: c.venceEmBreve ? 700 : 400,
                      whiteSpace: "nowrap",
                    }}
                  >
                    {c.vence}
                  </td>
                  <td style={{ padding: "12px" }}>
                    <Link to={`/contratos/${c.id}`} style={{ textDecoration: "none" }}>
                      <Button variant="secondary">Ver contrato</Button>
                    </Link>
                  </td>
                </tr>
              ))}
            {!carregando && linhasFiltradas.length === 0 && (
              <tr>
                <td
                  colSpan={3}
                  style={{
                    padding: "24px 12px",
                    textAlign: "center",
                    color: "#94a3b8",
                    fontSize: 13,
                  }}
                >
                  {linhas.length === 0
                    ? "Nenhum contrato cadastrado. Use “+ Novo contrato PDF” para criar o primeiro."
                    : "Nenhum contrato encontrado para esta busca."}
                </td>
              </tr>
            )}
          </tbody>
        </table>

        {!carregando && linhas.length > 0 && (
          <p style={{ margin: "14px 12px 0", fontSize: 12, color: CORES.textoSuave }}>
            {plural(linhasFiltradas.length, "documento exibido", "documentos exibidos")} ·{" "}
            {plural(linhas.length, "no total", "no total")} · Consulte o imóvel e o
            vencimento antes de abrir.
          </p>
        )}
      </div>
    </main>
  );
}
