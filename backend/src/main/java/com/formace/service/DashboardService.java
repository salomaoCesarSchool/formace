package com.formace.service;

import com.formace.dto.DashboardResponse;
import com.formace.entity.Contrato;
import com.formace.entity.LancamentoFinanceiro;
import com.formace.enums.NaturezaLancamento;
import com.formace.enums.StatusContrato;
import com.formace.enums.StatusImovel;
import com.formace.enums.StatusLancamento;
import com.formace.enums.TipoLancamento;
import com.formace.repository.ContratoRepository;
import com.formace.repository.ImovelRepository;
import com.formace.repository.LancamentoFinanceiroRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;

/**
 * Consolida os KPIs do dashboard (ocupacao, receita do mes, contratos a vencer e alertas).
 */
@Service
@RequiredArgsConstructor
public class DashboardService {

    private static final DateTimeFormatter MES_ATUAL = DateTimeFormatter.ofPattern("yyyy-MM");

    /** Janela de alerta de vencimento de contratos (90 dias). */
    private static final int DIAS_ALERTA_VENCIMENTO = 90;

    private final ImovelRepository imovelRepository;
    private final ContratoRepository contratoRepository;
    private final LancamentoFinanceiroRepository lancamentoRepository;
    private final FinanceiroService financeiroService;

