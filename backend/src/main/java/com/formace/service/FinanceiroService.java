package com.formace.service;

import com.formace.dto.FluxoDiarioResponse;
import com.formace.dto.LancamentoRequest;
import com.formace.dto.PagarRequest;
import com.formace.entity.Contrato;
import com.formace.entity.Imovel;
import com.formace.entity.LancamentoFinanceiro;
import com.formace.entity.Locatario;
import com.formace.entity.Recibo;
import com.formace.enums.NaturezaLancamento;
import com.formace.enums.StatusLancamento;
import com.formace.enums.TipoLancamento;
import com.formace.exception.BadRequestException;
import com.formace.exception.NotFoundException;
import com.formace.repository.ContratoRepository;
import com.formace.repository.ImovelRepository;
import com.formace.repository.LancamentoFinanceiroRepository;
import com.formace.repository.LocatarioRepository;
import com.formace.repository.ReciboRepository;
import com.lowagie.text.Document;
import com.lowagie.text.DocumentException;
import com.lowagie.text.Element;
import com.lowagie.text.Font;
import com.lowagie.text.FontFactory;
import com.lowagie.text.PageSize;
import com.lowagie.text.Paragraph;
import com.lowagie.text.Phrase;
import com.lowagie.text.Rectangle;
import com.lowagie.text.pdf.PdfPCell;
import com.lowagie.text.pdf.PdfPTable;
import com.lowagie.text.pdf.PdfWriter;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.Sort;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.awt.Color;
import java.io.ByteArrayOutputStream;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.HexFormat;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.TreeMap;

/**
 * Regras do modulo financeiro:
 *  - multa de 2% sobre o valor base quando pago apos o vencimento;
 *  - juros de 1% ao mes, pro rata por dia de atraso (1% / 30 por dia);
 *  - emissao de recibo numerado em PDF (OpenPDF);
 *  - fluxo de caixa diario (RDD).
 */
@Service
@RequiredArgsConstructor
public class FinanceiroService {

    private static final Logger log = LoggerFactory.getLogger(FinanceiroService.class);

    /** Multa contratual por atraso: 2%. */
    public static final BigDecimal PERCENTUAL_MULTA = new BigDecimal("0.02");

    /** Juros de mora: 1% ao mes. */
    public static final BigDecimal TAXA_JUROS_MENSAL = new BigDecimal("0.01");

    /** Base de dias do mes usada no pro rata de juros. */
    public static final BigDecimal DIAS_MES = new BigDecimal("30");

    private static final BigDecimal ZERO = BigDecimal.valueOf(0L).setScale(2, RoundingMode.HALF_UP);
    private static final DateTimeFormatter DATA = DateTimeFormatter.ofPattern("dd/MM/yyyy");
    private static final DateTimeFormatter DATA_HORA = DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm");
    private static final Locale PT_BR = Locale.forLanguageTag("pt-BR");

    // Fontes do PDF (WINANSI cobre os acentos do portugues)
    private static final Font FONT_ORG = FontFactory.getFont(FontFactory.HELVETICA, 14f, Font.BOLD, new Color(16, 24, 40));
    private static final Font FONT_SUB = FontFactory.getFont(FontFactory.HELVETICA, 9f, Font.NORMAL, new Color(100, 116, 139));
    private static final Font FONT_TITULO = FontFactory.getFont(FontFactory.HELVETICA, 17f, Font.BOLD, new Color(16, 24, 40));
    private static final Font FONT_NORMAL = FontFactory.getFont(FontFactory.HELVETICA, 10.5f, Font.NORMAL, new Color(30, 41, 59));
    private static final Font FONT_LABEL = FontFactory.getFont(FontFactory.HELVETICA, 10.5f, Font.BOLD, new Color(30, 41, 59));
    private static final Font FONT_TOTAL = FontFactory.getFont(FontFactory.HELVETICA, 13f, Font.BOLD, new Color(16, 24, 40));
    private static final Font FONT_RODAPE = FontFactory.getFont(FontFactory.HELVETICA, 8f, Font.ITALIC, new Color(100, 116, 139));

    private final ImovelRepository imovelRepository;
    private final LocatarioRepository locatarioRepository;
    private final ContratoRepository contratoRepository;
    private final LancamentoFinanceiroRepository lancamentoRepository;
    private final ReciboRepository reciboRepository;

