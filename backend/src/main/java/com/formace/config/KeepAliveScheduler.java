package com.formace.config;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.EnableScheduling;
import org.springframework.scheduling.annotation.Scheduled;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;

/**
 * Keep-alive interno: periodicamente o proprio servidor faz um GET na
 * propria URL PUBLICA (https://formace.onrender.com/actuator/health).
 *
 * O request sai do container, passa pelo roteador do Render e volta para
 * o servico — ou seja, conta como trafego de ENTRADA e zera o contador
 * dos 15 minutos de suspensao do plano free. (Pingar localhost/127.0.0.1
 * nao funciona: o request nunca sai da maquina.)
 *
 * Este mecanismo mantem o servidor ACORDADO, mas nao consegue acorda-lo:
 * se o processo parou, o scheduler parou junto. Para acordar, o ping
 * EXTERNO do GitHub Actions (.github/workflows/keep-awake.yml) entra em
 * acao. As duas camadas juntas cobrem os dois casos.
 *
 * Desativado em desenvolvimento: quando a base URL contem "localhost"
 * (padrao local), o ping e ignorado.
 */
@Slf4j
@Configuration
@EnableScheduling
public class KeepAliveScheduler {

    private final HttpClient http = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(10))
            .build();

    /** Base URL publica da aplicacao (app.frontend.base-url / FRONTEND_BASE_URL). */
    @Value("${app.frontend.base-url}")
    private String baseUrl;

    /** Evita repetir o log de "desativado em dev" a cada ciclo. */
    private boolean avisoDevPublicado;

    /**
     * fixedDelay: a espera comeca a contar apos o fim do ping anterior.
     * Padrao de 7 min: mesmo que UMA volta falhe, a proxima sucesso chega
     * em ~14 min — ainda dentro da janela de 15 min do Render.
     */
    @Scheduled(
            fixedDelayString = "${app.keep-alive.interval-ms:420000}",
            initialDelayString = "${app.keep-alive.initial-delay-ms:300000}")
    public void ping() {
        String base = baseUrl.replaceAll("/+$", "");
        if (base.contains("localhost")) {
            if (!avisoDevPublicado) {
                log.info("Keep-alive interno desativado em desenvolvimento (base-url=localhost)");
                avisoDevPublicado = true;
            }
            return;
        }

        String url = base + "/actuator/health";
        try {
            HttpRequest request = HttpRequest.newBuilder(URI.create(url))
                    .timeout(Duration.ofSeconds(60))
                    .GET()
                    .build();
            HttpResponse<Void> response = http.send(request, HttpResponse.BodyHandlers.discarding());

            if (response.statusCode() >= 200 && response.statusCode() < 300) {
                log.info("Keep-alive OK: {} -> HTTP {}", url, response.statusCode());
            } else {
                log.warn("Keep-alive: {} -> HTTP {}", url, response.statusCode());
            }
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            log.warn("Keep-alive interrompido em {}", url);
        } catch (Exception e) {
            log.warn("Keep-alive falhou em {}: {}", url, e.getMessage());
        }
    }
}
