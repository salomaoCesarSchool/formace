package com.formace.repository;

import com.formace.entity.Imovel;
import com.formace.enums.StatusImovel;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

/**
 * Todas as consultas trazem o locatario junto (join fetch): a entidade Imovel
 * tem locatario LAZY e a tela serializa esse campo — sem o fetch daria erro de
 * lazy e, com fetch, evita o N+1 (uma query unica em vez de 1+124).
 */
public interface ImovelRepository extends JpaRepository<Imovel, Long> {

    @Query("""
            select i from Imovel i
              left join fetch i.locatario
             where i.status = :status
             order by i.codigo
            """)
    List<Imovel> findByStatusOrderByCodigoAsc(@Param("status") StatusImovel status);

    long countByStatus(StatusImovel status);

    Optional<Imovel> findByCodigo(String codigo);

    @Query("""
            select i from Imovel i
              left join fetch i.locatario
             where lower(i.codigo) like lower(concat('%', :q, '%'))
                or lower(i.endereco) like lower(concat('%', :q, '%'))
                or lower(i.bairro) like lower(concat('%', :q, '%'))
                or lower(i.tipo) like lower(concat('%', :q, '%'))
             order by i.codigo
            """)
    List<Imovel> buscar(@Param("q") String q);

    @Override
    @Query("select i from Imovel i left join fetch i.locatario")
    List<Imovel> findAll();

    @Override
    @Query("select i from Imovel i left join fetch i.locatario where i.id = :id")
    Optional<Imovel> findById(@Param("id") Long id);
}
