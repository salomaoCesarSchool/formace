/**
 * Documento do contrato (HTML que vira o PDF) e utilitarios de impressao.
 * Texto oficial da Fundacao Manuel Cruz — extraido do assistente antigo
 * (components/NovoContrato) para ser reaproveitado pela nova tela
 * /contratos/novo e pela visualizacao do contrato.
 */

/* ───────── Tipos ───────── */

export type ContratoCriado = {
  id: string;
  imovel: string;
  locatario: string;
  vence: string; // MM/AAAA, fim do contrato (igual ao campo do seu mock)
  html: string; // contrato completo já assinado (pra abrir de novo / imprimir)
  enviadoPara: string[];
};

export type Dados = {
  imovel: string; // endereço completo, como vai no contrato
  aluguel: string;
  diaVencimento: string;
  dataInicio: string; // ISO
  dataFim?: string; // ISO — quando vem do formulario, prevalece sobre o prazo
  prazoMeses: string;

  locatario: string;
  qualLocatario: string; // nacionalidade, estado civil, profissão
  rgLocatario: string;
  cpfLocatario: string;
  enderecoLocatario: string;
  emailLocatario: string;

  fiador: string;
  qualFiador: string;
  rgFiador: string;
  cpfFiador: string;
  enderecoFiador: string;
  emailFiador: string;

  conjuge: string; // opcional
  rgConjuge: string;
  cpfConjuge: string;

  /** Rotulo da modalidade (usado quando nao ha fiador na clausula de garantia). */
  garantia?: string;
};

export type Assinaturas = {
  locatario: string;
  fiador: string;
  conjuge: string;
  fundacao: string;
};

/* ───────── Dados da Fundação (do cabeçalho do contrato oficial) ───────── */

export const FUNDACAO = {
  nome: "FUNDAÇÃO MANUEL CRUZ",
  admin: "ADMINISTRADA PELA ARQUIDIOCESE DE ARACAJU",
  cnpj: "13.043.047/0001-84",
  rua: "RUA NOSSA SENHORA DO SOCORRO, 215 – SÃO JOSÉ",
  tel: "(079) 3214.0057",
  email: "fmc.fundacao@gmail.com",
  cep: "49015-300 - ARACAJU - SERGIPE",
};

/* ───────── Utilitários ───────── */

export function numero(v: string): number {
  const n = Number(v.replace(/\./g, "").replace(",", "."));
  return Number.isFinite(n) ? n : 0;
}
export const somaDias = (iso: string, dias: number) => {
  const d = new Date(iso + "T12:00:00");
  d.setDate(d.getDate() + dias);
  return d.toISOString().slice(0, 10);
};
export const somaMeses = (iso: string, meses: number) => {
  const d = new Date(iso + "T12:00:00");
  d.setMonth(d.getMonth() + meses);
  return d.toISOString().slice(0, 10);
};
export const dataExtenso = (iso: string) =>
  new Date(iso + "T12:00:00").toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/* Números por extenso (o contrato escreve "750,00 (setecentos e cinquenta reais)") */
const U = [
  "zero",
  "um",
  "dois",
  "três",
  "quatro",
  "cinco",
  "seis",
  "sete",
  "oito",
  "nove",
  "dez",
  "onze",
  "doze",
  "treze",
  "quatorze",
  "quinze",
  "dezesseis",
  "dezessete",
  "dezoito",
  "dezenove",
];
const D = [
  "",
  "",
  "vinte",
  "trinta",
  "quarenta",
  "cinquenta",
  "sessenta",
  "setenta",
  "oitenta",
  "noventa",
];
const C = [
  "",
  "cento",
  "duzentos",
  "trezentos",
  "quatrocentos",
  "quinhentos",
  "seiscentos",
  "setecentos",
  "oitocentos",
  "novecentos",
];

function menor1000(n: number): string {
  if (n === 100) return "cem";
  const c = Math.floor(n / 100);
  const r = n % 100;
  const partes: string[] = [];
  if (c) partes.push(C[c]);
  if (r > 0 && r < 20) partes.push(U[r]);
  if (r >= 20)
    partes.push(D[Math.floor(r / 10)] + (r % 10 ? " e " + U[r % 10] : ""));
  return partes.join(" e ");
}
export function extenso(n: number): string {
  if (n === 0) return "zero";
  if (n < 1000) return menor1000(n);
  const mil = Math.floor(n / 1000);
  const r = n % 1000;
  const milStr = mil === 1 ? "mil" : menor1000(mil) + " mil";
  if (!r) return milStr;
  return milStr + (r < 100 || r % 100 === 0 ? " e " : " ") + menor1000(r);
}
export function reaisExtenso(v: number): string {
  const total = Math.round(v * 100);
  const reais = Math.floor(total / 100);
  const cent = total % 100;
  let s = `${extenso(reais)} ${reais === 1 ? "real" : "reais"}`;
  if (cent) s += ` e ${extenso(cent)} ${cent === 1 ? "centavo" : "centavos"}`;
  return s;
}
export const brlSimples = (v: number) =>
  "R$" +
  v.toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

