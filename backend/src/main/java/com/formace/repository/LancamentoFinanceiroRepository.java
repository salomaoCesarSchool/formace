package com.formace.repository;

import com.formace.entity.LancamentoFinanceiro;
import com.formace.enums.NaturezaLancamento;
import com.formace.enums.StatusLancamento;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

public interface LancamentoFinanceiroRepository extends JpaRepository<LancamentoFinanceiro, Long> {

    List<LancamentoFinanceiro> findByMesReferenciaOrderByMesReferenciaDesc(String mesReferencia);

    List<LancamentoFinanceiro> findByMesReferenciaAndStatusOrderByDataPagamentoDesc(
            String mesReferencia, StatusLancamento status);

    List<LancamentoFinanceiro> findTop10ByOrderByIdDesc();

    List<LancamentoFinanceiro> findByDataPagamentoBetween(LocalDate de, LocalDate ate);

    List<LancamentoFinanceiro> findByStatusOrderByDataVencimentoAsc(StatusLancamento status);

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
