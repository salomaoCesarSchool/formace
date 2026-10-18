import { useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import Button from "../components/Button";
import { api, mensagemDeErro } from "../api/axios";
import fundo from "../assets/fundo.png";
import logo from "../assets/logo.png";

/**
 * Tela de redefinicao de senha: recebe o token do link enviado por e-mail
 * (/redefinir-senha?token=...) e grava a nova senha via POST /auth/redefinir-senha.
 * O token e de uso unico e expira em 30 minutos no backend.
 */

const rotulo: CSSProperties = {
  display: "block",
  fontSize: 11,
  color: "#555",
  marginBottom: 6,
};

const entrada: CSSProperties = {
  width: "100%",
  boxSizing: "border-box",
  border: "none",
  borderRadius: 8,
  padding: "13px 14px",
  fontSize: 12,
  fontFamily: "'Nunito', sans-serif",
  color: "#1a1a2e",
  background: "#fff",
  boxShadow: "0 2px 10px rgba(108, 92, 231, 0.14)",
  outline: "none",
};

const erroStyle: CSSProperties = {
  color: "#d63031",
  fontSize: 11,
  marginTop: 5,
};

function Olho({ aberto }: { aberto: boolean }) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="#8689de"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12z" />
      <circle cx="12" cy="12" r="3" />
      {!aberto && <line x1="3" y1="3" x2="21" y2="21" />}
    </svg>
  );
}

function Campo({
  nome,
  erro,
  children,
}: {
  nome: string;
  erro?: string;
  children: ReactNode;
}) {
  return (
    <div style={{ marginBottom: 18 }}>
      <label style={rotulo}>{nome}</label>
      {children}
      {erro && <div style={erroStyle}>{erro}</div>}
    </div>
  );
}

function CampoSenha({
  nome,
  value,
  onChange,
  erro,
  autoComplete,
}: {
  nome: string;
  value: string;
  onChange: (v: string) => void;
  erro?: string;
  autoComplete: string;
}) {
  const [visivel, setVisivel] = useState(false);
  return (
    <Campo nome={nome} erro={erro}>
      <div style={{ position: "relative" }}>
        <input
          type={visivel ? "text" : "password"}
          aria-label={nome}
          autoComplete={autoComplete}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          style={{ ...entrada, paddingRight: 40 }}
        />
        <button
          type="button"
          onClick={() => setVisivel((v) => !v)}
          aria-label={visivel ? "Esconder senha" : "Mostrar senha"}
          style={{
            position: "absolute",
            right: 10,
            top: "50%",
            transform: "translateY(-50%)",
            border: "none",
            background: "none",
            cursor: "pointer",
            padding: 4,
            display: "flex",
          }}
        >
          <Olho aberto={visivel} />
        </button>
      </div>
    </Campo>
  );
}

