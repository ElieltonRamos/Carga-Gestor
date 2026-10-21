# CargaGestor

Sistema operacional WMS focado na gestão de expedição e conferência de carregamentos em depósito.

### 🚀 Funcionalidades Principais

- **Cadastro de Carga (Wizard):** Criação sequencial de entregas com geração de romaneios, peso, volume e códigos.
- **Emissão de Documentos:** Visualização e impressão de romaneios detalhados e etiquetas operacionais com código de barras.
- **Conferência Mobile:** Dashboard para bipagem e validação de itens no carregamento em tempo real com indicadores de status.

# WMS: instruções para IA

Gestão de cargas, romaneios e conferência de carregamento.
- Backend: NestJS + Prisma (MySQL/MariaDB). Prefixo `/api`, Swagger em `/swagger` (porta 3004).
- Frontend web: Angular. Acompanha e edita cargas, gerencia clientes, usuários e dados da empresa.
- App Android (outro projeto): faz a bipagem real (`POST /api/scans`). O web só monitora.
- `(?)` = caminho não confirmado.

## Como trabalhar
- Responder em pt-BR, objetivo, focado em código. Não gerar documentação.
- Não assumir campos ou tipos: conferir DTO/schema. Na dúvida, perguntar.
- Uma pergunta por vez.
- Sem diferenciação de role no frontend por enquanto (navbar e telas iguais para todos).

## Backend
- `prisma/schema.prisma`: client gerado em `generated/prisma`. Imports com extensão `.js` (ex.: `../../../generated/prisma/client.js`).
- Módulos em `src/features/<módulo>/`: `clients`, `company`, `users`, `summary`, `license-system` (confirmados); `cargos` e `scans` (?).
- `src/core/`: `database/prisma.service`, `decorators/` (`current-user.decorator`, `public.decorator`), `utils/` (`validation`, `pagination-query.dto`, `paginated-response`).
- **`PrismaService` não estende `PrismaClient`**: expõe `client`. Consultas são `this.prisma.client.<model>...` e transações `this.prisma.client.$transaction`.
- `@CurrentUser('username') actor` injeta o usuário logado. `@Public()` marca rota sem token (login).
- `core/utils/validation`: `trim`, `trimOrNull`, `digits`, `digitsOrNull`, `upperOrNull`, `ValidationMessages`.
- Padrões: DTO com class-validator + `ValidationMessages`; `Logger` com `actor=`; `rethrow` (HttpException não vira `error`; P2002 vira 409); transações com timeout de 30 s; `lockCargoRow` antes de editar cargo; `PATCH` aplica só os campos que mudaram (`diff`) e loga só nomes de campos.
- `cargos`: `cargos.controller`, `cargos.service`, `cargo-status.service` (depart/reopen), `cargo-lock`, `dto/` (?).
- `buildDetail` monta a resposta da carga (totais de volumes por carga, romaneio e item).
- Índices para o resumo: `Cargo(createdAt)`, `Cargo(status, createdAt)`, `ScanLog(createdAt)` — **confirmados no schema**.

## Modelo de dados
`Cargo` 1:N `Delivery` (romaneio, com snapshot achatado do cliente: `clientName`, `clientCity`…) 1:N `DeliveryItem` 1:N `Volume`.
- `Volume.code` (único) = `{cargoId}-{sequence}-{itemId}-{n}`. É o código de barras da etiqueta e o que o `/scans` recebe.
- Outros: `ScanLog` (result `OK|ERROR|WARNING|UNDO`, reason `NOT_FOUND|ALREADY_LOADED|WRONG_CARGO|CARGO_DEPARTED`), `User` (role `ADMIN|OPERATOR|CHECKER`), `Client`, `Company` (registro único, licença).
- `Cargo.status`: `OPEN | LOADING | DEPARTED`.
- `Delivery.client` com `onDelete: SetNull`; `Cargo.pendingAtDeparture` guarda os volumes pendentes na expedição.

