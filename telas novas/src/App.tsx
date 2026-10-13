import { Routes, Route } from "react-router-dom";
import Splash from "./components/Splash";
import Layout from "./components/layout";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Imoveis from "./pages/Imoveis";
import Financeiro from "./pages/Financeiro";
import Contratos from "./pages/Contratos";
import ContratoDetalhe from "./pages/ContratoDetalhe";
import Relatorio from "./pages/Relatorio";
import fundo from "./assets/fundo.png";
import logo from "./assets/logo.png";

function App() {
  return (
    <Routes>
      <Route
        path="/"
        element={<Splash backgroundSrc={fundo} logoSrc={logo} />}
      />
      <Route path="/login" element={<Login />} />
      <Route element={<Layout />}>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/imoveis" element={<Imoveis />} />
        <Route path="/financeiro" element={<Financeiro />} />
        <Route path="/contratos" element={<Contratos />} />
        <Route path="/contratos/:id" element={<ContratoDetalhe />} />
        <Route path="/relatorio" element={<Relatorio />} />
      </Route>
    </Routes>
  );
}

export default App;
