import { Navigate, Route, Routes } from 'react-router-dom';
import type { ReactNode } from 'react';
import Layout from './components/layout';
import Splash from './components/Splash';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Imoveis from './pages/Imoveis';
import Financeiro from './pages/Financeiro';
import Contratos from './pages/Contratos';
import ContratoDetalhe from './pages/ContratoDetalhe';
import Relatorio from './pages/Relatorio';
import { sessaoAtual } from './api/axios';

/** Protege as rotas privadas: sem sessao redireciona para /login. */
function ExigirLogin({ children }: { children: ReactNode }) {
  if (!sessaoAtual()) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
}

export default function App() {
  return (
    <Routes>
      {/* Splash de abertura (identidade visual nova) */}
      <Route path="/" element={<Splash />} />
      <Route path="/login" element={<Login />} />
      <Route
        path="/"
        element={
          <ExigirLogin>
            <Layout />
          </ExigirLogin>
        }
      >
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="imoveis" element={<Imoveis />} />
        <Route path="financeiro" element={<Financeiro />} />
        <Route path="contratos" element={<Contratos />} />
        <Route path="contratos/:id" element={<ContratoDetalhe />} />
        <Route path="relatorio" element={<Relatorio />} />
      </Route>
      {/* Rotas antigas mantidas para nao quebrar links salvos */}
      <Route path="/relatorios" element={<Navigate to="/relatorio" replace />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

/** Rota inicial para quem ja esta logado (usada apos o login). */
export const ROTA_INICIAL = '/dashboard';
