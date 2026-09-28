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
 * Locatario (pessoa fisica ou juridica) que ocupa um imovel da Fundacao.
 */
@Entity
@Table(name = "locatario")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Locatario {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "nome", nullable = false, length = 160)
    private String nome;

    @Column(name = "cpf_cnpj", nullable = false, unique = true, length = 20)
    private String cpfCnpj;

    @Column(name = "telefone", length = 25)
    private String telefone;

    @Column(name = "email", length = 120)
    private String email;

    @Column(name = "endereco", length = 200)
    private String endereco;

    @Column(name = "cidade", length = 80)
    private String cidade;

    @Column(name = "observacao")
    private String observacao;

    @Column(name = "criado_em", updatable = false)
    private LocalDateTime criadoEm;

    @PrePersist
    void onCreate() {
        if (criadoEm == null) {
            criadoEm = LocalDateTime.now();
        }
    }
}
