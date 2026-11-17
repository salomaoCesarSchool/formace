package com.formace.controller;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.Instant;
import java.util.Map;

@RestController
public class KeepAliveController {

    private final JdbcTemplate jdbc;

    public KeepAliveController(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    @GetMapping("/keep-alive")
    public Map<String, Object> keepAlive() {
        Long total = jdbc.queryForObject("SELECT COUNT(*) FROM imovel", Long.class);
        return Map.of("ok", true, "imoveis", total, "time", Instant.now().toString());
    }
}
