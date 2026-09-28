package com.formace.entity;

import com.formace.enums.NaturezaLancamento;
import com.formace.enums.StatusLancamento;
import com.formace.enums.TipoLancamento;
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
 * Lancamento financeiro (aluguel, IPTU, despesas) com multa/juros por atraso.
 */
@Entity
@Table(name = "lancamento_financeiro")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class LancamentoFinanceiro {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.EAGER, optional = false)
    @JoinColumn(name = "imovel_id", nullable = false)
    private Imovel imovel;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "locatario_id")
    private Locatario locatario;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "contrato_id")
    private Contrato contrato;

    @Enumerated(EnumType.STRING)
    @Column(name = "tipo", nullable = false, length = 30)
    private TipoLancamento tipo;

    @Enumerated(EnumType.STRING)
    @Column(name = "natureza", nullable = false, length = 10)
    private NaturezaLancamento natureza;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 20)
    private StatusLancamento status;

    @Column(name = "valor_aluguel", nullable = false, precision = 12, scale = 2)
    private BigDecimal valorAluguel;

    @Column(name = "valor_iptu", nullable = false, precision = 12, scale = 2)
    private BigDecimal valorIptu;

    @Column(name = "multa", nullable = false, precision = 12, scale = 2)
    private BigDecimal multa;

    @Column(name = "juros", nullable = false, precision = 12, scale = 2)
    private BigDecimal juros;

    @Column(name = "valor_total", nullable = false, precision = 12, scale = 2)
    private BigDecimal valorTotal;

    @Column(name = "data_vencimento", nullable = false)
    private LocalDate dataVencimento;

    @Column(name = "data_pagamento")
    private LocalDate dataPagamento;

    /** Mes de referencia no formato AAAA-MM (ex.: 2026-09). */
    @Column(name = "mes_referencia", nullable = false, length = 7)
    private String mesReferencia;

    @Column(name = "descricao", length = 300)
    private String descricao;

    @OneToOne(mappedBy = "lancamento", cascade = CascadeType.ALL, fetch = FetchType.EAGER)
    private Recibo recibo;

    @Column(name = "criado_em", updatable = false)
    private LocalDateTime criadoEm;

    @PrePersist
    void onCreate() {
        if (criadoEm == null) {
            criadoEm = LocalDateTime.now();
        }
        if (natureza == null) {
            natureza = NaturezaLancamento.ENTRADA;
        }
        if (status == null) {
            status = dataPagamento != null ? StatusLancamento.PAGO : StatusLancamento.PENDENTE;
        }
    }
}
