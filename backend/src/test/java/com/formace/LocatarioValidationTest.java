package com.formace;

import com.formace.config.SecurityConfig;
import com.formace.controller.LocatarioController;
import com.formace.dto.LocatarioRequest;
import com.formace.entity.Locatario;
import com.formace.repository.UsuarioRepository;
import com.formace.security.CustomUserDetailsService;
import com.formace.security.JwtService;
import com.formace.service.CadastroService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import java.time.LocalDate;
import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Validacao do cadastro de clientes (locatarios): campos obrigatorios,
 * formato de e-mail e de telefone, e listagem dos documentos obrigatorios.
 */
@WebMvcTest(controllers = LocatarioController.class)
@Import({SecurityConfig.class, JwtService.class, CustomUserDetailsService.class})
class LocatarioValidationTest {

    @MockBean
    private CadastroService cadastroService;

    @MockBean
    private UsuarioRepository usuarioRepository;

    @Autowired
    private MockMvc mockMvc;

    private static String payload(String overrides) {
        return """
                {
                  "nome": "Maria da Silva",
                  "cpfCnpj": "301.017.029-07",
                  "rg": "12.345.678-9",
                  "dataNascimento": "1990-05-20",
                  "estadoCivil": "Solteira",
                  "profissao": "Professora",
                  "telefone": "(79) 98888-7777",
                  "email": "maria@email.com",
                  "endereco": "Rua A, 10",
                  "cidade": "Aracaju",
                  "observacao": ""
                %s
                }
                """.formatted(overrides);
    }

    @Test
    @DisplayName("Payload valido deve ser repassado ao servico e respondido com 201")
    void payloadValidoDeveCriarLocatario() throws Exception {
        when(cadastroService.salvarLocatario(any(LocatarioRequest.class)))
                .thenReturn(Locatario.builder().id(1L).nome("Maria da Silva").build());

        mockMvc.perform(post("/api/locatarios")
                        .with(user("admin").roles("ADMIN"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(payload("")))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").value(1));

        verify(cadastroService).salvarLocatario(any(LocatarioRequest.class));
    }

    @Test
    @DisplayName("E-mail com formato invalido deve retornar 400")
    void emailInvalidoDeveRetornar400() throws Exception {
        String json = payload("").replace("\"maria@email.com\"", "\"maria@email\"");

        mockMvc.perform(post("/api/locatarios")
                        .with(user("admin").roles("ADMIN"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json))
                .andExpect(status().isBadRequest());

        verify(cadastroService, never()).salvarLocatario(any());
    }

    @Test
    @DisplayName("Telefone fora do formato deve retornar 400")
    void telefoneInvalidoDeveRetornar400() throws Exception {
        String json = payload("").replace("(79) 98888-7777", "abc");

        mockMvc.perform(post("/api/locatarios")
                        .with(user("admin").roles("ADMIN"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json))
                .andExpect(status().isBadRequest());

        verify(cadastroService, never()).salvarLocatario(any());
    }

    @Test
    @DisplayName("Nome ausente deve retornar 400")
    void nomeAusenteDeveRetornar400() throws Exception {
        String json = payload("").replace("Maria da Silva", "");

        mockMvc.perform(post("/api/locatarios")
                        .with(user("admin").roles("ADMIN"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json))
                .andExpect(status().isBadRequest());

        verify(cadastroService, never()).salvarLocatario(any());
    }

    @Test
    @DisplayName("Locatario novo deve aceitar os campos de identificacao e profissao")
    void camposNovosDevemSerAceitos() throws Exception {
        when(cadastroService.salvarLocatario(any(LocatarioRequest.class)))
                .thenAnswer(invocation -> {
                    LocatarioRequest req = invocation.getArgument(0);
                    return Locatario.builder()
                            .id(2L)
                            .nome(req.nome())
                            .rg(req.rg())
                            .dataNascimento(req.dataNascimento())
                            .estadoCivil(req.estadoCivil())
                            .profissao(req.profissao())
                            .build();
                });

        mockMvc.perform(post("/api/locatarios")
                        .with(user("admin").roles("ADMIN"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(payload("")))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.rg").value("12.345.678-9"))
                .andExpect(jsonPath("$.profissao").value("Professora"));

        verify(cadastroService).salvarLocatario(any(LocatarioRequest.class));
    }

    @Test
    @DisplayName("Listagem de locatarios deve responder 200")
    void listarDeveResponder200() throws Exception {
        when(cadastroService.listarLocatarios(any())).thenReturn(List.of());

        mockMvc.perform(get("/api/locatarios")
                        .with(user("admin").roles("ADMIN")))
                .andExpect(status().isOk());
    }

    @Test
    @DisplayName("dataNascimento deve ser aceita como data ISO")
    void dataNascimentoDeveSerDataIso() throws Exception {
        LocatarioRequest[] captor = new LocatarioRequest[1];
        when(cadastroService.salvarLocatario(any(LocatarioRequest.class)))
                .thenAnswer(invocation -> {
                    captor[0] = invocation.getArgument(0);
                    return Locatario.builder().id(3L).build();
                });

        mockMvc.perform(post("/api/locatarios")
                        .with(user("admin").roles("ADMIN"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(payload("")))
                .andExpect(status().isCreated());

        org.assertj.core.api.Assertions.assertThat(captor[0].dataNascimento())
                .isEqualTo(LocalDate.of(1990, 5, 20));
    }
}
