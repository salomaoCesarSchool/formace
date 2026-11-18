import { Navigate, Route, Routes } from 'react-router-dom';
import type { ReactNode } from 'react';
import Layout from './components/layout';
import Splash from './components/Splash';
import Login from './pages/Login';
import RedefinirSenha from './pages/RedefinirSenha';
import Dashboard from './pages/Dashboard';
import Imoveis from './pages/Imoveis';
import Financeiro from './pages/Financeiro';
import Contratos from './pages/Contratos';
import ContratoDetalhe from './pages/ContratoDetalhe';
import NovoContrato from './pages/NovoContrato';
import Acesso from './pages/Acesso';
import Relatorio from './pages/Relatorio';
import { sessaoAtual } from './api/axios';
import { podeGerenciarUsuarios, podeVerFinanceiro } from './utils/permissoes';

/** Protege as rotas privadas: sem sessao redireciona para /login. */
function ExigirLogin({ children }: { children: ReactNode }) {
  if (!sessaoAtual()) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
}

/** Restringe a rota ao perfil (matriz ADMIN/GESTOR/OPERADOR). */
function ExigirPermissao({ permitido, children }: { permitido: boolean; children: ReactNode }) {
  if (!permitido) {
    return <Navigate to="/dashboard" replace />;
  }
  return <>{children}</>;
}

export default function App() {
  return (
    <Routes>
      {/* Splash de abertura (identidade visual nova) */}
      <Route path="/" element={<Splash />} />
      <Route path="/login" element={<Login />} />
      {/* Redefinicao de senha pelo link enviado por e-mail */}
      <Route path="/redefinir-senha" element={<RedefinirSenha />} />
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
        <Route
          path="financeiro"
          element={
            <ExigirPermissao permitido={podeVerFinanceiro()}>
              <Financeiro />
            </ExigirPermissao>
          }
        />
        <Route path="contratos" element={<Contratos />} />
        {/* Estático antes de :id — o React Router prioriza segmentos literais */}
        <Route path="contratos/novo" element={<NovoContrato />} />
        <Route path="contratos/:id" element={<ContratoDetalhe />} />
        <Route
          path="relatorio"
          element={
            <ExigirPermissao permitido={podeVerFinanceiro()}>
              <Relatorio />
            </ExigirPermissao>
          }
        />
        {/* Gestão de usuários: somente Administrador */}
        <Route
          path="acesso"
          element={
            <ExigirPermissao permitido={podeGerenciarUsuarios()}>
              <Acesso />
            </ExigirPermissao>
          }
        />
      </Route>
      {/* Rotas antigas mantidas para nao quebrar links salvos */}
      <Route path="/relatorios" element={<Navigate to="/relatorio" replace />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

/** Rota inicial para quem ja esta logado (usada apos o login). */
export const ROTA_INICIAL = '/dashboard';
