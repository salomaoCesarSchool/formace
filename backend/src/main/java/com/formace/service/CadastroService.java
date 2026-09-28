package com.formace.service;

import com.formace.dto.ContratoRequest;
import com.formace.dto.ImovelRequest;
import com.formace.dto.LocatarioRequest;
import com.formace.entity.Contrato;
import com.formace.entity.Imovel;
import com.formace.entity.Locatario;
import com.formace.enums.StatusContrato;
import com.formace.enums.StatusImovel;
import com.formace.exception.BadRequestException;
import com.formace.exception.NotFoundException;
import com.formace.repository.ContratoRepository;
import com.formace.repository.ImovelRepository;
import com.formace.repository.LancamentoFinanceiroRepository;
import com.formace.repository.LocatarioRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;

/**
 * Cadastros de imoveis, locatarios e contratos (inclui upload/link do PDF digitalizado).
 */
@Service
@RequiredArgsConstructor
public class CadastroService {

    private final ImovelRepository imovelRepository;
    private final LocatarioRepository locatarioRepository;
    private final ContratoRepository contratoRepository;
    private final LancamentoFinanceiroRepository lancamentoRepository;

    // ---------------------------------------------------------------------
    // Imoveis
    // ---------------------------------------------------------------------

    @Transactional(readOnly = true)
    public List<Imovel> listarImoveis(String status, String q) {
        boolean temBusca = q != null && !q.isBlank();
        if (temBusca) {
            List<Imovel> encontrados = imovelRepository.buscar(q.trim());
            if (status == null || status.isBlank()) {
                return encontrados;
            }
            StatusImovel statusEnum = StatusImovel.valueOf(status.trim().toUpperCase());
            return encontrados.stream().filter(i -> i.getStatus() == statusEnum).toList();
        }
        if (status != null && !status.isBlank()) {
            return imovelRepository.findByStatusOrderByCodigoAsc(StatusImovel.valueOf(status.trim().toUpperCase()));
        }
        return imovelRepository.findAll();
    }

    @Transactional(readOnly = true)
    public Imovel obterImovel(Long id) {
        return imovelRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Imovel " + id + " nao encontrado"));
    }

    @Transactional
    public Imovel salvarImovel(ImovelRequest req) {
        imovelRepository.findByCodigo(req.codigo()).ifPresent(existente -> {
            throw new BadRequestException("Ja existe um imovel com o codigo " + req.codigo());
        });

        Imovel imovel = Imovel.builder()
                .codigo(req.codigo().trim())
                .endereco(req.endereco().trim())
                .numero(req.numero())
                .bairro(req.bairro().trim())
                .cidade(req.cidade().trim())
                .cep(req.cep())
                .tipo(req.tipo().trim())
                .quartos(req.quartos())
                .banheiros(req.banheiros())
                .metragem(req.metragem())
                .valorAluguel(req.valorAluguel())
                .iptuMensal(req.iptuMensal())
                .status(req.status())
                .observacao(req.observacao())
                .build();

        aplicarLocatario(imovel, req);
        return imovelRepository.save(imovel);
    }

    @Transactional
    public Imovel atualizarImovel(Long id, ImovelRequest req) {
        Imovel imovel = obterImovel(id);

        imovelRepository.findByCodigo(req.codigo()).ifPresent(existente -> {
            if (!existente.getId().equals(id)) {
                throw new BadRequestException("Ja existe um imovel com o codigo " + req.codigo());
            }
        });

        imovel.setCodigo(req.codigo().trim());
        imovel.setEndereco(req.endereco().trim());
        imovel.setNumero(req.numero());
        imovel.setBairro(req.bairro().trim());
        imovel.setCidade(req.cidade().trim());
        imovel.setCep(req.cep());
        imovel.setTipo(req.tipo().trim());
        imovel.setQuartos(req.quartos());
        imovel.setBanheiros(req.banheiros());
        imovel.setMetragem(req.metragem());
        imovel.setValorAluguel(req.valorAluguel());
        imovel.setIptuMensal(req.iptuMensal());
        imovel.setStatus(req.status());
        imovel.setObservacao(req.observacao());
        aplicarLocatario(imovel, req);

        return imovelRepository.save(imovel);
    }

