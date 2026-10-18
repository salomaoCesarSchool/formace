# 🚀 Deploy do FORMACE no Render (plano gratuito) + Supabase

Visão geral: **um serviço só** no Render, com Docker multi-stage — o build do
React é embutido no jar do Spring Boot, então tudo sai de uma única URL
(`https://seu-app.onrender.com`), sem CORS e sem proxy. O banco de dados é o
**Supabase** (PostgreSQL gerenciado, também gratuito).

```
Navegador ──> https://seu-app.onrender.com
                 ├── /api/**     → Spring Boot (Java 21)
                 ├── /dashboard  → React (index.html)
                 └── JDBC ──────> Supabase (PostgreSQL, porta 6543)
```

---

## Passo 1 — Criar o banco no Supabase (5 min)

1. Acesse <https://supabase.com> → **Sign up** (dá para usar conta Google).
2. Clique em **New project**:
   - **Name**: `formace` (ou o que preferir)
   - **Database password**: gere uma senha forte e **guarde** (ex.: no gerenciador
     de senhas). Esquecer a senha obriga a resetar o banco.
   - **Region**: **South America (São Paulo)** — mais perto do Render e do Brasil
3. Aguarde ~2 minuto criar o projeto.
4. Pegue os dados da conexão: **Connect** (ou **Database** → **Connection
   string**) → aba **URI** (usar o **pooler**, porta **6543**). O formato é:

   ```
   postgresql://postgres.[SEU-REF]:SENHA@aws-0-sa-east-1.pooler.supabase.com:6543/postgres
   ```

   Anote: **host**, **senha** e o usuário `postgres.[SEU-REF]`.

> ⚠️ Plano gratuito **pausa o banco após 7 dias sem uso**. Para acordar: entre no
> painel do Supabase → **Database** → **Restore** (~1 minuto). Na prática, se o
> sistema for usado de vez em quando, isso nunca acontece.

---

## Passo 2 — Subir o código no GitHub (se ainda não estiver)

O Render lê o código do GitHub. Verifique que o `main` está em dia:

```bash
git status            # deve estar limpo
git push origin main  # se houver commits novos
```

> O `Dockerfile` e o `.dockerignore` na raiz do repo são o que o Render usa.

---

## Passo 3 — Criar o serviço no Render (5 min)

1. Acesse <https://render.com> → **Sign up** (dá para usar conta GitHub).
2. **New** → **Web Service** → conecte o repositório `Formace` do GitHub.
3. Preencha:
   - **Name**: `formace` (vira o endereço `formace-xxx.onrender.com`)
   - **Region**: **Oregon (US West)** ou **Ohio (US East)** — gratuitos
   - **Runtime**: **Docker**
   - **Root Directory**: deixe **vazio** (o Dockerfile está na raiz do repo)
   - **Instance Type**: **Free**
4. Em **Advanced** → **Add Environment Variable**, adicione as variáveis abaixo
   (não esqueça nenhuma):

   | Variável | Valor |
   |---|---|
   | `DB_URL` | `jdbc:postgresql://aws-0-sa-east-1.pooler.supabase.com:6543/postgres?sslmode=require&prepareThreshold=0` |
   | `DB_USER` | `postgres.[SEU-REF]` (o usuário do pooler, com o sufixo) |
   | `DB_PASSWORD` | a senha do banco que você criou no Supabase |
   | `JWT_SECRET` | um segredo longo e único, ex.: gere com `openssl rand -hex 48` |
   | `FRONTEND_BASE_URL` | a URL pública do app, ex.: `https://formace-abc123.onrender.com` (usada no link de recuperação de senha) |
   | `MAIL_HOST` | `smtp.gmail.com` (opcional — recuperação de senha por e-mail) |
   | `MAIL_PORT` | `587` |
   | `MAIL_USERNAME` | o e-mail que envia (ex.: `seuemail@gmail.com`) |
   | `MAIL_PASSWORD` | senha de app do Gmail (Conta Google → Senhas de aplicativo) |

   > Só as 5 primeiras são obrigatórias. Sem elas o app não sobe.

5. Em **Health Check Path** coloque: `/actuator/health`
6. Clique em **Create Web Service**.

---

## Passo 4 — Acompanhar o primeiro deploy (~5–10 min)

O build baixa todas as dependências do Maven e do npm, então a primeira subida é
lenta. Em **Logs** você deve ver, no final:

```
Started FormaceApplication in ... seconds
```

Pronto! A URL `https://formace-xxx.onrender.com` já abre o sistema (tela Splash →
Login). Na primeira vez use o acesso `admin / admin123`.

### Seed do banco

O `data.sql` roda automaticamente no primeiro boot (124 imóveis, lançamentos,
etc.) — o banco Supabase nasce populado igual o local.

---

## Dicas e comportamentos do plano gratuito

- **Servidor dorme**: após ~15 min sem acesso, o serviço dorme; a primeira visita
  seguinte demora ~1 minuto para carregar (o Spring Boot reinicia). Antes de uma
  apresentação, abra a URL uns 2 min antes.
- **Banco pausa em 7 dias** sem uso (acorde pelo painel do Supabase).
- **RAM**: o container roda com heap limitado a 320MB para caber nos 512MB do
  plano gratuito — configurado no `Dockerfile`.
- **Senha nova**: `/login` → aba **Esqueci a senha** → o link chega por e-mail
  (configure `MAIL_*`) ou aparece no **log do Render** (`Link de recuperacao...`).
- **Swagger**: `https://seu-app.onrender.com/swagger-ui.html` (API documentada).

## Custo

| Serviço | Plano | Custo |
|---|---|---|
| Render Web Service (Docker) | Free | US$ 0 |
| Supabase Database | Free (500MB) | US$ 0 |
| **Total** | | **US$ 0** |
