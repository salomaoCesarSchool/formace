import axios, { AxiosError } from 'axios';
import type { ApiErro } from '../types';

export const TOKEN_KEY = 'formace_token';
export const USER_KEY = 'formace_user';

/**
 * Instancia axios da API. O token JWT e anexado automaticamente em cada requisicao
 * e um 401 limpa a sessao (evita loops com a tela de login).
 */
export const api = axios.create({
  baseURL: '/api',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY);
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error: AxiosError<ApiErro>) => {
    const url = error.config?.url ?? '';
    const expirou = error.response?.status === 401 && !url.includes('/auth/login');
    if (expirou) {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
      if (!window.location.pathname.includes('/login')) {
        window.location.assign('/login');
      }
    }
    return Promise.reject(error);
  },
);

/** Converte um erro axios em mensagem legivel para o usuario. */
export function mensagemDeErro(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as ApiErro | undefined;
    if (data?.campos) {
      return Object.values(data.campos).join(' | ');
    }
    if (data?.mensagem) {
      return data.mensagem;
    }
    if (error.response?.status === 401) {
      return 'Sessao expirada. Faca login novamente.';
    }
    if (error.response?.status === 403) {
      return 'Voce nao tem permissao para esta acao.';
    }
    if (error.response?.status === 404) {
      return 'Registro nao encontrado.';
    }
    return `Falha na comunicacao com a API (${error.response?.status ?? 'sem resposta'})`;
  }
  return 'Erro inesperado. Tente novamente.';
}

/** Baixa um arquivo (PDF) servido pela API e salva no computador do usuario. */
export async function baixarArquivo(url: string, nomeArquivo: string): Promise<void> {
  const response = await api.get(url, { responseType: 'blob' });
  const objectUrl = URL.createObjectURL(response.data);
  const anchor = document.createElement('a');
  anchor.href = objectUrl;
  anchor.download = nomeArquivo;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(objectUrl);
}

export function salvarSessao(token: string, username: string, nome: string, role: string): void {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify({ username, nome, role }));
}

export function sessaoAtual(): { username: string; nome: string; role: string } | null {
  const bruto = localStorage.getItem(USER_KEY);
  if (!bruto || !localStorage.getItem(TOKEN_KEY)) {
    return null;
  }
  try {
    return JSON.parse(bruto) as { username: string; nome: string; role: string };
  } catch {
    return null;
  }
}

export function encerrarSessao(): void {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}