/** Meses entre duas datas ISO (minimo 1) — usado no prazo da cláusula 2ª. */
export function mesesEntre(inicio: string, fim: string): number {
  if (!inicio || !fim) return 0;
  const [y1, m1, d1] = inicio.split("-").map(Number);
  const [y2, m2, d2] = fim.split("-").map(Number);
  let meses = (y2 - y1) * 12 + (m2 - m1);
  if (d2 < d1) meses -= 1;
  return Math.max(1, meses);
}

/* ───────── O contrato em HTML (vira o PDF) ─────────
   Texto copiado do contrato oficial da Fundação (Casa 159 – MG). */

export function contratoHTML(d: Dados, a: Assinaturas): string {
  const valor = numero(d.aluguel);
  const prazo = Number(d.prazoMeses) || 0;
  const dia = Number(d.diaVencimento) || 0;
  const inicio = d.dataInicio ? dataExtenso(d.dataInicio) : "___";
  const fim = d.dataFim
    ? dataExtenso(d.dataFim)
    : d.dataInicio
      ? dataExtenso(somaDias(somaMeses(d.dataInicio, prazo), -1))
      : "___";
  const hoje = dataExtenso(new Date().toISOString().slice(0, 10));
  const temConjuge = d.conjuge.trim() !== "";
  const temFiador = d.fiador.trim() !== "";

  const qual = (q: string) =>
    q.trim() ? esc(q.trim()) : "qualificação não informada";
  const pessoa = (
    nome: string,
    q: string,
    rg: string,
    cpf: string,
    end: string,
  ) =>
    `${esc(nome)}, ${qual(q)}, portador(a) de documento de identificação ${esc(rg)} e CPF ${esc(cpf)}, residente e domiciliado(a) em ${esc(end)}`;

  const assin = (img: string, titulo: string, nome: string, cpf?: string) => `
    <div class="ass">
      <div class="linha">${img ? `<img src="${img}" />` : ""}</div>
      <div class="papel">${titulo}</div>
      <div><b>${esc(nome)}</b></div>
      ${cpf ? `<div class="papel">CPF ${esc(cpf)}</div>` : ""}
    </div>`;
  const testemunha = `
    <div class="ass"><div class="linha"></div><div class="papel">TESTEMUNHA:</div></div>`;

  // Cláusula de garantia: com fiador mantém a FIANÇA oficial; sem fiador,
  // registra a modalidade de garantia escolhida (caução, seguro, sem garantia).
  const clausulaGarantia = temFiador
    ? `<p><b>Décima: FIANÇA</b> - Assina juntamente com o(a) LOCATÁRIO(A), o(a) FIADOR(A) e principal pagador(a), <b>SOLIDARIAMENTE RESPONSÁVEL PELO CUMPRIMENTO DE TODAS AS CLÁUSULAS E CONDIÇÕES DO PRESENTE CONTRATO</b>, ${pessoa(d.fiador, d.qualFiador, d.rgFiador, d.cpfFiador, d.enderecoFiador)}${
        temConjuge
          ? `, e seu(sua) cônjuge ${esc(d.conjuge)}, portador(a) de documento de identificação ${esc(d.rgConjuge)} e CPF ${esc(d.cpfConjuge)}`
          : ""
      }, o qual renuncia aos favores dos artigos 827, 835, 837, 838 – I e III, 839/CC e 794 do Código de Processo Civil, ficando estipulado que a garantia constante desta cláusula vigorará ainda que a locação seja prorrogada, respondendo ainda por reajuste que por ventura sejam cabíveis durante o período prorrogado, até a efetiva entrega das chaves à LOCADORA, abrangendo ainda a responsabilidade pelas despesas judiciais e honorários advocatícios no caso de ser intentada pela LOCADORA qualquer ação fundada no presente contrato. Vindo a falecer o(a) FIADOR(A), requerer insolvência, concordata, mudar de residência ou vir a residir em outro Estado, o(a) LOCATÁRIO(A) se obriga a comunicar à LOCADORA, no prazo de 30 (trinta) dias, apresentando novo FIADOR, sob pena de infração contratual.</p>`
    : `<p><b>Décima: GARANTIA DA LOCAÇÃO</b> - Para garantia do fiel e pontual cumprimento de todas as cláusulas e condições deste contrato, as partes adotaram a modalidade de garantia locatícia <b>${esc(
        d.garantia || "não especificada",
      )}</b>, respondendo o garantidor, quando houver, pelas obrigações contratuais na forma da lei e das condições aqui ajustadas.</p>`;

  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8">
<title>Contrato de locação – ${esc(d.imovel)}</title>
<style>
  @page { size: A4; margin: 20mm 20mm; }
  body { font-family: "Nunito", Arial, sans-serif; font-size: 12px; line-height: 1.55; color: #1a1a2e; margin: 0; }
  .topo { text-align: center; font-size: 10.5px; line-height: 1.4; margin-bottom: 22px; }
  .topo b { font-size: 13px; }
  h1 { font-size: 15px; text-align: center; margin: 0 0 16px; }
  p { margin: 0 0 9px; text-align: justify; text-indent: 24px; }
  p.sem { text-indent: 0; }
  .ass-box { display: grid; grid-template-columns: 1fr 1fr; gap: 28px 30px; margin-top: 34px; page-break-inside: avoid; }
  .ass { text-align: center; }
  .linha { height: 56px; border-bottom: 1px solid #1a1a2e; display: flex; align-items: flex-end; justify-content: center; }
  .linha img { max-height: 52px; max-width: 100%; }
  .papel { color: #555; font-size: 10.5px; margin-top: 2px; }
  .data { text-align: center; margin: 22px 0 0; text-indent: 0; }
</style></head><body>
<div class="topo">
  <b>${FUNDACAO.nome}</b><br>${FUNDACAO.admin}<br>CNPJ: ${FUNDACAO.cnpj}<br>
  ${FUNDACAO.rua}<br>Tel.: ${FUNDACAO.tel} - E-mail: ${FUNDACAO.email}<br>${FUNDACAO.cep}
</div>

<h1>CONTRATO DE LOCAÇÃO</h1>

<p>Pelo presente instrumento particular de Contrato de Locação que fazem entre si, de um lado a ${FUNDACAO.nome}, entidade civil de fins filantrópicos, com sede à Rua Nossa Senhora do Socorro, n.º 215, nesta cidade a seguir denominada LOCADORA, e de outro lado ${pessoa(d.locatario, d.qualLocatario, d.rgLocatario, d.cpfLocatario, d.enderecoLocatario)}, denominado(a) LOCATÁRIO(A), têm justos e contratados as cláusulas e condições seguintes:</p>

<p><b>Primeira: OBJETO E USO</b> - Constitui objeto do presente Contrato o imóvel de propriedade da LOCADORA situado em ${esc(d.imovel)}, em perfeito estado de uso e conservação, destinando-se o imóvel exclusivamente para o fim residencial, não podendo ser utilizado para outro fim, salvo com o consentimento expresso da LOCADORA.</p>

<p><b>Segunda: PRAZO DA LOCAÇÃO</b> - O prazo da locação é de ${prazo} (${extenso(prazo)}) meses, a começar em ${inicio} e a terminar em ${fim}, quando cessará a locação independentemente de notificação ou aviso, devendo o(a) LOCATÁRIO(A) entregar o imóvel completamente desocupado e em condições de ser utilizado de imediato.</p>

<p><b>Terceira: VALOR DO ALUGUEL - VENCIMENTO - REAJUSTE</b> - O valor mensal do aluguel é de ${brlSimples(valor)} (${reaisExtenso(valor)}), vencido no dia ${String(dia).padStart(2, "0")} (${extenso(dia)}) de cada mês, dando-se uma tolerância até o 5º (quinto) dia subsequente ao vencimento, devendo ser pago em moeda corrente, na sede da LOCADORA. Eventuais atrasos implicarão em multa de 10%, juros de 1% ao mês ou fração de mês, e reajuste monetário com base no INPC sobre o aluguel e demais encargos. O aluguel acordado nesta cláusula vigorará pelo prazo de 12 (doze) meses, ficando de logo estipulado e ajustado entre as partes que, após 01 (um) ano de locação, o valor do aluguel será reajustado, imediatamente, pelo menor período permitido em Lei, aplicando-se a média aritmética simples do INPC e do IGP-DI ou outro índice adotado pelo Governo, a escolha da LOCADORA.</p>

<p><b>Quarta: TAXAS - IMPOSTO PREDIAL E DEMAIS TRIBUTOS</b> - Compete ao(a) LOCATÁRIO(A) o pagamento das taxas de água e luz, esgoto, lixo, imposto predial e demais tributos que onere ou venha onerar o imóvel locado, obrigando-se o(a) LOCATÁRIO(A) a apresentar todos os recibos quitados, quando finda a locação, ou quando solicitado pela LOCADORA.</p>

<p><b>Parágrafo Primeiro:</b> No prazo de até 30 (trinta) dias contados da assinatura deste CONTRATO, o(a) LOCATÁRIO(A) promoverá a transferência de titularidade das contas de luz, água e esgoto para o seu nome, efetuando, em sendo o caso, a nova ligação/religação/reativação.</p>

<p><b>Parágrafo Segundo:</b> Finda a locação, o(a) LOCATÁRIO(A) deverá fornecer prova de que não existem débitos pendentes com relação ao fornecimento de luz, água e esgoto referentes ao Imóvel, além de dever solicitar junto aos respectivos fornecedores o cancelamento ou desativação de todos os contratos de serviços que porventura tiver utilizado ao longo de sua permanência no imóvel, sob pena de ficar responsável pelo pagamento integral de quaisquer cobranças efetuadas em seu nome ou em nome da LOCADORA ou novo inquilino, ainda que realizadas após a devolução do Imóvel, sem prejuízo das demais penalidades deste CONTRATO e das perdas e danos suplementares.</p>

<p><b>Parágrafo Terceiro:</b> Sem prejuízo do previsto nos Parágrafos acima, o(a) LOCATÁRIO(A), por meio deste instrumento, nomeia a LOCADORA e seus procuradores, outorgando-lhes poderes para, em conjunto ou isoladamente, promoverem a alteração dos contratos, junto à ENERGISA SERGIPE Distribuidora de Energia S.A., bem como à DESO – Companhia de Saneamento de Sergipe, a fim de que conste o nome dele(a), LOCATÁRIO(A), nas respectivas faturas. Outorga-se poderes, ainda, para proceder à nova ligação/religação/reativação dos serviços em nome do(a) LOCATÁRIO(A), bem como solicitar o redirecionamento de débitos àqueles que ocuparam o imóvel em momento anterior (“Débitos de Terceiros”). Por ocasião do término da locação a LOCADORA adotará as providências necessárias para a exclusão do nome do(a) LOCATÁRIO(A) dos órgãos retro mencionados, com a rescisão dos aludidos contratos e consequentemente o desligamento do fornecimento dos serviços de energia, água e esgoto.</p>

<p><b>Parágrafo Quarto:</b> A LOCADORA fica isenta de qualquer responsabilidade e/ou ônus para a obtenção de religação/reativação/alteração de titularidade, bem como de quaisquer responsabilidades por eventuais demoras e/ou falhas na prestação de serviços de luz e água, não sendo devido ao(a) LOCATÁRIO(A) qualquer indenização ou desconto sobre o valor do aluguel e/ou dos encargos da locação em decorrência de tais fatos.</p>

<p><b>Quinta: CONSERVAÇÃO - OBRAS - MODIFICAÇÕES - BENFEITORIAS</b> - O(A) LOCATÁRIO(A) obriga-se a entregar o imóvel, finda a locação, no estado em que recebeu, de acordo com o laudo de vistoria inicial e a cláusula primeira deste Contrato. Não será permitido ao(à) LOCATÁRIO(A) fazer quaisquer obras ou modificações internas ou externas, sem o prévio consentimento escrito da LOCADORA, salvo obras de conservação. As benfeitorias de qualquer natureza incorporar-se-ão ao imóvel, sem direito a indenização ou retenção, ficando pactuado que a LOCADORA tem direito de preferir a remoção de qualquer obra feita no imóvel, mesmo as feitas com o consentimento da LOCADORA, finda a locação.</p>

<p><b>Sexta: RESPONSABILIDADE CIVIL</b> - Sob pena de responsabilidade civil, o(a) LOCATÁRIO(A) deverá levar imediatamente ao conhecimento da LOCADORA qualquer aviso, dano, vício redibitório, que diga respeito ao imóvel locado.</p>

<p><b>Sétima: CESSÃO - SUBLOCAÇÃO - EMPRÉSTIMO - TRANSFERÊNCIA</b> - É vedado ao(à) LOCATÁRIO(A) ceder, sublocar, emprestar, transferir o imóvel locado, sem o expresso consentimento da LOCADORA, sob pena de rescisão contratual.</p>

<p><b>Oitava: VISTORIA</b> - É reservado a LOCADORA o direito de vistoriar o imóvel locado, sempre que lhe aprouver, bastando que o faça prévia comunicação escrita ou verbal. Por ocasião da vistoria, se forem constatadas anormalidades, defeitos ou estragos, a LOCADORA notificará o(a) LOCATÁRIO(A) extrajudicialmente para, no prazo de 15 (quinze) dias, restaurar ou substituir o necessário, sob pena da LOCADORA executar o serviço, cobrando o que for devido e incluindo uma taxa de 10% (dez por cento) sobre o montante das despesas, a título de administração, além de ser considerada infração contratual de natureza grave, dando ensejo a rescisão contratual. A entrega da chave para vistoria final não exonera o(a) LOCATÁRIO(A) e FIADOR(A) das obrigações contratuais, inclusive quanto ao aluguel, que será cobrado com o reajuste de Lei, até a entrega definitiva da chave com o imóvel completamente restaurado.</p>

<p><b>Parágrafo Primeiro:</b> Caso seja constatado dano ou vício no imóvel locado cujo conserto seja de responsabilidade da LOCADORA, esta encaminhará notificação ao(à) LOCATÁRIO(A) para que agende dia e hora para o preposto da LOCADORA adentrar no imóvel e realizar os reparos necessários.</p>

<p><b>Parágrafo Segundo:</b> O não atendimento pelo(a) LOCATÁRIO(A) da obrigação acima citada implicará em multa contratual de 10% (dez por cento) do valor do aluguel vigente, além de outras medidas contratuais (rescisão) e judiciais pertinentes ao caso concreto.</p>

<p><b>Nona: PENALIDADE - RESCISÃO</b> - A violação pelo(a) LOCATÁRIO(A) de qualquer das cláusulas e condições deste Contrato, inclusive quanto ao prazo contratual, importará na imediata obrigação de pagar a LOCADORA a indenização correspondente a 03 (três) meses de aluguel vigente à época, exigível em ação própria, sem prejuízo do pagamento do aluguel, juros de mora de 1%, correção monetária, honorários advocatícios na base de 20% sobre o total do débito, e demais cominações legais. Em caso de incêndio, desabamento, desapropriação ou qualquer ocorrência que impeça o uso normal do imóvel locado, o presente contrato será rescindido de pleno direito, independentemente de indenização por parte da LOCADORA, cabendo ao(à) LOCATÁRIO(A) a responsabilidade pelos prejuízos a que der causa por ação ou omissão.</p>

${clausulaGarantia}

<p><b>Décima Primeira: CITAÇÃO - INTIMAÇÃO - NOTIFICAÇÃO</b> - Fica autorizado pelas partes contratantes que havendo necessidade de citação, intimação ou notificação, far-se-á, mediante correspondência com aviso de recebimento.</p>

<p><b>Décima Segunda: FUNDAMENTO LEGAL</b> - O presente Contrato é celebrado e regido pela Lei n.º 8.245/91, que regula a Locação de Imóvel Urbano e demais legislação pertinente.</p>

<p><b>Décima Terceira: FORO</b> - Para dirimir qualquer questão oriunda do presente Contrato, fica eleito o Foro da Comarca de Aracaju.</p>

<p>E, por estarem justos e contratados, assinam juntamente com ${
    temFiador ? "o FIADOR e " : ""
  }as testemunhas subfirmadas, este Contrato, em duas vias de igual teor.</p>

<p class="data">Aracaju/SE, ${hoje}.</p>

<div class="ass-box">
  ${assin(a.fundacao, "LOCADORA:", FUNDACAO.nome)}
  ${assin(a.locatario, "LOCATÁRIO(A):", d.locatario, d.cpfLocatario)}
  ${temFiador ? assin(a.fiador, "FIADOR(A):", d.fiador, d.cpfFiador) : "<div></div>"}
  ${temConjuge ? assin(a.conjuge, "CÔNJUGE DO FIADOR:", d.conjuge, d.cpfConjuge) : "<div></div>"}
  ${testemunha}
  ${testemunha}
</div>
</body></html>`;
}

/* Abre a janela de impressão do navegador (ali ela escolhe "Salvar como PDF") */
export function imprimirContrato(html: string) {
  const f = document.createElement("iframe");
  f.style.cssText = "position:fixed;right:0;bottom:0;width:0;height:0;border:0";
  document.body.appendChild(f);
  const doc = f.contentWindow?.document;
  if (!doc) return;
  doc.open();
  doc.write(html);
  doc.close();
  setTimeout(() => {
    f.contentWindow?.focus();
    f.contentWindow?.print();
    setTimeout(() => f.remove(), 1500);
  }, 300);
}
