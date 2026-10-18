package com.formace.service;

import com.formace.dto.EsqueciSenhaRequest;
import com.formace.entity.TokenRecuperacao;
import com.formace.entity.Usuario;
import com.formace.exception.BadRequestException;
import com.formace.repository.TokenRecuperacaoRepository;
import com.formace.repository.UsuarioRepository;
import jakarta.mail.internet.MimeMessage;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;

import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Recuperacao de senha por e-mail:
 * 1) solicitar() gera um token expiravel (30 min, uso unico) e envia o link;
 * 2) redefinir() valida o token e grava a nova senha com hash BCrypt.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class RecuperacaoSenhaService {

    private static final int MINUTOS_VALIDADE = 30;

    private final UsuarioRepository usuarioRepository;
    private final TokenRecuperacaoRepository tokenRepository;
    private final PasswordEncoder passwordEncoder;
    private final JavaMailSender javaMailSender;

    @Value("${app.frontend.base-url}")
    private String frontendBaseUrl;

    /**
     * Atende o pedido da tela "Esqueci a senha". Por seguranca a resposta nunca
     * revela se a conta existe; quando existe, envia o link por e-mail e tambem
     * registra no log do backend (util em ambiente local, sem SMTP configurado).
     */
    @Transactional
    public void solicitar(EsqueciSenhaRequest request) {
        String identificador = request.username().trim();
        Usuario usuario = usuarioRepository.findByUsername(identificador)
                .or(() -> usuarioRepository.findByEmailIgnoreCase(identificador))
                .orElse(null);

        if (usuario == null) {
            // nao revela existencia da conta nem tenta enviar e-mail
            log.info("Recuperacao de senha pedida para '{}' (conta nao encontrada)", identificador);
            return;
        }

        // invalida links antigos ainda nao usados: vale apenas o ultimo
        tokenRepository.findByUsuarioAndUtilizadoFalse(usuario).forEach(t -> {
            t.setUtilizado(true);
            tokenRepository.save(t);
        });

        TokenRecuperacao token = TokenRecuperacao.builder()
                .token(UUID.randomUUID().toString().replace("-", ""))
                .usuario(usuario)
                .expiraEm(LocalDateTime.now().plusMinutes(MINUTOS_VALIDADE))
                .utilizado(false)
                .build();
        tokenRepository.save(token);

        String link = frontendBaseUrl + "/redefinir-senha?token=" + token.getToken();
        // sempre no log: permite recuperar a senha localmente mesmo sem SMTP
        log.info("Link de recuperacao para {} (valido {} min): {}", usuario.getUsername(),
                MINUTOS_VALIDADE, link);

        enviarEmail(usuario, link);
    }

    /** Valida o token do e-mail e grava a nova senha. */
    @Transactional
    public void redefinir(String token, String novaSenha) {
        TokenRecuperacao registro = tokenRepository.findByToken(token)
                .orElseThrow(() -> new BadRequestException("Link de recuperacao invalido. Solicite um novo."));

        if (registro.isUtilizado()) {
            throw new BadRequestException("Link de recuperacao ja utilizado. Solicite um novo.");
        }
        if (registro.expirado()) {
            throw new BadRequestException("Link de recuperacao expirado. Solicite um novo.");
        }

        Usuario usuario = registro.getUsuario();
        usuario.setPassword(passwordEncoder.encode(novaSenha));
        usuarioRepository.save(usuario);

        registro.setUtilizado(true);
        tokenRepository.save(registro);
        log.info("Senha redefinida com sucesso para {}", usuario.getUsername());
    }

    private void enviarEmail(Usuario usuario, String link) {
        String para = destinatarioDe(usuario);
        if (para == null) {
            log.warn("Usuario {} nao tem e-mail cadastrado; use o link do log", usuario.getUsername());
            return;
        }
        try {
            MimeMessage mensagem = javaMailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(mensagem, StandardCharsets.UTF_8.name());
            helper.setTo(para);
            helper.setSubject("Redefinicao de senha - FORMACE");
            helper.setText(corpoHtml(usuario.getNome(), link), true);
            javaMailSender.send(mensagem);
            log.info("E-mail de recuperacao enviado para {}", para);
        } catch (Exception ex) {
            // mantem a resposta generica; o link fica disponivel no log do backend
            log.error("Falha ao enviar e-mail de recuperacao para {}: {}", para, ex.getMessage());
        }
    }

    private String destinatarioDe(Usuario usuario) {
        if (usuario.getEmail() != null && !usuario.getEmail().isBlank()) {
            return usuario.getEmail();
        }
        return usuario.getUsername().contains("@") ? usuario.getUsername() : null;
    }

    private String corpoHtml(String nome, String link) {
        String quem = nome == null || nome.isBlank() ? "usuário" : nome;
        return """
                <div style="font-family: Arial, sans-serif; color: #1a1a2e; line-height: 1.6">
                  <p>Olá %s,</p>
                  <p>Recebemos uma solicitação para redefinir a senha da sua conta no
                  <b>FORMACE</b> (Fundação Manuel Cruz).</p>
                  <p><a href="%s" style="background: #6c5ce7; color: #fff; padding: 10px 18px;
                     border-radius: 8px; text-decoration: none; display: inline-block">
                     Criar nova senha</a></p>
                  <p>Ou copie o link: <br><span style="font-size: 12px; color: #777">%s</span></p>
                  <p style="color: #777; font-size: 12px">O link expira em %d minutos e pode ser
                  usado uma única vez. Se você não pediu isso, ignore este e-mail.</p>
                </div>
                """.formatted(quem, link, link, MINUTOS_VALIDADE);
    }
}