    @Value("${app.fundacao.nome}")
    private String fundacaoNome;

    @Value("${app.fundacao.cnpj}")
    private String fundacaoCnpj;

    /** Resultado do calculo financeiro de um lancamento. */
    public record ResumoCalculo(BigDecimal multa, BigDecimal juros, BigDecimal valorTotal) {
    }

    // ---------------------------------------------------------------------
    // Consultas
    // ---------------------------------------------------------------------

    @Transactional(readOnly = true)
    public List<LancamentoFinanceiro> listar(String mesReferencia, String status) {
        boolean temMes = mesReferencia != null && !mesReferencia.isBlank();
        boolean temStatus = status != null && !status.isBlank();

        StatusLancamento statusEnum = null;
        if (temStatus) {
            try {
                statusEnum = StatusLancamento.valueOf(status.trim().toUpperCase());
            } catch (IllegalArgumentException ex) {
                throw new BadRequestException("Status invalido. Use PENDENTE, PAGO, ATRASADO ou CANCELADO");
            }
        }

        if (temMes && temStatus) {
            return lancamentoRepository.findByMesReferenciaAndStatusOrderByDataPagamentoDesc(mesReferencia.trim(), statusEnum);
        }
        if (temMes) {
            return lancamentoRepository.findByMesReferenciaOrderByMesReferenciaDesc(mesReferencia.trim());
        }
        if (temStatus) {
            return lancamentoRepository.findByStatusOrderByDataVencimentoAsc(statusEnum);
        }
        return lancamentoRepository.findAll(Sort.by(Sort.Direction.DESC, "id"));
    }

    @Transactional(readOnly = true)
    public LancamentoFinanceiro obter(Long id) {
        return lancamentoRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Lancamento " + id + " nao encontrado"));
    }

    // ---------------------------------------------------------------------
    // Regras de negocio
    // ---------------------------------------------------------------------

    /**
     * Multa de 2% sobre o valor base quando a data de referencia (pagamento) e posterior ao vencimento.
     */
    public static BigDecimal calcularMulta(BigDecimal valorBase, LocalDate vencimento, LocalDate dataReferencia) {
        if (valorBase == null || vencimento == null || dataReferencia == null || !dataReferencia.isAfter(vencimento)) {
            return ZERO;
        }
        return valorBase.multiply(PERCENTUAL_MULTA).setScale(2, RoundingMode.HALF_UP);
    }

    /**
     * Juros de mora de 1% a.m. calculados pro rata por dia de atraso (1% / 30 dias).
     */
    public static BigDecimal calcularJuros(BigDecimal valorBase, LocalDate vencimento, LocalDate dataReferencia) {
        if (valorBase == null || vencimento == null || dataReferencia == null || !dataReferencia.isAfter(vencimento)) {
            return ZERO;
        }
        long dias = ChronoUnit.DAYS.between(vencimento, dataReferencia);
        if (dias <= 0) {
            return ZERO;
        }
        return valorBase
                .multiply(TAXA_JUROS_MENSAL)
                .multiply(BigDecimal.valueOf(dias))
                .divide(DIAS_MES, 2, RoundingMode.HALF_UP);
    }

    /**
     * Consolida multa, juros e valor total do lancamento.
     * Para natureza SAIDA (despesa do fluxo de caixa) nao ha multa/juros.
     */
    public ResumoCalculo calcularTotais(BigDecimal valorAluguel,
                                        BigDecimal valorIptu,
                                        LocalDate vencimento,
                                        LocalDate dataReferencia,
                                        NaturezaLancamento natureza) {
        BigDecimal base = nz(valorAluguel).add(nz(valorIptu));
        BigDecimal multa = BigDecimal.ZERO;
        BigDecimal juros = BigDecimal.ZERO;

        if (natureza == null || natureza == NaturezaLancamento.ENTRADA) {
            multa = calcularMulta(base, vencimento, dataReferencia);
            juros = calcularJuros(base, vencimento, dataReferencia);
        }

        BigDecimal total = base.add(multa).add(juros).setScale(2, RoundingMode.HALF_UP);
        return new ResumoCalculo(multa.setScale(2, RoundingMode.HALF_UP), juros.setScale(2, RoundingMode.HALF_UP), total);
    }

