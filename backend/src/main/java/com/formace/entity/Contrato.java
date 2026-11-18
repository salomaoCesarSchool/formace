package com.formace.entity;

import com.formace.enums.StatusContrato;
import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToOne;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Index;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * Contrato de locacao digitalizado (com upload ou link do PDF).
 */
@Entity
@Table(name = "contrato", indexes = {
        @Index(name = "idx_contrato_status_fim", columnList = "status, dataFim"),
        @Index(name = "idx_contrato_imovel", columnList = "imovel_id")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Contrato {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "codigo", nullable = false, unique = true, length = 20)
    private String codigo;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "imovel_id", nullable = false)
    private Imovel imovel;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "locatario_id", nullable = false)
    private Locatario locatario;

    @Column(name = "data_inicio", nullable = false)
    private LocalDate dataInicio;

    @Column(name = "data_fim", nullable = false)
    private LocalDate dataFim;

    @Column(name = "valor_mensal", nullable = false, precision = 12, scale = 2)
    private BigDecimal valorMensal;

    /** Dia do mes de vencimento do aluguel (1..28). */
    @Column(name = "dia_vencimento", nullable = false)
    private Integer diaVencimento;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 20)
    private StatusContrato status;

    /** Link externo do PDF digitalizado (quando nao ha upload). */
    @Column(name = "pdf_url", length = 500)
    private String pdfUrl;

    @Column(name = "pdf_nome", length = 160)
    private String pdfNome;

    /** Conteudo do PDF enviado (upload). */
    @Column(name = "pdf_conteudo", columnDefinition = "bytea")
    @JsonIgnore
    private byte[] pdfConteudo;

    @Column(name = "observacao")
    private String observacao;

    /** Modelo do contrato (ex.: Locacao residencial). */
    @Column(name = "modelo", length = 60)
    private String modelo;

    /** Modalidade da garantia locaticia (FIADOR, CAUCAO, SEM_GARANTIA, SEGURO). */
    @Column(name = "modalidade_garantia", length = 30)
    private String modalidadeGarantia;

    /** Indice de reajuste acordado (ex.: IPCA, IGPM). */
    @Column(name = "indice_reajuste", length = 40)
    private String indiceReajuste;

    /** Periodicidade do reajuste (Anual, Semestral...). */
    @Column(name = "periodicidade_reajuste", length = 20)
    private String periodicidadeReajuste;

    /**
     * Fiador do contrato — o FK fica na tabela fiador (fiador.contrato_id);
     * cascade persist/merge + orphanRemoval cuidam do ciclo no save do contrato.
     */
    @OneToOne(mappedBy = "contrato", fetch = FetchType.LAZY,
            cascade = {CascadeType.PERSIST, CascadeType.MERGE}, orphanRemoval = true)
    private Fiador fiador;

    @Column(name = "criado_em", updatable = false)
    private LocalDateTime criadoEm;

    @PrePersist
    void onCreate() {
        if (criadoEm == null) {
            criadoEm = LocalDateTime.now();
        }
        if (status == null) {
            status = StatusContrato.ATIVO;
        }
        if (diaVencimento == null) {
            diaVencimento = 10;
        }
    }
}
