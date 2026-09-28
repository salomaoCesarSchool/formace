package com.formace.repository;

import com.formace.entity.Recibo;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface ReciboRepository extends JpaRepository<Recibo, Long> {

    Optional<Recibo> findTopByOrderByNumeroDesc();

    Optional<Recibo> findByLancamentoId(Long lancamentoId);
}
