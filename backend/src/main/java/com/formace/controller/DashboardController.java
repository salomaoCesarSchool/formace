package com.formace.controller;

import com.formace.dto.DashboardResponse;
import com.formace.service.DashboardService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.web.bind.annotation.RestController;

/**
 * KPIs do dashboard (ocupacao, receita, contratos a vencer e alertas).
 */
@Tag(name = "Dashboard", description = "KPIs e indicadores da carteira")
@RestController
@RequestMapping("/api/dashboard")
@RequiredArgsConstructor
public class DashboardController {

    private final DashboardService dashboardService;

    @Operation(summary = "KPIs do dashboard", description = "Imoveis ocupados, receita do mes, contratos a vencer e demais indicadores da carteira.")
    @GetMapping
    public DashboardResponse montar() {
        return dashboardService.montar();
    }
}
