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
 * Documento obrigatorio configuravel por modalidade de garantia
 * (FIADOR, CAUCAO, SEM_GARANTIA, SEGURO) e por destinatario
 * (CLIENTE/locatario ou FIADOR).
 */
@Entity
@Table(name = "documento_obrigatorio")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DocumentoObrigatorio {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** Modalidade da garantia locaticia (ex.: FIADOR, CAUCAO). */
    @Column(name = "modalidade", nullable = false, length = 30)
    private String modalidade;

    /** Para quem o documento e exigido: CLIENTE ou FIADOR. */
    @Column(name = "destinatario", nullable = false, length = 20)
    private String destinatario;

    @Column(name = "nome", nullable = false, length = 120)
    private String nome;

    @Column(name = "obrigatorio", nullable = false)
    private boolean obrigatorio;

    @Column(name = "criado_em", updatable = false)
    private LocalDateTime criadoEm;

    @PrePersist
    void onCreate() {
        if (criadoEm == null) {
            criadoEm = LocalDateTime.now();
        }
        if (destinatario == null || destinatario.isBlank()) {
            destinatario = "CLIENTE";
        }
    }
}
