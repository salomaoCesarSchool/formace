export interface Contrato {
  id: string;
  imovel: string;
  locatario: string;
  vence: string;
  arquivoPdf: string;
}

export const contratosMock: Contrato[] = [
  {
    id: "palmeiras-45",
    imovel: "R. Palmeiras, 45",
    locatario: "M. Andrade",
    vence: "03/2027",
    arquivoPdf: "/contratos/casa-159-mg.pdf",
  },
  {
    id: "central-902",
    imovel: "Av. Central, 902",
    locatario: "Padaria Bom Pão",
    vence: "11/2026",
    arquivoPdf: "/contratos/casa-159-mg.pdf",
  },
  {
    id: "sol-12",
    imovel: "Rua do Sol, 12",
    locatario: "Carlos Menezes",
    vence: "06/2027",
    arquivoPdf: "/contratos/casa-159-mg.pdf",
  },
  {
    id: "alameda-verde-220",
    imovel: "Alameda Verde, 220",
    locatario: "Beatriz Lima",
    vence: "01/2027",
    arquivoPdf: "/contratos/casa-159-mg.pdf",
  },
];
