import { Outlet, useLocation } from "react-router-dom";
import Sidebar from "./Sidebar";

const rotaParaNome: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/imoveis": "Imóveis e clientes",
  "/financeiro": "Financeiro",
  "/relatorio": "Relatório/MP",
};

function Layout() {
  const location = useLocation();
  const ativo = location.pathname.startsWith("/contratos")
    ? "Contratos"
    : (rotaParaNome[location.pathname] ?? "Dashboard");

  return (
    <div
      style={{
        display: "flex",
        minHeight: "100vh",
        fontFamily: "'Nunito', sans-serif",
      }}
    >
      <Sidebar usuario="Usuário" ativo={ativo} />
      <div style={{ flex: 1, background: "#fff" }}>
        <Outlet />
      </div>
    </div>
  );
}

export default Layout;
