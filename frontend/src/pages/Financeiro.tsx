import { useCallback, useEffect, useState, type FormEvent } from 'react';
import {
  Download,
  FileText,
  Plus,
  ReceiptText,
  RefreshCw,
} from 'lucide-react';
import BadgeStatus from '../components/BadgeStatus';
import Modal from '../components/Modal';
import { api, baixarArquivo, mensagemDeErro } from '../api/axios';
import {
  formatBRL,
  formatData,
  formatMesReferencia,
  mesAtual,
  ultimoDiaDoMes,
} from '../utils/format';
import type {
  FluxoDiario,
  Imovel,
  LancamentoFinanceiro,
  LancamentoRequest,
  Locatario,
  NaturezaLancamento,
  TipoLancamento,
} from '../types';

const STATUS_OPCOES = ['', 'PAGO', 'PENDENTE', 'ATRASADO', 'CANCELADO'] as const;

const TIPOS_OPCOES: TipoLancamento[] = [
  'ALUGUEL',
  'IPTU',
  'TAXA_CONDOMINIO',
  'MANUTENCAO',
  'REPUBLICACAO',
  'DESPESA',
  'OUTROS',
];

function ultimosDias(quantidade: number): { de: string; ate: string } {
  const hoje = new Date();
  const inicio = new Date();
  inicio.setDate(hoje.getDate() - quantidade);
  const pad = (valor: number) => String(valor).padStart(2, '0');
  const formatar = (data: Date) =>
    `${data.getFullYear()}-${pad(data.getMonth() + 1)}-${pad(data.getDate())}`;
  return { de: formatar(inicio), ate: formatar(hoje) };
}

const FORM_INICIAL: LancamentoRequest = {
  imovelId: 0,
  locatarioId: 0,
  tipo: 'ALUGUEL',
  natureza: 'ENTRADA',
  valorAluguel: 0,
  valorIptu: 0,
  mesReferencia: mesAtual(),
  dataVencimento: `${mesAtual()}-10`,
  dataPagamento: '',
  descricao: '',
};

/**
 * Modulo financeiro: lancamentos, quitacao, download do recibo PDF e fluxo de caixa (RDD).
 */