    @Transactional
    public void excluirImovel(Long id) {
        Imovel imovel = obterImovel(id);
        if (!contratoRepository.findByImovelId(id).isEmpty()) {
            throw new BadRequestException("Imovel possui contratos vinculados e nao pode ser excluido");
        }
        if (lancamentoRepository.existsByImovelId(id)) {
            throw new BadRequestException("Imovel possui lancamentos financeiros e nao pode ser excluido");
        }
        imovelRepository.delete(imovel);
    }

    private void aplicarLocatario(Imovel imovel, ImovelRequest req) {
        if (req.status() == StatusImovel.OCUPADO) {
            if (req.locatarioId() == null) {
                throw new BadRequestException("Imovel OCUPADO exige um locatario vinculado");
            }
            imovel.setLocatario(locatarioRepository.findById(req.locatarioId())
                    .orElseThrow(() -> new NotFoundException("Locatario " + req.locatarioId() + " nao encontrado")));
        } else {
            imovel.setLocatario(null);
        }
    }

    // ---------------------------------------------------------------------
    // Locatarios
    // ---------------------------------------------------------------------

    @Transactional(readOnly = true)
    public List<Locatario> listarLocatarios(String q) {
        if (q == null || q.isBlank()) {
            return locatarioRepository.findAll();
        }
        return locatarioRepository.buscar(q.trim());
    }

    @Transactional
    public Locatario salvarLocatario(LocatarioRequest req) {
        return locatarioRepository.save(Locatario.builder()
                .nome(req.nome().trim())
                .cpfCnpj(req.cpfCnpj().trim())
                .telefone(req.telefone())
                .email(req.email())
                .endereco(req.endereco())
                .cidade(req.cidade())
                .observacao(req.observacao())
                .build());
    }

    @Transactional
    public Locatario atualizarLocatario(Long id, LocatarioRequest req) {
        Locatario locatario = locatarioRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Locatario " + id + " nao encontrado"));

        locatario.setNome(req.nome().trim());
        locatario.setCpfCnpj(req.cpfCnpj().trim());
        locatario.setTelefone(req.telefone());
        locatario.setEmail(req.email());
        locatario.setEndereco(req.endereco());
        locatario.setCidade(req.cidade());
        locatario.setObservacao(req.observacao());
        return locatarioRepository.save(locatario);
    }

    @Transactional
    public void excluirLocatario(Long id) {
        Locatario locatario = locatarioRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Locatario " + id + " nao encontrado"));
        if (!contratoRepository.findAll().stream()
                .anyMatch(c -> c.getLocatario().getId().equals(id))) {
            locatarioRepository.delete(locatario);
            return;
        }
        throw new BadRequestException("Locatario possui contratos vinculados e nao pode ser excluido");
    }

    // ---------------------------------------------------------------------
    // Contratos
    // ---------------------------------------------------------------------

    @Transactional(readOnly = true)
    public List<Contrato> listarContratos(String status, Integer vencendoDias) {
        LocalDate hoje = LocalDate.now();

        if (vencendoDias != null && vencendoDias > 0) {
            return contratoRepository
                    .findByStatusAndDataFimGreaterThanEqualAndDataFimLessThanEqualOrderByDataFimAsc(
                            StatusContrato.ATIVO, hoje, hoje.plusDays(vencendoDias));
        }
        if (status != null && !status.isBlank()) {
            StatusContrato statusEnum;
            try {
                statusEnum = StatusContrato.valueOf(status.trim().toUpperCase());
            } catch (IllegalArgumentException ex) {
                throw new BadRequestException("Status de contrato invalido. Use ATIVO, VENCIDO ou ENCERRADO");
            }
            return contratoRepository.findByStatusOrderByDataFimAsc(statusEnum);
        }
        return contratoRepository.findByOrderByDataFimAsc();
    }

    @Transactional(readOnly = true)
    public Contrato obterContrato(Long id) {
        return contratoRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Contrato " + id + " nao encontrado"));
    }

