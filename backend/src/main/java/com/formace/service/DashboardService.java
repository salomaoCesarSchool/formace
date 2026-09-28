package com.formace.service;

import com.formace.dto.DashboardResponse;
import com.formace.entity.Contrato;
import com.formace.entity.LancamentoFinanceiro;
import com.formace.enums.NaturezaLancamento;
import com.formace.enums.StatusContrato;
import com.formace.enums.StatusImovel;
import com.formace.enums.StatusLancamento;
import com.formace.repository.ContratoRepository;
import com.formace.repository.ImovelRepository;
import com.formace.repository.LancamentoFinanceiroRepository;
import lombok.RequiredArgsConstructor;
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

        long contratosAtivos = contratoRepository.findByStatusOrderByDataFimAsc(StatusContrato.ATIVO).size();

        BigDecimal receitaMes = financeiroService.receitaDoMes(mes);
        BigDecimal pendentesMes = financeiroService.pendentesDoMes(mes);

        long pendentes = lancamentoRepository.countByStatusAndNatureza(
                StatusLancamento.PENDENTE, NaturezaLancamento.ENTRADA)
                + lancamentoRepository.countByStatusAndNatureza(StatusLancamento.ATRASADO, NaturezaLancamento.ENTRADA);

        List<LancamentoFinanceiro> ultimos = lancamentoRepository.findTop10ByOrderByIdDesc();

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
                ultimos,
                alertas);
    }
}