    @Transactional
    public LancamentoFinanceiro criar(LancamentoRequest req) {
        Imovel imovel = imovelRepository.findById(req.imovelId())
                .orElseThrow(() -> new NotFoundException("Imovel " + req.imovelId() + " nao encontrado"));
        Locatario locatario = locatarioRepository.findById(req.locatarioId())
                .orElseThrow(() -> new NotFoundException("Locatario " + req.locatarioId() + " nao encontrado"));

        Contrato contrato = resolverContrato(req, imovel, locatario);

        LocalDate vencimento = req.dataVencimento() != null
                ? req.dataVencimento()
                : vencimentoPadrao(req.mesReferencia(), contrato);

        LocalDate hoje = LocalDate.now();
        LocalDate dataReferencia = req.dataPagamento() != null
                ? req.dataPagamento()
                : (req.dataCalculo() != null ? req.dataCalculo() : hoje);

        NaturezaLancamento natureza = req.natureza() != null ? req.natureza() : NaturezaLancamento.ENTRADA;

        if (req.tipo() == TipoLancamento.DESPESA && natureza == NaturezaLancamento.ENTRADA) {
            throw new BadRequestException("Lancamento do tipo DESPESA deve ter natureza SAIDA");
        }
        if (natureza == NaturezaLancamento.SAIDA
                && (req.tipo() == TipoLancamento.ALUGUEL || req.tipo() == TipoLancamento.IPTU)) {
            throw new BadRequestException("Saida so pode ser MANUTENCAO, DESPESA ou OUTROS");
        }

        ResumoCalculo calculo = calcularTotais(req.valorAluguel(), req.valorIptu(), vencimento, dataReferencia, natureza);

        StatusLancamento status;
        if (req.dataPagamento() != null) {
            status = StatusLancamento.PAGO;
        } else if (vencimento.isBefore(hoje)) {
            status = StatusLancamento.ATRASADO;
        } else {
            status = StatusLancamento.PENDENTE;
        }

        LancamentoFinanceiro lancamento = LancamentoFinanceiro.builder()
                .imovel(imovel)
                .locatario(locatario)
                .contrato(contrato)
                .tipo(req.tipo())
                .natureza(natureza)
                .status(status)
                .valorAluguel(nz(req.valorAluguel()).setScale(2, RoundingMode.HALF_UP))
                .valorIptu(nz(req.valorIptu()).setScale(2, RoundingMode.HALF_UP))
                .multa(calculo.multa())
                .juros(calculo.juros())
                .valorTotal(calculo.valorTotal())
                .dataVencimento(vencimento)
                .dataPagamento(req.dataPagamento())
                .mesReferencia(req.mesReferencia().trim())
                .descricao(req.descricao() != null && !req.descricao().isBlank()
                        ? req.descricao().trim()
                        : descricaoPadrao(req.tipo(), req.mesReferencia()))
                .build();

        LancamentoFinanceiro salvo = lancamentoRepository.save(lancamento);
        log.debug("Lancamento criado id={} total={} status={}", salvo.getId(), salvo.getValorTotal(), salvo.getStatus());
        return salvo;
    }

    /**
     * Quita um lancamento pendente/atrasado, recalculando multa e juros pela data efetiva de pagamento.
     */
    @Transactional
    public LancamentoFinanceiro pagar(Long id, PagarRequest req) {
        LancamentoFinanceiro lancamento = obter(id);

        if (lancamento.getNatureza() == NaturezaLancamento.SAIDA) {
            throw new BadRequestException("Lancamento de saida nao pode ser quitado como recebimento");
        }
        if (lancamento.getStatus() == StatusLancamento.CANCELADO) {
            throw new BadRequestException("Lancamento cancelado nao pode ser quitado");
        }

        ResumoCalculo calculo = calcularTotais(
                lancamento.getValorAluguel(),
                lancamento.getValorIptu(),
                lancamento.getDataVencimento(),
                req.dataPagamento(),
                lancamento.getNatureza());

        lancamento.setMulta(calculo.multa());
        lancamento.setJuros(calculo.juros());
        lancamento.setValorTotal(calculo.valorTotal());
        lancamento.setDataPagamento(req.dataPagamento());
        lancamento.setStatus(StatusLancamento.PAGO);
        return lancamentoRepository.save(lancamento);
    }

