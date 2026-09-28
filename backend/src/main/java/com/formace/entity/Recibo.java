package com.formace.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.OneToOne;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

/**
 * Recibo numerado emitido para um lancamento pago (o PDF e gerado sob demanda).
 */
@Entity
@Table(name = "recibo")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Recibo {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** Numero sequencial e ininterrupto do recibo (000001, 000002, ...). */
    @Column(name = "numero", nullable = false, unique = true)
    private Long numero;

    @OneToOne(optional = false)
    @JoinColumn(name = "lancamento_id", nullable = false, unique = true)
    @JsonIgnore
    private LancamentoFinanceiro lancamento;

    @Column(name = "emitido_em", nullable = false)
    private LocalDateTime emitidoEm;

    @Column(name = "emitido_por", nullable = false, length = 80)
    private String emitidoPor;

    /** SHA-256 do conteudo do PDF (auditoria / anti-fraude). */
    @Column(name = "hash", length = 80)
    private String hash;

    @PrePersist
    void onCreate() {
        if (emitidoEm == null) {
            emitidoEm = LocalDateTime.now();
        }
        if (emitidoPor == null) {
            emitidoPor = "sistema";
        }
    }
}
