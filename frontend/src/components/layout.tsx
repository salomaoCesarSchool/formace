import { Outlet, useLocation } from "react-router-dom";
import Sidebar, { usuarioDaSessao } from "./Sidebar";

const rotaParaNome: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/imoveis": "Imóveis e clientes",
  "/financeiro": "Financeiro",
  "/relatorio": "Relatório/MP",
};

/** Shell autenticado: barra lateral escura + conteúdo da rota (sem header extra). */
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
      <Sidebar usuario={usuarioDaSessao()} ativo={ativo} />
      <div style={{ flex: 1, background: "#fff", minWidth: 0 }}>
        <Outlet />
      </div>
    </div>
  );
}

export default Layout;