    @Transactional
    public void cancelar(Long id) {
        LancamentoFinanceiro lancamento = obter(id);
        lancamento.setStatus(StatusLancamento.CANCELADO);
        lancamentoRepository.save(lancamento);
    }

    // ---------------------------------------------------------------------
    // Fluxo de caixa / RDD
    // ---------------------------------------------------------------------

    /**
     * Fluxo de caixa diario (RDD - Relatorio Diario de Disponibilidade): entradas, saidas,
     * saldo do dia e saldo acumulado por data de pagamento.
     */
    @Transactional(readOnly = true)
    public List<FluxoDiarioResponse> fluxoCaixa(LocalDate de, LocalDate ate) {
        if (de == null || ate == null) {
            throw new BadRequestException("Informe as datas 'de' e 'ate' do periodo");
        }
        if (ate.isBefore(de)) {
            throw new BadRequestException("Data final deve ser igual ou posterior a data inicial");
        }
        if (ChronoUnit.DAYS.between(de, ate) > 366) {
            throw new BadRequestException("Periodo maximo do fluxo de caixa: 12 meses");
        }

        Map<LocalDate, BigDecimal> entradas = new TreeMap<>();
        Map<LocalDate, BigDecimal> saidas = new TreeMap<>();

        // Saldo acumulado anterior ao periodo
        BigDecimal saldoAcumulado = BigDecimal.ZERO;
        LocalDate limiteInferior = LocalDate.of(2000, 1, 1);
        if (de.isAfter(limiteInferior)) {
            for (LancamentoFinanceiro l : lancamentoRepository.findByDataPagamentoBetween(limiteInferior, de.minusDays(1))) {
                if (l.getStatus() != StatusLancamento.PAGO) {
                    continue;
                }
                saldoAcumulado = l.getNatureza() == NaturezaLancamento.SAIDA
                        ? saldoAcumulado.subtract(l.getValorTotal())
                        : saldoAcumulado.add(l.getValorTotal());
            }
        }

        for (LancamentoFinanceiro l : lancamentoRepository.findByDataPagamentoBetween(de, ate)) {
            if (l.getStatus() != StatusLancamento.PAGO || l.getDataPagamento() == null) {
                continue;
            }
            Map<LocalDate, BigDecimal> destino = l.getNatureza() == NaturezaLancamento.SAIDA ? saidas : entradas;
            destino.merge(l.getDataPagamento(), l.getValorTotal(), BigDecimal::add);
        }

        List<FluxoDiarioResponse> dias = new ArrayList<>();
        LocalDate dia = de;
        while (!dia.isAfter(ate)) {
            BigDecimal e = entradas.getOrDefault(dia, ZERO);
            BigDecimal s = saidas.getOrDefault(dia, ZERO);
            BigDecimal saldoDia = e.subtract(s).setScale(2, RoundingMode.HALF_UP);
            saldoAcumulado = saldoAcumulado.add(saldoDia).setScale(2, RoundingMode.HALF_UP);
            dias.add(new FluxoDiarioResponse(dia, e, s, saldoDia, saldoAcumulado));
            dia = dia.plusDays(1);
        }
        return dias;
    }

    // ---------------------------------------------------------------------
    // Recibo numerado em PDF
    // ---------------------------------------------------------------------

    /**
     * Gera (e persiste a numeracao na primeira vez) o recibo PDF do lancamento.
     */
    @Transactional
    public byte[] gerarReciboPdf(Long lancamentoId) {
        LancamentoFinanceiro lancamento = obter(lancamentoId);

        if (lancamento.getDataPagamento() == null) {
            throw new BadRequestException("Recibo so pode ser emitido para lancamentos quitados");
        }

        Recibo recibo = lancamento.getRecibo();
        if (recibo == null) {
            long proximo = reciboRepository.findTopByOrderByNumeroDesc()
                    .map(Recibo::getNumero)
                    .orElse(0L) + 1L;

            recibo = Recibo.builder()
                    .numero(proximo)
                    .lancamento(lancamento)
                    .emitidoEm(LocalDateTime.now())
                    .emitidoPor(usuarioAtual())
                    .build();

            lancamento.setRecibo(recibo);
            lancamentoRepository.save(lancamento);
            recibo = lancamento.getRecibo();
            log.info("Recibo {} emitido para o lancamento {}", recibo.getNumero(), lancamento.getId());
        }

        byte[] pdf = montarReciboPdf(recibo, lancamento);

        if (recibo.getHash() == null || recibo.getHash().isBlank()) {
            recibo.setHash(sha256Hex(pdf));
            reciboRepository.save(recibo);
        }
        return pdf;
    }

