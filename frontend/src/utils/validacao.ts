/**
 * Validacoes de campos obrigatorios dos cadastros (cliente/locatario e fiador):
 * CPF (digitos verificadores), e-mail (formato) e telefone (DDD + numero).
 */

const somenteDigitos = (valor: string) => (valor ?? "").replace(/\D/g, "");

/**
 * Valida CPF pelo calculo dos dois digitos verificadores.
 * CPFs sinteticos de demonstracao (padrao sequencial) sao considerados
 * invalidos — por isso a checagem e aplicada apenas em cadastro novo.
 */
export function validaCPF(cpf: string): boolean {
  const c = somenteDigitos(cpf);
  if (c.length !== 11 || /^(\d)\1+$/.test(c)) return false;

  let soma = 0;
  for (let i = 0; i < 9; i++) soma += parseInt(c[i], 10) * (10 - i);
  let d1 = (soma * 10) % 11;
  if (d1 === 10) d1 = 0;
  if (d1 !== parseInt(c[9], 10)) return false;

  soma = 0;
  for (let i = 0; i < 10; i++) soma += parseInt(c[i], 10) * (11 - i);
  let d2 = (soma * 10) % 11;
  if (d2 === 10) d2 = 0;
  return d2 === parseInt(c[10], 10);
}

/** Formato minimo exigido de CPF/CNPJ: 11 ou 14 digitos (com ou sem mascara). */
export function documentoPreenchido(documento: string): boolean {
  const d = somenteDigitos(documento);
  return d.length === 11 || d.length === 14;
}

/** E-mail: exige usuario@dominio.tld. */
export function validaEmail(email: string): boolean {
  const valor = (email ?? "").trim();
  if (!valor) return false;
  return /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/.test(valor);
}

/** Telefone: DDD + numero, 10 ou 11 digitos (fixo ou celular). */
export function validaTelefone(telefone: string): boolean {
  const d = somenteDigitos(telefone);
  return d.length === 10 || d.length === 11;
}

/** Conta os digitos de um valor (auxilio em mascaras). */
export function digitos(valor: string): number {
  return somenteDigitos(valor).length;
}

/** Aplica mascara de CPF (000.000.000-00) enquanto o usuario digita. */
export function mascaraCPF(valor: string): string {
  const d = somenteDigitos(valor).slice(0, 11);
  return d
    .replace(/^(\d{3})(\d)/, "$1.$2")
    .replace(/^(\d{3})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d{1,2})$/, ".$1-$2");
}

/** Aplica mascara de telefone ((00) 00000-0000) enquanto o usuario digita. */
export function mascaraTelefone(valor: string): string {
  const d = somenteDigitos(valor).slice(0, 11);
  if (d.length <= 2) return d.length ? `(${d}` : "";
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10)
    return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}
