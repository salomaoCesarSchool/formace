import { useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import Button from "../components/Button";
import fundo from "../assets/fundo.png";
import logo from "../assets/logo.png";

type Modo = "login" | "cadastro" | "esqueci";
type Erros = {
  email?: string;
  senha?: string;
  confirmar?: string;
  geral?: string;
};

const EMAIL_OK = /^\S+@\S+\.\S+$/;

/* ───────── contas cadastradas (só no navegador, enquanto não há back-end) ─────────
   A senha nunca é guardada: só um resumo (hash) dela. Semana 4: trocar por POST/login com Axios. */

type Conta = { email: string; hash: string };
const CHAVE_CONTAS = "contas-cadastradas";

function lerContas(): Conta[] {
  try {
    const t = localStorage.getItem(CHAVE_CONTAS);
    return t ? (JSON.parse(t) as Conta[]) : [];
  } catch {
    return [];
  }
}

function salvarContas(contas: Conta[]) {
  try {
    localStorage.setItem(CHAVE_CONTAS, JSON.stringify(contas));
  } catch {
    /* navegador bloqueou o armazenamento */
  }
}

async function resumo(email: string, senha: string) {
  const dados = new TextEncoder().encode(`${email.toLowerCase()}::${senha}`);
  const bytes = new Uint8Array(await crypto.subtle.digest("SHA-256", dados));
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

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

/* ───────── ícones ───────── */

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

const SOCIAIS: { nome: string; cor: string; caminho: string }[] = [
  {
    nome: "Twitter",
    cor: "#c9cbf0",
    caminho:
      "M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z",
  },
  {
    nome: "Facebook",
    cor: "#c9cbf0",
    caminho:
      "M14 8V6c0-.9.2-1.5 1.6-1.5H17V1.2C16.7 1.1 15.7 1 14.6 1 12.1 1 10.4 2.5 10.4 5.3V8H7.5v3.4h2.9V23H14V11.4h2.7L17.1 8z",
  },
  {
    nome: "Google",
    cor: "#8689de",
    caminho:
      "M21.35 11.1h-9.17v2.73h6.51c-.33 3.81-3.5 5.44-6.5 5.44C8.36 19.27 5 16.25 5 12c0-4.1 3.2-7.27 7.2-7.27 3.09 0 4.9 1.97 4.9 1.97L19 4.72S16.56 2 12.1 2C6.42 2 2.03 6.8 2.03 12c0 5.05 4.13 10 10.22 10 5.35 0 9.25-3.67 9.25-9.09 0-1.15-.15-1.81-.15-1.81z",
  },
];

/* ───────── campos ───────── */

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

/* ───────── tela ───────── */

function Login() {
  const navigate = useNavigate();
  const [modo, setModo] = useState<Modo>("login");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [confirmar, setConfirmar] = useState("");
  const [erros, setErros] = useState<Erros>({});
  const [aviso, setAviso] = useState("");
  const [linkEnviado, setLinkEnviado] = useState(false);

  const trocar = (m: Modo) => {
    setModo(m);
    setSenha("");
    setConfirmar("");
    setErros({});
    setAviso("");
    setLinkEnviado(false);
  };

  const enviar = async (ev: { preventDefault: () => void }) => {
    ev.preventDefault();
    const e: Erros = {};
    if (!email.trim()) e.email = "Informe o e-mail.";
    else if (!EMAIL_OK.test(email.trim())) e.email = "Confira o e-mail.";

    if (modo === "esqueci") {
      setErros(e);
      if (Object.keys(e).length > 0) return;
      // Semana 4: trocar por POST com Axios que manda o link de redefinição para o e-mail.
      setLinkEnviado(true);
      return;
    }

    if (!senha) e.senha = "Informe a senha.";
    else if (modo === "cadastro" && senha.length < 6)
      e.senha = "Use pelo menos 6 caracteres.";
    if (modo === "cadastro") {
      if (!confirmar) e.confirmar = "Confirme a senha.";
      else if (confirmar !== senha) e.confirmar = "As senhas não são iguais.";
    }
    setErros(e);
    setAviso("");
    if (Object.keys(e).length > 0) return;

    const mail = email.trim().toLowerCase();
    const contas = lerContas();
    const hash = await resumo(mail, senha);

    if (modo === "cadastro") {
      if (contas.some((c) => c.email === mail)) {
        setErros({ email: "Esse e-mail já está cadastrado." });
        return;
      }
      salvarContas([...contas, { email: mail, hash }]);
      setModo("login");
      setSenha("");
      setConfirmar("");
      setAviso("Cadastro feito. Entre com o seu e-mail e senha.");
      return;
    }

    if (!contas.some((c) => c.email === mail && c.hash === hash)) {
      setErros({ geral: "E-mail ou senha incorretos." });
      return;
    }
    navigate("/dashboard");
  };

  const aba = (m: Modo, texto: string) => (
    <button
      type="button"
      role="tab"
      aria-selected={modo === m}
      onClick={() => trocar(m)}
      style={{
        flex: 1,
        border: "none",
        background: "none",
        padding: "10px 0",
        fontSize: 13,
        fontFamily: "'Nunito', sans-serif",
        color: "#1a1a2e",
        cursor: "pointer",
        borderBottom: `2px solid ${modo === m ? "#c9cbf0" : "transparent"}`,
      }}
    >
      {texto}
    </button>
  );

  return (
    <div
      style={{
        display: "flex",
        minHeight: "100vh",
        fontFamily: "'Nunito', sans-serif",
        background: "#fafbff",
      }}
    >
      {/* painel da marca */}
      <div
        style={{
          flex: "0 0 48%",
          backgroundImage: `url(${fundo})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundColor: "#0e1a5c",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <img src={logo} alt="Formace" style={{ width: "60%", maxWidth: 380 }} />
      </div>

      {/* formulário */}
      <div
        style={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 32,
        }}
      >
        <form
          onSubmit={enviar}
          noValidate
          style={{ width: "100%", maxWidth: 360 }}
        >
          {modo === "esqueci" ? (
            <div style={{ textAlign: "center", margin: "0 auto 32px" }}>
              <h1
                style={{
                  fontSize: 16,
                  fontWeight: 600,
                  color: "#1a1a2e",
                  margin: 0,
                }}
              >
                Esqueci a senha
              </h1>
              <p style={{ fontSize: 11, color: "#777", margin: "6px 0 0" }}>
                Informe o e-mail da sua conta e enviaremos um link para criar
                uma nova senha.
              </p>
            </div>
          ) : (
            <div
              role="tablist"
              style={{
                display: "flex",
                maxWidth: 240,
                margin: "0 auto 40px",
              }}
            >
              {aba("login", "Login")}
              {aba("cadastro", "Cadastro")}
            </div>
          )}

          {modo === "esqueci" && linkEnviado ? (
            <>
              <div
                role="status"
                style={{
                  background: "#f1f2fc",
                  borderRadius: 8,
                  padding: 16,
                  fontSize: 12,
                  color: "#333",
                  lineHeight: 1.5,
                }}
              >
                Se existir uma conta com <b>{email.trim()}</b>, o link já está a
                caminho. Confira a caixa de entrada e o spam.
              </div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "center",
                  marginTop: 22,
                }}
              >
                <Button
                  type="button"
                  onClick={() => trocar("login")}
                  style={{
                    width: 190,
                    background: "#6c6fd0",
                    boxShadow: "0 4px 14px rgba(108, 111, 208, 0.45)",
                  }}
                >
                  Voltar ao login
                </Button>
              </div>
            </>
          ) : (
            <>
              <Campo nome="Email" erro={erros.email}>
                <input
                  type="email"
                  aria-label="Email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  style={entrada}
                />
              </Campo>

              {modo !== "esqueci" && (
                <CampoSenha
                  nome="Senha"
                  value={senha}
                  onChange={setSenha}
                  erro={erros.senha}
                  autoComplete={
                    modo === "login" ? "current-password" : "new-password"
                  }
                />
              )}

              {modo === "cadastro" && (
                <CampoSenha
                  nome="Confirmar senha"
                  value={confirmar}
                  onChange={setConfirmar}
                  erro={erros.confirmar}
                  autoComplete="new-password"
                />
              )}

              {erros.geral && (
                <div style={{ ...erroStyle, marginBottom: 10 }}>
                  {erros.geral}
                </div>
              )}
              {aviso && (
                <div
                  style={{ color: "#4a4cb0", fontSize: 11, marginBottom: 10 }}
                >
                  {aviso}
                </div>
              )}

              <div
                style={{
                  display: "flex",
                  justifyContent: "center",
                  marginTop: 8,
                }}
              >
                <Button
                  type="submit"
                  style={{
                    width: 190,
                    background: "#6c6fd0",
                    boxShadow: "0 4px 14px rgba(108, 111, 208, 0.45)",
                  }}
                >
                  {modo === "login"
                    ? "Login"
                    : modo === "cadastro"
                      ? "Cadastrar"
                      : "Enviar link"}
                </Button>
              </div>

              <div style={{ marginTop: 14, fontSize: 10 }}>
                {modo === "login" ? (
                  <button
                    type="button"
                    onClick={() => trocar("esqueci")}
                    style={linkStyle}
                  >
                    Esqueci a senha
                  </button>
                ) : modo === "esqueci" ? (
                  <button
                    type="button"
                    onClick={() => trocar("login")}
                    style={linkStyle}
                  >
                    Voltar ao login
                  </button>
                ) : (
                  <span style={{ color: "#8689de" }}>
                    Já tem uma conta?{" "}
                    <button
                      type="button"
                      onClick={() => trocar("login")}
                      style={linkStyle}
                    >
                      Login
                    </button>
                  </span>
                )}
              </div>

              {modo !== "esqueci" && (
                <>
                  <p
                    style={{
                      textAlign: "center",
                      fontSize: 9,
                      color: "#aaa",
                      margin: "26px 0 10px",
                    }}
                  >
                    Conecte-se com as redes sociais
                  </p>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "center",
                      gap: 36,
                    }}
                  >
                    {SOCIAIS.map((s) => (
                      <button
                        key={s.nome}
                        type="button"
                        aria-label={`Entrar com ${s.nome}`}
                        onClick={() =>
                          setAviso(
                            `Entrar com ${s.nome} entra com a integração do back-end.`,
                          )
                        }
                        style={{
                          border: "none",
                          background: "none",
                          cursor: "pointer",
                          padding: 4,
                        }}
                      >
                        <svg
                          width="22"
                          height="22"
                          viewBox="0 0 24 24"
                          fill={s.cor}
                          aria-hidden="true"
                        >
                          <path d={s.caminho} />
                        </svg>
                      </button>
                    ))}
                  </div>
                </>
              )}
            </>
          )}
        </form>
      </div>
    </div>
  );
}

const linkStyle: CSSProperties = {
  border: "none",
  background: "none",
  padding: 0,
  color: "#8689de",
  fontSize: 10,
  fontFamily: "'Nunito', sans-serif",
  cursor: "pointer",
  textDecoration: "underline",
};

export default Login;
