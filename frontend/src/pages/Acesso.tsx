import { useEffect, useState } from "react";
import Button from "../components/Button";
import PageHeader from "../components/PageHeader";
import { api, mensagemDeErro } from "../api/axios";
import { CORES } from "../theme";
import { rotuloRole } from "../utils/permissoes";
import { validaEmail } from "../utils/validacao";
import { formatDataHora } from "../utils/format";
import type { UsuarioSistema } from "../types";

/* ───────── Perfis de acesso (matriz frontend + backend) ───────── */

const PERFIS = [
  {
    valor: "ADMIN",
    titulo: "Administrador",
    descricao:
      "Acesso total: cadastros, financeiro, relatórios, documentos e gestão de usuários.",
    cor: { fundo: "#eef4fc", texto: "#1a5fa8" },
  },
  {
    valor: "GESTOR",
    titulo: "Gerente",
    descricao:
      "Acesso a todos os módulos, exceto a gestão de usuários.",
    cor: { fundo: "#e0f2fe", texto: "#0369a1" },
  },
  {
    valor: "OPERADOR",
    titulo: "Operador",
    descricao:
      "Visão geral, imóveis/locatários e contratos — sem financeiro, relatórios ou usuários.",
    cor: { fundo: "#f1f5f9", texto: "#475569" },
  },
];

/** Cor do chip do perfil (legados fora da matriz aparecem em cinza). */
function corPapel(role: string) {
  const perfil = PERFIS.find((p) => p.valor === role.replace(/^ROLE_/, ""));
  return perfil?.cor ?? { fundo: "#f1f5f9", texto: "#64748b" };
}

/* ───────── Estilos ───────── */

const rotulo: React.CSSProperties = {
  display: "block",
  fontSize: 12,
  color: "#64748b",
  fontWeight: 600,
  marginBottom: 6,
};

const campo = (comErro?: boolean): React.CSSProperties => ({
  width: "100%",
  boxSizing: "border-box",
  padding: "10px 12px",
  fontSize: 14,
  border: comErro ? "1px solid #b91c1c" : "1px solid #e2e8f0",
  background: comErro ? "#fff5f5" : "#fff",
  borderRadius: 8,
  color: "#16233b",
  fontFamily: "'Nunito', sans-serif",
});

const erroTexto: React.CSSProperties = {
  color: "#b91c1c",
  fontSize: 12,
  marginTop: 4,
};

const th: React.CSSProperties = {
  textAlign: "left",
  padding: "10px 14px",
  fontSize: 11,
  fontWeight: 700,
  color: "#64748b",
  textTransform: "uppercase",
  letterSpacing: "0.5px",
  borderBottom: "1px solid #e2e8f0",
};

const td: React.CSSProperties = {
  padding: "12px 14px",
  fontSize: 13,
  color: "#334155",
  borderBottom: "1px solid #f1f5f9",
  verticalAlign: "middle",
};

interface FormState {
  id?: number;
  nome: string;
  username: string;
  email: string;
  role: string; // sem o prefixo ROLE_ ("", "ADMIN", "GESTOR", "OPERADOR")
  senha: string;
}

const FORM_VAZIO: FormState = {
  nome: "",
  username: "",
  email: "",
  role: "",
  senha: "",
};

/**
 * Tela de Acesso (abaixo de Relatórios no menu): cadastro, edição e exclusão
 * de usuários com os perfis Administrador / Gerente / Operador. Somente o
 * Administrador acessa (rota, menu e endpoint protegidos por @PreAuthorize).
 */