    private byte[] montarReciboPdf(Recibo recibo, LancamentoFinanceiro lancamento) {
        try {
            ByteArrayOutputStream out = new ByteArrayOutputStream();
            Document doc = new Document(PageSize.A4, 45, 45, 45, 50);
            PdfWriter.getInstance(doc, out);
            doc.open();

            Imovel imovel = lancamento.getImovel();
            Locatario locatario = lancamento.getLocatario();

            // Cabeçalho da instituicao
            Paragraph orgao = new Paragraph(fundacaoNome.toUpperCase(), FONT_ORG);
            orgao.setAlignment(Element.ALIGN_CENTER);
            orgao.setSpacingAfter(2f);
            doc.add(orgao);

            Paragraph cnpj = new Paragraph("CNPJ " + fundacaoCnpj + "  |  Sistema FORMACE", FONT_SUB);
            cnpj.setAlignment(Element.ALIGN_CENTER);
            cnpj.setSpacingAfter(14f);
            doc.add(cnpj);

            Paragraph titulo = new Paragraph("RECIBO DE LOCAÇÃO Nº " + String.format("%06d", recibo.getNumero()), FONT_TITULO);
            titulo.setAlignment(Element.ALIGN_CENTER);
            titulo.setSpacingAfter(4f);
            doc.add(titulo);

            Paragraph emissao = new Paragraph(
                    "Emitido em " + recibo.getEmitidoEm().format(DATA_HORA) + " por " + recibo.getEmitidoPor(),
                    FONT_SUB);
            emissao.setAlignment(Element.ALIGN_CENTER);
            emissao.setSpacingAfter(16f);
            doc.add(emissao);

            // Corpo do recibo
            doc.add(linha("Recebemos de:", locatario != null
                    ? locatario.getNome() + "  -  CPF/CNPJ " + locatario.getCpfCnpj()
                    : "Nao informado"));
            doc.add(linha("Referente a:", lancamento.getDescricao()));
            doc.add(linha("Imovel:", imovel.getCodigo() + "  -  " + imovel.getEndereco()
                    + ", " + nvl(imovel.getNumero()) + "  -  " + imovel.getBairro()
                    + " / " + imovel.getCidade()));
            doc.add(linha("Mes de referencia:", formatarMesReferencia(lancamento.getMesReferencia())));

            Paragraph importancia = new Paragraph();
            importancia.setSpacingBefore(8f);
            importancia.setSpacingAfter(10f);
            importancia.add(new com.lowagie.text.Chunk("Valor recebido:  ", FONT_LABEL));
            importancia.add(new com.lowagie.text.Chunk(
                    formatarMoeda(lancamento.getValorTotal()), FONT_TOTAL));
            doc.add(importancia);

            // Demonstrativo de composicao
            PdfPTable tabela = new PdfPTable(new float[]{6f, 2.4f});
            tabela.setWidthPercentage(100f);
            tabela.setSpacingAfter(10f);

            celulaCabecalho(tabela, "Composicao do valor");
            celulaCabecalho(tabela, "Valor (R$)");

            cellula(tabela, "Aluguel", formatarMoeda(lancamento.getValorAluguel()), Element.ALIGN_LEFT);
            cellula(tabela, "IPTU / encargos", formatarMoeda(lancamento.getValorIptu()), Element.ALIGN_LEFT);
            cellula(tabela, "Multa por atraso (2%)", formatarMoeda(lancamento.getMulta()), Element.ALIGN_LEFT);
            cellula(tabela, "Juros de mora (1% a.m.)", formatarMoeda(lancamento.getJuros()), Element.ALIGN_LEFT);
            cellulaTotal(tabela, "TOTAL", formatarMoeda(lancamento.getValorTotal()));

            doc.add(tabela);

            doc.add(linha("Vencimento:", lancamento.getDataVencimento().format(DATA)));
            doc.add(linha("Data de pagamento:",
                    lancamento.getDataPagamento() != null ? lancamento.getDataPagamento().format(DATA) : "-"));
            long atraso = lancamento.getDataPagamento() != null
                    ? Math.max(0L, ChronoUnit.DAYS.between(lancamento.getDataVencimento(), lancamento.getDataPagamento()))
                    : 0L;
            doc.add(linha("Dias de atraso:", atraso + " dia(s)"));

            Paragraph linha = new Paragraph();
            linha.setSpacingBefore(26f);
            linha.add(new com.lowagie.text.Chunk("____________________________________________", FONT_NORMAL));
            doc.add(linha);

            Paragraph assinatura = new Paragraph(
                    usuarioAtual() + "  -  " + fundacaoNome, FONT_NORMAL);
            assinatura.setSpacingAfter(18f);
            doc.add(assinatura);

            Paragraph rodape = new Paragraph(
                    "Documento gerado eletronicamente pelo sistema FORMACE. "
                            + "Autenticacao: recibo nº " + String.format("%06d", recibo.getNumero())
                            + " / hash SHA-256 " + nvl(recibo.getHash()),
                    FONT_RODAPE);
            rodape.setAlignment(Element.ALIGN_CENTER);
            doc.add(rodape);

            doc.close();
            return out.toByteArray();
        } catch (DocumentException ex) {
            throw new IllegalStateException("Falha ao gerar o PDF do recibo", ex);
        }
    }

