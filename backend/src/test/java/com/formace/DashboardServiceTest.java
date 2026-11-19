package com.formace;

import com.formace.dto.DashboardResponse;
import com.formace.entity.Imovel;
import com.formace.entity.LancamentoFinanceiro;
import com.formace.entity.Locatario;
import com.formace.enums.NaturezaLancamento;
import com.formace.enums.StatusLancamento;
import com.formace.enums.TipoLancamento;
import com.formace.repository.ContratoRepository;
import com.formace.repository.ImovelRepository;
import com.formace.repository.LancamentoFinanceiroRepository;
import com.formace.service.DashboardService;
import com.formace.service.FinanceiroService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

/**
 * Testes do DashboardService: grafico de pagamentos de aluguel do mes,
 * inadimplentes e lista de cobrancas pendentes (nome, imovel, valor,
 * vencimento e dias em atraso).
 */
class DashboardServiceTest {

    private ImovelRepository imovelRepository;
    private ContratoRepository contratoRepository;
    private LancamentoFinanceiroRepository lancamentoRepository;
    private FinanceiroService financeiroService;
    private DashboardService service;

    private final String mes = LocalDate.now().format(java.time.format.DateTimeFormatter.ofPattern("yyyy-MM"));

    @BeforeEach
    void setUp() {
        imovelRepository = mock(ImovelRepository.class);
        contratoRepository = mock(ContratoRepository.class);
        lancamentoRepository = mock(LancamentoFinanceiroRepository.class);
        financeiroService = mock(FinanceiroService.class);
        service = new DashboardService(imovelRepository, contratoRepository, lancamentoRepository, financeiroService);

        // base neutra: sem imoveis/contratos/lancamentos
        when(imovelRepository.count()).thenReturn(0L);
        when(imovelRepository.countByStatus(any())).thenReturn(0L);
        when(contratoRepository.countByStatus(any())).thenReturn(0L);
        when(contratoRepository
                .findByStatusAndDataFimGreaterThanEqualAndDataFimLessThanEqualOrderByDataFimAsc(
                        any(), any(), any()))
                .thenReturn(List.of());
        when(financeiroService.receitaDoMes(anyString())).thenReturn(BigDecimal.ZERO);
        when(financeiroService.pendentesDoMes(anyString())).thenReturn(BigDecimal.ZERO);
        when(lancamentoRepository.countByStatusAndNatureza(any(), any())).thenReturn(0L);
        when(lancamentoRepository.buscarRecentes(any())).thenReturn(List.of());
        when(lancamentoRepository.buscarCobrancasVencidas(any(), any(), anyList(), any()))
                .thenReturn(List.of());
        when(lancamentoRepository.somarCobrancasVencidas(any(), any(), anyList(), any()))
                .thenReturn(BigDecimal.ZERO);
        when(lancamentoRepository.countPendentesAVencer(any(), anyString(), any(), any(), any()))
                .thenReturn(0L);
    }

    private void stubContagem(StatusLancamento status, long quantidade) {
        when(lancamentoRepository.countByTipoAndMesReferenciaAndStatusAndNatureza(
                eq(TipoLancamento.ALUGUEL), eq(mes), eq(status), eq(NaturezaLancamento.ENTRADA)))
                .thenReturn(quantidade);
    }

    @Test
    @DisplayName("Grafico conta pagos/a vencer por status e separa pendente vencido como atraso")
    void graficoDeveContarPagamentosPorStatus() {
        stubContagem(StatusLancamento.PAGO, 95);
        stubContagem(StatusLancamento.PENDENTE, 10);
        stubContagem(StatusLancamento.ATRASADO, 3);
        // dos 10 pendentes, 7 ainda nao venceram ("A vencer"); os 3 restantes
        // estao vencidos e devem aparecer em "Em atraso"
        when(lancamentoRepository.countPendentesAVencer(
                eq(TipoLancamento.ALUGUEL), eq(mes), eq(NaturezaLancamento.ENTRADA),
                eq(StatusLancamento.PENDENTE), any()))
                .thenReturn(7L);

        DashboardResponse response = service.montar();

        DashboardResponse.PagamentosMes pm = response.pagamentosMes();
        assertThat(pm.pagos()).isEqualTo(95);
        assertThat(pm.aVencer()).isEqualTo(7);
        assertThat(pm.emAtraso()).isEqualTo(6);
        assertThat(pm.total()).isEqualTo(108);
    }