export default function Financeiro() {
  const [lancamentos, setLancamentos] = useState<LancamentoFinanceiro[]>([]);
  const [imoveis, setImoveis] = useState<Imovel[]>([]);
  const [locatarios, setLocatarios] = useState<Locatario[]>([]);
  const [fluxo, setFluxo] = useState<FluxoDiario[]>([]);

  const [mes, setMes] = useState(mesAtual());
  const [status, setStatus] = useState<string>('');
  const [periodo, setPeriodo] = useState(ultimosDias(30));

  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');
  const [aviso, setAviso] = useState('');

  const [modalNovo, setModalNovo] = useState(false);
  const [form, setForm] = useState<LancamentoRequest>(FORM_INICIAL);

  const [quitar, setQuitar] = useState<LancamentoFinanceiro | null>(null);
  const [dataQuitacao, setDataQuitacao] = useState('');

  const [emitindo, setEmitindo] = useState<number | null>(null);

  const carregarLancamentos = useCallback(async () => {
    setCarregando(true);
    setErro('');
    try {
      const params: Record<string, string> = {};
      if (mes) params.mesReferencia = mes;
      if (status) params.status = status;
      const resposta = await api.get<LancamentoFinanceiro[]>('/financeiro/lancamentos', { params });
      setLancamentos(resposta.data);
    } catch (error) {
      setErro(mensagemDeErro(error));
    } finally {
      setCarregando(false);
    }
  }, [mes, status]);

  const carregarFluxo = useCallback(async () => {
    try {
      const resposta = await api.get<FluxoDiario[]>('/financeiro/fluxo-caixa', {
        params: { de: periodo.de, ate: periodo.ate },
      });
      setFluxo(resposta.data);
    } catch (error) {
      setErro(mensagemDeErro(error));
    }
  }, [periodo.de, periodo.ate]);

  useEffect(() => {
    void carregarLancamentos();
  }, [carregarLancamentos]);

  useEffect(() => {
    void carregarFluxo();
  }, [carregarFluxo]);

  useEffect(() => {
    api
      .get<Imovel[]>('/imoveis')
      .then((resposta) => setImoveis(resposta.data))
      .catch(() => setImoveis([]));
    api
      .get<Locatario[]>('/locatarios')
      .then((resposta) => setLocatarios(resposta.data))
      .catch(() => setLocatarios([]));
  }, []);

  function selecionarImovel(imovelId: number) {
    const imovel = imoveis.find((item) => item.id === imovelId);
    setForm((atual) => ({
      ...atual,
      imovelId,
      locatarioId: imovel?.locatario?.id ?? atual.locatarioId,
      valorAluguel: imovel?.valorAluguel ?? atual.valorAluguel,
      valorIptu: imovel?.iptuMensal ?? atual.valorIptu,
    }));
  }

  async function criarLancamento(evento: FormEvent) {
    evento.preventDefault();
    setAviso('');
    try {
      const payload: LancamentoRequest = {
        ...form,
        dataPagamento: form.dataPagamento || undefined,
        descricao: form.descricao || undefined,
      };
      await api.post('/financeiro/lancamentos', payload);
      setModalNovo(false);
      setForm({
        ...FORM_INICIAL,
        mesReferencia: mes,
        dataVencimento: `${mes}-10`,
      });
      setAviso('Lancamento criado com sucesso.');
      await carregarLancamentos();
      await carregarFluxo();
    } catch (error) {
      setErro(mensagemDeErro(error));
    }
  }

  async function confirmarQuitacao() {
    if (!quitar || !dataQuitacao) return;
    setAviso('');
    try {
      await api.post(`/financeiro/lancamentos/${quitar.id}/pagar`, { dataPagamento: dataQuitacao });
      setQuitar(null);
      setAviso('Lancamento quitado. Multa e juros recalculados pela data de pagamento.');
      await carregarLancamentos();
      await carregarFluxo();
    } catch (error) {
      setErro(mensagemDeErro(error));
    }
  }

  async function emitirRecibo(lancamento: LancamentoFinanceiro) {
    setEmitindo(lancamento.id);
    setErro('');
    try {
      const numero = lancamento.recibo?.numero;
      const nome = numero
        ? `recibo-${String(numero).padStart(6, '0')}.pdf`
        : `recibo-${String(lancamento.id).padStart(6, '0')}.pdf`;
      await baixarArquivo(`/financeiro/lancamentos/${lancamento.id}/recibo`, nome);
      setAviso('Recibo PDF emitido com sucesso.');
      await carregarLancamentos();
    } catch (error) {
      setErro(mensagemDeErro(error));
    } finally {
      setEmitindo(null);
    }
  }

  const totalFiltrado = lancamentos.reduce((soma, item) => soma + Number(item.valorTotal), 0);

  return (
    <div className="space-y-6">
      {/* Barra de filtros */}
      <div className="cartao flex flex-wrap items-end gap-4 p-4">
        <div>
          <label className="mb-1 block text-xs font-semibold text-slate-600">Mes de referencia</label>
          <input
            type="month"
            className="input-padrao w-44"
            value={mes}
            onChange={(evento) => setMes(evento.target.value)}
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-slate-600">Status</label>
          <select className="input-padrao w-44" value={status} onChange={(evento) => setStatus(evento.target.value)}>
            {STATUS_OPCOES.map((opcao) => (
              <option key={opcao || 'todos'} value={opcao}>
                {opcao || 'Todos'}
              </option>
            ))}
          </select>
        </div>

        <button type="button" className="botao-secundario" onClick={() => void carregarLancamentos()}>
          <RefreshCw size={16} />
          Atualizar
        </button>

        <div className="ml-auto flex items-center gap-4">
          <div className="text-right">
            <p className="text-xs text-slate-500">Total filtrado</p>
            <p className="text-lg font-bold text-slate-900">{formatBRL(totalFiltrado)}</p>
          </div>
          <button
            type="button"
            className="botao-primario"
            onClick={() => setModalNovo(true)}
          >
            <Plus size={16} />
            Novo lancamento
          </button>
        </div>
      </div>

      {erro && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{erro}</p>
      )}
      {aviso && (
        <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {aviso}
        </p>
      )}

      {/* Tabela de lancamentos */}
      <section className="cartao overflow-hidden">
        <div className="border-b border-slate-200 px-5 py-4">
          <h2 className="text-sm font-bold uppercase tracking-wide text-slate-700">
            Lancamentos de {mes ? formatMesReferencia(mes) : 'todos os meses'}
          </h2>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead>
              <tr>
                <th className="cabecalho-tabela">Ref.</th>
                <th className="cabecalho-tabela">Imovel</th>
                <th className="cabecalho-tabela">Locatario</th>
                <th className="cabecalho-tabela">Tipo</th>
                <th className="cabecalho-tabela">Vencimento</th>
                <th className="cabecalho-tabela">Pagamento</th>
                <th className="cabecalho-tabela text-right">Multa/Juros</th>
                <th className="cabecalho-tabela text-right">Valor total</th>
                <th className="cabecalho-tabela">Status</th>
                <th className="cabecalho-tabela text-right">Acoes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {carregando && (
                <tr>
                  <td className="celula-tabela" colSpan={10}>
                    Carregando lancamentos...
                  </td>
                </tr>
              )}
              {!carregando && lancamentos.length === 0 && (
                <tr>
                  <td className="celula-tabela" colSpan={10}>
                    Nenhum lancamento encontrado para os filtros informados.
                  </td>
                </tr>
              )}
              {!carregando &&
                lancamentos.map((lancamento) => (
                  <tr key={lancamento.id} className="transition hover:bg-slate-50">
                    <td className="celula-tabela whitespace-nowrap font-medium text-slate-800">
                      {formatMesReferencia(lancamento.mesReferencia)}
                    </td>
                    <td className="celula-tabela">
                      {lancamento.imovel.codigo}
                      <span className="block text-xs text-slate-400">{lancamento.imovel.bairro}</span>
                    </td>
                    <td className="celula-tabela">{lancamento.locatario?.nome ?? '-'}</td>
                    <td className="celula-tabela">
                      <span className="text-xs font-semibold text-slate-600">{lancamento.tipo}</span>
                      {lancamento.natureza === 'SAIDA' && (
                        <span className="ml-1 rounded bg-red-50 px-1.5 py-0.5 text-[10px] font-bold text-red-600">
                          SAIDA
                        </span>
                      )}
                    </td>
                    <td className="celula-tabela whitespace-nowrap">{formatData(lancamento.dataVencimento)}</td>
                    <td className="celula-tabela whitespace-nowrap">{formatData(lancamento.dataPagamento)}</td>
                    <td className="celula-tabela whitespace-nowrap text-right text-xs text-slate-500">
                      {formatBRL(lancamento.multa)} / {formatBRL(lancamento.juros)}
                    </td>
                    <td className="celula-tabela whitespace-nowrap text-right font-bold text-slate-900">
                      {formatBRL(lancamento.valorTotal)}
                    </td>
                    <td className="celula-tabela">
                      <BadgeStatus texto={lancamento.status} />
                    </td>
                    <td className="celula-tabela whitespace-nowrap text-right">
                      <div className="inline-flex gap-2">
                        <button
                          type="button"
                          className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-100 disabled:opacity-50"
                          onClick={() => void emitirRecibo(lancamento)}
                          disabled={
                            emitindo === lancamento.id ||
                            lancamento.natureza === 'SAIDA' ||
                            !lancamento.dataPagamento
                          }
                          title={
                            lancamento.dataPagamento
                              ? 'Emitir recibo numerado em PDF'
                              : 'Quitacao pendente: o recibo so sai apos o pagamento'
                          }
                        >
                          {emitindo === lancamento.id ? '...' : (
                            <>
                              <Download size={12} className="mr-1 inline" />
                              Recibo
                            </>
                          )}
                        </button>

                        {!lancamento.dataPagamento && lancamento.status !== 'CANCELADO' && (
                          <button
                            type="button"
                            className="rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1.5 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-100"
                            onClick={() => {
                              setQuitar(lancamento);
                              setDataQuitacao(new Date().toISOString().slice(0, 10));
                            }}
                          >
                            Quitar
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Fluxo de caixa / RDD */}
      <section className="cartao overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-5 py-4">
          <div>
            <h2 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-slate-700">
              <ReceiptText size={16} />
              Fluxo de caixa diario (RDD)
            </h2>
            <p className="text-xs text-slate-400">Entradas, saidas e saldo acumulado por dia</p>
          </div>

          <div className="flex items-end gap-3">
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600">De</label>
              <input
                type="date"
                className="input-padrao w-40"
                value={periodo.de}
                onChange={(evento) => setPeriodo((atual) => ({ ...atual, de: evento.target.value }))}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600">Ate</label>
              <input
                type="date"
                className="input-padrao w-40"
                value={periodo.ate}
                onChange={(evento) => setPeriodo((atual) => ({ ...atual, ate: evento.target.value }))}
              />
            </div>
            <button type="button" className="botao-secundario" onClick={() => void carregarFluxo()}>
              <RefreshCw size={14} />
              Calcular
            </button>
          </div>
        </div>

        <div className="max-h-96 overflow-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead>
              <tr>
                <th className="cabecalho-tabela">Data</th>
                <th className="cabecalho-tabela text-right">Entradas</th>
                <th className="cabecalho-tabela text-right">Saidas</th>
                <th className="cabecalho-tabela text-right">Saldo do dia</th>
                <th className="cabecalho-tabela text-right">Saldo acumulado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {fluxo.length === 0 && (
                <tr>
                  <td className="celula-tabela" colSpan={5}>
                    Sem movimentacao no periodo informado.
                  </td>
                </tr>
              )}
              {fluxo
                .filter((dia) => dia.entradas !== 0 || dia.saidas !== 0)
                .map((dia) => (
                  <tr key={dia.data} className="transition hover:bg-slate-50">
                    <td className="celula-tabela whitespace-nowrap">{formatData(dia.data)}</td>
                    <td className="celula-tabela whitespace-nowrap text-right text-emerald-700">
                      {formatBRL(dia.entradas)}
                    </td>
                    <td className="celula-tabela whitespace-nowrap text-right text-red-600">
                      {formatBRL(dia.saidas)}
                    </td>
                    <td className="celula-tabela whitespace-nowrap text-right font-semibold text-slate-800">
                      {formatBRL(dia.saldoDia)}
                    </td>
                    <td className="celula-tabela whitespace-nowrap text-right font-bold text-slate-900">
                      {formatBRL(dia.saldoAcumulado)}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Modal: novo lancamento */}
      <Modal
        aberto={modalNovo}
        titulo="Novo lancamento financeiro"
        aoFechar={() => setModalNovo(false)}
        largura="ampla"
        rodape={
          <>
            <button type="button" className="botao-secundario" onClick={() => setModalNovo(false)}>
              Cancelar
            </button>
            <button type="submit" form="form-lancamento" className="botao-primario">
              <FileText size={16} />
              Salvar lancamento
            </button>
          </>
        }
      >
        <form id="form-lancamento" onSubmit={criarLancamento} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="mb-1 block text-xs font-semibold text-slate-600">Imovel *</label>
            <select
              className="input-padrao"
              value={form.imovelId || ''}
              onChange={(evento) => selecionarImovel(Number(evento.target.value))}
              required
            >
              <option value="">Selecione o imovel</option>
              {imoveis.map((imovel) => (
                <option key={imovel.id} value={imovel.id}>
                  {imovel.codigo} - {imovel.endereco}, {imovel.bairro} ({imovel.status})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-600">Locatario *</label>
            <select
              className="input-padrao"
              value={form.locatarioId || ''}
              onChange={(evento) => setForm({ ...form, locatarioId: Number(evento.target.value) })}
              required
            >
              <option value="">Selecione o locatario</option>
              {locatarios.map((locatario) => (
                <option key={locatario.id} value={locatario.id}>
                  {locatario.nome} - {locatario.cpfCnpj}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-600">Tipo *</label>
            <select
              className="input-padrao"
              value={form.tipo}
              onChange={(evento) => setForm({ ...form, tipo: evento.target.value as TipoLancamento })}
              required
            >
              {TIPOS_OPCOES.map((tipo) => (
                <option key={tipo} value={tipo}>
                  {tipo.replace('_', ' ')}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-600">Natureza *</label>
            <select
              className="input-padrao"
              value={form.natureza}
              onChange={(evento) =>
                setForm({ ...form, natureza: evento.target.value as NaturezaLancamento })
              }
              required
            >
              <option value="ENTRADA">ENTRADA (receita)</option>
              <option value="SAIDA">SAIDA (despesa)</option>
            </select>
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-600">Mes de referencia *</label>
            <input
              type="month"
              className="input-padrao"
              value={form.mesReferencia}
              onChange={(evento) => setForm({ ...form, mesReferencia: evento.target.value })}
              required
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-600">Vencimento *</label>
            <input
              type="date"
              className="input-padrao"
              value={form.dataVencimento}
              onChange={(evento) => setForm({ ...form, dataVencimento: evento.target.value })}
              required
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-600">
              Data de pagamento (opcional)
            </label>
            <input
              type="date"
              className="input-padrao"
              value={form.dataPagamento ?? ''}
              onChange={(evento) => setForm({ ...form, dataPagamento: evento.target.value })}
            />
            <p className="mt-1 text-[11px] text-slate-400">
              Se posterior ao vencimento, multa (2%) e juros (1% a.m.) sao calculados automaticamente.
            </p>
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-600">Valor do aluguel *</label>
            <input
              type="number"
              step="0.01"
              min="0"
              className="input-padrao"
              value={form.valorAluguel}
              onChange={(evento) => setForm({ ...form, valorAluguel: Number(evento.target.value) })}
              required
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-600">Valor do IPTU *</label>
            <input
              type="number"
              step="0.01"
              min="0"
              className="input-padrao"
              value={form.valorIptu}
              onChange={(evento) => setForm({ ...form, valorIptu: Number(evento.target.value) })}
              required
            />
          </div>

          <div className="sm:col-span-2">
            <label className="mb-1 block text-xs font-semibold text-slate-600">Descricao</label>
            <input
              type="text"
              className="input-padrao"
              maxLength={300}
              placeholder="Ex.: Aluguel do mes 09/2026"
              value={form.descricao ?? ''}
              onChange={(evento) => setForm({ ...form, descricao: evento.target.value })}
            />
          </div>
        </form>
      </Modal>

      {/* Modal: quitar lancamento */}
      <Modal
        aberto={quitar !== null}
        titulo="Quitar lancamento"
        aoFechar={() => setQuitar(null)}
        rodape={
          <>
            <button type="button" className="botao-secundario" onClick={() => setQuitar(null)}>
              Cancelar
            </button>
            <button
              type="button"
              className="botao-primario"
              onClick={() => void confirmarQuitacao()}
              disabled={!dataQuitacao}
            >
              Confirmar quitacao
            </button>
          </>
        }
      >
        {quitar && (
          <div className="space-y-4">
            <div className="rounded-lg bg-slate-50 p-4 text-sm">
              <p className="font-semibold text-slate-800">
                {quitar.imovel.codigo} - {quitar.locatario?.nome ?? '-'}
              </p>
              <p className="text-slate-500">{quitar.descricao}</p>
              <p className="mt-1 text-xs text-slate-400">
                Vencimento: {formatData(quitar.dataVencimento)}
              </p>
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600">
                Data efetiva de pagamento *
              </label>
              <input
                type="date"
                className="input-padrao"
                value={dataQuitacao}
                onChange={(evento) => setDataQuitacao(evento.target.value)}
                required
              />
              <p className="mt-1 text-[11px] text-slate-400">
                Multa de 2% e juros de 1% ao mes serao recalculados conforme a data informada.
              </p>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