    @Transactional(readOnly = true)
    public DashboardResponse montar() {
        String mes = LocalDate.now().format(MES_ATUAL);

        long totalImoveis = imovelRepository.count();
        long ocupados = imovelRepository.countByStatus(StatusImovel.OCUPADO);
        long vagos = imovelRepository.countByStatus(StatusImovel.VAGO);

        LocalDate hoje = LocalDate.now();
        List<Contrato> vencendo = contratoRepository
                .findByStatusAndDataFimGreaterThanEqualAndDataFimLessThanEqualOrderByDataFimAsc(
                        StatusContrato.ATIVO, hoje, hoje.plusDays(DIAS_ALERTA_VENCIMENTO));

        long contratosAtivos = contratoRepository.countByStatus(StatusContrato.ATIVO);

        BigDecimal receitaMes = financeiroService.receitaDoMes(mes);
        BigDecimal pendentesMes = financeiroService.pendentesDoMes(mes);

        long pendentes = lancamentoRepository.countByStatusAndNatureza(
                StatusLancamento.PENDENTE, NaturezaLancamento.ENTRADA)
                + lancamentoRepository.countByStatusAndNatureza(StatusLancamento.ATRASADO, NaturezaLancamento.ENTRADA);

        // ---- Grafico "Pagamentos dos alugueis" do mes vigente ----
        // "A vencer" = pendente com vencimento futuro; pendente JA vencido conta
        // como "em atraso" (o status e definido na criacao e nao muda sozinho
        // quando o vencimento passa, entao confiar só no status mostraria
        // aluguel vencido como "a vencer").
        long pagosAluguel = lancamentoRepository.countByTipoAndMesReferenciaAndStatusAndNatureza(
                TipoLancamento.ALUGUEL, mes, StatusLancamento.PAGO, NaturezaLancamento.ENTRADA);
        long pendentesAluguel = lancamentoRepository.countByTipoAndMesReferenciaAndStatusAndNatureza(
                TipoLancamento.ALUGUEL, mes, StatusLancamento.PENDENTE, NaturezaLancamento.ENTRADA);
        long pendentesAVencer = lancamentoRepository.countPendentesAVencer(
                TipoLancamento.ALUGUEL, mes, NaturezaLancamento.ENTRADA, StatusLancamento.PENDENTE, hoje);
        long aVencerAluguel = pendentesAVencer;
        long emAtrasoAluguel = lancamentoRepository.countByTipoAndMesReferenciaAndStatusAndNatureza(
                TipoLancamento.ALUGUEL, mes, StatusLancamento.ATRASADO, NaturezaLancamento.ENTRADA)
                + (pendentesAluguel - pendentesAVencer);
        DashboardResponse.PagamentosMes pagamentosMes = new DashboardResponse.PagamentosMes(
                pagosAluguel, aVencerAluguel, emAtrasoAluguel,
                pagosAluguel + aVencerAluguel + emAtrasoAluguel);

        // ---- Inadimplencia e lista de cobrancas pendentes ----
        // Sem filtro de competencia: inadimplencia e saldo acumulado (aluguel de
        // meses anteriores ainda nao pago continua em aberto). O Financeiro usa a
        // mesma visao na aba Cobrancas; filtrar pelo mes vigente fazia o KPI
        // mostrar 0 enquanto existiam lancamentos ATRASADO/PENDENTE vencidos.
        List<StatusLancamento> emAberto = List.of(StatusLancamento.PENDENTE, StatusLancamento.ATRASADO);
        List<LancamentoFinanceiro> cobrancasBrutas = lancamentoRepository.buscarCobrancasVencidas(
                TipoLancamento.ALUGUEL, NaturezaLancamento.ENTRADA, emAberto, hoje);
        BigDecimal valorEmAberto = lancamentoRepository.somarCobrancasVencidas(
                TipoLancamento.ALUGUEL, NaturezaLancamento.ENTRADA, emAberto, hoje);

        long inadimplentes = cobrancasBrutas.stream()
                .map(l -> l.getLocatario() != null ? l.getLocatario().getId() : null)
                .filter(java.util.Objects::nonNull)
                .distinct()
                .count();
        if (inadimplentes == 0) {
            // lancamentos sem locatario vinculado: conta pelo proprio atraso
            inadimplentes = cobrancasBrutas.size();
        }
        DashboardResponse.Inadimplentes inadimplentesKpi =
                new DashboardResponse.Inadimplentes(inadimplentes, valorEmAberto);

        List<DashboardResponse.CobrancaPendente> cobrancas = cobrancasBrutas.stream()
                .limit(15)
                .map(l -> new DashboardResponse.CobrancaPendente(
                        l.getLocatario() != null ? l.getLocatario().getNome() : "Locatário não informado",
                        formatarImovel(l),
                        l.getValorTotal(),
                        l.getDataVencimento(),
                        (int) java.time.temporal.ChronoUnit.DAYS.between(l.getDataVencimento(), hoje)))
                .toList();

        List<LancamentoFinanceiro> ultimos = lancamentoRepository
                .buscarRecentes(PageRequest.of(0, 10));

        List<DashboardResponse.Alerta> alertas = new ArrayList<>();
        alertas.add(new DashboardResponse.Alerta(
                "contratos",
                vencendo.isEmpty()
                        ? "Nenhum contrato vence nos proximos " + DIAS_ALERTA_VENCIMENTO + " dias"
                        : vencendo.size() + " contrato(s) vencem nos proximos " + DIAS_ALERTA_VENCIMENTO + " dias",
                vencendo.isEmpty() ? "info" : "atencao"));

        for (Contrato c : vencendo) {
            alertas.add(new DashboardResponse.Alerta(
                    "vencimento",
                    "Contrato " + c.getCodigo() + " do imovel " + c.getImovel().getCodigo()
                            + " vence em " + c.getDataFim().format(DateTimeFormatter.ofPattern("MM/yyyy")),
                    "atencao"));
        }

        if (vagos > 0) {
            alertas.add(new DashboardResponse.Alerta(
                    "vagos", vagos + " imovel(is) vago(s) aguardando locatario", "info"));
        }
        if (pendentes > 0) {
            alertas.add(new DashboardResponse.Alerta(
                    "cobranca", pendentes + " lancamento(s) em aberto no sistema", "critico"));
        }

        return new DashboardResponse(
                totalImoveis,
                ocupados,
                vagos,
                contratosAtivos,
                vencendo.size(),
                mes,
                receitaMes,
                pendentesMes,
                pendentes,
                pagamentosMes,
                inadimplentesKpi,
                cobrancas,
                ultimos,
                alertas);
    }

    /** Formata o imovel da cobranca: "Rua X, 123 - Bairro". */
    private static String formatarImovel(LancamentoFinanceiro l) {
        var imovel = l.getImovel();
        if (imovel == null) {
            return "Imóvel não informado";
        }
        StringBuilder sb = new StringBuilder(imovel.getEndereco() != null ? imovel.getEndereco() : "Endereço não informado");
        if (imovel.getNumero() != null && !imovel.getNumero().isBlank()) {
            sb.append(", ").append(imovel.getNumero());
        }
        if (imovel.getBairro() != null && !imovel.getBairro().isBlank()) {
            sb.append(" - ").append(imovel.getBairro());
        }
        return sb.toString();
    }
}
