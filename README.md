# FORMACE — Sistema de Gestão da Fundação Manuel Cruz

Sistema web para a gestão dos **124 imóveis** da Fundação Manuel Cruz: cadastro de imóveis e
locatários, contratos, financeiro (lançamentos, quitação, recibos em PDF) e **prestação de
contas ao Ministério Público de Sergipe (MP-SE)** com relatórios consolidados em PDF.

## Stack

| Camada    | Tecnologias |
|-----------|-------------|
| Backend   | Java 21, Spring Boot 3.3, Spring Data JPA, Spring Security (JWT), OpenPDF, Lombok, PostgreSQL |
| Frontend  | React 18, TypeScript, Vite, Tailwind CSS, Axios, Lucide React |
| Infra     | Docker / Docker Compose (PostgreSQL 16 + API + Web) |

## Estrutura do projeto

```
Formace2/
├── docker-compose.yml          # postgres + backend (:8080) + frontend (:3000)
├── README.md
├── backend/
│   ├── pom.xml
│   ├── Dockerfile
│   └── src/main/java/com/formace/
│       ├── config/             # SecurityConfig, DataSeeder
│       ├── controller/         # Auth, Dashboard, Imovel, Locatario, Contrato, Financeiro, Relatorio
│       ├── dto/
│       ├── entity/             # Imovel, Locatario, Contrato, LancamentoFinanceiro, Recibo, Usuario
│       ├── enums/
│       ├── exception/          # GlobalExceptionHandler + exceções de negócio
│       ├── repository/
│       ├── security/           # JwtService, JwtAuthenticationFilter, CustomUserDetailsService
│       └── service/            # FinanceiroService, RelatorioMPService, DashboardService, CadastroService
│   └── src/main/resources/
│       ├── application.yml
│       └── data.sql            # 124 imóveis + locatários + contratos + lançamentos de teste
└── frontend/
    ├── package.json
    ├── vite.config.ts          # dev server na porta 3000 com proxy /api -> :8080
    └── src/
        ├── api/axios.ts        # instância Axios + interceptor do JWT
        ├── components/         # Sidebar, Header, CardKPI, BadgeStatus, Modal
        ├── pages/              # Login, Dashboard, Financeiro, ImoveisClientes, Contratos, RelatoriosMP
        ├── types/index.ts
        └── utils/format.ts
```

## Subir com Docker (recomendado)

Requisitos: Docker + Docker Compose.

```bash
docker-compose up -d --build
```

| Serviço  | URL / Porta                  |
|----------|------------------------------|
| Frontend | http://localhost:3000        |
| Backend  | http://localhost:8080        |
| Postgres | localhost:5432 (formace/formace) |

Logs e parada:

```bash
docker-compose logs -f backend   # acompanhar a API
docker-compose down              # parar tudo
docker-compose down -v           # parar e apagar o volume do banco
```

Na primeira subida o Hibernate cria as tabelas e o `data.sql` carrega a carga de teste
(124 imóveis, contratos e lançamentos). O usuário administrador é criado automaticamente
pelo `DataSeeder`.

## Subir manualmente (sem Docker)

### 1. Banco de dados

É preciso um PostgreSQL rodando com banco `formace`, usuário `formace` e senha `formace`
(pode usar o próprio `docker-compose` só para o banco):

```bash
docker-compose up -d postgres
```

### 2. Backend (porta 8080)

Requisitos: JDK 21 + Maven 3.9+.

```bash
cd backend
mvn spring-boot:run
```

Variáveis opcionais (com padrões locais já definidos no `application.yml`):

```bash
DB_URL=jdbc:postgresql://localhost:5432/formace
DB_USER=formace
DB_PASSWORD=formace
JWT_SECRET=<segredo-de-producao>
CORS_ALLOWED_ORIGINS=http://localhost:3000,http://localhost:5173
```

### 3. Frontend (porta 3000)

Requisitos: Node 20+.

```bash
cd frontend
npm install
npm run dev
```

O `vite.config.ts` faz proxy de `/api` para `http://localhost:8080`, então não há problemas
de CORS no desenvolvimento local.

## Credenciais de acesso

| Usuário | Senha     |
|---------|-----------|
| `admin` | `admin123`|

> Criado pelo `DataSeeder` na primeira subida (hash BCrypt gerado no boot).
> **Troque a senha em produção.**

## Regras de negócio

- **Multa por atraso:** 2% sobre o valor base (aluguel + IPTU) quando o pagamento ocorre
  após o vencimento.
- **Juros de mora:** 1% ao mês, calculados *pro rata* por dia de atraso (`1% / 30` por dia).
- **Despesas** (`natureza = SAIDA`) não sofrem multa/juros.
- **Recibo numerado em PDF** gerado com OpenPDF a cada quitação.
- **Fluxo de caixa diário (RDD)** consolidando entradas e saídas por dia.
- **Alertas de vencimento** de contratos ("vence 03/2027") e KPIs do dashboard
  (imóveis ocupados, receita do mês, contratos a vencer).
- **Relatório MP-SE** consolidado e multipágina em PDF para prestação de contas.
- Segurança: todas as rotas exigem JWT, exceto `/api/auth/**`, `/actuator/health` e `/error`
  (proteção contra IDOR garantida por validação de acesso no servidor).

## Principais endpoints da API

| Método | Rota | Descrição |
|--------|------|-----------|
| POST   | `/api/auth/login` | Autentica e retorna o JWT |
| GET    | `/api/auth/me` | Usuário autenticado |
| GET    | `/api/dashboard` | KPIs do dashboard |
| GET/POST | `/api/imoveis` | Lista e cria imóveis |
| GET/POST | `/api/locatarios` | Lista e cria locatários |
| GET/POST | `/api/contratos` | Lista e cria contratos (upload/link do PDF) |
| GET    | `/api/contratos/{id}/pdf` | Download do PDF do contrato |
| GET/POST | `/api/financeiro/lancamentos` | Lançamentos financeiros |
| POST   | `/api/financeiro/lancamentos/{id}/pagar` | Quita (calcula multa/juros e emite recibo) |
| GET    | `/api/financeiro/lancamentos/{id}/recibo` | Recibo em PDF numerado |
| GET    | `/api/financeiro/fluxo-caixa` | Fluxo de caixa diário (RDD) |
| GET    | `/api/relatorios/mp-se` | Relatório consolidado MP-SE (PDF) |
| GET    | `/api/relatorios/mp-se/resumo` | Resumo para o relatório MP-SE |

## Testes

```bash
cd backend
mvn test        # FinanceiroSecurityTest: segurança (JWT/IDOR) + cálculos de multa/juros
```

```bash
cd frontend
npm run build   # tsc --noEmit + vite build (type-check e build de produção)
```


## Uso de Inteligência Artificial

Durante o desenvolvimento do projeto FORMACE, ferramentas de Inteligência Artificial
foram utilizadas como recurso de apoio à programação e ao desenvolvimento do sistema.

A IA foi utilizada principalmente para:
- Auxílio na elaboração e revisão de código;
- Identificação e correção de erros;
- Apoio na estruturação da arquitetura do sistema;
- Sugestões de implementação e boas práticas;
- Auxílio na criação e revisão de testes;
- Apoio na documentação do projeto.

A implementação, integração, validação e decisões finais sobre o sistema foram realizadas
e revisadas pela equipe técnica de projeto.

