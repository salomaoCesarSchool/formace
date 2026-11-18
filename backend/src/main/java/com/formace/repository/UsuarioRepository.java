package com.formace.repository;

import com.formace.entity.Usuario;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface UsuarioRepository extends JpaRepository<Usuario, Long> {

    Optional<Usuario> findByUsername(String username);

    /** Conta os usuarios de um papel (protege a exclusao do ultimo ADMIN). */
    long countByRole(String role);

    Optional<Usuario> findByEmailIgnoreCase(String email);
}
