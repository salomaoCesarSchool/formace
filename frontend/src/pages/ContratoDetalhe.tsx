import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import Button from "../components/Button";
import ContratoPDF from "../components/ContratoPDF";
import { buscarContrato } from "../store/contratosStore";
import { api, mensagemDeErro, baixarArquivo } from "../api/axios";
import type { Contrato } from "../types";
import { formatBRL, formatData, rotuloVencimento } from "../utils/format";

/** Rótulos das modalidades de garantia (iguais aos do formulário). */
const GARANTIAS_ROTULO: Record<string, string> = {
  SEM_GARANTIA: "Sem garantia",
  FIADOR: "Fiador",
  CAUCAO: "Caução",
  SEGURO: "Seguro-fiança",
};

function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span
      style={{
        background: "#eef4fc",
        color: "#1a5fa8",
        borderRadius: 999,
        padding: "4px 12px",
        fontSize: 11,
        fontWeight: 600,
      }}
    >
      {children}
    </span>
  );
}

/* Detalhe do contrato:
   - contratos criados pelo assistente (local): abre o HTML assinado (ContratoPDF)
   - contratos da API: baixa o PDF servido pelo backend e exibe em iframe
     (com fallback para pdfUrl, quando o PDF estiver só como link externo) */

function ContratoDetalhe() {
  const { id } = useParams();

  // contratos criados pelo "+ Novo contrato PDF" (guardados no navegador)
  const criado = buscarContrato(id);
  if (criado) return <ContratoPDF contrato={criado} />;

  return <ContratoDaApi id={id} />;
}

