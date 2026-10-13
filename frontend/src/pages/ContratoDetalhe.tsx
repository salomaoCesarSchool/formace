import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import Button from "../components/Button";
import ContratoPDF from "../components/ContratoPDF";
import { buscarContrato } from "../store/contratosStore";
import { api, mensagemDeErro, baixarArquivo } from "../api/axios";
import type { Contrato } from "../types";
import { formatBRL, formatData, rotuloVencimento } from "../utils/format";

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
        <Link to="/contratos" style={{ fontSize: 12, color: "#6c5ce7" }}>
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
        style={{ fontSize: 12, color: "#6c5ce7", textDecoration: "none" }}
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

      {pdfUrl ? (
        <div
          style={{
            background: "#f1f0ff",
            border: "1px solid #e5e5ef",
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
              background: "#f1f0ff",
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
