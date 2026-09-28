package com.formace;

import com.formace.config.SecurityConfig;
import com.formace.controller.FinanceiroController;
import com.formace.dto.LancamentoRequest;
import com.formace.entity.LancamentoFinanceiro;
import com.formace.entity.Usuario;
import com.formace.enums.NaturezaLancamento;
import com.formace.enums.StatusLancamento;
import com.formace.enums.TipoLancamento;
import com.formace.repository.ContratoRepository;
import com.formace.repository.ImovelRepository;
import com.formace.repository.LancamentoFinanceiroRepository;
import com.formace.repository.LocatarioRepository;
import com.formace.repository.ReciboRepository;
import com.formace.repository.UsuarioRepository;
import com.formace.security.CustomUserDetailsService;
import com.formace.security.JwtService;
import com.formace.service.FinanceiroService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.security.core.userdetails.User;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors;
import org.springframework.test.web.servlet.MockMvc;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Testes do modulo financeiro:
 *  - regras de calculo (multa 2%, juros 1% a.m. pro rata e composicao do total);
 *  - validacao de entrada (Bean Validation -> HTTP 400);
 *  - seguranca (sem token -> 401, token invalido -> 401, JWT valido -> acesso).
 */
@WebMvcTest(controllers = FinanceiroController.class)
@Import({SecurityConfig.class, JwtService.class, CustomUserDetailsService.class})
class FinanceiroSecurityTest {

    private static final String LANCAMENTO_VALIDO = """
            {
              "imovelId": 1,
              "locatarioId": 10,
              "tipo": "ALUGUEL",
              "natureza": "ENTRADA",
              "valorAluguel": 1000.00,
              "valorIptu": 200.00,
              "mesReferencia": "2026-09",
              "dataVencimento": "2026-09-10",
              "dataPagamento": "2026-09-15",
              "descricao": "Aluguel referencia 09/2026"
            }
            """;

    @MockBean
    private FinanceiroService financeiroService;

    @MockBean
    private UsuarioRepository usuarioRepository;

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private JwtService jwtService;

    // ------------------------------------------------------------------
    // Calculo financeiro
    // ------------------------------------------------------------------

    @Nested
    @DisplayName("Calculo financeiro")
    class CalculoFinanceiro {

        private FinanceiroService service() {
            return new FinanceiroService(
                    mock(ImovelRepository.class),
                    mock(LocatarioRepository.class),
                    mock(ContratoRepository.class),
                    mock(LancamentoFinanceiroRepository.class),
                    mock(ReciboRepository.class));
        }

        @Test
        @DisplayName("Multa deve ser 2% quando o pagamento ocorre apos o vencimento")
        void multaDeveSerDoisPorCentoComAtraso() {
            BigDecimal multa = FinanceiroService.calcularMulta(
                    new BigDecimal("1000.00"),
                    LocalDate.of(2026, 9, 10),
                    LocalDate.of(2026, 9, 25));

            assertThat(multa).isEqualByComparingTo("20.00");
        }

        @Test
        @DisplayName("Nao deve haver multa quando o pagamento e feito no vencimento ou antes")
        void naoDeveHaverMultaNoPrazo() {
            LocalDate vencimento = LocalDate.of(2026, 9, 10);

            BigDecimal noDia = FinanceiroService.calcularMulta(
                    new BigDecimal("1000.00"), vencimento, vencimento);
            BigDecimal Antes = FinanceiroService.calcularMulta(
                    new BigDecimal("1000.00"), vencimento, vencimento.minusDays(3));

            assertThat(noDia).isEqualByComparingTo("0.00");
            assertThat(Antes).isEqualByComparingTo("0.00");
        }

        @Test
        @DisplayName("Juros de 1% a.m. devem ser pro rata por dia de atraso")
        void jurosDevemSerProRata() {
            LocalDate vencimento = LocalDate.of(2026, 9, 10);

            // 30 dias de atraso sobre R$ 1.000,00 -> 1% = R$ 10,00
            BigDecimal trintaDias = FinanceiroService.calcularJuros(
                    new BigDecimal("1000.00"), vencimento, vencimento.plusDays(30));

            // 15 dias de atraso -> R$ 5,00
            quinzeDias(vencimento);

            assertThat(trintaDias).isEqualByComparingTo("10.00");
        }

        private void quinzeDias(LocalDate vencimento) {
            BigDecimal quinze = FinanceiroService.calcularJuros(
                    new BigDecimal("1000.00"), vencimento, vencimento.plusDays(15));
            assertThat(quinze).isEqualByComparingTo("5.00");
        }

        @Test
        @DisplayName("Valor total deve somar aluguel + IPTU + multa + juros")
        void valorTotalDeveSomarTodosOsComponentes() {
            FinanceiroService service = service();

            FinanceiroService.ResumoCalculo resumo = service.calcularTotais(
                    new BigDecimal("1000.00"),
                    new BigDecimal("200.00"),
                    LocalDate.of(2026, 9, 10),
                    LocalDate.of(2026, 10, 20),
                    NaturezaLancamento.ENTRADA);

            // base 1.200,00 / 40 dias de atraso
            // multa 2% = 24,00
            // juros  = 1.200 * 1% * 40/30 = 16,00
            assertThat(resumo.multa()).isEqualByComparingTo("24.00");
            assertThat(resumo.juros()).isEqualByComparingTo("16.00");
            assertThat(resumo.valorTotal()).isEqualByComparingTo("1240.00");
        }

