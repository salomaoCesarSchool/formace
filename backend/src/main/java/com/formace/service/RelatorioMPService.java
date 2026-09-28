package com.formace.service;

import com.formace.dto.RelatorioResumoResponse;
import com.formace.entity.Contrato;
import com.formace.entity.Imovel;
import com.formace.entity.LancamentoFinanceiro;
import com.formace.enums.NaturezaLancamento;
import com.formace.enums.StatusContrato;
import com.formace.enums.StatusImovel;
import com.formace.enums.StatusLancamento;
import com.formace.exception.BadRequestException;
import com.formace.repository.ContratoRepository;
import com.formace.repository.ImovelRepository;
import com.formace.repository.LancamentoFinanceiroRepository;
import com.lowagie.text.Document;
import com.lowagie.text.DocumentException;
import com.lowagie.text.Element;
import com.lowagie.text.Font;
import com.lowagie.text.FontFactory;
import com.lowagie.text.PageSize;
import com.lowagie.text.Paragraph;
import com.lowagie.text.Phrase;
import com.lowagie.text.Rectangle;
import com.lowagie.text.pdf.ColumnText;
import com.lowagie.text.pdf.PdfContentByte;
import com.lowagie.text.pdf.PdfPCell;
import com.lowagie.text.pdf.PdfPTable;
import com.lowagie.text.pdf.PdfPageEventHelper;
import com.lowagie.text.pdf.PdfWriter;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.awt.Color;
import java.io.ByteArrayOutputStream;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.time.temporal.ChronoUnit;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Relatorio anual consolidado de prestacao de contas ao Ministerio Publico de Sergipe (MP-SE).
 * Gera um PDF multipagina: capa, quadro resumo, memoria de lancamentos, demonstrativo por imovel
 * e declaracao final (com rodape numerado em todas as paginas).
 */
@Service
@RequiredArgsConstructor
public class RelatorioMPService {

    /** Numero de linhas por pagina nas tabelas de detalhe (paginacao manual). */
    private static final int LINHAS_POR_PAGINA = 26;

    private static final DateTimeFormatter DATA = DateTimeFormatter.ofPattern("dd/MM/yyyy");
    private static final DateTimeFormatter DATA_HORA = DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm");

    private static final Font FONT_SUB = FontFactory.getFont(FontFactory.HELVETICA, 9f, Font.NORMAL, new Color(100, 116, 139));
    private static final Font FONT_CAPA = FontFactory.getFont(FontFactory.HELVETICA, 26f, Font.BOLD, new Color(16, 24, 40));
    private static final Font FONT_SUBCAPA = FontFactory.getFont(FontFactory.HELVETICA, 15f, Font.NORMAL, new Color(30, 41, 59));
    private static final Font FONT_SECAO = FontFactory.getFont(FontFactory.HELVETICA, 14f, Font.BOLD, new Color(16, 24, 40));
    private static final Font FONT_NORMAL = FontFactory.getFont(FontFactory.HELVETICA, 9.5f, Font.NORMAL, new Color(30, 41, 59));
    private static final Font FONT_LABEL = FontFactory.getFont(FontFactory.HELVETICA, 9.5f, Font.BOLD, new Color(30, 41, 59));
    private static final Font FONT_RODAPE = FontFactory.getFont(FontFactory.HELVETICA, 8f, Font.ITALIC, new Color(100, 116, 139));

    private final ImovelRepository imovelRepository;
    private final ContratoRepository contratoRepository;
    private final LancamentoFinanceiroRepository lancamentoRepository;

    @Value("${app.fundacao.nome}")
    private String fundacaoNome;

    @Value("${app.fundacao.cnpj}")
    private String fundacaoCnpj;

    @Value("${app.fundacao.orgao}")
    private String orgaoFiscalizador;

    // ---------------------------------------------------------------------
    // Resumo JSON (cards exibidos na tela de relatorios)
    // ---------------------------------------------------------------------

