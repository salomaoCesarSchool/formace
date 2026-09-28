package com.formace.config;

import com.formace.entity.Usuario;
import com.formace.repository.UsuarioRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.crypto.password.PasswordEncoder;

/**
 * Carga inicial do usuario administrador (aparece so na primeira subida, quando a tabela esta vazia).
 * Usuario: admin / senha: admin123 (troque em producao).
 */
@Configuration
public class DataSeeder {

    private static final Logger log = LoggerFactory.getLogger(DataSeeder.class);

    @Bean
    CommandLineRunner seedAdminUsuario(UsuarioRepository usuarioRepository, PasswordEncoder passwordEncoder) {
        return args -> {
            if (usuarioRepository.count() == 0) {
                Usuario admin = Usuario.builder()
                        .username("admin")
                        .password(passwordEncoder.encode("admin123"))
                        .nome("Administrador FORMACE")
                        .email("admin@fundacaomanuelcruz.se.gov.br")
                        .role("ROLE_ADMIN")
                        .build();
                usuarioRepository.save(admin);
                log.info("Usuario administrador criado (login: admin / senha: admin123)");
            }
        };
    }
}
