package com.formace.dto;

import com.formace.entity.Usuario;

import java.time.LocalDateTime;

/**
 * Usuario sem a senha (nunca serializar a entidade diretamente).
 */
public record UsuarioResponse(
        Long id,
        String username,
        String nome,
        String email,
        String role,
        LocalDateTime criadoEm) {

    public static UsuarioResponse de(Usuario usuario) {
        return new UsuarioResponse(
                usuario.getId(),
                usuario.getUsername(),
                usuario.getNome(),
                usuario.getEmail(),
                usuario.getRole(),
                usuario.getCriadoEm());
    }
}
