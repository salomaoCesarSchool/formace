import { useCallback, useEffect, useState } from 'react';
import { FileCheck2, FileDown, Landmark, RefreshCw } from 'lucide-react';
import CardKPI from '../components/CardKPI';
import { api, baixarArquivo, mensagemDeErro } from '../api/axios';
import { formatBRL } from '../utils/format';
import type { RelatorioResumo } from '../types';

const ANO_ATUAL = new Date().getFullYear();
const ANOS = Array.from({ length: 6 }, (_, indice) => ANO_ATUAL - indice);

/**
 * Exportador do relatorio anual consolidado de prestacao de contas ao MP-SE.
 */
export default function RelatoriosMP() {
  const [ano, setAno] = useState(ANO_ATUAL);
  const [resumo, setResumo] = useState<RelatorioResumo | null>(null);
  const [erro, setErro] = useState('');
  const [aviso, setAviso] = useState('');
  const [carregando, setCarregando] = useState(true);
  const [gerando, setGerando] = useState(false);

  const carregar = useCallback(async () => {
    setCarregando(true);
    setErro('');
    try {
      const resposta = await api.get<RelatorioResumo>('/relatorios/mp-se/resumo', {
        params: { ano },
      });
      setResumo(resposta.data);
    } catch (error) {
      setErro(mensagemDeErro(error));
    } finally {
      setCarregando(false);
    }
  }, [ano]);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  async function gerarPdf() {
    setGerando(true);
    setErro('');
    setAviso('');
    try {
      await baixarArquivo(`/relatorios/mp-se?ano=${ano}`, `relatorio-mp-se-${ano}.pdf`);
      setAviso(`Relatorio anual de ${ano} gerado em PDF com sucesso.`);
    } catch (error) {
      setErro(mensagemDeErro(error));
    } finally {
      setGerando(false);
    }
  }

  const taxaOcupacao =
    resumo && resumo.totalImoveis > 0
      ? Math.round((resumo.imoveisOcupados * 100) / resumo.totalImoveis)
      : 0;

  return (
    <div className="space-y-6">
      {/* Seletor de exercicio */}
      <div className="cartao flex flex-wrap items-end justify-between gap-4 p-5">
        <div className="flex items-end gap-4">
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-600">Exercicio</label>
            <select
              className="input-padrao w-40"
              value={ano}
              onChange={(evento) => setAno(Number(evento.target.value))}
            >
              {ANOS.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </div>
          <button type="button" className="botao-secundario" onClick={() => void carregar()}>
            <RefreshCw size={16} />
            Recarregar resumo
          </button>
        </div>

        <button type="button" className="botao-primario" onClick={() => void gerarPdf()} disabled={gerando}>
          <FileDown size={16} />
          {gerando ? 'Gerando PDF...' : `Gerar relatorio consolidado ${ano}`}
        </button>
      </div>

      {erro && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{erro}</p>
      )}
      {aviso && (
        <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {aviso}
        </p>
      )}

      {/* Cards do resumo */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <CardKPI
          titulo="Receita prevista"
          valor={formatBRL(resumo?.receitaPrevista)}
          legenda={`Contratos ativos em ${ano}`}
          icone={Landmark}
          tom="azul"
        />
        <CardKPI
          titulo="Arrecadado no exercicio"
          valor={formatBRL(resumo?.arrecadado)}
          legenda={`${resumo?.lancamentosPagos ?? 0} lancamento(s) quitados`}
          icone={FileCheck2}
          tom="verde"
        />
        <CardKPI
          titulo="Em aberto"
          valor={formatBRL(resumo?.emAberto)}
          legenda={`${resumo?.lancamentosAbertos ?? 0} lancamento(s) pendentes`}
          icone={FileCheck2}
          tom="ambar"
        />
        <CardKPI
          titulo="Multas e juros"
          valor={formatBRL(resumo?.multasEJuros)}
          legenda="Arrecadados por atraso no exercicio"
          icone={FileCheck2}
          tom="vermelho"
        />
      </div>

      {/* Conteudo do relatorio + quadro resumo */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <section className="cartao overflow-hidden xl:col-span-2">
          <div className="border-b border-slate-200 px-5 py-4">
            <h2 className="text-sm font-bold uppercase tracking-wide text-slate-700">
              Quadro resumo do exercicio {ano}
            </h2>
          </div>

          {carregando ? (
            <p className="p-5 text-sm text-slate-500">Carregando resumo...</p>
          ) : resumo ? (
            <div className="grid grid-cols-1 gap-4 p-5 sm:grid-cols-2">
              {[
                ['Total de imoveis', String(resumo.totalImoveis)],
                ['Imoveis ocupados', `${resumo.imoveisOcupados} (${taxaOcupacao}%)`],
                ['Imoveis vagos', String(resumo.imoveisVagos)],
                ['Contratos ativos', String(resumo.contratosAtivos)],
                ['Lancamentos no exercicio', String(resumo.totalLancamentos)],
                ['Lancamentos quitados', String(resumo.lancamentosPagos)],
                ['Lancamentos em aberto', String(resumo.lancamentosAbertos)],
                ['Arrecadacao liquida', formatBRL(resumo.arrecadado)],
              ].map(([rotulo, valor]) => (
                <div key={rotulo} className="rounded-lg border border-slate-100 bg-slate-50 px-4 py-3">
                  <p className="text-xs text-slate-500">{rotulo}</p>
                  <p className="text-lg font-bold text-slate-900">{valor}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="p-5 text-sm text-slate-500">Resumo indisponivel.</p>
          )}
        </section>

        <section className="cartao p-5">
          <h2 className="text-sm font-bold uppercase tracking-wide text-slate-700">
            O que o PDF contem
          </h2>
          <ol className="mt-3 space-y-3 text-sm text-slate-600">
            <li className="flex gap-2">
              <span className="font-bold text-slate-400">1.</span> Capa com fundacao, CNPJ e exercicio
            </li>
            <li className="flex gap-2">
              <span className="font-bold text-slate-400">2.</span> Quadro resumo da carteira de 124
              imoveis (ocupados x vagos)
            </li>
            <li className="flex gap-2">
              <span className="font-bold text-slate-400">3.</span> Resultado financeiro consolidado
              (previsto, arrecadado, em aberto e multas/juros)
            </li>
            <li className="flex gap-2">
              <span className="font-bold text-slate-400">4.</span> Memoria cronologica de todos os
              lancamentos do exercicio
            </li>
            <li className="flex gap-2">
              <span className="font-bold text-slate-400">5.</span> Demonstrativo por imovel com
              locatario e valores recebidos
            </li>
            <li className="flex gap-2">
              <span className="font-bold text-slate-400">6.</span> Declaracao final com linhas de
              assinatura e rodape numerado
            </li>
          </ol>

          <button
            type="button"
            className="botao-primario mt-5 w-full"
            onClick={() => void gerarPdf()}
            disabled={gerando}
          >
            <FileDown size={16} />
            {gerando ? 'Gerando...' : 'Baixar PDF para o MP-SE'}
          </button>

          <p className="mt-3 text-[11px] leading-relaxed text-slate-400">
            Destinatario: Ministerio Publico de Sergipe (MP-SE). O documento e gerado pelo backend
            (OpenPDF) com paginacao automatica e numeracao de paginas.
          </p>
        </section>
      </div>
    </div>
  );
}