    @Transactional(readOnly = true)
    public RelatorioResumoResponse resumo(int ano) {
        validarAno(ano);

        long totalImoveis = imovelRepository.count();
        long ocupados = imovelRepository.countByStatus(StatusImovel.OCUPADO);
        long vagos = imovelRepository.countByStatus(StatusImovel.VAGO);

        List<Contrato> contratosAtivos = contratoRepository.findByStatusOrderByDataFimAsc(StatusContrato.ATIVO);
        long contratosAtivosCount = contratosAtivos.size();

        List<LancamentoFinanceiro> lancamentos = lancamentoRepository.buscarPorAno(ano);
        long pagos = lancamentos.stream().filter(l -> l.getStatus() == StatusLancamento.PAGO).count();
        long abertos = lancamentos.stream()
                .filter(l -> l.getStatus() == StatusLancamento.PENDENTE || l.getStatus() == StatusLancamento.ATRASADO)
                .count();

        BigDecimal receitaPrevista = BigDecimal.ZERO;
        LocalDate iniExercicio = LocalDate.of(ano, 1, 1);
        LocalDate fimExercicio = LocalDate.of(ano, 12, 31);

        for (Contrato c : contratosAtivos) {
            LocalDate ini = c.getDataInicio().isBefore(iniExercicio) ? iniExercicio : c.getDataInicio();
            LocalDate fim = c.getDataFim().isAfter(fimExercicio) ? fimExercicio : c.getDataFim();
            if (fim.isBefore(ini)) {
                continue;
            }
            long meses = ChronoUnit.MONTHS.between(ini, fim) + 1;
            receitaPrevista = receitaPrevista.add(c.getValorMensal().multiply(BigDecimal.valueOf(meses)));
        }

        BigDecimal arrecadado = nz(lancamentoRepository.somarPorAnoENatureza(ano, NaturezaLancamento.ENTRADA));
        BigDecimal multasJuros = nz(lancamentoRepository.somarMultaJuros(ano, StatusLancamento.PAGO));

        BigDecimal emAberto = lancamentos.stream()
                .filter(l -> l.getStatus() == StatusLancamento.PENDENTE || l.getStatus() == StatusLancamento.ATRASADO)
                .map(LancamentoFinanceiro::getValorTotal)
                .reduce(BigDecimal.ZERO, BigDecimal::add)
                .setScale(2, RoundingMode.HALF_UP);

        return new RelatorioResumoResponse(
                ano,
                totalImoveis,
                ocupados,
                vagos,
                contratosAtivosCount,
                lancamentos.size(),
                pagos,
                abertos,
                receitaPrevista.setScale(2, RoundingMode.HALF_UP),
                arrecadado.setScale(2, RoundingMode.HALF_UP),
                emAberto,
                multasJuros.setScale(2, RoundingMode.HALF_UP));
    }

    // ---------------------------------------------------------------------
    // PDF consolidado
    // ---------------------------------------------------------------------

    @Transactional(readOnly = true)
    public byte[] gerarRelatorioAnual(int ano) {
        RelatorioResumoResponse resumo = resumo(ano);
        List<Imovel> imoveis = imovelRepository.findAll();
        Map<Long, BigDecimal> recebidoPorImovel = recebidoPorImovelNoAno(ano);
        List<LancamentoFinanceiro> lancamentos = lancamentoRepository.buscarPorAno(ano);

        try {
            ByteArrayOutputStream out = new ByteArrayOutputStream();
            Document doc = new Document(PageSize.A4, 45, 45, 55, 55);
            PdfWriter writer = PdfWriter.getInstance(doc, out);
            writer.setPageEvent(new RodapeRelatorio(fundacaoNome, ano));
            doc.open();

            adicionarCapa(doc, ano);
            adicionarQuadroResumo(doc, resumo);
            adicionarMemoriaDeLancamentos(doc, lancamentos);
            adicionarDemonstrativoPorImovel(doc, ano, imoveis, recebidoPorImovel);
            adicionarEncerramento(doc, ano);

            doc.close();
            return out.toByteArray();
        } catch (DocumentException ex) {
            throw new IllegalStateException("Falha ao gerar o relatorio MP-SE", ex);
        }
    }

