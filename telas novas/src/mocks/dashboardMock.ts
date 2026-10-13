export const dashboardMock = {
  usuario: "Usuário",
  perfil: "Gestor",
  periodo: "agosto de 2026",
  indicadores: [
    {
      titulo: "Imóveis ocupados",
      valor: "108/124",
      legenda: "87% de ocupação",
    },
    {
      titulo: "Receita de aluguel (mês)",
      valor: "R$ 64.200",
      legenda: "+4% vs. mês anterior",
    },
    {
      titulo: "Contratos a vencer (30 dias)",
      valor: "7",
      legenda: "requer atenção",
    },
  ],
  lancamentos: [
    {
      imovel: "Rua das Palmeiras, 45",
      locatario: "M. Andrade",
      tipo: "Aluguel",
      valor: "R$ 1.200",
    },
    {
      imovel: "Av. Central, 902",
      locatario: "Padaria Bom Pão",
      tipo: "Aluguel",
      valor: "R$ 2.800",
    },
    {
      imovel: "Residencial — manutenção",
      locatario: "—",
      tipo: "Gasto",
      valor: "R$ 640",
    },
    {
      imovel: "Rua do Sol, 12",
      locatario: "C. Menezes",
      tipo: "Aluguel",
      valor: "R$ 950",
    },
  ],
  alertas: [
    "3 contratos vencem esta semana",
    "Estoque do residencial: DML abaixo do mínimo",
  ],
};