    private LancamentoFinanceiro cobranca(long id, Locatario locatario, Imovel imovel,
                                          LocalDate vencimento, BigDecimal valor) {
        return LancamentoFinanceiro.builder()
                .id(id)
                .tipo(TipoLancamento.ALUGUEL)
                .natureza(NaturezaLancamento.ENTRADA)
                .status(StatusLancamento.ATRASADO)
                .locatario(locatario)
                .imovel(imovel)
                .dataVencimento(vencimento)
                .valorTotal(valor)
                .mesReferencia(mes)
                .build();
    }

    @Test
    @DisplayName("Cobrancas devem trazer nome, imovel, valor, vencimento e dias de atraso")
    void cobrancasDevemMapearCamposEDiasDeAtraso() {
        Locatario maria = Locatario.builder().id(10L).nome("Maria Silva").build();
        Locatario joao = Locatario.builder().id(11L).nome("João Souza").build();
        Imovel imovel = Imovel.builder()
                .id(1L)
                .endereco("Rua das Flores")
                .numero("123")
                .bairro("Espinheiro")
                .build();

        LocalDate hoje = LocalDate.now();
        LocalDate vencido = hoje.minusDays(16);

        when(lancamentoRepository.buscarCobrancasVencidas(
                eq(TipoLancamento.ALUGUEL), eq(NaturezaLancamento.ENTRADA), anyList(), eq(hoje)))
                .thenReturn(List.of(
                        cobranca(1L, maria, imovel, vencido, new BigDecimal("1500.00")),
                        cobranca(2L, joao, imovel, hoje.minusDays(3), new BigDecimal("2400.00"))));
        when(lancamentoRepository.somarCobrancasVencidas(
                eq(TipoLancamento.ALUGUEL), eq(NaturezaLancamento.ENTRADA), anyList(), eq(hoje)))
                .thenReturn(new BigDecimal("3900.00"));

        DashboardResponse response = service.montar();

        assertThat(response.cobrancasPendentes()).hasSize(2);

        DashboardResponse.CobrancaPendente primeira = response.cobrancasPendentes().get(0);
        assertThat(primeira.locatario()).isEqualTo("Maria Silva");
        assertThat(primeira.imovel()).isEqualTo("Rua das Flores, 123 - Espinheiro");
        assertThat(primeira.valor()).isEqualByComparingTo("1500.00");
        assertThat(primeira.dataVencimento()).isEqualTo(vencido);
        assertThat(primeira.diasAtraso()).isEqualTo(16);

        // inadimplentes = locatarios distintos em atraso; total em aberto
        assertThat(response.inadimplentes().quantidade()).isEqualTo(2);
        assertThat(response.inadimplentes().valorEmAberto()).isEqualByComparingTo("3900.00");
    }

    @Test
    @DisplayName("Dois atrasos do mesmo locatario contam como um inadimplente")
    void mesmoLocatarioContaUmaVez() {
        Locatario maria = Locatario.builder().id(10L).nome("Maria Silva").build();
        Imovel imovelA = Imovel.builder().id(1L).endereco("Rua A").numero("1").build();
        Imovel imovelB = Imovel.builder().id(2L).endereco("Rua B").numero("2").build();
        LocalDate hoje = LocalDate.now();

        when(lancamentoRepository.buscarCobrancasVencidas(
                eq(TipoLancamento.ALUGUEL), eq(NaturezaLancamento.ENTRADA), anyList(), eq(hoje)))
                .thenReturn(List.of(
                        cobranca(1L, maria, imovelA, hoje.minusDays(5), new BigDecimal("1000.00")),
                        cobranca(2L, maria, imovelB, hoje.minusDays(2), new BigDecimal("1000.00"))));

        DashboardResponse response = service.montar();

        assertThat(response.inadimplentes().quantidade()).isEqualTo(1);
        assertThat(response.cobrancasPendentes()).hasSize(2);
    }

    @Test
    @DisplayName("Cobrancas sem locatario usam a propria contagem de atrasos")
    void cobrancaSemLocatarioUsaContagemDeAtrasos() {
        Imovel imovel = Imovel.builder().id(1L).endereco("Rua C").build();
        LocalDate hoje = LocalDate.now();

        when(lancamentoRepository.buscarCobrancasVencidas(
                eq(TipoLancamento.ALUGUEL), eq(NaturezaLancamento.ENTRADA), anyList(), eq(hoje)))
                .thenReturn(List.of(cobranca(1L, null, imovel, hoje.minusDays(1), new BigDecimal("900.00"))));

        DashboardResponse response = service.montar();

        assertThat(response.inadimplentes().quantidade()).isEqualTo(1);
        assertThat(response.cobrancasPendentes().get(0).locatario()).isEqualTo("Locatário não informado");
        assertThat(response.cobrancasPendentes().get(0).imovel()).isEqualTo("Rua C");
    }
}
