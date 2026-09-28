package com.formace.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

/**
 * Usuario do sistema (autenticacao JWT).
 */
@Entity
@Table(name = "usuario")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Usuario {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "username", nullable = false, unique = true, length = 80)
    private String username;

    /** Senha com hash BCrypt. */
    @Column(name = "password", nullable = false, length = 120)
    private String password;

    @Column(name = "nome", nullable = false, length = 160)
    private String nome;

    @Column(name = "email", length = 160)
    private String email;

    /** Ex.: ROLE_ADMIN */
    @Column(name = "role", nullable = false, length = 40)
    private String role;

    @Column(name = "criado_em", updatable = false)
    private LocalDateTime criadoEm;

    @PrePersist
    void onCreate() {
        if (criadoEm == null) {
            criadoEm = LocalDateTime.now();
        }
        if (role == null || role.isBlank()) {
            role = "ROLE_ADMIN";
        }
    }
}
