package com.formace;

import com.formace.config.SecurityConfig;
import com.formace.controller.UsuarioController;
import com.formace.entity.Usuario;
import com.formace.repository.UsuarioRepository;
import com.formace.security.CustomUserDetailsService;
import com.formace.security.JwtService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;
import java.util.Optional;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Gestao de usuarios e niveis de acesso:
 *  - /api/usuarios exige ADMIN (403 para GESTOR e OPERADOR);
 *  - validacoes de usuario (duplicidade, perfil, senha, conta propria, ultimo admin);
 *  - a senha nunca aparece na resposta.
 */
@WebMvcTest(controllers = UsuarioController.class)
@Import({SecurityConfig.class, JwtService.class, CustomUserDetailsService.class})
class UsuarioControllerTest {

    @MockBean
    private UsuarioRepository usuarioRepository;

    @Autowired
    private MockMvc mockMvc;

    private static Usuario usuario(long id, String username, String role) {
        return Usuario.builder()
                .id(id)
                .username(username)
                .nome("Ana Gestora")
                .email("ana@formace.com")
                .password("$2a$10$hash")
                .role(role)
                .build();
    }

    private static String payload(String role, String senha) {
        return """
                {
                  "nome": "Ana Gestora",
                  "username": "ana.gestora",
                  "email": "ana@formace.com",
                  "role": "%s",
                  "senha": %s
                }""".formatted(role, senha == null ? "null" : "\"" + senha + "\"");
    }

    @BeforeEach
    void preparar() {
        when(usuarioRepository.save(any(Usuario.class))).thenAnswer(inv -> inv.getArgument(0));
    }

    @Test
    @DisplayName("Listar usuarios: ADMIN recebe 200 e a resposta nao tem a senha")
    void listarComoAdminDeveResponder200SemSenha() throws Exception {
        when(usuarioRepository.findAll()).thenReturn(List.of(
                usuario(1, "admin", "ROLE_ADMIN"),
                usuario(2, "operador", "ROLE_OPERADOR")));

        mockMvc.perform(get("/api/usuarios")
                        .with(user("admin").roles("ADMIN")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(2))
                .andExpect(jsonPath("$[0].role").value("ROLE_ADMIN"))
                .andExpect(jsonPath("$[0].password").doesNotExist())
                .andExpect(jsonPath("$[1].username").value("operador"));
    }

    @Test
    @DisplayName("Listar usuarios: GESTOR recebe 403 (somente ADMIN gerencia)")
    void listarComoGestorDeveRetornar403() throws Exception {
        mockMvc.perform(get("/api/usuarios")
                        .with(user("gerente").roles("GESTOR")))
                .andExpect(status().isForbidden());

        verifyNoInteractions(usuarioRepository);
    }

    @Test
    @DisplayName("Criar usuario: ADMIN recebe 201 e a senha vai com hash BCrypt")
    void criarComoAdminDeveResponder201() throws Exception {
        when(usuarioRepository.findByUsername("ana.gestora")).thenReturn(Optional.empty());

        mockMvc.perform(post("/api/usuarios")
                        .with(user("admin").roles("ADMIN"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(payload("OPERADOR", "senhasegura123")))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.username").value("ana.gestora"))
                .andExpect(jsonPath("$.role").value("ROLE_OPERADOR"))
                .andExpect(jsonPath("$.password").doesNotExist());
    }

    @Test
    @DisplayName("Criar usuario: OPERADOR recebe 403")
    void criarComoOperadorDeveRetornar403() throws Exception {
        mockMvc.perform(post("/api/usuarios")
                        .with(user("operador").roles("OPERADOR"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(payload("GESTOR", "senhasegura123")))
                .andExpect(status().isForbidden());

        verifyNoInteractions(usuarioRepository);
    }

    @Test
    @DisplayName("Senha curta no criacao deve retornar 400")
    void senhaCurtaDeveRetornar400() throws Exception {
        mockMvc.perform(post("/api/usuarios")
                        .with(user("admin").roles("ADMIN"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(payload("GESTOR", "12345")))
                .andExpect(status().isBadRequest());

        verify(usuarioRepository, never()).save(any());
    }

    @Test
    @DisplayName("Username duplicado deve retornar 400")
    void usernameDuplicadoDeveRetornar400() throws Exception {
        when(usuarioRepository.findByUsername("ana.gestora"))
                .thenReturn(Optional.of(usuario(9, "ana.gestora", "ROLE_GESTOR")));

        mockMvc.perform(post("/api/usuarios")
                        .with(user("admin").roles("ADMIN"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(payload("GESTOR", "senhasegura123")))
                .andExpect(status().isBadRequest());

        verify(usuarioRepository, never()).save(any());
    }

    @Test
    @DisplayName("Perfil fora da matriz deve retornar 400")
    void perfilInvalidoDeveRetornar400() throws Exception {
        when(usuarioRepository.findByUsername("ana.gestora")).thenReturn(Optional.empty());

        mockMvc.perform(post("/api/usuarios")
                        .with(user("admin").roles("ADMIN"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(payload("SUPERVISOR", "senhasegura123")))
                .andExpect(status().isBadRequest());

        verify(usuarioRepository, never()).save(any());
    }

    @Test
    @DisplayName("Excluir a propria conta deve retornar 400")
    void excluirPropriaContaDeveRetornar400() throws Exception {
        when(usuarioRepository.findById(5L))
                .thenReturn(Optional.of(usuario(5, "admin", "ROLE_ADMIN")));

        mockMvc.perform(delete("/api/usuarios/5")
                        .with(user("admin").roles("ADMIN")))
                .andExpect(status().isBadRequest());

        verify(usuarioRepository, never()).delete(any());
    }

    @Test
    @DisplayName("Excluir o ultimo administrador deve retornar 400")
    void excluirUltimoAdminDeveRetornar400() throws Exception {
        when(usuarioRepository.findById(7L))
                .thenReturn(Optional.of(usuario(7, "outra.admin", "ROLE_ADMIN")));
        when(usuarioRepository.countByRole("ROLE_ADMIN")).thenReturn(1L);

        mockMvc.perform(delete("/api/usuarios/7")
                        .with(user("admin").roles("ADMIN")))
                .andExpect(status().isBadRequest());

        verify(usuarioRepository, never()).delete(any());
    }

    @Test
    @DisplayName("Rebaixar o ultimo administrador no PUT deve retornar 400")
    void rebaixarUltimoAdminDeveRetornar400() throws Exception {
        when(usuarioRepository.findById(7L))
                .thenReturn(Optional.of(usuario(7, "outra.admin", "ROLE_ADMIN")));
        when(usuarioRepository.countByRole("ROLE_ADMIN")).thenReturn(1L);

        mockMvc.perform(put("/api/usuarios/7")
                        .with(user("admin").roles("ADMIN"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(payload("OPERADOR", null)))
                .andExpect(status().isBadRequest());

        verify(usuarioRepository, never()).save(any());
    }

    @Test
    @DisplayName("Trocar o perfil do ultimo admin para o proprio ADMIN e permitido")
    void manterPerfilAdminNoUltimoEhPermitido() throws Exception {
        when(usuarioRepository.findById(7L))
                .thenReturn(Optional.of(usuario(7, "outra.admin", "ROLE_ADMIN")));
        when(usuarioRepository.findByUsername("ana.gestora")).thenReturn(Optional.empty());

        mockMvc.perform(put("/api/usuarios/7")
                        .with(user("admin").roles("ADMIN"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(payload("ADMIN", null)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.role").value("ROLE_ADMIN"));
    }
}
