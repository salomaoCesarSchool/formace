# FORMACE — Sistema de Gestão da Fundação Manuel Cruz

Sistema web para a gestão dos **124 imóveis** da Fundação Manuel Cruz: cadastro de imóveis,
locatários e contratos (com fiador), financeiro (lançamentos, quitação, recibos em PDF),
controle de acesso por perfis e **prestação de contas ao Ministério Público de Sergipe (MP-SE)**
com relatórios consolidados em PDF.

**Produção:** https://formace.onrender.com (Render + Supabase Postgres)

## Stack

| Camada    | Tecnologias |
|-----------|-------------|
| Backend   | Java 21, Spring Boot 3.3, Spring Data JPA, Spring Security (JWT), SpringDoc/OpenAPI, OpenPDF, Lombok, PostgreSQL |
| Frontend  | React 18, TypeScript, Vite, React Router 7, Axios — estilos inline com tema próprio (`theme.ts`) e ícones SVG próprios |
| Infra     | Docker / Docker Compose (PostgreSQL 16 + API + Web), Render (produção), GitHub Actions (keep-alive) |

## Estrutura do projeto

```
formace/
├── docker-compose.yml
├── .github/workflows/keep-awake.yml   # ping a cada 5 min em /actuator/health
├── README.md
├── backend/
│   ├── pom.xml
│   ├── Dockerfile
│   └── src/main/java/com/formace/
│       ├── config/        # SecurityConfig, DataSeeder, KeepAliveScheduler, OpenApiConfig, SpaForwardFilter
│       ├── controller/    # Auth, Dashboard, Imovel, Locatario, Contrato, Financeiro, Relatorio, Usuario, DocumentoObrigatorio
│       ├── dto/
│       ├── entity/        # Imovel, Locatario, Contrato, Fiador, LancamentoFinanceiro, Recibo, Usuario, DocumentoObrigatorio, TokenRecuperacao
│       ├── enums/
│       ├── exception/     # GlobalExceptionHandler + exceções de negócio
│       ├── repository/
│       ├── security/      # JwtService, JwtAuthenticationFilter, CustomUserDetailsService
│       └── service/       # CadastroService, DashboardService, FinanceiroService, RelatorioMPService, RecuperacaoSenhaService
│   └── src/main/resources/
│       ├── application.yml
│       └── data.sql       # 124 imóveis + locatários + contratos + lançamentos de teste
└── frontend/
    ├── package.json
    ├── vite.config.ts     # dev server na porta 3000 com proxy /api -> :8080
    └── src/
        ├── api/axios.ts   # instância Axios + interceptor do JWT
        ├── App.tsx        # rotas protegidas por login/perfil
        ├── theme.ts       # paleta e medidas do design
        ├── pages/         # Login, RedefinirSenha, Dashboard, Imoveis, Financeiro, Contratos, NovoContrato, ContratoDetalhe, Relatorio, Acesso
        ├── components/    # Sidebar, PageHeader, Table, Button, Input, Select, Splash, ContratoPDF, DocumentosConfig, LocatarioForm, layout
        ├── store/contratosStore.ts
        ├── types/         # tipos espelhados do backend
        └── utils/         # permissoes, validacao, format, contratoDocumento
```

## Funcionalidades

- **Visão geral (dashboard):** imóveis ocupados/vagos, receita do mês, inadimplência,
  próximos vencimentos, últimos lançamentos e alertas — tudo calculado no backend
  (`DashboardService`).
- **Imóveis e locatários:** CRUD com validação de CPF, e-mail e telefone.
- **Contratos:** criação com fiador, anexo/link do PDF, geração do contrato em PDF
  (impressão do navegador) e detalhe com datas de vencimento.
- **Financeiro:** lançamentos por competência, quitação com multa/juros, cancelamento,
  recibo numerado em PDF e fluxo de caixa diário.
