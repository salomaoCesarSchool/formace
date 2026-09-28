package com.formace.repository;

import com.formace.entity.Locatario;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface LocatarioRepository extends JpaRepository<Locatario, Long> {

    @Query("""
            select l from Locatario l
             where lower(l.nome) like lower(concat('%', :q, '%'))
                or lower(l.cpfCnpj) like lower(concat('%', :q, '%'))
                or lower(l.email) like lower(concat('%', :q, '%'))
             order by l.nome
            """)
    List<Locatario> buscar(@Param("q") String q);
}