export default function Acesso() {
  const [usuarios, setUsuarios] = useState<UsuarioSistema[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");
  const [sucesso, setSucesso] = useState("");
  const [form, setForm] = useState<FormState | null>(null);
  const [err, setErr] = useState<Record<string, boolean>>({});
  const [salvando, setSalvando] = useState(false);

  async function carregar() {
    setCarregando(true);
    setErro("");
    try {
      const { data } = await api.get<UsuarioSistema[]>("/usuarios");
      setUsuarios(data);
    } catch (error) {
      setErro(mensagemDeErro(error));
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => {
    void carregar();
  }, []);

  // Escape fecha o diálogo (mesmo comportamento dos demais formulários)
  useEffect(() => {
    if (!form) return;
    const fechar = (e: KeyboardEvent) => e.key === "Escape" && setForm(null);
    window.addEventListener("keydown", fechar);
    return () => window.removeEventListener("keydown", fechar);
  }, [form]);

  function abrirNovo() {
    setErr({});
    setErro("");
    setForm({ ...FORM_VAZIO });
  }

  function abrirEdicao(usuario: UsuarioSistema) {
    setErr({});
    setErro("");
    setForm({
      id: usuario.id,
      nome: usuario.nome,
      username: usuario.username,
      email: usuario.email ?? "",
      // contas legadas fora da matriz exigem escolher um dos 3 perfis
      role: /^(ADMIN|GESTOR|OPERADOR)$/.test(
        usuario.role.replace(/^ROLE_/, ""),
      )
        ? usuario.role.replace(/^ROLE_/, "")
        : "",
      senha: "",
    });
  }

  async function salvar() {
    if (!form) return;
    const ehNovo = !form.id;
    const novos: Record<string, boolean> = {};
    const faltas: string[] = [];

    if (!form.nome.trim()) {
      novos.nome = true;
      faltas.push("o nome");
    }
    if (!form.username.trim()) {
      novos.username = true;
      faltas.push("o usuário");
    }
    if (form.email.trim() && !validaEmail(form.email)) {
      novos.email = true;
      faltas.push("um e-mail válido");
    }
    if (!form.role) {
      novos.role = true;
      faltas.push("o perfil de acesso");
    }
    if (form.senha && form.senha.length < 6) {
      novos.senha = true;
      faltas.push("uma senha com ao menos 6 caracteres");
    }
    if (ehNovo && !form.senha) {
      novos.senha = true;
      faltas.push("a senha (obrigatória no novo usuário)");
    }
    setErr(novos);
    if (faltas.length > 0) {
      setErro(
        `Confira ${faltas.join(", ")}${faltas.length > 1 ? "." : " destacado em vermelho."}`,
      );
      return;
    }

    setSalvando(true);
    setErro("");
    try {
      const papel = `ROLE_${form.role}`;
      const payload = {
        nome: form.nome.trim(),
        username: form.username.trim(),
        email: form.email.trim(),
        role: papel,
        // senha nula/vazia mantém a atual na edição
        senha: form.senha ? form.senha : null,
      };
      if (ehNovo) {
        await api.post("/usuarios", payload);
        setSucesso(`Usuário ${payload.username} criado com sucesso.`);
      } else {
        await api.put(`/usuarios/${form.id}`, payload);
        setSucesso(`Usuário ${payload.username} atualizado.`);
      }
      setForm(null);
      await carregar();
    } catch (error) {
      setErro(mensagemDeErro(error));
    } finally {
      setSalvando(false);
    }
  }

  async function excluir(usuario: UsuarioSistema) {
    if (
      !window.confirm(
        `Excluir o usuário "${usuario.username}"? Esta ação não pode ser desfeita.`,
      )
    ) {
      return;
    }
    setErro("");
    setSucesso("");
    try {
      await api.delete(`/usuarios/${usuario.id}`);
      setSucesso(`Usuário ${usuario.username} excluído.`);
      await carregar();
    } catch (error) {
      setErro(mensagemDeErro(error));
    }
  }

  return (
    <main style={{ padding: "28px 36px" }}>
      <PageHeader
        titulo="Acesso"
        subtitulo="Gerencie os usuários e os níveis de acesso do sistema."
        acoes={
          <Button variant="primary" onClick={abrirNovo}>
            + Novo usuário
          </Button>
        }
      />

      {erro && (
        <div
          style={{
            background: "#fee2e2",
            color: "#b91c1c",
            borderRadius: 10,
            padding: 14,
            fontSize: 13,
            marginBottom: 16,
          }}
        >
          {erro}
        </div>
      )}
      {sucesso && (
        <div
          style={{
            background: "#dcfce7",
            color: "#15803d",
            borderRadius: 10,
            padding: 14,
            fontSize: 13,
            marginBottom: 16,
          }}
        >
          {sucesso}
        </div>
      )}

      {/* Perfis de acesso */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
          gap: 12,
          marginBottom: 20,
        }}
      >
        {PERFIS.map((perfil) => (
          <div
            key={perfil.valor}
            style={{
              background: "#fff",
              border: `1px solid ${CORES.borda}`,
              borderRadius: 12,
              padding: 16,
            }}
          >
            <span
              style={{
                display: "inline-block",
                background: perfil.cor.fundo,
                color: perfil.cor.texto,
                borderRadius: 999,
                padding: "3px 12px",
                fontSize: 11,
                fontWeight: 700,
                marginBottom: 8,
              }}
            >
              {rotuloRole(perfil.valor)}
            </span>
            <p
              style={{
                margin: "0 0 4px",
                fontSize: 13,
                fontWeight: 700,
                color: CORES.titulo,
              }}
            >
              {perfil.titulo}
            </p>
            <p
              style={{
                margin: 0,
                fontSize: 12,
                color: CORES.textoSuave,
                lineHeight: 1.5,
              }}
            >
              {perfil.descricao}
            </p>
          </div>
        ))}
      </div>

      {/* Lista de usuários */}
      <div
        style={{
          background: "#fff",
          border: `1px solid ${CORES.borda}`,
          borderRadius: 12,
          overflow: "auto",
        }}
      >
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th style={th}>Nome</th>
              <th style={th}>Usuário</th>
              <th style={th}>E-mail</th>
              <th style={th}>Perfil</th>
              <th style={th}>Criado em</th>
              <th style={{ ...th, textAlign: "right" }}>Ações</th>
            </tr>
          </thead>
          <tbody>
            {carregando && (
              <tr>
                <td style={{ ...td, color: "#94a3b8" }} colSpan={6}>
                  Carregando usuários…
                </td>
              </tr>
            )}
            {!carregando && usuarios.length === 0 && !erro && (
              <tr>
                <td style={{ ...td, color: "#94a3b8" }} colSpan={6}>
                  Nenhum usuário cadastrado.
                </td>
              </tr>
            )}
            {usuarios.map((usuario) => {
              const papel = usuario.role.replace(/^ROLE_/, "");
              return (
                <tr key={usuario.id}>
                  <td style={{ ...td, fontWeight: 600, color: "#16233b" }}>
                    {usuario.nome}
                  </td>
                  <td style={td}>{usuario.username}</td>
                  <td style={td}>{usuario.email || "—"}</td>
                  <td style={td}>
                    <span
                      style={{
                        background: corPapel(usuario.role).fundo,
                        color: corPapel(usuario.role).texto,
                        borderRadius: 999,
                        padding: "3px 10px",
                        fontSize: 11,
                        fontWeight: 700,
                      }}
                    >
                      {rotuloRole(papel === "USER" ? "" : papel)}
                    </span>
                  </td>
                  <td style={td}>{formatDataHora(usuario.criadoEm)}</td>
                  <td style={{ ...td, textAlign: "right", whiteSpace: "nowrap" }}>
                    <button
                      type="button"
                      onClick={() => abrirEdicao(usuario)}
                      style={{
                        border: "none",
                        background: "none",
                        color: CORES.primaria,
                        fontWeight: 600,
                        fontSize: 13,
                        cursor: "pointer",
                        padding: "4px 6px",
                      }}
                    >
                      Editar
                    </button>
                    <button
                      type="button"
                      onClick={() => void excluir(usuario)}
                      style={{
                        border: "none",
                        background: "none",
                        color: "#b91c1c",
                        fontWeight: 600,
                        fontSize: 13,
                        cursor: "pointer",
                        padding: "4px 6px",
                      }}
                    >
                      Excluir
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Diálogo de criação/edição */}
      {form && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(15,23,42,0.45)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 50,
            padding: 20,
          }}
        >
          <div
            style={{
              background: "#fff",
              borderRadius: 14,
              padding: 24,
              width: "100%",
              maxWidth: 460,
              maxHeight: "90vh",
              overflow: "auto",
              boxShadow: "0 24px 60px rgba(15,23,42,0.35)",
              fontFamily: "'Nunito', sans-serif",
            }}
          >
            <h2
              style={{
                margin: "0 0 4px",
                fontSize: 17,
                color: CORES.titulo,
                fontWeight: 700,
              }}
            >
              {form.id ? "Editar usuário" : "Novo usuário"}
            </h2>
            <p
              style={{
                margin: "0 0 18px",
                fontSize: 12,
                color: CORES.textoSuave,
              }}
            >
              {form.id
                ? "Deixe a senha em branco para manter a senha atual."
                : "Informe os dados e o perfil de acesso (mínimo 6 caracteres na senha)."}
            </p>

            <div style={{ marginBottom: 14 }}>
              <label style={rotulo}>
                Nome completo <span style={{ color: "#b91c1c" }}>*</span>
              </label>
              <input
                style={campo(err.nome)}
                value={form.nome}
                onChange={(e) => {
                  setForm({ ...form, nome: e.target.value });
                  setErr((x) => ({ ...x, nome: false }));
                  setErro("");
                }}
                placeholder="Ex.: Maria da Silva"
              />
              {err.nome && <div style={erroTexto}>Informe o nome.</div>}
            </div>

            <div style={{ marginBottom: 14 }}>
              <label style={rotulo}>
                Usuário (login) <span style={{ color: "#b91c1c" }}>*</span>
              </label>
              <input
                style={campo(err.username)}
                value={form.username}
                onChange={(e) => {
                  setForm({ ...form, username: e.target.value });
                  setErr((x) => ({ ...x, username: false }));
                  setErro("");
                }}
                placeholder="Ex.: maria.silva"
                autoComplete="username"
              />
              {err.username && <div style={erroTexto}>Informe o usuário.</div>}
            </div>

            <div style={{ marginBottom: 14 }}>
              <label style={rotulo}>E-mail</label>
              <input
                style={campo(err.email)}
                value={form.email}
                onChange={(e) => {
                  setForm({ ...form, email: e.target.value });
                  setErr((x) => ({ ...x, email: false }));
                  setErro("");
                }}
                placeholder="nome@dominio.com"
                inputMode="email"
                autoComplete="email"
              />
              {err.email && <div style={erroTexto}>E-mail inválido.</div>}
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 14,
                marginBottom: 6,
              }}
            >
              <div>
                <label style={rotulo}>
                  Perfil de acesso{" "}
                  <span style={{ color: "#b91c1c" }}>*</span>
                </label>
                <select
                  style={campo(err.role)}
                  value={form.role}
                  onChange={(e) => {
                    setForm({ ...form, role: e.target.value });
                    setErr((x) => ({ ...x, role: false }));
                    setErro("");
                  }}
                >
                  <option value="">Selecione</option>
                  {PERFIS.map((perfil) => (
                    <option key={perfil.valor} value={perfil.valor}>
                      {rotuloRole(perfil.valor)}
                    </option>
                  ))}
                </select>
                {err.role && (
                  <div style={erroTexto}>Escolha o perfil de acesso.</div>
                )}
              </div>

              <div>
                <label style={rotulo}>
                  Senha {!form.id && <span style={{ color: "#b91c1c" }}>*</span>}
                </label>
                <input
                  type="password"
                  style={campo(err.senha)}
                  value={form.senha}
                  onChange={(e) => {
                    setForm({ ...form, senha: e.target.value });
                    setErr((x) => ({ ...x, senha: false }));
                    setErro("");
                  }}
                  placeholder={form.id ? "Manter atual" : "Mínimo 6 caracteres"}
                  autoComplete="new-password"
                />
                {err.senha && (
                  <div style={erroTexto}>
                    {form.id
                      ? "A senha, se informada, precisa ter 6+ caracteres."
                      : "A senha é obrigatória (6+ caracteres)."}
                  </div>
                )}
              </div>
            </div>

            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                gap: 10,
                marginTop: 18,
              }}
            >
              <Button variant="secondary" onClick={() => setForm(null)}>
                Cancelar
              </Button>
              <Button onClick={() => void salvar()} disabled={salvando}>
                {salvando ? "Salvando..." : "Salvar"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
