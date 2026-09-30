package com.formace.config;

import io.swagger.v3.oas.models.Components;
import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Contact;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.security.SecurityRequirement;
import io.swagger.v3.oas.models.security.SecurityScheme;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * Metadados da documentacao OpenAPI (Swagger UI).
 *
 * A API exige Bearer JWT em todas as rotas /api/**, por isso o componente
 * "bearerAuth" e declarado aqui: sem ele o botao "Authorize" do Swagger nao
 * envia o header Authorization e todas as chamadas retornariam 401.
 */
@Configuration
public class OpenApiConfig {

    public static final String SCHEME = "bearerAuth";

    @Bean
    public OpenAPI formaceOpenApi() {
        return new OpenAPI()
                .info(new Info()
                        .title("API FORMACE")
                        .description("""
                                Sistema de Gestao da Fundacao Manuel Cruz.

                                Endpoints de autenticacao, cadastro (imoveis, locatarios, contratos),
                                modulo financeiro (lancamentos, quitacao, recibos e fluxo de caixa)
                                e relatorio consolidado para o Ministerio Publico de Sergipe (MP-SE).

                                Todas as rotas iniciadas em /api/** exigem Bearer JWT,
                                exceto /api/auth/**. Use o botao Authorize para informar o token.
                                """)
                        .version("1.0.0")
                        .contact(new Contact().name("Equipe Back-end — Salomao e Leonardo")
                                .email("formace@example.com")))
                .components(new Components().addSecuritySchemes(SCHEME,
                        new SecurityScheme()
                                .name(SCHEME)
                                .type(SecurityScheme.Type.HTTP)
                                .scheme("bearer")
                                .bearerFormat("JWT")
                                .description("Cole o token retornado por POST /api/auth/login")))
                .addSecurityItem(new SecurityRequirement().addList(SCHEME));
    }
}