    // ---------------------------------------------------------------------
    // Secoes
    // ---------------------------------------------------------------------

    private void adicionarCapa(Document doc, int ano) throws DocumentException {
        doc.add(espaco(90f));

        Paragraph orgao = new Paragraph(fundacaoNome.toUpperCase(), FONT_CAPA);
        orgao.setAlignment(Element.ALIGN_CENTER);
        orgao.setSpacingAfter(10f);
        doc.add(orgao);

        Paragraph cnpj = new Paragraph("CNPJ " + fundacaoCnpj, FONT_SUBCAPA);
        cnpj.setAlignment(Element.ALIGN_CENTER);
        cnpj.setSpacingAfter(60f);
        doc.add(cnpj);

        Paragraph titulo = new Paragraph("RELATORIO ANUAL DE PRESTACAO DE CONTAS", FONT_CAPA);
        titulo.setAlignment(Element.ALIGN_CENTER);
        titulo.setSpacingAfter(14f);
        doc.add(titulo);

        Paragraph exercicio = new Paragraph("Exercicio " + ano, FONT_SUBCAPA);
        exercicio.setAlignment(Element.ALIGN_CENTER);
        exercicio.setSpacingAfter(50f);
        doc.add(exercicio);

        Paragraph destinatario = new Paragraph(orgaoFiscalizador, FONT_SUBCAPA);
        destinatario.setAlignment(Element.ALIGN_CENTER);
        destinatario.setSpacingAfter(10f);
        doc.add(destinatario);

        Paragraph carteira = new Paragraph(
                "Carteira de 124 imoveis - alugueis, contratos e fluxo de caixa", FONT_SUB);
        carteira.setAlignment(Element.ALIGN_CENTER);
        carteira.setSpacingAfter(110f);
        doc.add(carteira);

        Paragraph emissao = new Paragraph(
                "Emitido em " + LocalDateTime.now().format(DATA_HORA) + " pelo sistema FORMACE", FONT_RODAPE);
        emissao.setAlignment(Element.ALIGN_CENTER);
        doc.add(emissao);

        doc.newPage();
    }

    private void adicionarQuadroResumo(Document doc, RelatorioResumoResponse r) throws DocumentException {
        doc.add(secao("1. QUADRO RESUMO DA CARTEIRA"));

        PdfPTable carteira = novaTabela(2);
        linhaCabecalho(carteira, "Indicador", "Valor");
        linhaTabela(carteira, "Total de imoveis", String.valueOf(r.totalImoveis()));
        linhaTabela(carteira, "Imoveis ocupados", String.valueOf(r.imoveisOcupados()));
        linhaTabela(carteira, "Imoveis vagos", String.valueOf(r.imoveisVagos()));
        linhaTabela(carteira, "Contratos ativos", String.valueOf(r.contratosAtivos()));
        linhaTabela(carteira, "Taxa de ocupacao",
                (r.totalImoveis() > 0
                        ? Math.round((r.imoveisOcupados() * 100.0) / r.totalImoveis())
                        : 0) + " %");
        doc.add(carteira);

        doc.add(secao("2. RESULTADO FINANCEIRO DO EXERCICIO " + r.ano()));

        PdfPTable financeiro = novaTabela(2);
        linhaCabecalho(financeiro, "Conta", "Valor (R$)");
        linhaTabela(financeiro, "Receita prevista com contratos ativos", moeda(r.receitaPrevista()));
        linhaTabela(financeiro, "Arrecadado no exercicio (alugueis e taxas)", moeda(r.arrecadado()));
        linhaTabela(financeiro, "Valores em aberto (pendentes + atrasados)", moeda(r.emAberto()));
        linhaTabela(financeiro, "Multas e juros arrecadados por atraso", moeda(r.multasEJuros()));
        linhaTotal(financeiro, "Saldo arrecadado no exercicio", moeda(r.arrecadado()));
        doc.add(financeiro);

        doc.add(secao("3. MOVIMENTACAO DE LANCAMENTOS"));

        PdfPTable movimento = novaTabela(2);
        linhaCabecalho(movimento, "Situacao", "Quantidade");
        linhaTabela(movimento, "Lancamentos no exercicio", String.valueOf(r.totalLancamentos()));
        linhaTabela(movimento, "Lancamentos quitados", String.valueOf(r.lancamentosPagos()));
        linhaTabela(movimento, "Lancamentos em aberto", String.valueOf(r.lancamentosAbertos()));
        doc.add(movimento);

        doc.newPage();
    }

