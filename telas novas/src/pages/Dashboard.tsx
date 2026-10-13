import { dashboardMock } from "../mocks/dashboardMock";

function Dashboard() {
  const { perfil, periodo, indicadores, lancamentos, alertas } = dashboardMock;

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
            Dashboard
          </h1>
          <p style={{ color: "#999", fontSize: 12 }}>
            Visão geral da fundação · {periodo}
          </p>
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            border: "1px solid #e5e5ef",
            borderRadius: 20,
            padding: "4px 12px 4px 4px",
            fontSize: 12,
            color: "#555",
          }}
        >
          <span
            style={{
              width: 20,
              height: 20,
              borderRadius: "50%",
              background: "#4b3fd6",
              display: "inline-block",
            }}
          />
          {perfil}
        </div>
      </div>

      <div style={{ display: "flex", gap: 14, marginBottom: 20 }}>
        {indicadores.map((ind, i) => (
          <div
            key={i}
            style={{
              flex: 1,
              border: "1px solid #e5e5ef",
              borderRadius: 10,
              padding: 16,
            }}
          >
            <p style={{ fontSize: 12, color: "#999", marginBottom: 6 }}>
              {ind.titulo}
            </p>
            <h2
              style={{
                margin: "2px 0",
                fontWeight: 600,
                fontSize: 32,
                lineHeight: "100%",
                letterSpacing: "0.23px",
                color: "rgba(14, 26, 194, 0.5)",
              }}
            >
              {ind.valor}
            </h2>
            <p style={{ fontSize: 11, color: "#aaa" }}>{ind.legenda}</p>
          </div>
        ))}
      </div>

      <div style={{ display: "flex", gap: 14 }}>
        <div
          style={{
            flex: 2,
            border: "1px solid #e5e5ef",
            borderRadius: 10,
            padding: 16,
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 12,
            }}
          >
            <h3 style={{ fontSize: 14, fontWeight: 600, color: "#1a1a2e" }}>
              Últimos lançamentos financeiros
            </h3>
            <span
              style={{
                fontSize: 11,
                border: "1px solid #e5e5ef",
                borderRadius: 6,
                padding: "3px 10px",
                color: "#888",
              }}
            >
              Último mês
            </span>
          </div>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ color: "#999", fontSize: 12, textAlign: "left" }}>
                <th style={{ fontWeight: 400, paddingBottom: 8 }}>Imóvel</th>
                <th style={{ fontWeight: 400, paddingBottom: 8 }}>Locatário</th>
                <th style={{ fontWeight: 400, paddingBottom: 8 }}>Tipo</th>
                <th style={{ fontWeight: 400, paddingBottom: 8 }}>Valor</th>
              </tr>
            </thead>
            <tbody>
              {lancamentos.map((l, i) => (
                <tr
                  key={i}
                  style={{
                    fontSize: 13,
                    color: "#999",
                    borderTop: "1px solid #f0f0f5",
                  }}
                >
                  <td style={{ padding: "8px 0" }}>{l.imovel}</td>
                  <td style={{ padding: "8px 0" }}>{l.locatario}</td>
                  <td style={{ padding: "8px 0" }}>{l.tipo}</td>
                  <td style={{ padding: "8px 0" }}>{l.valor}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div
          style={{
            flex: 1,
            border: "1px solid #e5e5ef",
            borderRadius: 10,
            padding: 16,
          }}
        >
          <h3
            style={{
              fontSize: 14,
              fontWeight: 600,
              marginBottom: 12,
              color: "#1a1a2e",
            }}
          >
            Alertas
          </h3>
          {alertas.map((a, i) => (
            <div
              key={i}
              style={{
                background: "#f1f0ff",
                color: "rgba(14, 26, 194, 0.5)",
                fontWeight: 600,
                padding: 10,
                borderRadius: 8,
                marginTop: 8,
                fontSize: 12,
              }}
            >
              {a}
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}

export default Dashboard;
