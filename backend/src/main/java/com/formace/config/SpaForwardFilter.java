package com.formace.config;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

/**
 * Modo SPA (deploy unico): o frontend React e embutido no jar (static/index.html).
 * Todo GET de pagina do React (/login, /dashboard, /contratos/12...) e encaminhado
 * para o index.html e o react-router cuida da tela; chamadas de API continuam
 * em /api/** e assets com extensao (.js, .png, .css) sao servidos direto.
 */
@Component
public class SpaForwardFilter extends OncePerRequestFilter {

    private static final String[] PREFIXOS_API = {
            "/api", "/actuator", "/v3", "/swagger-ui", "/error"
    };

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain) throws ServletException, IOException {
        String caminho = request.getRequestURI();
        String contexto = request.getContextPath();
        if (contexto != null && !contexto.isEmpty() && caminho.startsWith(contexto)) {
            caminho = caminho.substring(contexto.length());
        }

        boolean ehGet = "GET".equals(request.getMethod());
        boolean ehApi = false;
        for (String p : PREFIXOS_API) {
            if (caminho.startsWith(p)) {
                ehApi = true;
                break;
            }
        }
        boolean temExtensao = caminho.contains(".");
        // raiz "/" cai no index.html pelo proprio Spring Boot (welcome page)

        if (ehGet && !ehApi && !temExtensao && !caminho.isEmpty()) {
            request.getRequestDispatcher("/index.html").forward(request, response);
            return;
        }
        filterChain.doFilter(request, response);
    }
}