## API
- `POST /users/login` (retorna `{ token }`; `licenseWarning` desativado por enquanto); `/users`; `/company`; `/clients`; `/summary`; `/license/{usage-report,status,validate,info}`.
- `/cargos`: `GET` (paginado), `POST`, `GET|PATCH|DELETE /{id}`, `POST /{id}/depart`, `POST /{id}/reopen`.
- `/scans`: `POST`, `GET`, `POST /undo`.
- Paginação (cargos, clients): `page` (1), `limit` (10, máx 100). Resposta `{ data, total, page, limit, totalPages }`.
- `GET /cargos`: filtra por `createdAt` com `createdFrom`/`createdTo` (`YYYY-MM-DD`); sem eles, filtra o dia atual (America/Sao_Paulo). Outros filtros: `status`, `search`, `loadDate`.

### Users
- `GET /users` **não é paginado** (array). Filtros: `username` (contém), `role`, `active` (padrão: só ativos).
- `POST`: `name` (≤191), `username` (3–50, `[A-Za-z0-9._-]`, único → 409), `password` (6–72), `role` (padrão `OPERATOR`), `active`. `PATCH` = todos opcionais (`password` troca a senha).
- Resposta: `id, name, username, role, active, createdAt, updatedAt` (sem senha).
- `DELETE` **desativa** (`active=false`). Usuário de ID 1 é protegido (400 em PATCH/DELETE). Inativo não é encontrado por `GET /{id}` nem `PATCH` (404): não existe reativação.

### Company
- Registro único. `GET /company` e `PATCH /company` (sem id). 404 se não cadastrada.
- Campos: `cnpj` (14 dígitos, aceita máscara), `name` (= razão social, obrigatório), `tradeName`, `stateRegistration` (≤20), `phone` (≤20), `street`, `streetNumber` (≤20), `neighborhood`, `city`, `state` (UF 2 letras), `zipCode` (8 dígitos).
- Resposta também traz `id`, `licenseKey` (mascarada, `****XXXX`), `settings`, `createdAt`, `updatedAt`. `licenseToken` nunca sai.
- `null` ou texto vazio limpa campo opcional. Alterar o CNPJ faz a licença ser revalidada.

### Clients
- `GET /clients` paginado, `search` por nome ou documento. `POST`, `GET|PATCH|DELETE /{id}`.
- Campos: `name` (obrigatório, ≤191), `document` (opcional, 11 ou 14 dígitos, aceita máscara, salvo só com dígitos, único → 409), `address`, `neighborhood`, `city` (obrigatória), `state` (UF), `zipCode` (8 dígitos), `phone` (≤20).
- `PATCH`: `null` ou vazio limpa opcionais. `DELETE` é real, com 409 se houver entregas vinculadas.

### Summary
- `GET /summary?from=YYYY-MM-DD&to=YYYY-MM-DD`. Padrão: dia 1 do mês até hoje (America/Sao_Paulo, offset fixo -03:00). 400 se `from > to`.
- Cargas, romaneios e volumes filtram por `Cargo.createdAt`; bipagens por `ScanLog.createdAt`.
- Resposta: `period`, `cargos {total, open, loading, departed}`, `deliveries`, `volumes {total, loaded, pending}`, `pendingAtDeparture`, `scans {total, ok, error, warning, undo, byReason}`.
- `scans.byReason` agrupa por `reason` independente do `result`.

## Regras de negócio (cargo)
- Editar: qualquer status exceto `DEPARTED` (409).
- Expedir: `LOADING` e ao menos 1 volume carregado. Com pendentes exige `force: true`.
- Reabrir: só `DEPARTED`; `reason` obrigatório (até 500).
- Excluir: só `OPEN` e sem volumes carregados.
- `PATCH /cargos/{id}`:
  - `deliveries` é a lista completa: com `id` mantém, sem `id` cria (exige `client` ou `clientId`), ausente remove.
  - Não remove romaneio/item nem reduz volumes já carregados (409; estornar antes com `/scans/undo`).
  - Reenviar romaneios existentes sem `client` (snapshot intacto).
  - Sem `deliveries`, só o cabeçalho muda.
  - Lista de romaneios não pode ficar vazia.
- `romaneioNumber` e `loadOrder` são únicos (409).

## Frontend (`src/app/`)
Angular standalone, `inject()`, signals/computed, control flow (`@if/@for/@switch`), reactive forms, Tailwind v4 com tokens de tema (light/dark), ngx-toastr, SweetAlert2, locale pt-BR.

