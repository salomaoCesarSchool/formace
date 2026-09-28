import { useEffect, useMemo, useState } from 'react';
import { Building2, Search, Users } from 'lucide-react';
import BadgeStatus, { varianteDoStatus } from '../components/BadgeStatus';
import { api, mensagemDeErro } from '../api/axios';
import { diasAte, formatBRL, rotuloVencimento } from '../utils/format';
import type { Contrato, Imovel, Locatario, StatusImovel } from '../types';

type Aba = 'imoveis' | 'locatarios';

/**
 * Tabela dos 124 imoveis (badges de status) e cadastro de locatarios.
 */
export default function ImoveisClientes() {
  const [aba, setAba] = useState<Aba>('imoveis');
  const [imoveis, setImoveis] = useState<Imovel[]>([]);
  const [locatarios, setLocatarios] = useState<Locatario[]>([]);
  const [contratos, setContratos] = useState<Contrato[]>([]);
  const [busca, setBusca] = useState('');
  const [filtroStatus, setFiltroStatus] = useState<'' | StatusImovel>('');
  const [erro, setErro] = useState('');
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get<Imovel[]>('/imoveis'),
      api.get<Locatario[]>('/locatarios'),
      api.get<Contrato[]>('/contratos'),
    ])
      .then(([respostaImoveis, respostaLocatarios, respostaContratos]) => {
        setImoveis(respostaImoveis.data);
        setLocatarios(respostaLocatarios.data);
        setContratos(respostaContratos.data);
      })
      .catch((error) => setErro(mensagemDeErro(error)))
      .finally(() => setCarregando(false));
  }, []);

  const contratoPorImovel = useMemo(() => {
    const mapa = new Map<number, Contrato>();
    contratos.forEach((contrato) => mapa.set(contrato.imovel.id, contrato));
    return mapa;
  }, [contratos]);

  const locatarioPorId = useMemo(() => {
    const mapa = new Map<number, Locatario>();
    locatarios.forEach((locatario) => mapa.set(locatario.id, locatario));
    return mapa;
  }, [locatarios]);

  const imoveisFiltrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    return imoveis.filter((imovel) => {
      if (filtroStatus && imovel.status !== filtroStatus) return false;
      if (!termo) return true;
      const alvo = [
        imovel.codigo,
        imovel.endereco,
        imovel.bairro,
        imovel.cidade,
        imovel.tipo,
        imovel.locatario?.nome ?? '',
      ]
        .join(' ')
        .toLowerCase();
      return alvo.includes(termo);
    });
  }, [imoveis, busca, filtroStatus]);

  const ocupados = imoveis.filter((imovel) => imovel.status === 'OCUPADO').length;
  const vagos = imoveis.length - ocupados;

  return (
    <div className="space-y-6">
      {/* Resumo */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="cartao flex items-center gap-4 p-5">
          <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-slate-100 text-slate-700">
            <Building2 size={20} />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Total de imoveis
            </p>
            <p className="text-2xl font-bold text-slate-900">{imoveis.length}</p>
          </div>
        </div>
        <div className="cartao flex items-center gap-4 p-5">
          <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700">
            <Building2 size={20} />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Ocupados</p>
            <p className="text-2xl font-bold text-slate-900">{ocupados}</p>
          </div>
        </div>
        <div className="cartao flex items-center gap-4 p-5">
          <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
            <Users size={20} />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Locatarios</p>
            <p className="text-2xl font-bold text-slate-900">{locatarios.length}</p>
          </div>
        </div>
      </div>

      {/* Abas + filtros */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex rounded-lg border border-slate-200 bg-white p-1">
          <button
            type="button"
            onClick={() => setAba('imoveis')}
            className={`rounded-md px-4 py-2 text-sm font-semibold transition ${
              aba === 'imoveis' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            Imoveis ({imoveis.length})
          </button>
          <button
            type="button"
            onClick={() => setAba('locatarios')}
            className={`rounded-md px-4 py-2 text-sm font-semibold transition ${
              aba === 'locatarios' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            Locatarios ({locatarios.length})
          </button>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-2.5 text-slate-400" />
            <input
              className="input-padrao w-72 pl-9"
              placeholder={
                aba === 'imoveis'
                  ? 'Buscar por codigo, endereco, bairro...'
                  : 'Buscar por nome, CPF/CNPJ, e-mail...'
              }
              value={busca}
              onChange={(evento) => setBusca(evento.target.value)}
            />
          </div>

          {aba === 'imoveis' && (
            <select
              className="input-padrao w-40"
              value={filtroStatus}
              onChange={(evento) => setFiltroStatus(evento.target.value as '' | StatusImovel)}
            >
              <option value="">Todos status</option>
              <option value="OCUPADO">Ocupados ({ocupados})</option>
              <option value="VAGO">Vagos ({vagos})</option>
            </select>
          )}
        </div>
      </div>

      {erro && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{erro}</p>
      )}

      <section className="cartao overflow-hidden">
        <div className="overflow-x-auto">
          {aba === 'imoveis' ? (
            <table className="min-w-full divide-y divide-slate-200">
              <thead>
                <tr>
                  <th className="cabecalho-tabela">Codigo</th>
                  <th className="cabecalho-tabela">Endereco</th>
                  <th className="cabecalho-tabela">Tipo</th>
                  <th className="cabecalho-tabela text-right">Aluguel</th>
                  <th className="cabecalho-tabela text-right">IPTU</th>
                  <th className="cabecalho-tabela">Locatario</th>
                  <th className="cabecalho-tabela">Contrato</th>
                  <th className="cabecalho-tabela">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {carregando && (
                  <tr>
                    <td className="celula-tabela" colSpan={8}>
                      Carregando imoveis...
                    </td>
                  </tr>
                )}
                {!carregando && imoveisFiltrados.length === 0 && (
                  <tr>
                    <td className="celula-tabela" colSpan={8}>
                      Nenhum imovel encontrado para a busca.
                    </td>
                  </tr>
                )}
                {!carregando &&
                  imoveisFiltrados.map((imovel) => {
                    const contrato = contratoPorImovel.get(imovel.id);
                    const dias = contrato ? diasAte(contrato.dataFim) : null;
                    const venceEmBreve = dias !== null && dias >= 0 && dias <= 90;

                    return (
                      <tr key={imovel.id} className="transition hover:bg-slate-50">
                        <td className="celula-tabela font-semibold text-slate-800">{imovel.codigo}</td>
                        <td className="celula-tabela">
                          {imovel.endereco}, {imovel.numero ?? 's/n'}
                          <span className="block text-xs text-slate-400">
                            {imovel.bairro} - {imovel.cidade}
                          </span>
                        </td>
                        <td className="celula-tabela">{imovel.tipo}</td>
                        <td className="celula-tabela whitespace-nowrap text-right">
                          {formatBRL(imovel.valorAluguel)}
                        </td>
                        <td className="celula-tabela whitespace-nowrap text-right">
                          {formatBRL(imovel.iptuMensal)}
                        </td>
                        <td className="celula-tabela">
                          {imovel.locatario ? (
                            <>
                              {imovel.locatario.nome}
                              <span className="block text-xs text-slate-400">
                                {imovel.locatario.cpfCnpj}
                              </span>
                            </>
                          ) : (
                            <span className="text-slate-400">-</span>
                          )}
                        </td>
                        <td className="celula-tabela whitespace-nowrap">
                          {contrato ? (
                            <span
                              className={`text-xs font-semibold ${
                                dias !== null && dias < 0 ? 'text-red-600' : 'text-slate-600'
                              }`}
                            >
                              {contrato.codigo}
                              <span className="block text-[11px] text-slate-400">
                                {rotuloVencimento(contrato.dataFim)}
                              </span>
                            </span>
                          ) : (
                            <span className="text-slate-400">sem contrato</span>
                          )}
                        </td>
                        <td className="celula-tabela whitespace-nowrap">
                          <div className="flex flex-wrap gap-1.5">
                            <BadgeStatus
                              texto={imovel.status === 'OCUPADO' ? 'Ocupado' : 'Vago'}
                              variante={varianteDoStatus(imovel.status)}
                            />
                            {venceEmBreve && (
                              <BadgeStatus texto="Vence em breve" variante="laranja" />
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          ) : (
            <table className="min-w-full divide-y divide-slate-200">
              <thead>
                <tr>
                  <th className="cabecalho-tabela">Nome</th>
                  <th className="cabecalho-tabela">CPF / CNPJ</th>
                  <th className="cabecalho-tabela">Telefone</th>
                  <th className="cabecalho-tabela">E-mail</th>
                  <th className="cabecalho-tabela">Cidade</th>
                  <th className="cabecalho-tabela">Imovel vinculado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {carregando && (
                  <tr>
                    <td className="celula-tabela" colSpan={6}>
                      Carregando locatarios...
                    </td>
                  </tr>
                )}
                {!carregando &&
                  locatarios
                    .filter((locatario) => {
                      const termo = busca.trim().toLowerCase();
                      if (!termo) return true;
                      return [locatario.nome, locatario.cpfCnpj, locatario.email ?? '']
                        .join(' ')
                        .toLowerCase()
                        .includes(termo);
                    })
                    .map((locatario) => {
                      const imovel = imoveis.find((item) => item.locatario?.id === locatario.id);
                      return (
                        <tr key={locatario.id} className="transition hover:bg-slate-50">
                          <td className="celula-tabela font-medium text-slate-800">{locatario.nome}</td>
                          <td className="celula-tabela whitespace-nowrap">{locatario.cpfCnpj}</td>
                          <td className="celula-tabela whitespace-nowrap">{locatario.telefone ?? '-'}</td>
                          <td className="celula-tabela">{locatario.email ?? '-'}</td>
                          <td className="celula-tabela">{locatario.cidade ?? '-'}</td>
                          <td className="celula-tabela">
                            {imovel ? (
                              <>
                                {imovel.codigo}
                                <span className="block text-xs text-slate-400">
                                  {imovel.endereco} - {imovel.bairro}
                                </span>
                              </>
                            ) : (
                              <span className="text-slate-400">sem imovel</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
              </tbody>
            </table>
          )}
        </div>
      </section>
    </div>
  );
}
