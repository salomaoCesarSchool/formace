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
  pdfUrl?: string;
  pdfNome?: string;
  observacao?: string;
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
