package com.formace.controller;

import com.formace.dto.LocatarioRequest;
import com.formace.entity.Locatario;
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
 * Locatarios (pessoas que ocupam os imoveis).
 */
@RestController
@RequestMapping("/api/locatarios")
@RequiredArgsConstructor
public class LocatarioController {

    private final CadastroService cadastroService;

    @GetMapping
    public List<Locatario> listar(@RequestParam(required = false) String q) {
        return cadastroService.listarLocatarios(q);
    }

    @GetMapping("/{id}")
    public Locatario obter(@PathVariable Long id) {
        return cadastroService.listarLocatarios(null).stream()
                .filter(l -> l.getId().equals(id))
                .findFirst()
                .orElseThrow(() -> new com.formace.exception.NotFoundException("Locatario " + id + " nao encontrado"));
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public Locatario criar(@Valid @RequestBody LocatarioRequest request) {
        return cadastroService.salvarLocatario(request);
    }

    @PutMapping("/{id}")
    public Locatario atualizar(@PathVariable Long id, @Valid @RequestBody LocatarioRequest request) {
        return cadastroService.atualizarLocatario(id, request);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void excluir(@PathVariable Long id) {
        cadastroService.excluirLocatario(id);
    }
}
