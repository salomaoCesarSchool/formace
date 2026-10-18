package com.formace.repository;

import com.formace.entity.TokenRecuperacao;
import com.formace.entity.Usuario;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface TokenRecuperacaoRepository extends JpaRepository<TokenRecuperacao, Long> {

    Optional<TokenRecuperacao> findByToken(String token);

    List<TokenRecuperacao> findByUsuarioAndUtilizadoFalse(Usuario usuario);
}