    private void adicionarMemoriaDeLancamentos(Document doc,
                                               List<LancamentoFinanceiro> lancamentos) throws DocumentException {
        doc.add(secao("4. MEMORIA DE LANCAMENTOS DO EXERCICIO"));
        doc.add(paragrafoPequeno(
                "Relacao cronologica dos lancamentos financeiros (entradas e saidas) registrados no exercicio."));

        if (lancamentos.isEmpty()) {
            doc.add(paragrafoPequeno("Nenhum lancamento registrado no exercicio."));
            doc.newPage();
            return;
        }

        boolean primeiraPagina = true;
        for (int inicio = 0; inicio < lancamentos.size(); inicio += LINHAS_POR_PAGINA) {
            if (!primeiraPagina) {
                doc.newPage();
                doc.add(secao("4. MEMORIA DE LANCAMENTOS DO EXERCICIO (continuacao)"));
            }
            primeiraPagina = false;

            PdfPTable tabela = novaTabela(7);
            tabela.setWidths(new float[]{1.3f, 1.5f, 3.4f, 1.9f, 1.7f, 1.7f, 2f});
            linhaCabecalho(tabela, "Ref.", "Imovel", "Locatario", "Tipo",
                    "Vencimento", "Pagamento", "Valor (R$)");

            List<LancamentoFinanceiro> fatia = lancamentos
                    .subList(inicio, Math.min(inicio + LINHAS_POR_PAGINA, lancamentos.size()));
            for (LancamentoFinanceiro l : fatia) {
                linhaTabela(tabela,
                        FinanceiroService.formatarMesReferencia(l.getMesReferencia()),
                        l.getImovel().getCodigo(),
                        l.getLocatario() != null ? l.getLocatario().getNome() : "-",
                        l.getTipo().name(),
                        l.getDataVencimento() != null ? l.getDataVencimento().format(DATA) : "-",
                        l.getDataPagamento() != null ? l.getDataPagamento().format(DATA) : "-",
                        FinanceiroService.formatarMoeda(l.getValorTotal()));
            }
            doc.add(tabela);
        }

        doc.newPage();
    }

