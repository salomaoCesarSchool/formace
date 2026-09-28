import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, Lock, User } from 'lucide-react';
import { api, mensagemDeErro, salvarSessao } from '../api/axios';
import type { AuthResponse } from '../types';

/**
 * Tela de autenticacao (JWT).
 */
export default function Login() {
  const navigate = useNavigate();
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('');
  const [erro, setErro] = useState('');
  const [carregando, setCarregando] = useState(false);

  async function entrar(evento: FormEvent) {
    evento.preventDefault();
    setErro('');
    setCarregando(true);
    try {
      const { data } = await api.post<AuthResponse>('/auth/login', { username, password });
      salvarSessao(data.token, data.username, data.nome, data.role);
      navigate('/');
    } catch (error) {
      setErro(mensagemDeErro(error));
    } finally {
      setCarregando(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-[#101828] to-[#1E293B] p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-2xl">
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-slate-900">
            <Building2 size={28} className="text-white" />
          </div>
          <h1 className="mt-4 text-2xl font-bold text-slate-900">FORMACE</h1>
          <p className="text-sm text-slate-500">Fundacao Manuel Cruz - Gestao de imoveis</p>
        </div>

        <form onSubmit={entrar} className="space-y-4">
          <div>
            <label htmlFor="username" className="mb-1 block text-xs font-semibold text-slate-600">
              Usuario
            </label>
            <div className="relative">
              <User size={16} className="absolute left-3 top-3 text-slate-400" />
              <input
                id="username"
                className="input-padrao pl-9"
                value={username}
                onChange={(evento) => setUsername(evento.target.value)}
                autoComplete="username"
                required
              />
            </div>
          </div>

          <div>
            <label htmlFor="password" className="mb-1 block text-xs font-semibold text-slate-600">
              Senha
            </label>
            <div className="relative">
              <Lock size={16} className="absolute left-3 top-3 text-slate-400" />
              <input
                id="password"
                type="password"
                className="input-padrao pl-9"
                value={password}
                onChange={(evento) => setPassword(evento.target.value)}
                autoComplete="current-password"
                placeholder="admin123"
                required
              />
            </div>
          </div>

          {erro && (
            <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
              {erro}
            </p>
          )}

          <button type="submit" className="botao-primario w-full" disabled={carregando}>
            {carregando ? 'Autenticando...' : 'Entrar'}
          </button>

          <p className="text-center text-[11px] text-slate-400">
            Acesso inicial: admin / admin123
          </p>
        </form>
      </div>
    </div>
  );
}