function RedefinirSenha() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = (searchParams.get("token") ?? "").trim();

  const [senha, setSenha] = useState("");
  const [confirmar, setConfirmar] = useState("");
  const [erros, setErros] = useState<{ senha?: string; confirmar?: string; geral?: string }>({});
  const [carregando, setCarregando] = useState(false);
  const [pronto, setPronto] = useState(false);

  const enviar = async (e: React.FormEvent) => {
    e.preventDefault();
    const novos: typeof erros = {};
    if (!senha.trim()) novos.senha = "Senha é obrigatória";
    else if (senha.length < 6) novos.senha = "Senha deve ter pelo menos 6 caracteres";
    if (confirmar !== senha) novos.confirmar = "As senhas não coincidem";
    setErros(novos);
    if (Object.keys(novos).length > 0) return;

    setCarregando(true);
    try {
      await api.post("/auth/redefinir-senha", { token, password: senha });
      setPronto(true);
    } catch (error) {
      setErros({ geral: mensagemDeErro(error) });
    } finally {
      setCarregando(false);
    }
  };

  const semToken = !token;

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "#eef0fb" }}>
      {/* Painel esquerdo: identidade */}
      <div
        style={{
          width: "42%",
          minHeight: "100vh",
          background: `linear-gradient(160deg, rgba(26,26,46,0.88), rgba(108,92,231,0.82)), url(${fundo}) center/cover`,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: 32,
          color: "#fff",
          textAlign: "center",
        }}
      >
        <img src={logo} alt="FORMACE" style={{ width: 150, marginBottom: 22 }} />
        <h1 style={{ fontSize: 24, fontWeight: 800, margin: 0, letterSpacing: 1 }}>
          FORMACE
        </h1>
        <p style={{ fontSize: 11, opacity: 0.85, marginTop: 10, maxWidth: 280 }}>
          Fundação Manuel Cruz — Sistema de Gestão de Imóveis
        </p>
      </div>

      {/* Painel direito: formulário */}
      <div
        style={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 24,
        }}
      >
        <form
          onSubmit={enviar}
          style={{
            width: "100%",
            maxWidth: 340,
            background: "#fff",
            borderRadius: 14,
            padding: "34px 30px",
            boxShadow: "0 10px 34px rgba(108, 92, 231, 0.16)",
          }}
        >
          <h2 style={{ fontSize: 17, fontWeight: 800, color: "#1a1a2e", margin: 0 }}>
            Criar nova senha
          </h2>
          <p style={{ fontSize: 11, color: "#777", marginTop: 8, marginBottom: 22 }}>
            Defina uma nova senha para a sua conta no FORMACE.
          </p>

          {semToken ? (
            <div
              style={{
                background: "#fff5f5",
                border: "1px solid #ffd6d6",
                borderRadius: 8,
                padding: "12px 14px",
                fontSize: 11,
                color: "#d63031",
                marginBottom: 18,
              }}
            >
              Link inválido ou incompleto. Volte ao login e solicite um novo link
              de recuperação de senha.
            </div>
          ) : pronto ? (
            <>
              <div
                style={{
                  background: "#f0fff4",
                  border: "1px solid #c6f6d5",
                  borderRadius: 8,
                  padding: "12px 14px",
                  fontSize: 11,
                  color: "#27ae60",
                  marginBottom: 18,
                }}
              >
                Senha redefinida com sucesso! Já pode entrar com a nova senha.
              </div>
              <Button
                type="button"
                onClick={() => navigate("/login")}
                style={{
                  width: "100%",
                  background: "#6c6fd0",
                  boxShadow: "0 4px 14px rgba(108, 111, 208, 0.45)",
                }}
              >
                Ir para o login
              </Button>
            </>
          ) : (
            <>
              <CampoSenha
                nome="Nova senha"
                value={senha}
                onChange={(v) => {
                  setSenha(v);
                  setErros((prev) => ({ ...prev, senha: undefined, geral: undefined }));
                }}
                erro={erros.senha}
                autoComplete="new-password"
              />
              <CampoSenha
                nome="Confirmar nova senha"
                value={confirmar}
                onChange={(v) => {
                  setConfirmar(v);
                  setErros((prev) => ({ ...prev, confirmar: undefined }));
                }}
                erro={erros.confirmar}
                autoComplete="new-password"
              />

              {erros.geral && (
                <div
                  style={{
                    background: "#fff5f5",
                    border: "1px solid #ffd6d6",
                    borderRadius: 8,
                    padding: "12px 14px",
                    fontSize: 11,
                    color: "#d63031",
                    marginBottom: 18,
                  }}
                >
                  {erros.geral}
                </div>
              )}

              <div style={{ display: "flex", justifyContent: "center", marginTop: 8 }}>
                <Button
                  type="submit"
                  disabled={carregando}
                  style={{
                    width: 190,
                    background: "#6c6fd0",
                    boxShadow: "0 4px 14px rgba(108, 111, 208, 0.45)",
                  }}
                >
                  {carregando ? "Salvando..." : "Salvar nova senha"}
                </Button>
              </div>
            </>
          )}

          <div style={{ marginTop: 16, textAlign: "center", fontSize: 11 }}>
            <button
              type="button"
              onClick={() => navigate("/login")}
              style={{
                border: "none",
                background: "none",
                color: "#8689de",
                cursor: "pointer",
                fontSize: 11,
                fontFamily: "'Nunito', sans-serif",
              }}
            >
              Voltar para o login
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default RedefinirSenha;
