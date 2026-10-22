package com.formace.repository;

import com.formace.entity.Contrato;
import com.formace.enums.StatusContrato;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

/**
 * As consultas que devolvem contratos para as telas trazem imovel (+ locatario
 * do imovel) e locatario em uma unica query (join fetch), evitando N+1 entre
 * Render e Supabase. As validacoes internas usam as derived queries simples.
 */
public interface ContratoRepository extends JpaRepository<Contrato, Long> {

    @Query("""
            select c from Contrato c
              left join fetch c.imovel i
              left join fetch i.locatario
              left join fetch c.locatario
             order by c.dataFim asc
            """)
    List<Contrato> findByOrderByDataFimAsc();

    @Query("""
            select c from Contrato c
              left join fetch c.imovel i
              left join fetch i.locatario
              left join fetch c.locatario
             where c.status = :status
             order by c.dataFim asc
            """)
    List<Contrato> findByStatusOrderByDataFimAsc(@Param("status") StatusContrato status);

    /** Contratos com vencimento (data_fim) dentro da janela informada. */
    @Query("""
            select c from Contrato c
              left join fetch c.imovel
              left join fetch c.locatario
             where c.status = :status
               and c.dataFim >= :de
               and c.dataFim <= :ate
             order by c.dataFim asc
            """)
    List<Contrato> findByStatusAndDataFimGreaterThanEqualAndDataFimLessThanEqualOrderByDataFimAsc(
            @Param("status") StatusContrato status,
            @Param("de") LocalDate de,
            @Param("ate") LocalDate ate);

    long countByStatus(StatusContrato status);

    long countByStatusAndDataFimGreaterThanEqualAndDataFimLessThanEqual(
            StatusContrato status, LocalDate de, LocalDate ate);

    Optional<Contrato> findByCodigo(String codigo);

    List<Contrato> findByImovelId(Long imovelId);

    @Override
    @Query("""
            select c from Contrato c
              left join fetch c.imovel i
              left join fetch i.locatario
              left join fetch c.locatario
             where c.id = :id
            """)
    Optional<Contrato> findById(@Param("id") Long id);
}