    // ---------------------------------------------------------------------
    // Auxiliares
    // ---------------------------------------------------------------------

    private Contrato resolverContrato(LancamentoRequest req, Imovel imovel, Locatario locatario) {
        if (req.contratoId() != null) {
            Contrato contrato = contratoRepository.findById(req.contratoId())
                    .orElseThrow(() -> new NotFoundException("Contrato " + req.contratoId() + " nao encontrado"));
            if (!contrato.getImovel().getId().equals(imovel.getId())) {
                throw new BadRequestException("Contrato informado nao pertence ao imovel informado");
            }
            return contrato;
        }
        return contratoRepository.findByImovelId(imovel.getId()).stream()
                .filter(c -> c.getLocatario().getId().equals(locatario.getId()))
                .findFirst()
                .orElse(null);
    }

    /** Dia de vencimento do contrato (padrao dia 10) dentro do mes de referencia. */
    private LocalDate vencimentoPadrao(String mesReferencia, Contrato contrato) {
        int ano = Integer.parseInt(mesReferencia.substring(0, 4));
        int mes = Integer.parseInt(mesReferencia.substring(5, 7));
        int dia = contrato != null && contrato.getDiaVencimento() != null
                ? contrato.getDiaVencimento()
                : 10;
        LocalDate primeiroDia = LocalDate.of(ano, mes, 1);
        int ultimoDia = primeiroDia.withDayOfMonth(primeiroDia.lengthOfMonth()).getDayOfMonth();
        return LocalDate.of(ano, mes, Math.min(dia, ultimoDia));
    }

    private String descricaoPadrao(TipoLancamento tipo, String mesReferencia) {
        return switch (tipo) {
            case ALUGUEL -> "Aluguel do mes " + formatarMesReferencia(mesReferencia);
            case IPTU -> "IPTU / taxas do mes " + formatarMesReferencia(mesReferencia);
            case TAXA_CONDOMINIO -> "Taxa de condominio - " + formatarMesReferencia(mesReferencia);
            case MANUTENCAO -> "Despesa de manutencao";
            case REPUBLICACAO -> "Republicacao de anuncio do imovel";
            case DESPESA -> "Despesa operacional";
            case OUTROS -> "Lancamento diverso";
        };
    }

    private Paragraph linha(String label, String valor) {
        Paragraph p = new Paragraph();
        p.setSpacingAfter(4f);
        p.add(new com.lowagie.text.Chunk(label + " ", FONT_LABEL));
        p.add(new com.lowagie.text.Chunk(valor != null ? valor : "-", FONT_NORMAL));
        return p;
    }

