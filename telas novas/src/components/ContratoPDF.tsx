import { Link } from "react-router-dom";
import Button from "./Button";
import { imprimirContrato } from "./NovoContrato";
import type { ContratoCriado } from "./NovoContrato";

/* Tela "Ver contrato" para os contratos criados pelo "+ Novo contrato PDF". */
function ContratoPDF({ contrato }: { contrato: ContratoCriado }) {
  return (
    <main style={{ padding: "28px 36px", fontFamily: "'Nunito', sans-serif" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          marginBottom: 20,
        }}
      >
        <div>
          <h1 style={{ fontSize: 20, marginBottom: 2, color: "#1a1a2e" }}>
            {contrato.locatario}
          </h1>
          <p style={{ color: "#999", fontSize: 12 }}>
            {contrato.imovel} · vence {contrato.vence}
          </p>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <Link to="/contratos" style={{ textDecoration: "none" }}>
            <Button variant="secondary">Voltar</Button>
          </Link>
          <Button onClick={() => imprimirContrato(contrato.html)}>
            Baixar PDF
          </Button>
        </div>
      </div>
      <iframe
        title="Contrato"
        srcDoc={contrato.html}
        style={{
          width: "100%",
          maxWidth: 820,
          height: "75vh",
          border: "1px solid #e5e5ef",
          borderRadius: 10,
        }}
      />
    </main>
  );
}

export default ContratoPDF;
