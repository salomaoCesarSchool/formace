package com.formace.controller;

import com.formace.dto.LancamentoRequest;
import com.formace.dto.PagarRequest;
import com.formace.entity.LancamentoFinanceiro;
import com.formace.dto.FluxoDiarioResponse;
import com.formace.exception.BadRequestException;
import com.formace.service.FinanceiroService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;
import java.time.format.DateTimeParseException;
import java.util.List;

/**
 * Modulo financeiro: lancamentos, quitacao, recibo em PDF e fluxo de caixa (RDD).
 */
@RestController
@RequestMapping("/api/financeiro")
@RequiredArgsConstructor
public class FinanceiroController {

    private final FinanceiroService financeiroService;

    @GetMapping("/lancamentos")
    public List<LancamentoFinanceiro> listar(
            @RequestParam(required = false) String mesReferencia,
            @RequestParam(required = false) String status) {
        return financeiroService.listar(mesReferencia, status);
    }

    @GetMapping("/lancamentos/{id}")
    public LancamentoFinanceiro obter(@PathVariable Long id) {
        return financeiroService.obter(id);
    }

    @PostMapping("/lancamentos")
    @ResponseStatus(HttpStatus.CREATED)
    public LancamentoFinanceiro criar(@Valid @RequestBody LancamentoRequest request) {
        return financeiroService.criar(request);
    }

    @PostMapping("/lancamentos/{id}/pagar")
    public LancamentoFinanceiro pagar(@PathVariable Long id, @Valid @RequestBody PagarRequest request) {
        return financeiroService.pagar(id, request);
    }

    @PostMapping("/lancamentos/{id}/cancelar")
    public LancamentoFinanceiro cancelar(@PathVariable Long id) {
        financeiroService.cancelar(id);
        return financeiroService.obter(id);
    }

    /**
     * Download do recibo numerado em PDF.
     */
    @GetMapping("/lancamentos/{id}/recibo")
    public ResponseEntity<byte[]> recibo(@PathVariable Long id) {
        byte[] pdf = financeiroService.gerarReciboPdf(id);

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_PDF);
        headers.setContentDisposition(ContentDisposition.attachment()
                .filename("recibo-" + String.format("%06d", id) + ".pdf")
                .build());
        return new ResponseEntity<>(pdf, headers, HttpStatus.OK);
    }

    /**
     * Fluxo de caixa diario / RDD: entradas, saidas, saldo do dia e saldo acumulado.
     */
    @GetMapping("/fluxo-caixa")
    public List<FluxoDiarioResponse> fluxoCaixa(
            @RequestParam String de,
            @RequestParam String ate) {
        return financeiroService.fluxoCaixa(parseData(de, "de"), parseData(ate, "ate"));
    }

    private LocalDate parseData(String valor, String campo) {
        try {
            return LocalDate.parse(valor);
        } catch (DateTimeParseException ex) {
            throw new BadRequestException("Parametro '" + campo + "' invalido. Use o formato AAAA-MM-DD");
        }
    }
}
