package com.formace;

import com.formace.config.SecurityConfig;
import com.formace.controller.DocumentoObrigatorioController;
import com.formace.entity.DocumentoObrigatorio;
import com.formace.repository.DocumentoObrigatorioRepository;
import com.formace.repository.UsuarioRepository;
import com.formace.security.CustomUserDetailsService;
import com.formace.security.JwtService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * CRUD dos documentos obrigatorios configuraveis por modalidade de garantia.
 */
@WebMvcTest(controllers = DocumentoObrigatorioController.class)
@Import({SecurityConfig.class, JwtService.class, CustomUserDetailsService.class})
class DocumentoObrigatorioControllerTest {

    @MockBean
    private DocumentoObrigatorioRepository repository;

    @MockBean
    private UsuarioRepository usuarioRepository;

    @Autowired
    private MockMvc mockMvc;

    private static final String PAYLOAD = """
            {
              "modalidade": "fiador",
              "destinatario": "FIADOR",
              "nome": "Comprovante de renda",
              "obrigatorio": true
            }
            """;

    @Test
    @DisplayName("Listagem sem filtro deve responder 200")
    void listarTudoDeveResponder200() throws Exception {
        when(repository.findAllByOrderByModalidadeAscDestinatarioAscNomeAsc())
                .thenReturn(List.of());

        mockMvc.perform(get("/api/documentos-obrigatorios")
                        .with(user("admin").roles("ADMIN")))
                .andExpect(status().isOk());
    }

    @Test
    @DisplayName("Filtro por modalidade deve ir ao repositorio com a chave maiuscula")
    void filtroPorModalidadeDeveMaiuscular() throws Exception {
        when(repository.findByModalidadeOrderByDestinatarioAscNomeAsc("FIADOR"))
                .thenReturn(List.of());

        mockMvc.perform(get("/api/documentos-obrigatorios").param("modalidade", "fiador")
                        .with(user("admin").roles("ADMIN")))
                .andExpect(status().isOk());

        verify(repository).findByModalidadeOrderByDestinatarioAscNomeAsc("FIADOR");
    }

    @Test
    @DisplayName("Criacao valida deve responder 201 e salvar")
    void criarValidoDeveResponder201() throws Exception {
        when(repository.save(any(DocumentoObrigatorio.class)))
                .thenAnswer(invocation -> {
                    DocumentoObrigatorio d = invocation.getArgument(0);
                    d.setId(7L);
                    return d;
                });

        mockMvc.perform(post("/api/documentos-obrigatorios")
                        .with(user("admin").roles("ADMIN"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(PAYLOAD))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").value(7))
                .andExpect(jsonPath("$.modalidade").value("FIADOR"));

        verify(repository).save(any(DocumentoObrigatorio.class));
    }

    @Test
    @DisplayName("Nome ausente deve retornar 400 e nao salvar")
    void nomeAusenteDeveRetornar400() throws Exception {
        mockMvc.perform(post("/api/documentos-obrigatorios")
                        .with(user("admin").roles("ADMIN"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(PAYLOAD.replace("Comprovante de renda", "")))
                .andExpect(status().isBadRequest());

        verify(repository, never()).save(any());
    }

    @Test
    @DisplayName("Destinatario fora de CLIENTE/FIADOR deve retornar 400")
    void destinatarioInvalidoDeveRetornar400() throws Exception {
        mockMvc.perform(post("/api/documentos-obrigatorios")
                        .with(user("admin").roles("ADMIN"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(PAYLOAD.replace("\"FIADOR\",", "\"OUTRO\",")))
                .andExpect(status().isBadRequest());

        verify(repository, never()).save(any());
    }

    @Test
    @DisplayName("Excluir documento inexistente deve responder 404")
    void excluirInexistenteDeveRetornar404() throws Exception {
        when(repository.existsById(99L)).thenReturn(false);

        mockMvc.perform(delete("/api/documentos-obrigatorios/99")
                        .with(user("admin").roles("ADMIN")))
                .andExpect(status().isNotFound());

        verify(repository, never()).deleteById(any());
    }
}
