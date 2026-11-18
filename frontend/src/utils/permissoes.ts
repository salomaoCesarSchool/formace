import { sessaoAtual } from "../api/axios";

/**
 * Niveis de acesso do sistema.
 *
 * Matriz de permissoes (frontend + backend):
 *  - ADMIN    : tudo, inclusive gestao de usuarios (/acesso);
 *  - GESTOR   : tudo exceto gestao de usuarios;
 *  - OPERADOR : visao geral, imoveis/locatarios e contratos
 *               (sem financeiro, sem relatorios, sem usuarios).
 */
export type Papel = "ADMIN" | "GESTOR" | "OPERADOR";

/** Converte o role do JWT (ex.: ROLE_ADMIN) no rotulo exibido na interface. */
export function rotuloRole(role?: string | null): string {
  const limpo = (role ?? "").replace(/^ROLE_/, "").toUpperCase();
  if (limpo === "ADMIN") return "Administrador";
  // Requisitos definem o perfil como "Gerente" (o Figma exibe "Gestor" no selo).
  if (limpo === "GESTOR") return "Gerente";
  if (limpo === "OPERADOR") return "Operador";
  return "Usuário";
}

/** Papel normalizado da sessao atual (null sem sessao). */
export function papelAtual(): Papel | null {
  const papel = (sessaoAtual()?.role ?? "").replace(/^ROLE_/, "").toUpperCase();
  if (papel === "ADMIN" || papel === "GESTOR" || papel === "OPERADOR") {
    return papel;
  }
  // Contas antigas criadas sem role explicita entram como ADMIN (comportamento
  // legado do @PrePersist da entidade Usuario).
  return papel ? "ADMIN" : null;
}

/** Somente o administrador gerencia usuarios (/acesso). */
export function podeGerenciarUsuarios(): boolean {
  return papelAtual() === "ADMIN";
}

/** Financeiro e relatorios: administrador ou gestor. */
export function podeVerFinanceiro(): boolean {
  const papel = papelAtual();
  return papel === "ADMIN" || papel === "GESTOR";
}

/** Gesto de cadastros e contratos: todos os niveis (inclusive operador). */
export function podeGerenciarCadastros(): boolean {
  return papelAtual() !== null;
}