- **Relatórios MP-SE:** consolidado multipágina em PDF + resumo por competência.
- **Controle de acesso:** perfis ADMIN, GESTOR e OPERADOR, gestão de usuários em `/acesso`
  e documentos obrigatórios configuráveis por modalidade de imóvel.
- **Recuperação de senha** por e-mail.

## Regras de negócio

- **Multa por atraso:** 2% sobre o valor base (aluguel + IPTU) quando o pagamento ocorre
  após o vencimento.
- **Juros de mora:** 1% ao mês, calculados *pro rata* por dia de atraso (`1% / 30` por dia).
- **Despesas** (`natureza = SAIDA`) não sofrem multa/juros.
- **Recibo numerado em PDF** gerado com OpenPDF a cada quitação.
- **Fluxo de caixa diário (RDD)** consolidando entradas e saídas por dia.
- **Dashboard:** inadimplência e cobranças em aberto são consolidadas **sem filtro de
  competência** (mesma visão da aba Cobranças do Financeiro); o gráfico "A vencer / Em atraso"
  separa os pendentes por `dataVencimento` (pendente já vencido conta como atraso).
- **Perfis:** ADMIN (tudo, inclusive `/acesso`), GESTOR (tudo menos gestão de usuários) e
  OPERADOR (visão geral, imóveis/locatários e contratos — sem financeiro). As rotas protegidas
  do frontend usam `utils/permissoes.ts` e o backend valida de novo no servidor.
- **Segurança:** todas as rotas exigem JWT, exceto `/api/auth/**`, `/actuator/health` e
  `/error` (proteção contra IDOR garantida por validação de acesso no servidor).
  Senhas em BCrypt; o JWT expira em 24h.
- **Relatório MP-SE** consolidado e multipágina em PDF para prestação de contas.

## Principais endpoints da API

Todas as rotas exigem `Authorization: Bearer <JWT>` (exceto as de `/api/auth`).

### Autenticação e usuários

| Método | Rota | Descrição |
|--------|------|-----------|
| POST   | `/api/auth/login` | Autentica e retorna o JWT |
| POST   | `/api/auth/cadastro` | Cria usuário |
| POST   | `/api/auth/esqueci-senha` | Envia link de redefinição por e-mail |
| POST   | `/api/auth/redefinir-senha` | Redefine a senha com token |
| GET    | `/api/auth/me` | Usuário autenticado |
| GET/POST | `/api/usuarios` | Lista e cria usuários |
| PUT/DELETE | `/api/usuarios/{id}` | Edita e remove usuários |

### Dashboard e cadastros

| Método | Rota | Descrição |
|--------|------|-----------|
| GET    | `/api/dashboard` | KPIs, últimos lançamentos, alertas e cobranças em aberto |
| GET/POST/PUT/DELETE | `/api/imoveis` (`/{id}`) | CRUD de imóveis |
| GET/POST/PUT/DELETE | `/api/locatarios` (`/{id}`) | CRUD de locatários |
| GET/POST/PUT/DELETE | `/api/contratos` (`/{id}`) | CRUD de contratos |
| PUT    | `/api/contratos/{id}/pdf-link` | Vincula o link do PDF do contrato |
| POST/GET | `/api/contratos/{id}/pdf` | Gera/baixa o PDF do contrato |
| GET/POST/PUT/DELETE | `/api/documentos-obrigatorios` (`/{id}`) | Documentos exigidos por modalidade |

### Financeiro e relatórios

| Método | Rota | Descrição |
|--------|------|-----------|
| GET/POST | `/api/financeiro/lancamentos` | Lista e cria lançamentos |
| POST   | `/api/financeiro/lancamentos/{id}/pagar` | Quita (calcula multa/juros e emite recibo) |
| POST   | `/api/financeiro/lancamentos/{id}/cancelar` | Cancela lançamento |
| GET    | `/api/financeiro/lancamentos/{id}/recibo` | Recibo em PDF numerado |
| GET    | `/api/financeiro/fluxo-caixa` | Fluxo de caixa diário (RDD) |
| GET    | `/api/relatorios/mp-se` | Relatório consolidado MP-SE (PDF) |
| GET    | `/api/relatorios/mp-se/resumo` | Resumo para o relatório MP-SE |

