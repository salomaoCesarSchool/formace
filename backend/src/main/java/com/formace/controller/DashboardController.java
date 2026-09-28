package com.formace.controller;

import com.formace.dto.DashboardResponse;
import com.formace.service.DashboardService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * KPIs do dashboard (ocupacao, receita, contratos a vencer e alertas).
 */
@RestController
@RequestMapping("/api/dashboard")
@RequiredArgsConstructor
public class DashboardController {

    private final DashboardService dashboardService;

    @GetMapping
    public DashboardResponse montar() {
        return dashboardService.montar();
    }
}
