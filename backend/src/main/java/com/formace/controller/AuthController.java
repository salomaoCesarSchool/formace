package com.formace.controller;

import com.formace.dto.AuthResponse;
import com.formace.dto.LoginRequest;
import com.formace.entity.Usuario;
import com.formace.repository.UsuarioRepository;
import com.formace.security.JwtService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

/**
 * Autenticacao da API (login gera o JWT usado por todo o resto das rotas).
 */
@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthenticationManager authenticationManager;
    private final UsuarioRepository usuarioRepository;
    private final JwtService jwtService;

    @PostMapping("/login")
    public ResponseEntity<AuthResponse> login(@Valid @RequestBody LoginRequest request) {
        Authentication authentication = authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(request.username(), request.password()));

        UserDetails user = (UserDetails) authentication.getPrincipal();
        String token = jwtService.gerarToken(user);

        Usuario usuario = usuarioRepository.findByUsername(user.getUsername()).orElse(null);
        String nome = usuario != null ? usuario.getNome() : user.getUsername();
        String role = usuario != null ? usuario.getRole() : "ROLE_USER";

        return ResponseEntity.ok(AuthResponse.bearer(token, jwtService.getExpirationMs(), user.getUsername(), nome, role));
    }

    @GetMapping("/me")
    public ResponseEntity<Map<String, Object>> me(Authentication authentication) {
        Usuario usuario = usuarioRepository.findByUsername(authentication.getName()).orElse(null);
        if (usuario == null) {
            return ResponseEntity.status(401).build();
        }
        return ResponseEntity.ok(Map.of(
                "id", usuario.getId(),
                "username", usuario.getUsername(),
                "nome", usuario.getNome(),
                "email", usuario.getEmail() != null ? usuario.getEmail() : "",
                "role", usuario.getRole()));
    }
}
