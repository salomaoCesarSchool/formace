package com.formace.controller;

import com.formace.dto.ContratoRequest;
import com.formace.dto.PdfLinkRequest;
import com.formace.entity.Contrato;
import com.formace.service.CadastroService;
import com.formace.exception.BadRequestException;
import com.formace.exception.NotFoundException;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
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
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.List;

/**
 * Contratos digitalizados: grid, alertas de vencimento, upload e link do PDF.
 */
@RestController
@RequestMapping("/api/contratos")
@RequiredArgsConstructor
public class ContratoController {

    private final CadastroService cadastroService;

    @GetMapping
    public List<Contrato> listar(
            @RequestParam(required = false) String status,
            @RequestParam(required = false) Integer vencendoDias) {
        return cadastroService.listarContratos(status, vencendoDias);
    }

    @GetMapping("/{id}")
    public Contrato obter(@PathVariable Long id) {
        return cadastroService.obterContrato(id);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public Contrato criar(@Valid @RequestBody ContratoRequest request) {
        return cadastroService.salvarContrato(request);
    }

    @PutMapping("/{id}")
    public Contrato atualizar(@PathVariable Long id, @Valid @RequestBody ContratoRequest request) {
        return cadastroService.atualizarContrato(id, request);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void excluir(@PathVariable Long id) {
        cadastroService.excluirContrato(id);
    }

    /** Associa um link externo ao PDF do contrato. */
    @PutMapping("/{id}/pdf-link")
    public Contrato associarLink(@PathVariable Long id, @Valid @RequestBody PdfLinkRequest request) {
        return cadastroService.associarPdfLink(id, request.pdfUrl());
    }

    /** Envia o PDF digitalizado do contrato (multipart/form-data). */
    @PostMapping("/{id}/pdf")
    public Contrato enviarPdf(@PathVariable Long id, @RequestParam("file") MultipartFile file) {
        if (file.isEmpty()) {
            throw new BadRequestException("Arquivo vazio. Selecione o PDF do contrato");
        }
        String nome = file.getOriginalFilename() != null ? file.getOriginalFilename() : "contrato.pdf";
        if (!nome.toLowerCase().endsWith(".pdf")) {
            throw new BadRequestException("Somente arquivos PDF sao aceitos");
        }
        try {
            return cadastroService.salvarPdfUpload(id, nome, file.getBytes());
        } catch (IOException ex) {
            throw new BadRequestException("Nao foi possivel ler o arquivo enviado");
        }
    }

    /** Download do PDF armazenado do contrato. */
    @GetMapping("/{id}/pdf")
    public ResponseEntity<byte[]> baixarPdf(@PathVariable Long id) {
        Contrato contrato = cadastroService.obterContrato(id);

        if (contrato.getPdfConteudo() == null || contrato.getPdfConteudo().length == 0) {
            throw new NotFoundException("Este contrato nao possui PDF enviado. Use o link: "
                    + (contrato.getPdfUrl() != null ? contrato.getPdfUrl() : "nao cadastrado"));
        }

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_PDF);
        headers.setContentDisposition(ContentDisposition.attachment()
                .filename(contrato.getPdfNome() != null ? contrato.getPdfNome() : contrato.getCodigo() + ".pdf")
                .build());
        return new ResponseEntity<>(contrato.getPdfConteudo(), headers, HttpStatus.OK);
    }
}
