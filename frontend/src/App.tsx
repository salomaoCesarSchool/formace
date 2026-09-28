import { Navigate, Outlet, Route, Routes, useLocation } from 'react-router-dom';
import type { ReactNode } from 'react';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import Dashboard from './pages/Dashboard';
import Financeiro from './pages/Financeiro';
import ImoveisClientes from './pages/ImoveisClientes';
import Contratos from './pages/Contratos';
import RelatoriosMP from './pages/RelatoriosMP';
import Login from './pages/Login';
import { sessaoAtual } from './api/axios';

const paginas: Record<string, { titulo: string; subtitulo: string }> = {
  '/': {
    titulo: 'Dashboard',
    subtitulo: 'Visao geral da carteira de 124 imoveis da Fundacao Manuel Cruz',
  },
  '/financeiro': {
    titulo: 'Financeiro',
    subtitulo: 'Alugueis, recibos numerados, quitacoes e fluxo de caixa (RDD)',
  },
  '/imoveis': {
    titulo: 'Imoveis e Clientes',
    subtitulo: 'Carteira completa de imoveis e locatarios cadastrados',
  },
  '/contratos': {
    titulo: 'Contratos',
    subtitulo: 'Contratos digitalizados com alertas de vencimento',
  },
  '/relatorios': {
    titulo: 'Relatorios MP-SE',
    subtitulo: 'Prestacao de contas consolidada ao Ministerio Publico de Sergipe',
  },
};

/** Protege as rotas privadas: sem sessao redireciona para /login. */
function ExigirLogin({ children }: { children: ReactNode }) {
  if (!sessaoAtual()) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
}

/** Shell autenticado: sidebar escura + header + conteudo da rota. */
function Layout() {
  const { pathname } = useLocation();
  const info = paginas[pathname] ?? { titulo: 'FORMACE', subtitulo: '' };

  return (
    <div className="flex h-screen overflow-hidden bg-page">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <Header titulo={info.titulo} subtitulo={info.subtitulo} />
        <main className="flex-1 overflow-y-auto p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        path="/"
        element={
          <ExigirLogin>
            <Layout />
          </ExigirLogin>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="financeiro" element={<Financeiro />} />
        <Route path="imoveis" element={<ImoveisClientes />} />
        <Route path="contratos" element={<Contratos />} />
        <Route path="relatorios" element={<RelatoriosMP />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
