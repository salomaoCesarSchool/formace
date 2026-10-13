import { Link } from "react-router-dom";
import logo from "../assets/logo.png";
import fundo from "../assets/fundo.png";

const menuItems = [
  {
    nome: "Dashboard",
    rota: "/dashboard",
    icone: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 3l9 8h-3v9h-5v-6H11v6H6v-9H3z" />
      </svg>
    ),
  },
  {
    nome: "Imóveis e clientes",
    rota: "/imoveis",
    icone: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
        <circle cx="12" cy="8" r="4" />
        <path d="M4 20c0-4 4-6 8-6s8 2 8 6v1H4z" />
      </svg>
    ),
  },
  {
    nome: "Financeiro",
    rota: "/financeiro",
    icone: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2a10 10 0 100 20 10 10 0 000-20zm1 15h-2v-1.05a3 3 0 01-2-2.83h2a1 1 0 001 1h1a1 1 0 000-2h-1a3 3 0 010-6V5h2v1.05a3 3 0 012 2.83h-2a1 1 0 00-1-1h-1a1 1 0 000 2h1a3 3 0 010 6z" />
      </svg>
    ),
  },
  {
    nome: "Contratos",
    rota: "/contratos",
    icone: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
        <path d="M6 2h9l5 5v15a1 1 0 01-1 1H6a1 1 0 01-1-1V3a1 1 0 011-1zm8 6V4l4 4h-4z" />
      </svg>
    ),
  },
  {
    nome: "Relatório/MP",
    rota: "/relatorio",
    icone: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
        <path d="M4 4h16v3H4zM4 10h16v2H4zM4 15h10v2H4zM4 19h7v1H4z" />
      </svg>
    ),
  },
];

interface SidebarProps {
  usuario: string;
  ativo?: string;
}

function Sidebar({ usuario, ativo = "Dashboard" }: SidebarProps) {
  return (
    <aside
      style={{
        width: 260,
        minHeight: "100vh",
        padding: "32px 24px",
        color: "#fff",
        fontFamily: "'Nunito', sans-serif",
        backgroundImage: `linear-gradient(to bottom, rgba(10,14,40,0.9), rgba(10,14,40,0.85)), url(${fundo})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      <div style={{ marginBottom: 32 }}>
        <img src={logo} alt="Formace" style={{ width: 190 }} />
      </div>
      <p
        style={{
          opacity: 0.9,
          marginBottom: 32,
          fontSize: 18,
          lineHeight: 1.4,
        }}
      >
        Bem vindo,
        <br />
        {usuario}
      </p>
      <nav style={{ display: "flex", flexDirection: "column" }}>
        {menuItems.map((item) => (
          <Link
            key={item.nome}
            to={item.rota}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 14,
              padding: "14px 10px",
              color: "#fff",
              textDecoration: "none",
              opacity: item.nome === ativo ? 1 : 0.65,
              fontWeight: item.nome === ativo ? 600 : 400,
              borderLeft:
                item.nome === ativo
                  ? "4px solid #fff"
                  : "4px solid transparent",
              fontSize: 16,
            }}
          >
            {item.icone}
            <span>{item.nome}</span>
          </Link>
        ))}
      </nav>
    </aside>
  );
}

export default Sidebar;