function ContratoDaApi({ id }: { id?: string }) {
  const [contrato, setContrato] = useState<Contrato | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [aviso, setAviso] = useState("");

  useEffect(() => {
    let vivo = true;
    let objectUrl: string | null = null;

    async function carregar() {
      if (!id || Number.isNaN(Number(id))) {
        setCarregando(false);
        setAviso(`Contrato não encontrado para o id: "${id}"`);
        return;
      }
      try {
        const { data } = await api.get<Contrato>(`/contratos/${id}`);
        if (!vivo) return;
        setContrato(data);

        // tenta o PDF armazenado no backend
        try {
          const pdf = await api.get(`/contratos/${id}/pdf`, { responseType: "blob" });
          if (!vivo) return;
          objectUrl = URL.createObjectURL(pdf.data);
          setPdfUrl(objectUrl);
        } catch {
          // sem PDF enviado: usa o link externo, se existir
          if (vivo && data.pdfUrl) setPdfUrl(data.pdfUrl);
          if (vivo && !data.pdfUrl) {
            setAviso("Este contrato ainda não possui PDF enviado.");
          }
        }
      } catch (error) {
        if (vivo) setAviso(mensagemDeErro(error));
      } finally {
        if (vivo) setCarregando(false);
      }
    }

    carregar();
    return () => {
      vivo = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [id]);

  if (carregando) {
    return (
      <main style={{ padding: "28px 36px", fontFamily: "'Nunito', sans-serif" }}>
        <p style={{ color: "#999" }}>Carregando contrato…</p>
      </main>
    );
  }

  if (!contrato) {
    return (
      <main style={{ padding: "28px 36px", fontFamily: "'Nunito', sans-serif" }}>
        <p>{aviso || "Contrato não encontrado."}</p>
        <Link to="/contratos" style={{ fontSize: 12, color: "#1a5fa8" }}>
          ← Voltar para Contratos
        </Link>
      </main>
    );
  }

  const nomeLocatario = contrato.locatario?.nome ?? "Locatário";
  const descricaoImovel = contrato.imovel
    ? `${contrato.imovel.endereco}, ${contrato.imovel.numero ?? "s/n"} — ${contrato.imovel.bairro}`
    : "Imóvel";
  const vence = rotuloVencimento(contrato.dataFim);

  async function baixarPdf() {
    if (!pdfUrl || !contrato) return;
    try {
      if (pdfUrl.startsWith("blob:")) {
        await baixarArquivo(`/contratos/${contrato.id}/pdf`, `${contrato.codigo || "contrato"}.pdf`);
      } else {
        window.open(pdfUrl, "_blank", "noreferrer");
      }
    } catch (error) {
      setAviso(mensagemDeErro(error));
    }
  }

  return (
    <main style={{ padding: "28px 36px", fontFamily: "'Nunito', sans-serif" }}>
      <Link
        to="/contratos"
        style={{ fontSize: 12, color: "#1a5fa8", textDecoration: "none" }}
      >
        ← Voltar para Contratos
      </Link>

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          margin: "12px 0 20px",
          gap: 16,
          flexWrap: "wrap",
        }}
      >
        <div>
          <h1 style={{ fontSize: 20, marginBottom: 2, color: "#1a1a2e" }}>
            {nomeLocatario}
          </h1>
          <p style={{ color: "#999", fontSize: 12 }}>
            Contrato {contrato.codigo} · {descricaoImovel} · vence {vence} ·{" "}
            {formatBRL(contrato.valorMensal)}/mês ·{" "}
            {formatData(contrato.dataInicio)} a {formatData(contrato.dataFim)}
          </p>
          {(contrato.modelo ||
            contrato.modalidadeGarantia ||
            contrato.indiceReajuste) && (
            <div
              style={{
                display: "flex",
                gap: 8,
                flexWrap: "wrap",
                marginTop: 8,
              }}
            >
              {contrato.modelo && <Chip>{contrato.modelo}</Chip>}
              {contrato.modalidadeGarantia && (
                <Chip>
                  Garantia:{" "}
                  {GARANTIAS_ROTULO[contrato.modalidadeGarantia] ??
                    contrato.modalidadeGarantia}
                </Chip>
              )}
              {contrato.indiceReajuste && (
                <Chip>
                  Reajuste: {contrato.indiceReajuste}
                  {contrato.periodicidadeReajuste
                    ? ` · ${contrato.periodicidadeReajuste}`
                    : ""}
                </Chip>
              )}
            </div>
          )}
        </div>

        <div style={{ display: "flex", gap: 10 }}>
          <button
            type="button"
            onClick={() => pdfUrl && window.open(pdfUrl, "_blank", "noreferrer")}
            disabled={!pdfUrl}
            style={{
              padding: "10px 18px",
              fontSize: 13,
              borderRadius: 999,
              border: "1px solid #dcdceb",
              background: "#fff",
              color: "#1a1a2e",
              cursor: pdfUrl ? "pointer" : "not-allowed",
              fontFamily: "'Nunito', sans-serif",
              fontWeight: 700,
            }}
          >
            Abrir em nova aba
          </button>
          <Button variant="primary" onClick={baixarPdf} disabled={!pdfUrl}>
            Baixar PDF
          </Button>
        </div>
      </div>

      {aviso && (
        <p style={{ color: "#e17055", fontSize: 13, marginBottom: 12 }}>{aviso}</p>
      )}

      {contrato.fiador && (
        <div
          style={{
            background: "#fafaff",
            border: "1px solid #e2e8f0",
            borderRadius: 12,
            padding: 16,
            marginBottom: 16,
          }}
        >
          <p
            style={{
              margin: "0 0 6px",
              fontSize: 12,
              fontWeight: 700,
              color: "#1a5fa8",
              textTransform: "uppercase",
              letterSpacing: "0.6px",
            }}
          >
            Fiador
          </p>
          <p style={{ margin: 0, fontSize: 14, color: "#16233b", fontWeight: 600 }}>
            {contrato.fiador.nome} · CPF {contrato.fiador.cpf}
            {contrato.fiador.rg ? ` · RG ${contrato.fiador.rg}` : ""}
          </p>
          <p style={{ margin: "4px 0 0", fontSize: 12, color: "#64748b" }}>
            {[
              contrato.fiador.estadoCivil,
              contrato.fiador.profissao,
              contrato.fiador.telefone,
              contrato.fiador.email,
              contrato.fiador.endereco,
            ]
              .filter(Boolean)
              .join(" · ")}
          </p>
        </div>
      )}

      {pdfUrl ? (
        <div
          style={{
            background: "#eff6ff",
            border: "1px solid #e2e8f0",
            borderRadius: 12,
            padding: 16,
          }}
        >
          <iframe
            src={`${pdfUrl}#toolbar=0&navpanes=0&view=FitH`}
            title="Contrato PDF"
            style={{
              width: "100%",
              height: "75vh",
              border: "none",
              borderRadius: 8,
              background: "#fff",
            }}
          />
        </div>
      ) : (
        !aviso && (
          <div
            style={{
              background: "#eff6ff",
              border: "1px dashed #dcdceb",
              borderRadius: 12,
              padding: 24,
              color: "#999",
              fontSize: 13,
              textAlign: "center",
            }}
          >
            Este contrato ainda não possui PDF enviado.
          </div>
        )
      )}
    </main>
  );
}

export default ContratoDetalhe;