    private void adicionarDemonstrativoPorImovel(Document doc,
                                                 int ano,
                                                 List<Imovel> imoveis,
                                                 Map<Long, BigDecimal> recebidoPorImovel) throws DocumentException {
        doc.add(secao("5. DEMONSTRATIVO POR IMOVEL - EXERCICIO " + ano));
        doc.add(paragrafoPequeno(
                "Carteira completa da Fundacao Manuel Cruz com locatario, valor contratual e valor recebido no exercicio."));

        boolean primeiraPagina = true;
        for (int inicio = 0; inicio < imoveis.size(); inicio += LINHAS_POR_PAGINA) {
            if (!primeiraPagina) {
                doc.newPage();
                doc.add(secao("5. DEMONSTRATIVO POR IMOVEL - EXERCICIO " + ano + " (continuacao)"));
            }
            primeiraPagina = false;

            PdfPTable tabela = novaTabela(5);
            tabela.setWidths(new float[]{1.5f, 5f, 3.6f, 1.8f, 2f});
            linhaCabecalho(tabela, "Imovel", "Endereco", "Locatario", "Mensal", "Recebido");

            List<Imovel> fatia = imoveis.subList(inicio, Math.min(inicio + LINHAS_POR_PAGINA, imoveis.size()));
            for (Imovel imovel : fatia) {
                BigDecimal recebido = recebidoPorImovel.getOrDefault(imovel.getId(), BigDecimal.ZERO);
                String locatario = imovel.getLocatario() != null ? imovel.getLocatario().getNome() : "-";
                linhaTabela(tabela,
                        imovel.getCodigo(),
                        imovel.getEndereco() + ", " + nvl(imovel.getNumero()) + " - " + imovel.getBairro(),
                        locatario,
                        moeda(imovel.getValorAluguel()),
                        moeda(recebido));
            }
            doc.add(tabela);
        }

        doc.newPage();
    }

    private void adicionarEncerramento(Document doc, int ano) throws DocumentException {
        Paragraph titulo = new Paragraph("DECLARACAO FINAL", FONT_SECAO);
        titulo.setSpacingAfter(16f);
        doc.add(titulo);

        Paragraph texto = new Paragraph(
                "Declaramos, para os devidos fins e em atendimento a requisito do " + orgaoFiscalizador
                        + ", que os valores arrecadados com a locacao dos imoveis pertencentes a "
                        + fundacaoNome + " no exercicio " + ano
                        + " encontram-se devidamente lancados, conciliados e comprovados por recibos numerados "
                        + "emitidos pelo sistema FORMACE, constando deste relatorio o quadro resumo da carteira, "
                        + "o resultado financeiro, a memoria de lancamentos e o demonstrativo por imovel.",
                FONT_NORMAL);
        texto.setAlignment(Element.ALIGN_JUSTIFIED);
        texto.setSpacingAfter(40f);
        doc.add(texto);

        Paragraph linha1 = new Paragraph("_______________________________________________", FONT_NORMAL);
        linha1.setAlignment(Element.ALIGN_CENTER);
        linha1.setSpacingAfter(4f);
        doc.add(linha1);

        Paragraph nome1 = new Paragraph("Direcao Financeira - " + fundacaoNome, FONT_LABEL);
        nome1.setAlignment(Element.ALIGN_CENTER);
        nome1.setSpacingAfter(36f);
        doc.add(nome1);

        Paragraph linha2 = new Paragraph("_______________________________________________", FONT_NORMAL);
        linha2.setAlignment(Element.ALIGN_CENTER);
        linha2.setSpacingAfter(4f);
        doc.add(linha2);

        Paragraph nome2 = new Paragraph("Presidencia - " + fundacaoNome, FONT_LABEL);
        nome2.setAlignment(Element.ALIGN_CENTER);
        nome2.setSpacingAfter(40f);
        doc.add(nome2);

        Paragraph local = new Paragraph("Aracaju/SE, " + LocalDate.now().format(DATA) + ".", FONT_NORMAL);
        local.setAlignment(Element.ALIGN_CENTER);
        doc.add(local);
    }

    // ---------------------------------------------------------------------
    // Auxiliares de montagem
    // ---------------------------------------------------------------------

    private Paragraph secao(String texto) {
        Paragraph p = new Paragraph(texto, FONT_SECAO);
        p.setSpacingBefore(6f);
        p.setSpacingAfter(10f);
        return p;
    }

    private Paragraph paragrafoPequeno(String texto) {
        Paragraph p = new Paragraph(texto, FONT_SUB);
        p.setSpacingAfter(10f);
        return p;
    }

    private Paragraph espaco(float altura) {
        Paragraph p = new Paragraph("", FONT_NORMAL);
        p.setSpacingAfter(altura);
        return p;
    }

