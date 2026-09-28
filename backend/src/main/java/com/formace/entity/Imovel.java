package com.formace.entity;

import com.formace.enums.StatusImovel;
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
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * Imovel da carteira da Fundacao Manuel Cruz (124 unidades).
 */
@Entity
@Table(name = "imovel")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Imovel {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "codigo", nullable = false, unique = true, length = 20)
    private String codigo;

    @Column(name = "endereco", nullable = false)
    private String endereco;

    @Column(name = "numero", length = 15)
    private String numero;

    @Column(name = "bairro", nullable = false, length = 80)
    private String bairro;

    @Column(name = "cidade", nullable = false, length = 80)
    private String cidade;

    @Column(name = "cep", length = 12)
    private String cep;

    /** Apartamento, Casa, Sala comercial, Terreno, Galpao... */
    @Column(name = "tipo", nullable = false, length = 40)
    private String tipo;

    private Integer quartos;
    private Integer banheiros;

    @Column(name = "metragem")
    private Double metragem;

    @Column(name = "valor_aluguel", nullable = false, precision = 12, scale = 2)
    private BigDecimal valorAluguel;

    @Column(name = "iptu_mensal", nullable = false, precision = 12, scale = 2)
    private BigDecimal iptuMensal;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 20)
    private StatusImovel status;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "locatario_id")
    private Locatario locatario;

    @Column(name = "observacao")
    private String observacao;

    @Column(name = "criado_em", updatable = false)
    private LocalDateTime criadoEm;

    @PrePersist
    void onCreate() {
        if (criadoEm == null) {
            criadoEm = LocalDateTime.now();
        }
        if (status == null) {
            status = StatusImovel.VAGO;
        }
    }
}
