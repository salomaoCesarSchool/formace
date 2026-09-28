package com.formace.controller;

import com.formace.dto.ImovelRequest;
import com.formace.entity.Imovel;
import com.formace.service.CadastroService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * Carteira de 124 imoveis (consulta com filtros + cadastro).
 */
@RestController
@RequestMapping("/api/imoveis")
@RequiredArgsConstructor
public class ImovelController {

    private final CadastroService cadastroService;

    @GetMapping
    public List<Imovel> listar(
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String q) {
        return cadastroService.listarImoveis(status, q);
    }

    @GetMapping("/{id}")
    public Imovel obter(@PathVariable Long id) {
        return cadastroService.obterImovel(id);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public Imovel criar(@Valid @RequestBody ImovelRequest request) {
        return cadastroService.salvarImovel(request);
    }

    @PutMapping("/{id}")
    public Imovel atualizar(@PathVariable Long id, @Valid @RequestBody ImovelRequest request) {
        return cadastroService.atualizarImovel(id, request);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void excluir(@PathVariable Long id) {
        cadastroService.excluirImovel(id);
    }
}