    private PdfPTable novaTabela(int colunas) {
        PdfPTable tabela = new PdfPTable(colunas);
        tabela.setWidthPercentage(100f);
        tabela.setSpacingAfter(12f);
        return tabela;
    }

    private void linhaCabecalho(PdfPTable tabela, String... colunas) {
        for (String texto : colunas) {
            PdfPCell cell = new PdfPCell(new Phrase(texto,
                    FontFactory.getFont(FontFactory.HELVETICA, 9f, Font.BOLD, Color.WHITE)));
            cell.setBackgroundColor(new Color(16, 24, 40));
            cell.setPadding(5f);
            cell.setBorder(Rectangle.BOX);
            tabela.addCell(cell);
        }
    }

    private void linhaTabela(PdfPTable tabela, String... colunas) {
        for (String texto : colunas) {
            PdfPCell cell = new PdfPCell(new Phrase(texto == null ? "-" : texto, FONT_NORMAL));
            cell.setPadding(4f);
            cell.setBorder(Rectangle.BOX);
            tabela.addCell(cell);
        }
    }

    private void linhaTotal(PdfPTable tabela, String... colunas) {
        for (String texto : colunas) {
            PdfPCell cell = new PdfPCell(new Phrase(texto, FONT_LABEL));
            cell.setPadding(5f);
            cell.setBorder(Rectangle.BOX);
            cell.setBackgroundColor(new Color(226, 232, 240));
            tabela.addCell(cell);
        }
    }

    private static void validarAno(int ano) {
        int limite = LocalDate.now().getYear() + 1;
        if (ano < 1990 || ano > limite) {
            throw new BadRequestException("Ano invalido para o relatorio. Use um ano entre 1990 e " + limite);
        }
    }

    private Map<Long, BigDecimal> recebidoPorImovelNoAno(int ano) {
        Map<Long, BigDecimal> porImovel = new HashMap<>();
        for (LancamentoFinanceiro l : lancamentoRepository.buscarPorAno(ano)) {
            if (l.getStatus() != StatusLancamento.PAGO || l.getNatureza() != NaturezaLancamento.ENTRADA) {
                continue;
            }
            porImovel.merge(l.getImovel().getId(), l.getValorTotal(), BigDecimal::add);
        }
        return porImovel;
    }

    private static String moeda(BigDecimal valor) {
        return FinanceiroService.formatarMoeda(valor == null ? BigDecimal.ZERO : valor);
    }

    private static String nvl(String valor) {
        return valor == null || valor.isBlank() ? "-" : valor;
    }

    private static BigDecimal nz(BigDecimal valor) {
        return valor == null ? BigDecimal.ZERO : valor;
    }

    /** Rodape com numero de pagina em todas as folhas do relatorio. */
    private static final class RodapeRelatorio extends PdfPageEventHelper {

        private final String nomeFundacao;
        private final int ano;
        private final Font fonte;

        private RodapeRelatorio(String nomeFundacao, int ano) {
            this.nomeFundacao = nomeFundacao;
            this.ano = ano;
            this.fonte = FontFactory.getFont(FontFactory.HELVETICA, 7.5f, Font.NORMAL, new Color(100, 116, 139));
        }

        @Override
        public void onEndPage(PdfWriter writer, Document document) {
            PdfContentByte canvas = writer.getDirectContent();
            float y = 30f;

            ColumnText.showTextAligned(canvas, Element.ALIGN_LEFT,
                    new Phrase(nomeFundacao + "  |  Relatorio anual de prestacao de contas - exercicio " + ano,
                            fonte),
                    document.left(), y, 0f);

            String pagina = "Pagina " + writer.getPageNumber();
            ColumnText.showTextAligned(canvas, Element.ALIGN_RIGHT,
                    new Phrase(pagina, fonte),
                    document.right(), y, 0f);
        }
    }
}
