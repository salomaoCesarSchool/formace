package com.formace;

import com.formace.config.SecurityConfig;
import com.formace.controller.ContratoController;
import com.formace.entity.Contrato;
import com.formace.entity.Imovel;
import com.formace.entity.Locatario;
import com.formace.enums.StatusImovel;
import com.formace.repository.ContratoRepository;
import com.formace.repository.ImovelRepository;
import com.formace.repository.LancamentoFinanceiroRepository;
import com.formace.repository.LocatarioRepository;
import com.formace.repository.UsuarioRepository;
import com.formace.security.CustomUserDetailsService;
import com.formace.security.JwtService;
import com.formace.service.CadastroService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import java.util.Optional;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Geracao de contratos: modelo, modalidade de garantia (com dados obrigatorios
 * do fiador), indice/periodicidade de reajuste e validacao das datas.
 */
@WebMvcTest(controllers = ContratoController.class)
@Import({SecurityConfig.class, JwtService.class, CustomUserDetailsService.class,
        CadastroService.class})
class ContratoCriacaoTest {

    private static final String FIADOR_JSON = """
            "fiador": {
              "nome": "Jose do Fiador",
              "cpf": "123.456.789-00",
              "rg": "98.765.432-1",
              "dataNascimento": "1975-03-10",
              "estadoCivil": "Casado",
              "profissao": "Engenheiro",
              "telefone": "(79) 3214-0057",
              "email": "fiador@email.com",
              "endereco": "Rua B, 20"
            }""";

    @MockBean
    private ImovelRepository imovelRepository;

    @MockBean
    private LocatarioRepository locatarioRepository;

    @MockBean
    private ContratoRepository contratoRepository;

    @MockBean
    private LancamentoFinanceiroRepository lancamentoRepository;

    @MockBean
    private UsuarioRepository usuarioRepository;

    @Autowired
    private MockMvc mockMvc;

    /** Payload base: garantia e fiador sao injetados pelos testes. */
    private static String payload(String modalidade, String extras) {
        return """
                {
                  "imovelId": 1,
                  "locatarioId": 2,
                  "dataInicio": "2026-01-01",
                  "dataFim": "2029-01-01",
                  "valorMensal": 1500.00,
                  "diaVencimento": 10,
                  "modelo": "Locacao residencial",
                  "modalidadeGarantia": "%s",
                  "indiceReajuste": "IPCA",
                  "periodicidadeReajuste": "Anual"%s
                }
                """.formatted(modalidade, extras);
    }

    @BeforeEach
    void preparar() {
        when(imovelRepository.findById(1L)).thenReturn(Optional.of(Imovel.builder()
                .id(1L).codigo("IM001").endereco("Rua das Palmeiras, 45")
                .bairro("Espinheiro").cidade("Aracaju").tipo("Residencial")
                .valorAluguel(java.math.BigDecimal.valueOf(1500))
                .iptuMensal(java.math.BigDecimal.ZERO)
                .status(StatusImovel.VAGO).build()));
        when(locatarioRepository.findById(2L)).thenReturn(Optional.of(
                Locatario.builder().id(2L).nome("Maria da Silva").build()));
        when(contratoRepository.saveAndFlush(any(Contrato.class)))
                .thenAnswer(inv -> inv.getArgument(0));
        when(contratoRepository.save(any(Contrato.class)))
                .thenAnswer(inv -> inv.getArgument(0));
    }

    @Test
    @DisplayName("Contrato com garantia por fiador deve responder 201 e vincular o fiador")
    void criarComFiadorDeveResponder201() throws Exception {
        String json = payload("FIADOR", ",\n  " + FIADOR_JSON);

        mockMvc.perform(post("/api/contratos")
                        .with(user("admin").roles("ADMIN"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.codigo").value("CTR-0001"))
                .andExpect(jsonPath("$.modalidadeGarantia").value("FIADOR"))
                .andExpect(jsonPath("$.indiceReajuste").value("IPCA"))
                .andExpect(jsonPath("$.periodicidadeReajuste").value("Anual"))
                .andExpect(jsonPath("$.fiador.nome").value("Jose do Fiador"))
                .andExpect(jsonPath("$.fiador.cpf").value("123.456.789-00"));
    }

    @Test
    @DisplayName("Garantia por fiador sem dados do fiador deve retornar 400")
    void garantiaFiadorSemDadosDeveRetornar400() throws Exception {
        mockMvc.perform(post("/api/contratos")
                        .with(user("admin").roles("ADMIN"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(payload("FIADOR", "")))
                .andExpect(status().isBadRequest());

        verify(contratoRepository, never()).saveAndFlush(any());
    }

    @Test
    @DisplayName("E-mail invalido do fiador deve retornar 400 (validacao do payload)")
    void emailInvalidoDoFiadorDeveRetornar400() throws Exception {
        String json = payload("FIADOR", ",\n  " + FIADOR_JSON)
                .replace("fiador@email.com", "sem-arroba");

        mockMvc.perform(post("/api/contratos")
                        .with(user("admin").roles("ADMIN"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json))
                .andExpect(status().isBadRequest());

        verify(contratoRepository, never()).saveAndFlush(any());
    }

    @Test
    @DisplayName("Locatario ausente deve retornar 400")
    void semLocatarioDeveRetornar400() throws Exception {
        String json = payload("SEM_GARANTIA", "")
                .replace("\"locatarioId\": 2", "\"locatarioId\": null");

        mockMvc.perform(post("/api/contratos")
                        .with(user("admin").roles("ADMIN"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json))
                .andExpect(status().isBadRequest());

        verify(contratoRepository, never()).saveAndFlush(any());
    }

    @Test
    @DisplayName("Termino igual ao inicio deve retornar 400 pela regra do servico")
    void datasInvalidasDeveRetornar400() throws Exception {
        String json = payload("SEM_GARANTIA", "")
                .replace("2029-01-01", "2026-01-01");

        mockMvc.perform(post("/api/contratos")
                        .with(user("admin").roles("ADMIN"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json))
                .andExpect(status().isBadRequest());

        verify(contratoRepository, never()).saveAndFlush(any());
    }

    @Test
    @DisplayName("Garantia sem fiador (caucao) deve criar o contrato sem vinculo")
    void criarSemFiadorDeveResponder201() throws Exception {
        mockMvc.perform(post("/api/contratos")
                        .with(user("admin").roles("ADMIN"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(payload("CAUCAO", "")))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.modalidadeGarantia").value("CAUCAO"))
                .andExpect(jsonPath("$.fiador").doesNotExist());
    }
}