    @Transactional
    public Contrato salvarContrato(ContratoRequest req) {
        Imovel imovel = imovelRepository.findById(req.imovelId())
                .orElseThrow(() -> new NotFoundException("Imovel " + req.imovelId() + " nao encontrado"));
        Locatario locatario = locatarioRepository.findById(req.locatarioId())
                .orElseThrow(() -> new NotFoundException("Locatario " + req.locatarioId() + " nao encontrado"));

        if (!req.dataFim().isAfter(req.dataInicio())) {
            throw new BadRequestException("Data de fim deve ser posterior a data de inicio");
        }

        Contrato contrato = Contrato.builder()
                .codigo(proximoCodigoContrato())
                .imovel(imovel)
                .locatario(locatario)
                .dataInicio(req.dataInicio())
                .dataFim(req.dataFim())
                .valorMensal(req.valorMensal())
                .diaVencimento(req.diaVencimento())
                .pdfUrl(req.pdfUrl())
                .observacao(req.observacao())
                .status(StatusContrato.ATIVO)
                .build();

        ocuparImovel(imovel, locatario);
        return contratoRepository.save(contrato);
    }

    @Transactional
    public Contrato atualizarContrato(Long id, ContratoRequest req) {
        Contrato contrato = obterContrato(id);

        if (!req.dataFim().isAfter(req.dataInicio())) {
            throw new BadRequestException("Data de fim deve ser posterior a data de inicio");
        }

        Imovel imovel = imovelRepository.findById(req.imovelId())
                .orElseThrow(() -> new NotFoundException("Imovel " + req.imovelId() + " nao encontrado"));
        Locatario locatario = locatarioRepository.findById(req.locatarioId())
                .orElseThrow(() -> new NotFoundException("Locatario " + req.locatarioId() + " nao encontrado"));

        contrato.setImovel(imovel);
        contrato.setLocatario(locatario);
        contrato.setDataInicio(req.dataInicio());
        contrato.setDataFim(req.dataFim());
        contrato.setValorMensal(req.valorMensal());
        contrato.setDiaVencimento(req.diaVencimento());
        if (req.pdfUrl() != null && !req.pdfUrl().isBlank()) {
            contrato.setPdfUrl(req.pdfUrl().trim());
        }
        contrato.setObservacao(req.observacao());
        contrato.setStatus(calcularStatus(contrato));

        ocuparImovel(imovel, locatario);
        return contratoRepository.save(contrato);
    }

    @Transactional
    public void excluirContrato(Long id) {
        Contrato contrato = obterContrato(id);
        Imovel imovel = contrato.getImovel();
        contratoRepository.delete(contrato);

        boolean outroAtivo = contratoRepository.findByImovelId(imovel.getId()).stream()
                .anyMatch(c -> calcularStatus(c) == StatusContrato.ATIVO);
        if (!outroAtivo) {
            imovel.setStatus(StatusImovel.VAGO);
            imovel.setLocatario(null);
            imovelRepository.save(imovel);
        }
    }

    @Transactional
    public Contrato associarPdfLink(Long id, String pdfUrl) {
        Contrato contrato = obterContrato(id);
        contrato.setPdfUrl(pdfUrl.trim());
        return contratoRepository.save(contrato);
    }

    @Transactional
    public Contrato salvarPdfUpload(Long id, String nomeArquivo, byte[] conteudo) {
        Contrato contrato = obterContrato(id);
        contrato.setPdfNome(nomeArquivo);
        contrato.setPdfConteudo(conteudo);
        contrato.setPdfUrl(null);
        return contratoRepository.save(contrato);
    }

    // ---------------------------------------------------------------------
    // Auxiliares
    // ---------------------------------------------------------------------

    private void ocuparImovel(Imovel imovel, Locatario locatario) {
        imovel.setStatus(StatusImovel.OCUPADO);
        imovel.setLocatario(locatario);
        imovelRepository.save(imovel);
    }

    private StatusContrato calcularStatus(Contrato contrato) {
        if (contrato.getStatus() == StatusContrato.ENCERRADO) {
            return StatusContrato.ENCERRADO;
        }
        return contrato.getDataFim().isBefore(LocalDate.now())
                ? StatusContrato.VENCIDO
                : StatusContrato.ATIVO;
    }

    private String proximoCodigoContrato() {
        int sequencia = (int) contratoRepository.count() + 1;
        String codigo = String.format("CTR-%04d", sequencia);
        while (contratoRepository.findByCodigo(codigo).isPresent()) {
            sequencia++;
            codigo = String.format("CTR-%04d", sequencia);
        }
        return codigo;
    }
}
