export interface Lancamento {
  data: string;
  descricao: string;
  tipo: "Entrada" | "Saída";
  valor: string;
}

export const financeiroMock: { lancamentos: Lancamento[] } = {
  lancamentos: [
    {
      data: "26/08",
      descricao: "Aluguel — Rua das Palmeiras, 45",
      tipo: "Entrada",
      valor: "R$ 1.200,00",
    },
    {
      data: "24/08",
      descricao: "Manutenção elétrica — residencial",
      tipo: "Saída",
      valor: "R$ 640,00",
    },
    {
      data: "22/08",
      descricao: "Aluguel — Av. Central, 902",
      tipo: "Entrada",
      valor: "R$ 2.800,00",
    },
    {
      data: "20/08",
      descricao: "Folha — porteiros residencial",
      tipo: "Saída",
      valor: "R$ 5.400,00",
    },
  ],
};