- `app.routes.ts`, `app.config.ts`.
- `layout/app-layout`: `AppLayout`, casca das rotas autenticadas (navbar no topo, `<router-outlet />` no `<main>`).
- `core/`: `interceptors/auth.interceptor`, `guards/auth.guard`, `services/` (`auth.service`, `environment` com `environment.apiUrl`, `theme.service`, `license.service`), `types/paginated-response`.
- `shared/`: `utils/` (`volume-progress`, `delivery-payload` com `toDeliveryDto`, `form-utils`), `toastr/notification.service` (`success`, `error`, `warning`), `alerts/custom-alerts` (`alertError`, `alertLoading`, `closeLoading`, `alertConfirm`, `alertSuccess`, `alertWarning`).
- `shared/utils/form-utils`: `digitsLength(lengths)` (validator), `onlyDigits`, `orNull`, `httpErrorMessage(err, fallback)`.
- `features/cargo-registration/`: `pages/cargo-registration`, `services/cargos.service` (**service da API**), `types/cargo` (**tipos da API**).
- `features/dashboard/`: `pages/dashboard`, `services/summary.service`, `types/summary`.
- `features/clients/`: `pages/clients`, `services/clients.service`, `types/client`.
- `features/settings/`: `pages/settings`, `components/company-form`, `components/users-list`, `services/{company,users}.service`, `types/{company,user}`.
- Demais features: `login`, `cargo-overview`, `cargo-detail`, `delivery-detail`, `packing-label` (etiqueta), `scan-check`.

| Rota | Componente | Função |
|---|---|---|
| `''` | `Login` | autenticação; após o login vai para `/dashboard` |
| `dashboard` | `Dashboard` | resumo (cargas, romaneios, volumes, bipagens) por período, padrão mês atual; botão "Ver cargas" |
| `cargas` | `CargoOverview` | lista paginada, filtro por data inicial e final de criação, atalhos "Esta semana" e "Este mês" (padrão) |
| `cargas/novo` | `CargoRegistration` | wizard; envia tudo em um `POST` no último passo |
| `cargas/:cargoId` | `CargoDetail` | status, expedir/reabrir/excluir, editar cabeçalho, adicionar/remover romaneio, polling de 10 s |
| `cargas/:cargoId/entregas/:deliveryId` | `DeliveryDetail` | edita romaneio, cliente e itens; imprime romaneio e etiquetas |
| `conferencia/:cargoId/:deliveryId` | `ScanDelivery` | só validação; não integrado (bipagem é no Android) |
| `clientes` | `Clients` | formulário de cadastro no topo, tabela paginada com busca abaixo; editar (carrega no formulário) e excluir |
| `configuracoes` | `Settings` | página única, sem sub-rotas: `CompanyForm` (dados da empresa) + `UsersList` (cadastro e lista de usuários) |

`authGuard` fica só na rota pai do `AppLayout`; os filhos não repetem. `''` (Login) fica fora do layout.

### Layout
- Navbar: Dashboard, Cargas, Clientes, Configurações (`routerLinkActive="nav-active"`), botões voltar/avançar (`Location.back()/forward()`), tema, sair, chip do usuário (lido do payload do JWT).
- Tema via `ThemeService`: signal `theme` (`'dark' | 'light'`), `toggle()`, classe `dark`/`light` no `<html>`, `localStorage['theme']`, padrão claro. No layout, `isDark = computed(() => theme() === 'dark')`.
- Páginas filhas não repetem `min-h-screen`, fundo nem padding (o layout já dá `h-screen`, fundo e `p-6`). Wrapper padrão: `max-w-5xl mx-auto flex flex-col gap-6 text-text-primary`.

### Estilo (`styles.css`)
- Tailwind v4: tokens em `@theme`, sobrescritos em `.dark`. Usar utilitários de token: `bg-bg-base|card|surface|surface-low`, `border-border`, `text-text-primary|secondary|muted|inverse`, `bg-btn-primary-bg`/`hover:bg-btn-primary-hover`, `btn-secondary-{bg,hover,text,border}`, `input-{bg,border,border-focus,text,placeholder}`, `success|warning|danger|info` (+ `-subtle`), `rounded-input|card|badge`.
- Classes custom usadas pelo layout: `avatar-gradient`, `nav-active`, `bg-grid`, token `--color-bg-sidebar`. **PENDENTE: adicionar ao `styles.css`**.
- Botão primário: `bg-btn-primary-bg text-text-inverse h-10 px-6 rounded-input font-semibold text-sm hover:bg-btn-primary-hover`. Input: `h-10 px-3 rounded-input border border-input-border bg-input-bg text-input-text focus:border-input-border-focus focus:outline-none`.

