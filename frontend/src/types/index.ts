// Tipos espelhados das respostas da API do backend Spring Boot (FORMACE).

export type StatusImovel = 'OCUPADO' | 'VAGO';

export type StatusContrato = 'ATIVO' | 'VENCIDO' | 'ENCERRADO';

export type StatusLancamento = 'PENDENTE' | 'PAGO' | 'ATRASADO' | 'CANCELADO';

export type TipoLancamento =
  | 'ALUGUEL'
  | 'IPTU'
  | 'TAXA_CONDOMINIO'
  | 'MANUTENCAO'
  | 'REPUBLICACAO'
  | 'DESPESA'
  | 'OUTROS';

export type NaturezaLancamento = 'ENTRADA' | 'SAIDA';

export type SeveridadeAlerta = 'info' | 'atencao' | 'critico';

export interface Locatario {
  id: number;
  nome: string;
  cpfCnpj: string;
  /** RG ou outro documento oficial de identificação. */
  rg?: string;
  dataNascimento?: string;
  estadoCivil?: string;
  profissao?: string;
  telefone?: string;
  email?: string;
  endereco?: string;
  cidade?: string;
  observacao?: string;
  criadoEm?: string;
}

export interface Imovel {
  id: number;
  codigo: string;
  endereco: string;
  numero?: string;
  bairro: string;
  cidade: string;
  cep?: string;
  tipo: string;
  quartos?: number;
  banheiros?: number;
  metragem?: number;
  valorAluguel: number;
  iptuMensal: number;
  condominio?: number;
  status: StatusImovel;
  locatario?: Locatario;
  observacao?: string;
  criadoEm?: string;
}

export interface Contrato {
  id: number;
  codigo: string;
  imovel: Imovel;
  locatario: Locatario;
  dataInicio: string;
  dataFim: string;
  valorMensal: number;
  diaVencimento: number;
  status: StatusContrato;
  /** Modelo do contrato (Locação residencial, comercial...). */
  modelo?: string;
  /** Modalidade da garantia locatícia (FIADOR, CAUCAO, SEM_GARANTIA, SEGURO). */
  modalidadeGarantia?: string;
  indiceReajuste?: string;
  periodicidadeReajuste?: string;
  /** Fiador vinculado (quando a garantia é por fiador). */
  fiador?: Fiador;
  pdfUrl?: string;
  pdfNome?: string;
  observacao?: string;
  criadoEm?: string;
}

/** Fiador do contrato de locação (garantia FIADOR). */
export interface Fiador {
  id?: number;
  nome: string;
  cpf: string;
  rg?: string;
  dataNascimento?: string;
  estadoCivil?: string;
  profissao?: string;
  telefone?: string;
  email?: string;
  endereco?: string;
  criadoEm?: string;
}

/** Usuário do sistema (tela de Acesso — nunca vem com a senha). */
export interface UsuarioSistema {
  id: number;
  username: string;
  nome: string;
  email?: string | null;
  /** ROLE_ADMIN | ROLE_GESTOR | ROLE_OPERADOR (ou legados como ROLE_USER). */
  role: string;
  criadoEm?: string;
}

export interface Recibo {
  id: number;
  numero: number;
  emitidoEm: string;
  emitidoPor: string;
  hash?: string;
}

export interface LancamentoFinanceiro {
  id: number;
  imovel: Imovel;
  locatario?: Locatario;
  contrato?: Contrato;
  tipo: TipoLancamento;
  natureza: NaturezaLancamento;
  status: StatusLancamento;
  valorAluguel: number;
  valorIptu: number;
  multa: number;
  juros: number;
  valorTotal: number;
  dataVencimento: string;
  dataPagamento?: string;
  mesReferencia: string;
  descricao?: string;
  recibo?: Recibo;
  criadoEm?: string;
}

export interface LancamentoRequest {
  imovelId: number;
  locatarioId: number;
  contratoId?: number;
  tipo: TipoLancamento;
  natureza: NaturezaLancamento;
  valorAluguel: number;
  valorIptu: number;
  mesReferencia: string;
  dataVencimento: string;
  dataPagamento?: string;
  descricao?: string;
}

export interface Alerta {
  tipo: string;
  mensagem: string;
  severidade: SeveridadeAlerta;
}

/** Modalidade de garantia locatícia escolhida no contrato. */
export type ModalidadeGarantia =
  | 'SEM_GARANTIA'
  | 'FIADOR'
  | 'CAUCAO'
  | 'SEGURO';

/** Documento obrigatório configurável por modalidade de garantia. */
export interface DocumentoObrigatorio {
  id: number;
  modalidade: ModalidadeGarantia | string;
  destinatario: 'CLIENTE' | 'FIADOR' | string;
  nome: string;
  obrigatorio: boolean;
  criadoEm?: string;
}

/** Situação dos pagamentos de aluguel no mês (gráfico do dashboard). */
export interface PagamentosMes {
  pagos: number;
  aVencer: number;
  emAtraso: number;
  total: number;
}

/** Inquilinos que ainda não pagaram o aluguel do mês vigente. */
export interface Inadimplentes {
  quantidade: number;
  valorEmAberto: number;
}

/** Cobrança pendente: nome, imóvel, valor, vencimento e dias em atraso. */
export interface CobrancaPendente {
  locatario: string;
  imovel: string;
  valor: number;
  dataVencimento: string;
  diasAtraso: number;
}

export interface DashboardData {
  totalImoveis: number;
  imoveisOcupados: number;
  imoveisVagos: number;
  contratosAtivos: number;
  contratosAVencer: number;
  mesReferencia: string;
  receitaMes: number;
  pendentesMes: number;
  lancamentosPendentes: number;
  pagamentosMes: PagamentosMes;
  inadimplentes: Inadimplentes;
  cobrancasPendentes: CobrancaPendente[];
  ultimosLancamentos: LancamentoFinanceiro[];
  alertas: Alerta[];
}

export interface FluxoDiario {
  data: string;
  entradas: number;
  saidas: number;
  saldoDia: number;
  saldoAcumulado: number;
}

export interface RelatorioResumo {
  ano: number;
  totalImoveis: number;
  imoveisOcupados: number;
  imoveisVagos: number;
  contratosAtivos: number;
  totalLancamentos: number;
  lancamentosPagos: number;
  lancamentosAbertos: number;
  receitaPrevista: number;
  arrecadado: number;
  emAberto: number;
  multasEJuros: number;
}

export interface AuthResponse {
  token: string;
  tokenType: string;
  expiresInMs: number;
  username: string;
  nome: string;
  role: string;
}

export interface ApiErro {
  timestamp?: string;
  status: number;
  erro?: string;
  mensagem: string;
  campos?: Record<string, string>;
}
