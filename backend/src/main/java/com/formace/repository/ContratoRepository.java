package com.formace.repository;

import com.formace.entity.Contrato;
import com.formace.enums.StatusContrato;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface ContratoRepository extends JpaRepository<Contrato, Long> {

    List<Contrato> findByOrderByDataFimAsc();

    List<Contrato> findByStatusOrderByDataFimAsc(StatusContrato status);

    /** Contratos com vencimento (data_fim) dentro da janela informada. */
    List<Contrato> findByStatusAndDataFimGreaterThanEqualAndDataFimLessThanEqualOrderByDataFimAsc(
            StatusContrato status, LocalDate de, LocalDate ate);

    long countByStatusAndDataFimGreaterThanEqualAndDataFimLessThanEqual(
            StatusContrato status, LocalDate de, LocalDate ate);

    Optional<Contrato> findByCodigo(String codigo);

    List<Contrato> findByImovelId(Long imovelId);
}