    private void celulaCabecalho(PdfPTable tabela, String texto) {
        PdfPCell cell = new PdfPCell(new Phrase(texto, FontFactory.getFont(
                FontFactory.HELVETICA, 10f, Font.BOLD, Color.WHITE)));
        cell.setBackgroundColor(new Color(16, 24, 40));
        cell.setPadding(6f);
        cell.setBorder(Rectangle.BOX);
        tabela.addCell(cell);
    }

    private void cellula(PdfPTable tabela, String descricao, String valor, int alinhamento) {
        PdfPCell c1 = new PdfPCell(new Phrase(descricao, FONT_NORMAL));
        c1.setPadding(5f);
        c1.setBorder(Rectangle.BOX);
        c1.setHorizontalAlignment(alinhamento);
        tabela.addCell(c1);

        PdfPCell c2 = new PdfPCell(new Phrase(valor, FONT_NORMAL));
        c2.setPadding(5f);
        c2.setBorder(Rectangle.BOX);
        c2.setHorizontalAlignment(Element.ALIGN_RIGHT);
        tabela.addCell(c2);
    }

    private void cellulaTotal(PdfPTable tabela, String descricao, String valor) {
        PdfPCell c1 = new PdfPCell(new Phrase(descricao, FONT_TOTAL));
        c1.setPadding(6f);
        c1.setBorder(Rectangle.BOX);
        c1.setBackgroundColor(new Color(226, 232, 240));
        tabela.addCell(c1);

        PdfPCell c2 = new PdfPCell(new Phrase(valor, FONT_TOTAL));
        c2.setPadding(6f);
        c2.setBorder(Rectangle.BOX);
        c2.setBackgroundColor(new Color(226, 232, 240));
        c2.setHorizontalAlignment(Element.ALIGN_RIGHT);
        tabela.addCell(c2);
    }

    public static String formatarMoeda(BigDecimal valor) {
        if (valor == null) {
            valor = BigDecimal.ZERO;
        }
        return java.text.NumberFormat.getCurrencyInstance(PT_BR).format(valor);
    }

    public static String formatarMesReferencia(String mesReferencia) {
        if (mesReferencia == null || mesReferencia.length() < 7) {
            return "-";
        }
        return mesReferencia.substring(5, 7) + "/" + mesReferencia.substring(0, 4);
    }

    private static BigDecimal nz(BigDecimal valor) {
        return valor == null ? BigDecimal.ZERO : valor;
    }

    private static String nvl(String valor) {
        return valor == null || valor.isBlank() ? "-" : valor;
    }

    private String usuarioAtual() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || auth.getName() == null || auth.getName().isBlank()) {
            return "sistema";
        }
        return auth.getName();
    }

    private static String sha256Hex(byte[] conteudo) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            return HexFormat.of().formatHex(digest.digest(conteudo));
        } catch (NoSuchAlgorithmException ex) {
            throw new IllegalStateException("SHA-256 indisponivel", ex);
        }
    }

    /** Total de entradas liquido do mes (usado pelo dashboard). */
    @Transactional(readOnly = true)
    public BigDecimal receitaDoMes(String mesReferencia) {
        BigDecimal total = lancamentoRepository.somarValorTotal(
                mesReferencia, StatusLancamento.PAGO, NaturezaLancamento.ENTRADA);
        return total == null ? BigDecimal.ZERO : total;
    }

    /** Lançamentos abertos (pendentes + atrasados) do mes. */
    @Transactional(readOnly = true)
    public BigDecimal pendentesDoMes(String mesReferencia) {
        BigDecimal pendente = lancamentoRepository.somarValorTotal(
                mesReferencia, StatusLancamento.PENDENTE, NaturezaLancamento.ENTRADA);
        BigDecimal atrasado = lancamentoRepository.somarValorTotal(
                mesReferencia, StatusLancamento.ATRASADO, NaturezaLancamento.ENTRADA);
        BigDecimal total = nz(pendente).add(nz(atrasado));
        return total.setScale(2, RoundingMode.HALF_UP);
    }
}