        @Test
        @DisplayName("Saidas do fluxo de caixa nao recebem multa nem juros")
        void saidaNaoDeveReceberMultaJuros() {
            FinanceiroService service = service();

            FinanceiroService.ResumoCalculo resumo = service.calcularTotais(
                    new BigDecimal("500.00"),
                    BigDecimal.ZERO,
                    LocalDate.of(2026, 9, 10),
                    LocalDate.of(2026, 11, 10),
                    NaturezaLancamento.SAIDA);

            assertThat(resumo.multa()).isEqualByComparingTo("0.00");
            assertThat(resumo.juros()).isEqualByComparingTo("0.00");
            assertThat(resumo.valorTotal()).isEqualByComparingTo("500.00");
        }
    }

    // ------------------------------------------------------------------
    // Validacao de entrada
    // ------------------------------------------------------------------

    @Test
    @DisplayName("Payload sem imovel/locatario deve retornar 400 e nao persistir")
    void payloadInvalidoDeveRetornar400() throws Exception {
        String payload = """
                {
                  "tipo": "ALUGUEL",
                  "valorAluguel": -10.00,
                  "valorIptu": 0.00,
                  "mesReferencia": "13/2026"
                }
                """;

        mockMvc.perform(post("/api/financeiro/lancamentos")
                        .with(SecurityMockMvcRequestPostProcessors.user("admin").roles("ADMIN"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(payload))
                .andExpect(status().isBadRequest());

        verify(financeiroService, never()).criar(any());
    }

    @Test
    @DisplayName("Mes de referencia fora do formato AAAA-MM deve retornar 400")
    void mesReferenciaInvalidaDeveRetornar400() throws Exception {
        String payload = LANCAMENTO_VALIDO.replace("2026-09", "setembro/2026");

        mockMvc.perform(post("/api/financeiro/lancamentos")
                        .with(SecurityMockMvcRequestPostProcessors.user("admin").roles("ADMIN"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(payload))
                .andExpect(status().isBadRequest());

        verify(financeiroService, never()).criar(any());
    }

    @Test
    @DisplayName("Payload valido deve ser repassado ao servico e respondido com 201")
    void payloadValidoDeveCriarLancamento() throws Exception {
        LancamentoFinanceiro criado = LancamentoFinanceiro.builder()
                .id(55L)
                .valorTotal(new BigDecimal("1200.00"))
                .mesReferencia("2026-09")
                .status(StatusLancamento.PAGO)
                .build();

        when(financeiroService.criar(any(LancamentoRequest.class))).thenReturn(criado);

        mockMvc.perform(post("/api/financeiro/lancamentos")
                        .with(SecurityMockMvcRequestPostProcessors.user("admin").roles("ADMIN"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(LANCAMENTO_VALIDO))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").value(55))
                .andExpect(jsonPath("$.mesReferencia").value("2026-09"));

        verify(financeiroService).criar(any(LancamentoRequest.class));
    }

    // ------------------------------------------------------------------
    // Seguranca (JWT / superficie de IDOR)
    // ------------------------------------------------------------------

    @Test
    @DisplayName("Sem token a API nao devolve lancamentos de ninguem (401)")
    void semTokenDeveRetornar401() throws Exception {
        mockMvc.perform(get("/api/financeiro/lancamentos"))
                .andExpect(status().isUnauthorized());

        verify(financeiroService, never()).listar(any(), any());
    }

    @Test
    @DisplayName("Token adulterado/invalido deve retornar 401")
    void tokenInvalidoDeveRetornar401() throws Exception {
        mockMvc.perform(get("/api/financeiro/lancamentos")
                        .header("Authorization", "Bearer token-adulterado.nao.valido.assinatura"))
                .andExpect(status().isUnauthorized());

        verify(financeiroService, never()).listar(any(), any());
    }

    @Test
    @DisplayName("Requisicao sem header Authorization deve retornar 401 mesmo em POST")
    void postSemTokenDeveRetornar401() throws Exception {
        mockMvc.perform(post("/api/financeiro/lancamentos")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(LANCAMENTO_VALIDO))
                .andExpect(status().isUnauthorized());

        verify(financeiroService, never()).criar(any());
    }

    @Test
    @DisplayName("JWT valido emitido pelo sistema deve autenticar e liberar a listagem")
    void tokenValidoDevePermitirAcesso() throws Exception {
        Usuario admin = Usuario.builder()
                .id(1L)
                .username("admin")
                .password("$2a$10$abcdefghijklmnopqrstuvABCDEFGHIJKLMNOPQRSTUV")
                .nome("Administrador FORMACE")
                .role("ROLE_ADMIN")
                .build();

        when(usuarioRepository.findByUsername("admin")).thenReturn(Optional.of(admin));

        UserDetails detalhes = User.withUsername("admin")
                .password(admin.getPassword())
                .authorities("ROLE_ADMIN")
                .build();
        String token = jwtService.gerarToken(detalhes);

        when(financeiroService.listar(any(), any())).thenReturn(List.of());

        mockMvc.perform(get("/api/financeiro/lancamentos")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk());

        verify(financeiroService).listar(any(), any());
    }
}