## Banco de dados

- PostgreSQL 16; o schema é gerado pelo Hibernate (`ddl-auto: update`) — **não há Flyway**.
- O `data.sql` roda **em cada boot** (`spring.sql.init.mode: always`) com
  `ON CONFLICT (id) DO NOTHING`: só preenche bancos novos — alterar o arquivo **não** muda
  um banco já populado.
- Carga de teste: 124 imóveis, 121 locatários, 108 contratos, 223 lançamentos e 3 usuários.

## Subir com Docker (recomendado)

Requisitos: Docker + Docker Compose.

```bash
docker compose up -d --build
```

| Serviço  | URL / Porta                  |
|----------|------------------------------|
| Frontend | http://localhost:3000        |
| Backend  | http://localhost:8080        |
| Postgres | localhost:5432 (formace/formace) |

Logs e parada:

```bash
docker compose logs -f backend   # acompanhar a API
docker compose down              # parar tudo
docker compose down -v           # parar e apagar o volume do banco
```

Na primeira subida o Hibernate cria as tabelas e o `data.sql` carrega a carga de teste
(124 imóveis, contratos e lançamentos). O usuário administrador é criado automaticamente
pelo `DataSeeder`.

## Subir manualmente (sem Docker)

### 1. Banco de dados

É preciso um PostgreSQL rodando com banco `formace`, usuário `formace` e senha `formace`
(pode usar o próprio `docker compose` só para o banco):

```bash
docker compose up -d postgres
```

### 2. Backend (porta 8080)

Requisitos: JDK 21 + Maven 3.9+.

```bash
cd backend
mvn spring-boot:run
```

Variáveis opcionais (com padrões já definidos no `application.yml`):

```bash
DB_URL=jdbc:postgresql://localhost:5432/formace   # porta do postgres do compose
DB_USER=formace
DB_PASSWORD=formace
JWT_SECRET=<segredo-de-producao>
CORS_ALLOWED_ORIGINS=http://localhost:3000,http://localhost:5173
```

> O padrão do `application.yml` aponta para `localhost:5433`; ajuste `DB_URL` conforme a
> porta do seu banco.

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

## Testes

```bash
cd backend
mvn test
# 46 testes em 6 classes:
#   FinanceiroSecurityTest            — segurança (JWT/IDOR) + cálculos de multa/juros
#   UsuarioControllerTest             — CRUD de usuários e permissões por perfil
#   DashboardServiceTest              — KPIs, inadimplência e separação vencer/atraso
#   ContratoCriacaoTest               — criação de contrato com fiador
#   DocumentoObrigatorioControllerTest— documentos obrigatórios configuráveis
#   LocatarioValidationTest           — CPF, e-mail e telefone
```

```bash
cd frontend
npm run build   # tsc --noEmit + vite build (type-check e build de produção)
```

## Produção (Render + Supabase)

- **URL:** https://formace.onrender.com — deploy automático a cada push na `main`.
- **Banco:** Supabase Postgres, configurado no Render pelas variáveis `DB_URL`, `DB_USER`
  e `DB_PASSWORD`.
- **Keep-alive em duas camadas** (o plano free do Render suspende o serviço após 15 min
  sem tráfego de entrada):
  1. **Interna:** `KeepAliveScheduler` no app — a cada 7 minutos o servidor faz GET na
     própria URL pública;
  2. **Externa:** GitHub Actions (`.github/workflows/keep-awake.yml`) — a cada 5 minutos
     bate em `/actuator/health`, acordando o serviço e mantendo o banco ativo.

> O GitHub desativa workflows agendados após 60 dias sem atividade no repositório.

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
