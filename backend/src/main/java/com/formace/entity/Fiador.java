package com.formace.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * Fiador do contrato de locacao: vinculado ao contrato (modalidade de garantia
 * FIADOR) e com os campos obrigatorios de identificacao.
 */
@Entity
@Table(name = "fiador")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Fiador {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** Back-reference apenas para o ciclo do banco; fora do JSON (evita loop). */
    @JsonIgnore
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "contrato_id", nullable = false)
    private Contrato contrato;

    @Column(name = "nome", nullable = false, length = 160)
    private String nome;

    @Column(name = "cpf", nullable = false, length = 20)
    private String cpf;

    @Column(name = "rg", length = 30)
    private String rg;

    @Column(name = "data_nascimento")
    private LocalDate dataNascimento;

    @Column(name = "estado_civil", length = 30)
    private String estadoCivil;

    @Column(name = "profissao", length = 80)
    private String profissao;

    @Column(name = "telefone", length = 25)
    private String telefone;

    @Column(name = "email", length = 120)
    private String email;

    @Column(name = "endereco", length = 200)
    private String endereco;

    @Column(name = "criado_em", updatable = false)
    private LocalDateTime criadoEm;

    @PrePersist
    void onCreate() {
        if (criadoEm == null) {
            criadoEm = LocalDateTime.now();
        }
    }
}
