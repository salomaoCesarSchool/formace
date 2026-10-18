package com.formace.controller;

import com.formace.dto.AuthResponse;
import com.formace.dto.CadastroRequest;
import com.formace.dto.EsqueciSenhaRequest;
import com.formace.dto.LoginRequest;
import com.formace.dto.RedefinirSenhaRequest;
import com.formace.entity.Usuario;
import com.formace.exception.BadRequestException;
import com.formace.repository.UsuarioRepository;
import com.formace.security.JwtService;
import com.formace.service.RecuperacaoSenhaService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

/**
 * Autenticacao da API (login gera o JWT usado por todo o resto das rotas).
 */
@Tag(name = "Autenticacao", description = "Login, cadastro de usuario e usuario autenticado")
@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthenticationManager authenticationManager;
    private final UsuarioRepository usuarioRepository;
    private final JwtService jwtService;
    private final PasswordEncoder passwordEncoder;
    private final RecuperacaoSenhaService recuperacaoSenhaService;

    @Operation(summary = "Autenticar", description = "Recebe usuario e senha e retorna o Bearer JWT (valido por 24 horas).")
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

    @Operation(summary = "Cadastrar novo usuario",
            description = "Cria um usuario comum (ROLE_USER) e ja retorna o Bearer JWT, sem precisar logar em seguida.")
    @PostMapping("/cadastro")
    public ResponseEntity<AuthResponse> cadastro(@Valid @RequestBody CadastroRequest request) {
        String username = request.username().trim();

        if (usuarioRepository.findByUsername(username).isPresent()) {
            throw new BadRequestException("Ja existe um usuario com esse nome. Escolha outro ou faca login.");
        }

        // quando o campo "e-mail ou usuario" vem com @, ele tambem vira o e-mail da conta
        String email = request.email();
        if ((email == null || email.isBlank()) && username.contains("@")) {
            email = username;
        }

        String nome = request.nome();
        if (nome == null || nome.isBlank()) {
            nome = username.contains("@") ? username.substring(0, username.indexOf('@')) : username;
        }

        Usuario usuario = Usuario.builder()
                .username(username)
                .password(passwordEncoder.encode(request.password()))
                .nome(nome)
                .email(email)
                .role("ROLE_USER")
                .build();
        usuarioRepository.save(usuario);

        // autentica e devolve o token: o cadastro ja entra no sistema
        Authentication authentication = authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(username, request.password()));
        UserDetails user = (UserDetails) authentication.getPrincipal();
        String token = jwtService.gerarToken(user);

        return ResponseEntity.status(201)
                .body(AuthResponse.bearer(token, jwtService.getExpirationMs(), user.getUsername(), usuario.getNome(), usuario.getRole()));
    }

    @Operation(summary = "Esqueci a senha",
            description = "Gera um link de recuperacao valido por 30 minutos e envia por e-mail. "
                    + "A resposta e sempre generica, para nao revelar se a conta existe.")
    @PostMapping("/esqueci-senha")
    public ResponseEntity<Map<String, String>> esqueciSenha(@Valid @RequestBody EsqueciSenhaRequest request) {
        recuperacaoSenhaService.solicitar(request);
        return ResponseEntity.ok(Map.of("mensagem",
                "Se existir uma conta com esse e-mail, voce recebera uma mensagem com o link para redefinir a senha."));
    }

    @Operation(summary = "Redefinir senha",
            description = "Valida o token recebido por e-mail e grava a nova senha (BCrypt).")
    @PostMapping("/redefinir-senha")
    public ResponseEntity<Map<String, String>> redefinirSenha(@Valid @RequestBody RedefinirSenhaRequest request) {
        recuperacaoSenhaService.redefinir(request.token().trim(), request.password());
        return ResponseEntity.ok(Map.of("mensagem", "Senha redefinida com sucesso. Ja pode fazer login."));
    }

    @Operation(summary = "Usuario autenticado", description = "Retorna o usuario correspondente ao token informado no header Authorization.")
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
