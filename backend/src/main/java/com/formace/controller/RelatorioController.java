package com.formace.controller;

import com.formace.dto.RelatorioResumoResponse;
import com.formace.service.RelatorioMPService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * Prestacao de contas ao Ministerio Publico de Sergipe (MP-SE).
 */
@RestController
@RequestMapping("/api/relatorios")
@RequiredArgsConstructor
public class RelatorioController {

    private final RelatorioMPService relatorioMPService;

    /** Resumo JSON do exercicio (cards da tela de relatorios). */
    @GetMapping("/mp-se/resumo")
    public RelatorioResumoResponse resumo(@RequestParam(defaultValue = "0") int ano) {
        int exercicio = ano > 0 ? ano : java.time.LocalDate.now().getYear();
        return relatorioMPService.resumo(exercicio);
    }

    /** Relatorio anual consolidado completo em PDF. */
    @GetMapping("/mp-se")
    public ResponseEntity<byte[]> gerar(
            @RequestParam(defaultValue = "0") int ano) {
        int exercicio = ano > 0 ? ano : java.time.LocalDate.now().getYear();
        byte[] pdf = relatorioMPService.gerarRelatorioAnual(exercicio);

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_PDF);
        headers.setContentDisposition(ContentDisposition.attachment()
                .filename("relatorio-mp-se-" + exercicio + ".pdf")
                .build());
        return new ResponseEntity<>(pdf, headers, HttpStatus.OK);
    }
}
