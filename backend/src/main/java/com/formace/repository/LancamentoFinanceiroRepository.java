package com.formace.repository;

import com.formace.entity.LancamentoFinanceiro;
import com.formace.enums.NaturezaLancamento;
import com.formace.enums.StatusLancamento;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

/**
 * As listagens trazem todas as associations (imovel, locatario, contrato,
 * recibo) em UMA query com join fetch — antes cada lancamento disparava ~6
 * queries extras (EAGER), o que dava mais de 1.000 idas ao banco na tela de
 * Financeiro com o banco na nuvem. Todas as associacoes sao to-one, entao o
 * join fetch nao duplica linhas.
 */
public interface LancamentoFinanceiroRepository extends JpaRepository<LancamentoFinanceiro, Long> {

    /** Base de fetch comum a todas as listagens que vao para a tela. */
    String FETCH = """
              left join fetch l.imovel i
              left join fetch i.locatario
              left join fetch l.locatario
              left join fetch l.contrato c
              left join fetch c.imovel ci
              left join fetch ci.locatario
              left join fetch c.locatario
              left join fetch l.recibo
            """;

    @Query("select l from LancamentoFinanceiro l " + FETCH + """
             where l.mesReferencia = :mesReferencia
             order by l.mesReferencia desc
            """)
    List<LancamentoFinanceiro> findByMesReferenciaOrderByMesReferenciaDesc(
            @Param("mesReferencia") String mesReferencia);

    @Query("select l from LancamentoFinanceiro l " + FETCH + """
             where l.mesReferencia = :mesReferencia and l.status = :status
             order by l.dataPagamento desc
            """)
    List<LancamentoFinanceiro> findByMesReferenciaAndStatusOrderByDataPagamentoDesc(
            @Param("mesReferencia") String mesReferencia,
            @Param("status") StatusLancamento status);

    @Query("select l from LancamentoFinanceiro l " + FETCH + """
             where l.status = :status
             order by l.dataVencimento asc
            """)
    List<LancamentoFinanceiro> findByStatusOrderByDataVencimentoAsc(@Param("status") StatusLancamento status);

    /** Ultimos lancamentos do dashboard (limitado pelo Pageable). */
    @Query("select l from LancamentoFinanceiro l " + FETCH + " order by l.id desc")
    List<LancamentoFinanceiro> buscarRecentes(Pageable pageable);

    @Query("select l from LancamentoFinanceiro l " + FETCH + " order by l.id desc")
    List<LancamentoFinanceiro> buscarTodosDecrescente();

    @Override
    @Query("select l from LancamentoFinanceiro l " + FETCH + " where l.id = :id")
    Optional<LancamentoFinanceiro> findById(@Param("id") Long id);

    List<LancamentoFinanceiro> findByDataPagamentoBetween(LocalDate de, LocalDate ate);

    boolean existsByImovelId(Long imovelId);

    @Query("""
            select coalesce(sum(f.valorTotal), 0) from LancamentoFinanceiro f
             where f.mesReferencia = :mes
               and f.status = :status
               and f.natureza = :natureza
            """)
    BigDecimal somarValorTotal(@Param("mes") String mes,
                               @Param("status") StatusLancamento status,
                               @Param("natureza") NaturezaLancamento natureza);

    @Query("""
            select coalesce(sum(f.valorTotal), 0) from LancamentoFinanceiro f
             where f.mesReferencia like concat(:ano, '%')
               and f.natureza = :natureza
            """)
    BigDecimal somarPorAnoENatureza(@Param("ano") int ano, @Param("natureza") NaturezaLancamento natureza);

    @Query("""
            select f from LancamentoFinanceiro f
              left join fetch f.imovel i
              left join fetch i.locatario
              left join fetch f.locatario
             where f.mesReferencia like concat(:ano, '%')
             order by f.mesReferencia, f.id
            """)
    List<LancamentoFinanceiro> buscarPorAno(@Param("ano") int ano);

    @Query("""
            select coalesce(sum(f.multa), 0) + coalesce(sum(f.juros), 0) from LancamentoFinanceiro f
             where f.mesReferencia like concat(:ano, '%')
               and f.status = :pago
            """)
    BigDecimal somarMultaJuros(@Param("ano") int ano, @Param("pago") StatusLancamento pago);

    long countByStatusAndNatureza(StatusLancamento status, NaturezaLancamento natureza);
}