### Auth
- JWT em `localStorage['token']`, payload `{ userId, username, role, iat, exp }`; `AuthService.getTokenPayload()`.
- Interceptor: `Authorization: Bearer` só para `apiUrl`; 401 limpa o token e volta para `/`.
- Guard: token existe, é válido (`exp`) e, opcionalmente, `route.data.role`.
- A tela de login remove o token ao abrir.

### Armadilhas
- Ids são `number`. Cliente do romaneio é achatado (`clientName`…), não `client`.
- Services usam `environment.apiUrl` (de `core/services/environment`), não um `apiUrl` solto.
- `<input type="number">` precisa de `type` estático, senão o valor vira string e o backend rejeita.
- `loadDate`/`issueDate` vêm em ISO UTC: exibir com `date: 'dd/MM/yyyy' : 'UTC'`; no `<input type="date">` usar `slice(0, 10)`.
- Datas "hoje" em America/Sao_Paulo: `new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(new Date())`.
- Não existe endpoint por romaneio: editar romaneio é `PATCH` da carga com a lista completa (`toDeliveryDto`).
- `CargoDetail`: toda atualização local passa por `setCargo` (incrementa `cargoVersion`, que descarta respostas de polling defasadas).
- Erros do backend: `error.error.message` (string ou array); usar `httpErrorMessage`.
- `PATCH` de clients e company: campo vazio vai como `null` (limpa no banco). Documento/CNPJ/CEP: enviar só dígitos.
- Edição de usuário: senha vazia = manter; não enviar `password` nesse caso.
- SweetAlert2 renderiza `title` como HTML: escapar texto vindo de usuário antes de interpolar. Cores do `alertConfirm` são fixas (não seguem o tema).
- Legado do mock, não usar: `CargoService` (`cargo-registration.service`), `types/cargo-registration`, `shared/utils/delivery-progress`.

## Pendências

### ✅ Concluídas
- [x] **Filtros de período e botões "Esta semana"/"Este mês" no CargoOverview** (`cargo-overview.ts:99-109`)
- [x] **Rota `/configuracoes` no layout autenticado** (`app.routes.ts:30`)
- [x] **Página Settings (CompanyForm + UsersList)** — cadastro/edição de empresa e usuários
- [x] **Dashboard com SummaryService** — resumo por período com contadores de status, volumes e scans
- [x] **Rotas 404 e offline** (`NotFound`, `OfflineComponent`)
- [x] **Validação `createdFrom > createdTo` no frontend** (CargoOverview e Dashboard)
- [x] **Índices no schema Prisma** (`Cargo.createdAt`, `Cargo(status, createdAt)`, `ScanLog.createdAt`)
- [x] **`totalVolumes`/`loadedVolumes` por romaneio e item no backend** (`buildDetail` popula ambos)
- [x] **Soft delete de usuário** — backend desativa, frontend lista só ativos

### ⏳ Em aberto
- [ ] **Tela de licença** — service + endpoints existem (`LicenseService`, `/license/*`), mas não há rota/componente no frontend
- [ ] **Remover `?` em `totalVolumes`/`loadedVolumes` nos types** — `cargo.ts:40-41, 63-64` ainda opcionais; backend já garante
- [ ] **Filtros `status`, `search`, `loadDate` no CargoOverview** — API aceita, UI só expõe datas
- [ ] **Modo "todas as datas" no CargoOverview** — API não tem "sem filtro"; default é dia atual
- [ ] **Backend: 400 quando `createdFrom > createdTo`** — frontend valida; backend cria range vazio sem 400 explícito
- [ ] **CSS: adicionar `avatar-gradient`, `nav-active`, `bg-grid`, `--color-bg-sidebar`** ao `styles.css`
- [ ] **Decidir futuro do `ScanDelivery` / rota `conferencia/...`** — README diz "só validação, não integrado"
- [ ] **Backend: impedir usuário de se desativar** — frontend esconde botão, mas API permite