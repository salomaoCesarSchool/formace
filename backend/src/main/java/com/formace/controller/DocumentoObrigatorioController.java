package com.formace.controller;

import com.formace.dto.DocumentoObrigatorioRequest;
import com.formace.entity.DocumentoObrigatorio;
import com.formace.exception.NotFoundException;
import com.formace.repository.DocumentoObrigatorioRepository;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
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
 * Documentos obrigatorios configuraveis por modalidade de garantia.
 * O contrato exige, para cada modalidade escolhida, os documentos
 * cadastrados aqui (para o cliente e/ou para o fiador).
 * Leitura livre para todos os autenticados (o OPERADOR monta contratos);
 * alteracao restrita a ADMIN e GESTOR.
 */
@Tag(name = "Documentos obrigatorios", description = "Documentos exigidos por modalidade de garantia")
@RestController
@RequestMapping("/api/documentos-obrigatorios")
@RequiredArgsConstructor
public class DocumentoObrigatorioController {

    private final DocumentoObrigatorioRepository repository;

    @GetMapping
    public List<DocumentoObrigatorio> listar(@RequestParam(required = false) String modalidade) {
        if (modalidade != null && !modalidade.isBlank()) {
            return repository.findByModalidadeOrderByDestinatarioAscNomeAsc(modalidade.trim().toUpperCase());
        }
        return repository.findAllByOrderByModalidadeAscDestinatarioAscNomeAsc();
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasAnyRole('ADMIN', 'GESTOR')")
    public DocumentoObrigatorio criar(@Valid @RequestBody DocumentoObrigatorioRequest request) {
        return repository.save(DocumentoObrigatorio.builder()
                .modalidade(request.modalidade().trim().toUpperCase())
                .destinatario(request.destinatario())
                .nome(request.nome().trim())
                .obrigatorio(request.obrigatorio())
                .build());
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'GESTOR')")
    public DocumentoObrigatorio atualizar(@PathVariable Long id,
                                          @Valid @RequestBody DocumentoObrigatorioRequest request) {
        DocumentoObrigatorio documento = repository.findById(id)
                .orElseThrow(() -> new NotFoundException("Documento " + id + " nao encontrado"));
        documento.setModalidade(request.modalidade().trim().toUpperCase());
        documento.setDestinatario(request.destinatario());
        documento.setNome(request.nome().trim());
        documento.setObrigatorio(request.obrigatorio());
        return repository.save(documento);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @PreAuthorize("hasAnyRole('ADMIN', 'GESTOR')")
    public void excluir(@PathVariable Long id) {
        if (!repository.existsById(id)) {
            throw new NotFoundException("Documento " + id + " nao encontrado");
        }
        repository.deleteById(id);
    }
}
