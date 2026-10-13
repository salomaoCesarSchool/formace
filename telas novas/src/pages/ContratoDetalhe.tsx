import { useParams, Link } from "react-router-dom";
import { contratosMock } from "../mocks/contratosMock";
import Button from "../components/Button";
import ContratoPDF from "../components/ContratoPDF";
import { buscarContrato } from "../store/contratosStore";

function ContratoDetalhe() {
  const { id } = useParams();

  // contratos criados pelo "+ Novo contrato PDF"
  const criado = buscarContrato(id);
  if (criado) return <ContratoPDF contrato={criado} />;

  // contratos de exemplo (mock), como já era
  const contrato = contratosMock.find((c) => c.id === id);

  if (!contrato) {
    return (
      <main
        style={{ padding: "28px 36px", fontFamily: "'Nunito', sans-serif" }}
      >
        <p>Contrato não encontrado para o id: "{id}"</p>
        <Link to="/contratos">← Voltar para Contratos</Link>
      </main>
    );
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
        }}
      >
        <div>
          <h1 style={{ fontSize: 20, marginBottom: 2, color: "#1a1a2e" }}>
            {contrato.locatario}
          </h1>
          <p style={{ color: "#999", fontSize: 12 }}>
            Contrato de Locação · {contrato.imovel} · vence {contrato.vence}
          </p>
        </div>

        <div style={{ display: "flex", gap: 10 }}>
          <a
            href={contrato.arquivoPdf}
            target="_blank"
            rel="noreferrer"
            style={{ textDecoration: "none" }}
          >
            <Button
              variant="secondary"
              style={{ padding: "10px 18px", fontSize: 13 }}
            >
              Abrir em nova aba
            </Button>
          </a>
          <a
            href={contrato.arquivoPdf}
            download
            style={{ textDecoration: "none" }}
          >
            <Button variant="primary">Baixar PDF</Button>
          </a>
        </div>
      </div>

      <div
        style={{
          background: "#f1f0ff",
          border: "1px solid #e5e5ef",
          borderRadius: 12,
          padding: 16,
        }}
      >
        <iframe
          src={`${contrato.arquivoPdf}#toolbar=0&navpanes=0&view=FitH`}
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
    </main>
  );
}

export default ContratoDetalhe;
