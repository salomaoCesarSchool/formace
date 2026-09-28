import { useCallback, useEffect, useState, type ChangeEvent } from 'react';
import { ExternalLink, FileUp, Link2, RefreshCw } from 'lucide-react';
import BadgeStatus from '../components/BadgeStatus';
import Modal from '../components/Modal';
import { api, baixarArquivo, mensagemDeErro } from '../api/axios';
import { diasAte, formatBRL, formatData, rotuloVencimento } from '../utils/format';
import type { Contrato, StatusContrato } from '../types';

type Filtro = 'TODOS' | 'VENCENDO' | StatusContrato;

/**
 * Grid de contratos digitalizados com alertas de vencimento e envio/link do PDF.
 */
export default function Contratos() {
  const [contratos, setContratos] = useState<Contrato[]>([]);
  const [filtro, setFiltro] = useState<Filtro>('TODOS');
  const [erro, setErro] = useState('');
  const [aviso, setAviso] = useState('');
  const [carregando, setCarregando] = useState(true);

  const [contratoLink, setContratoLink] = useState<Contrato | null>(null);
  const [urlLink, setUrlLink] = useState('');
  const [contratoUpload, setContratoUpload] = useState<Contrato | null>(null);
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [enviando, setEnviando] = useState(false);

  const carregar = useCallback(async () => {
    setCarregando(true);
    setErro('');
    try {
      const params =
        filtro === 'VENCENDO'
          ? { vencendoDias: 90 }
          : filtro === 'TODOS'
            ? {}
            : { status: filtro };
      const resposta = await api.get<Contrato[]>('/contratos', { params });
      setContratos(resposta.data);
    } catch (error) {
      setErro(mensagemDeErro(error));
    } finally {
      setCarregando(false);
    }
  }, [filtro]);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  async function abrirPdf(contrato: Contrato) {
    setErro('');
    try {
      const resposta = await api.get(`/contratos/${contrato.id}/pdf`, { responseType: 'blob' });
      const objectUrl = URL.createObjectURL(resposta.data);
      window.open(objectUrl, '_blank', 'noopener');
      setTimeout(() => URL.revokeObjectURL(objectUrl), 60000);
    } catch {
      if (contrato.pdfUrl) {
        window.open(contrato.pdfUrl, '_blank', 'noopener');
      } else {
        setErro(`O contrato ${contrato.codigo} ainda nao possui PDF enviado ou link cadastrado.`);
      }
    }
  }

  function enviarLink() {
    if (!contratoLink || !urlLink.trim()) return;
    api
      .put(`/contratos/${contratoLink.id}/pdf-link`, { pdfUrl: urlLink.trim() })
      .then(() => {
        setAviso(`Link do contrato ${contratoLink.codigo} atualizado.`);
        setContratoLink(null);
        setUrlLink('');
        return carregar();
      })
      .catch((error) => setErro(mensagemDeErro(error)));
  }

  async function enviarArquivo(evento: ChangeEvent<HTMLInputElement>) {
    const selecionado = evento.target.files?.[0];
    if (!selecionado || !contratoUpload) return;

    setEnviando(true);
    setErro('');
    const dados = new FormData();
    dados.append('file', selecionado);
    try {
      await api.post(`/contratos/${contratoUpload.id}/pdf`, dados, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setAviso(`PDF do contrato ${contratoUpload.codigo} enviado com sucesso.`);
      setContratoUpload(null);
      setArquivo(null);
      await carregar();
    } catch (error) {
      setErro(mensagemDeErro(error));
    } finally {
      setEnviando(false);
      evento.target.value = '';
    }
  }

  function baixarPdf(contrato: Contrato) {
    void baixarArquivo(`/contratos/${contrato.id}/pdf`, `${contrato.codigo}.pdf`).catch((error) =>
      setErro(mensagemDeErro(error)),
    );
  }

  const vencendo = contratos.filter((contrato) => {
    const dias = diasAte(contrato.dataFim);
    return dias >= 0 && dias <= 90;
  }).length;

  return (
    <div className="space-y-6">
      {/* Barra de filtros */}
      <div className="cartao flex flex-wrap items-center justify-between gap-4 p-4">
        <div className="flex flex-wrap gap-2">
          {(
            [
              ['TODOS', 'Todos'],
              ['VENCENDO', `A vencer em 90 dias (${vencendo})`],
              ['ATIVO', 'Ativos'],
              ['VENCIDO', 'Vencidos'],
              ['ENCERRADO', 'Encerrados'],
            ] as Array<[Filtro, string]>
          ).map(([valor, rotulo]) => (
            <button
              key={valor}
              type="button"
              onClick={() => setFiltro(valor)}
              className={`rounded-lg px-3.5 py-2 text-sm font-semibold transition ${
                filtro === valor
                  ? 'bg-slate-900 text-white'
                  : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
              }`}
            >
              {rotulo}
            </button>
          ))}
        </div>

        <button type="button" className="botao-secundario" onClick={() => void carregar()}>
          <RefreshCw size={16} />
          Atualizar
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

      {/* Grid de contratos */}
      {carregando ? (
        <p className="text-sm text-slate-500">Carregando contratos...</p>
      ) : contratos.length === 0 ? (
        <div className="cartao p-8 text-center text-sm text-slate-500">
          Nenhum contrato encontrado para o filtro selecionado.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {contratos.map((contrato) => {
            const dias = diasAte(contrato.dataFim);
            const vencido = dias < 0;
            const venceEmBreve = dias >= 0 && dias <= 90;

            return (
              <article key={contrato.id} className="cartao flex flex-col p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-bold text-slate-900">{contrato.codigo}</p>
                    <p className="text-xs text-slate-400">
                      {contrato.imovel.codigo} - {contrato.imovel.bairro}
                    </p>
                  </div>
                  <BadgeStatus
                    texto={contrato.status === 'ATIVO' ? 'Ativo' : contrato.status === 'VENCIDO' ? 'Vencido' : 'Encerrado'}
                  />
                </div>

                <p className="mt-3 text-sm text-slate-700">{contrato.imovel.endereco}</p>
                <p className="text-xs text-slate-500">
                  Locatario: <span className="font-semibold">{contrato.locatario.nome}</span>
                </p>

                <div className="mt-4 grid grid-cols-2 gap-3 rounded-lg bg-slate-50 p-3 text-xs">
                  <div>
                    <p className="text-slate-400">Vigencia</p>
                    <p className="font-semibold text-slate-700">
                      {formatData(contrato.dataInicio)} ate {formatData(contrato.dataFim)}
                    </p>
                  </div>
                  <div>
                    <p className="text-slate-400">Valor mensal</p>
                    <p className="font-semibold text-slate-700">{formatBRL(contrato.valorMensal)}</p>
                  </div>
                  <div>
                    <p className="text-slate-400">Vencimento</p>
                    <p className="font-semibold text-slate-700">dia {contrato.diaVencimento}</p>
                  </div>
                  <div>
                    <p className="text-slate-400">PDF</p>
                    <p className="font-semibold text-slate-700">
                      {contrato.pdfNome ? 'enviado' : contrato.pdfUrl ? 'link' : 'pendente'}
                    </p>
                  </div>
                </div>

                <div className="mt-3 flex items-center justify-between">
                  <div className="flex flex-wrap gap-1.5">
                    <BadgeStatus
                      texto={rotuloVencimento(contrato.dataFim)}
                      variante={vencido ? 'vermelho' : venceEmBreve ? 'laranja' : 'cinza'}
                    />
                    {venceEmBreve && <BadgeStatus texto="Vence em breve" variante="laranja" />}
                  </div>
                  <span className={`text-xs font-semibold ${vencido ? 'text-red-600' : 'text-slate-400'}`}>
                    {vencido ? `vencido ha ${Math.abs(dias)}d` : `faltam ${dias}d`}
                  </span>
                </div>

                <div className="mt-4 flex flex-wrap gap-2 border-t border-slate-100 pt-3">
                  <button
                    type="button"
                    className="botao-secundario flex-1 px-3 py-1.5 text-xs"
                    onClick={() => void abrirPdf(contrato)}
                    title="Abrir o PDF digitalizado (ou o link cadastrado)"
                  >
                    <ExternalLink size={14} />
                    Abrir PDF
                  </button>
                  <button
                    type="button"
                    className="botao-secundario flex-1 px-3 py-1.5 text-xs"
                    onClick={() => {
                      setContratoLink(contrato);
                      setUrlLink(contrato.pdfUrl ?? '');
                    }}
                    title="Cadastrar link do PDF"
                  >
                    <Link2 size={14} />
                    Link
                  </button>
                  <button
                    type="button"
                    className="botao-secundario flex-1 px-3 py-1.5 text-xs"
                    onClick={() => {
                      setContratoUpload(contrato);
                      setArquivo(null);
                    }}
                    title="Enviar o PDF do contrato"
                  >
                    <FileUp size={14} />
                    Enviar
                  </button>
                  <button
                    type="button"
                    className="botao-secundario px-3 py-1.5 text-xs"
                    onClick={() => void baixarPdf(contrato)}
                    title="Baixar o PDF armazenado"
                  >
                    Baixar
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* Modal: link do PDF */}
      <Modal
        aberto={contratoLink !== null}
        titulo={`Cadastrar link do PDF - ${contratoLink?.codigo ?? ''}`}
        aoFechar={() => setContratoLink(null)}
        rodape={
          <>
            <button type="button" className="botao-secundario" onClick={() => setContratoLink(null)}>
              Cancelar
            </button>
            <button
              type="button"
              className="botao-primario"
              onClick={enviarLink}
              disabled={!urlLink.trim()}
            >
              Salvar link
            </button>
          </>
        }
      >
        <div>
          <label className="mb-1 block text-xs font-semibold text-slate-600">URL do PDF</label>
          <input
            type="url"
            className="input-padrao"
            placeholder="https://.../contrato-digitalizado.pdf"
            value={urlLink}
            onChange={(evento) => setUrlLink(evento.target.value)}
          />
          <p className="mt-2 text-[11px] text-slate-400">
            O link abre em nova aba junto com o contrato digitalizado.
          </p>
        </div>
      </Modal>

      {/* Modal: upload do PDF */}
      <Modal
        aberto={contratoUpload !== null}
        titulo={`Enviar PDF do contrato - ${contratoUpload?.codigo ?? ''}`}
        aoFechar={() => setContratoUpload(null)}
        rodape={
          <>
            <button type="button" className="botao-secundario" onClick={() => setContratoUpload(null)}>
              Cancelar
            </button>
            <button
              type="button"
              className="botao-primario"
              onClick={() => {
                const input = document.getElementById('input-pdf-contrato') as HTMLInputElement | null;
                input?.click();
              }}
              disabled={!arquivo || enviando}
            >
              <FileUp size={16} />
              {enviando ? 'Enviando...' : 'Enviar arquivo'}
            </button>
          </>
        }
      >
        <div className="space-y-3">
          <input
            id="input-pdf-contrato"
            type="file"
            accept="application/pdf"
            className="hidden"
            onChange={(evento) => {
              const arquivoSelecionado = evento.target.files?.[0] ?? null;
              setArquivo(arquivoSelecionado);
            }}
          />
          <button
            type="button"
            className="flex w-full flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-slate-300 px-6 py-10 text-sm text-slate-500 transition hover:border-slate-400 hover:bg-slate-50"
            onClick={() => {
              const input = document.getElementById('input-pdf-contrato') as HTMLInputElement | null;
              input?.click();
            }}
          >
            <FileUp size={24} />
            Clique para selecionar o PDF do contrato (max. 20MB)
          </button>
          {arquivo && (
            <p className="rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-700">
              Arquivo selecionado: <span className="font-semibold">{arquivo.name}</span> (
              {(arquivo.size / 1024).toFixed(0)} KB)
            </p>
          )}
        </div>
      </Modal>
    </div>
  );
}
