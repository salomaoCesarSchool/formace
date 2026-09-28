package com.formace.security;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.Date;
import java.util.function.Function;

/**
 * Emite e valida tokens JWT (HS256).
 */
@Service
public class JwtService {

    @Value("${app.jwt.secret}")
    private String secret;

    @Value("${app.jwt.expiration-ms}")
    private long expirationMs;

    private SecretKey chave() {
        // HS256 exige chave de ao menos 32 bytes.
        byte[] bytes = secret.getBytes(StandardCharsets.UTF_8);
        if (bytes.length < 32) {
            throw new IllegalStateException("app.jwt.secret deve ter ao menos 32 caracteres");
        }
        return Keys.hmacShaKeyFor(bytes);
    }

    public String gerarToken(UserDetails user) {
        Date agora = new Date();
        Date expira = new Date(agora.getTime() + expirationMs);
        return Jwts.builder()
                .subject(user.getUsername())
                .issuedAt(agora)
                .expiration(expira)
                .claim("role", user.getAuthorities().isEmpty()
                        ? "ROLE_USER"
                        : user.getAuthorities().iterator().next().getAuthority())
                .signWith(chave())
                .compact();
    }

    public String extrairUsername(String token) {
        return extrairClaim(token, Claims::getSubject);
    }

    public <T> T extrairClaim(String token, Function<Claims, T> resolver) {
        return resolver.apply(extrairClaims(token));
    }

    public boolean isTokenValido(String token, UserDetails user) {
        String username = extrairUsername(token);
        return username != null && username.equals(user.getUsername()) && !isTokenExpirado(token);
    }

    public boolean isTokenExpirado(String token) {
        return extrairClaims(token).getExpiration().before(new Date());
    }

    public long getExpirationMs() {
        return expirationMs;
    }

    private Claims extrairClaims(String token) {
        return Jwts.parser()
                .verifyWith(chave())
                .build()
                .parseSignedClaims(token)
                .getPayload();
    }
}
