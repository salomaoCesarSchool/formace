import { useEffect, useState } from 'react';
import {
  AlertTriangle,
  Building2,
  ClockAlert,
  TrendingUp,
  Wallet,
} from 'lucide-react';
import CardKPI from '../components/CardKPI';
import BadgeStatus from '../components/BadgeStatus';
import { api, mensagemDeErro } from '../api/axios';
import { formatBRL, formatData, formatMesReferencia } from '../utils/format';
import type { DashboardData } from '../types';

/**
 * Dashboard com cards de KPI, ultimos lancamentos e painel de alertas.
 */
export default function Dashboard() {
  const [dados, setDados] = useState<DashboardData | null>(null);
  const [erro, setErro] = useState('');
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    api
      .get<DashboardData>('/dashboard')
      .then((resposta) => setDados(resposta.data))
      .catch((error) => setErro(mensagemDeErro(error)))
      .finally(() => setCarregando(false));
  }, []);

  if (carregando) {
    return <p className="text-sm text-slate-500">Carregando indicadores...</p>;
  }

  if (erro || !dados) {
    return (
      <div className="cartao border-red-200 bg-red-50 p-6 text-sm text-red-700">
        {erro || 'Nao foi possivel carregar o dashboard.'}
      </div>
    );
  }

  const taxaOcupacao = dados.totalImoveis > 0
    ? Math.round((dados.imoveisOcupados * 100) / dados.totalImoveis)
    : 0;

  return (
    <div className="space-y-6">
      {/* Cards de KPI */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <CardKPI
          titulo="Ocupacao da carteira"
          valor={`${dados.imoveisOcupados}/${dados.totalImoveis} ocupados`}
          legenda={`${dados.imoveisVagos} imovel(is) vago(s) - ${taxaOcupacao}% de ocupacao`}
          icone={Building2}
          tom="verde"
        />
        <CardKPI
          titulo={`Receita ${formatMesReferencia(dados.mesReferencia)}`}
          valor={formatBRL(dados.receitaMes)}
          legenda="Alugueis e taxas quitados no mes"
          icone={Wallet}
          tom="azul"
        />
        <CardKPI
          titulo="Contratos a vencer"
          valor={`${dados.contratosAVencer}`}
          legenda={`${dados.contratosAtivos} contrato(s) ativo(s) - janela de 90 dias`}
          icone={ClockAlert}
          tom="ambar"
        />
        <CardKPI
          titulo="Em aberto"
          valor={formatBRL(dados.pendentesMes)}
          legenda={`${dados.lancamentosPendentes} lancamento(s) pendente(s) ou atrasado(s)`}
          icone={TrendingUp}
          tom="vermelho"
        />
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        {/* Ultimos lancamentos */}
        <section className="cartao overflow-hidden xl:col-span-2">
          <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
            <h2 className="text-sm font-bold uppercase tracking-wide text-slate-700">
              Ultimos lancamentos
            </h2>
            <span className="text-xs text-slate-400">{dados.ultimosLancamentos.length} registros</span>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead>
                <tr>
                  <th className="cabecalho-tabela">Referencia</th>
                  <th className="cabecalho-tabela">Imovel</th>
                  <th className="cabecalho-tabela">Locatario</th>
                  <th className="cabecalho-tabela text-right">Valor</th>
                  <th className="cabecalho-tabela">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {dados.ultimosLancamentos.length === 0 && (
                  <tr>
                    <td className="celula-tabela" colSpan={5}>
                      Nenhum lancamento registrado.
                    </td>
                  </tr>
                )}
                {dados.ultimosLancamentos.map((lancamento) => (
                  <tr key={lancamento.id} className="transition hover:bg-slate-50">
                    <td className="celula-tabela whitespace-nowrap font-medium text-slate-800">
                      {formatMesReferencia(lancamento.mesReferencia)}
                    </td>
                    <td className="celula-tabela">
                      {lancamento.imovel.codigo}
                      <span className="block text-xs text-slate-400">
                        {lancamento.imovel.bairro}
                      </span>
                    </td>
                    <td className="celula-tabela">
                      {lancamento.locatario?.nome ?? '-'}
                    </td>
                    <td className="celula-tabela whitespace-nowrap text-right font-semibold text-slate-900">
                      {formatBRL(lancamento.valorTotal)}
                    </td>
                    <td className="celula-tabela">
                      <BadgeStatus texto={lancamento.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Alertas */}
        <section className="cartao overflow-hidden">
          <div className="flex items-center gap-2 border-b border-slate-200 px-5 py-4">
            <AlertTriangle size={16} className="text-amber-500" />
            <h2 className="text-sm font-bold uppercase tracking-wide text-slate-700">Alertas</h2>
          </div>
          <ul className="max-h-[420px] divide-y divide-slate-100 overflow-y-auto">
            {dados.alertas.map((alerta, indice) => (
              <li key={`${alerta.tipo}-${indice}`} className="flex gap-3 px-5 py-3">
                <span
                  className={[
                    'mt-1 h-2.5 w-2.5 shrink-0 rounded-full',
                    alerta.severidade === 'critico'
                      ? 'bg-red-500'
                      : alerta.severidade === 'atencao'
                        ? 'bg-amber-500'
                        : 'bg-blue-500',
                  ].join(' ')}
                />
                <div>
                  <p className="text-sm text-slate-700">{alerta.mensagem}</p>
                </div>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}
