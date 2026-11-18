package com.formace.controller;

import com.formace.dto.UsuarioRequest;
import com.formace.dto.UsuarioResponse;
import com.formace.entity.Usuario;
import com.formace.exception.BadRequestException;
import com.formace.exception.NotFoundException;
import com.formace.repository.UsuarioRepository;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Locale;
import java.util.Set;

/**
 * Gestao de usuarios e niveis de acesso — restrita ao ADMIN (requisito de
 * perfis: Administrador, Gerente/GESTOR e Operador). A senha volta so quando
 * informada; a resposta usa DTO sem o hash.
 */
@Tag(name = "Usuarios", description = "Gestao de usuarios e niveis de acesso (somente Administrador)")
@RestController
@RequestMapping("/api/usuarios")
@RequiredArgsConstructor
public class UsuarioController {

    /** Perfis aceitos (role gravada com o prefixo ROLE_). */
    private static final Set<String> PAPEIS = Set.of("ROLE_ADMIN", "ROLE_GESTOR", "ROLE_OPERADOR");

    private final UsuarioRepository usuarioRepository;
    private final PasswordEncoder passwordEncoder;

    @Operation(summary = "Listar usuarios", description = "Somente Administrador.")
    @GetMapping
    @PreAuthorize("hasRole('ADMIN')")
    public List<UsuarioResponse> listar() {
        return usuarioRepository.findAll().stream()
                .map(UsuarioResponse::de)
                .toList();
    }

    @Operation(summary = "Criar usuario", description = "Somente Administrador. Senha obrigatoria (minimo 6).")
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasRole('ADMIN')")
    public UsuarioResponse criar(@Valid @RequestBody UsuarioRequest request) {
        String username = request.username().trim();
        if (usuarioRepository.findByUsername(username).isPresent()) {
            throw new BadRequestException("Ja existe um usuario com esse nome. Escolha outro.");
        }
        if (request.senha() == null || request.senha().isBlank()) {
            throw new BadRequestException("Senha e obrigatoria para novo usuario");
        }
        String papel = normalizarPapel(request.role());

        Usuario usuario = usuarioRepository.save(Usuario.builder()
                .username(username)
                .password(passwordEncoder.encode(request.senha()))
                .nome(request.nome().trim())
                .email(emailOuNulo(request.email()))
                .role(papel)
                .build());
        return UsuarioResponse.de(usuario);
    }

    @Operation(summary = "Atualizar usuario", description = "Somente Administrador. Senha vazia mantem a atual.")
    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public UsuarioResponse atualizar(@PathVariable Long id, @Valid @RequestBody UsuarioRequest request) {
        Usuario usuario = usuarioRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Usuario " + id + " nao encontrado"));
        String papel = normalizarPapel(request.role());

        // nao deixa o sistema ficar sem administrador (remocao do ultimo)
        if ("ROLE_ADMIN".equals(usuario.getRole()) && !"ROLE_ADMIN".equals(papel)
                && usuarioRepository.countByRole("ROLE_ADMIN") <= 1) {
            throw new BadRequestException(
                    "O sistema precisa de pelo menos um administrador — promova outra conta antes.");
        }

        String username = request.username().trim();
        usuarioRepository.findByUsername(username).ifPresent(existente -> {
            if (!existente.getId().equals(id)) {
                throw new BadRequestException("Ja existe um usuario com esse nome. Escolha outro.");
            }
        });

        usuario.setNome(request.nome().trim());
        usuario.setUsername(username);
        usuario.setEmail(emailOuNulo(request.email()));
        usuario.setRole(papel);
        if (request.senha() != null && !request.senha().isBlank()) {
            usuario.setPassword(passwordEncoder.encode(request.senha()));
        }
        return UsuarioResponse.de(usuarioRepository.save(usuario));
    }

    @Operation(summary = "Excluir usuario", description = "Somente Administrador. Nao e possivel excluir a propria conta nem o ultimo admin.")
    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @PreAuthorize("hasRole('ADMIN')")
    public void excluir(@PathVariable Long id, Authentication autenticacao) {
        Usuario usuario = usuarioRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Usuario " + id + " nao encontrado"));

        if (usuario.getUsername().equals(autenticacao.getName())) {
            throw new BadRequestException("Nao e possivel excluir a propria conta");
        }
        if ("ROLE_ADMIN".equals(usuario.getRole()) && usuarioRepository.countByRole("ROLE_ADMIN") <= 1) {
            throw new BadRequestException(
                    "O sistema precisa de pelo menos um administrador — promova outra conta antes.");
        }
        usuarioRepository.delete(usuario);
    }

    /** Aceita "ADMIN" ou "ROLE_ADMIN" e devolve com prefixo ROLE_. */
    private String normalizarPapel(String papel) {
        String limpo = papel == null ? "" : papel.trim().toUpperCase(Locale.ROOT);
        if (limpo.startsWith("ROLE_")) {
            limpo = limpo.substring("ROLE_".length());
        }
        String role = "ROLE_" + limpo;
        if (!PAPEIS.contains(role)) {
            throw new BadRequestException(
                    "Perfil invalido. Use ADMIN (Administrador), GESTOR (Gerente) ou OPERADOR (Operador)");
        }
        return role;
    }

    private static String emailOuNulo(String email) {
        return email == null || email.isBlank() ? null : email.trim();
    }
}
