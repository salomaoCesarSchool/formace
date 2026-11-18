package com.formace.repository;

import com.formace.entity.DocumentoObrigatorio;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

/** Repositorio dos documentos obrigatorios configuraveis. */
public interface DocumentoObrigatorioRepository extends JpaRepository<DocumentoObrigatorio, Long> {

    List<DocumentoObrigatorio> findByModalidadeOrderByDestinatarioAscNomeAsc(String modalidade);

    List<DocumentoObrigatorio> findAllByOrderByModalidadeAscDestinatarioAscNomeAsc();
}
