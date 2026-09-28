package com.formace.repository;

import com.formace.entity.Imovel;
import com.formace.enums.StatusImovel;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface ImovelRepository extends JpaRepository<Imovel, Long> {

    List<Imovel> findByStatusOrderByCodigoAsc(StatusImovel status);

    long countByStatus(StatusImovel status);

    Optional<Imovel> findByCodigo(String codigo);

    @Query("""
            select i from Imovel i
             where lower(i.codigo) like lower(concat('%', :q, '%'))
                or lower(i.endereco) like lower(concat('%', :q, '%'))
                or lower(i.bairro) like lower(concat('%', :q, '%'))
                or lower(i.tipo) like lower(concat('%', :q, '%'))
             order by i.codigo
            """)
    List<Imovel> buscar(@Param("q") String q);
}
