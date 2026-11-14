# WMS – Gestão de Carregamento (CargaGestor)
Configuracao do primeiro cliente = https://sigmetal-gestor-carga.gruposae.com.br/api

Sistema de expedição e conferência de carregamentos em depósito. Uma **carga** agrupa **romaneios** (entregas por cliente); cada romaneio tem **itens**, e cada item gera **volumes** com código único. O operador bipa cada volume antes da expedição.

## Projetos

| Projeto      | Stack                                                                                     | Função                                                                                            |
| ------------ | ----------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| `wms-server` | NestJS 11, Prisma 7 (adapter MariaDB), MySQL/MariaDB, JWT (`@nestjs/jwt`), bcryptjs       | API REST (prefixo `/api`, porta 3004, Swagger em `/swagger`), JWT, licença                        |
| `wms-app`    | Angular 21 (standalone, signals), Tailwind v4, jsbarcode, ngx-toastr, sweetalert2, vitest | Painel web: cargas, clientes, usuários, empresa, impressão de romaneio e etiquetas. **Não bipa.** |
| `wms-mobile` | Android: Kotlin, Compose (Material 3), Hilt, Retrofit/Gson                                | Login, lista de cargas e bipagem (`POST /api/scans`). Não expede, reabre nem edita.               |

## Fluxo principal

1. Cria-se a carga com romaneios, itens e volumes (`POST /cargos`, uma transação). No web, via wizard.
2. Imprimem-se romaneio e etiquetas (`wms-app`: `delivery-detail`, `packing-label`).
3. Conferência no Android: `POST /scans` com `{ code, cargoId }`. Desfazer: `POST /scans/undo`.
4. Expedição: `POST /cargos/:id/depart`. Reabertura: `POST /cargos/:id/reopen`.

## Modelo de dados (`wms-server/prisma/schema.prisma`)

```
Cargo 1─N Delivery (romaneio) 1─N DeliveryItem 1─N Volume
Client 1─N Delivery        (Delivery guarda snapshot achatado do cliente: clientName, clientCity…; clientId SetNull)
ScanLog N─1 Volume | User | Cargo   (FKs de volume/cargo com SetNull)
Volume N─1 User (loadedBy) · Cargo N─1 User (departedBy)
Company: registro único (dados da empresa, licenseKey, licenseToken, settings JSON)
```

- `Volume.code` (único) = `{cargoId}-{sequence}-{itemId}-{n}`. É o código da etiqueta e o que `/scans` recebe. Único no banco, **não entre bancos**: reset/restore ou mais de uma instalação podem repetir o código em etiquetas diferentes.
- Únicos: `Cargo.loadOrder`, `Delivery.romaneioNumber`, `(Delivery.cargoId, sequence)`, `(Volume.deliveryItemId, number)`.
- Deletar `Cargo` remove em cascata `Delivery → DeliveryItem → Volume`.
- `Cargo.pendingAtDeparture`: volumes pendentes no momento da expedição.
- Índices: `Cargo(createdAt)`, `Cargo(status, createdAt)`, `ScanLog(createdAt)` e os demais do schema.

| Enum             | Valores                                                        |
| ---------------- | -------------------------------------------------------------- |
| `UserRole`       | `ADMIN`, `OPERATOR`, `CHECKER`                                 |
| `CargoStatus`    | `OPEN`, `LOADING`, `DEPARTED`                                  |
| `DeliveryStatus` | `GENERATED`                                                    |
| `ScanResult`     | `OK`, `ERROR`, `WARNING`, `UNDO`                               |
| `ScanReason`     | `NOT_FOUND`, `ALREADY_LOADED`, `WRONG_CARGO`, `CARGO_DEPARTED` |

## API

Prefixo `/api`. Rotas exigem Bearer JWT, exceto as públicas (`@Public()` + `jwt-auth.guard`). Total: 33 rotas (3 públicas: `POST /users/login`, `POST /license/usage-report`, `GET /license/status`). Detalhe completo de DTOs: `/swagger`.

Paginação (cargos, clients, scans): `page` (padrão 1), `limit` (padrão 10, máx. 100). Resposta `{ data, total, page, limit, totalPages }`.

### `/users`

| Método | Rota           | Descrição                                                                                                   |
| ------ | -------------- | ----------------------------------------------------------------------------------------------------------- |
| POST   | `/users/login` | Pública. Retorna `{ token }` ou `{ token, licenseWarning }` (string, vem de `license.message`)              |
| POST   | `/users`       | Criar. `name` ≤191, `username` 3–50 `[A-Za-z0-9._-]` único (409), `password` 6–72, `role` padrão `OPERATOR` |
| GET    | `/users`       | Não paginado. Filtros: `username` (contém), `role`, `active` (padrão: só ativos)                            |
| GET    | `/users/:id`   | Usuário ativo (inativo = 404)                                                                               |
| PATCH  | `/users/:id`   | Todos os campos opcionais; `password` troca a senha                                                         |
| DELETE | `/users/:id`   | Soft delete (`active=false`)                                                                                |

ID 1 é protegido (400 em PATCH/DELETE). Usuário não pode desativar a si mesmo. Não existe reativação.

### `/company` (registro único, 404 se não cadastrada)

| Método             | Rota            | Descrição                                                     |
| ------------------ | --------------- | ------------------------------------------------------------- |
| GET                | `/company`      | `licenseKey` mascarada (`****XXXX`); `licenseToken` nunca sai |
| PATCH              | `/company`      | `null`/vazio limpa opcional; alterar CNPJ revalida a licença  |
| GET / PUT / DELETE | `/company/logo` | Logo como data URL PNG/JPEG base64 (ou `null`); DELETE = 204  |

Campos: `cnpj` (14 dígitos, aceita máscara), `name` (razão social, obrigatório), `tradeName`, `stateRegistration` (≤20), `phone` (≤20), `street`, `streetNumber` (≤20), `neighborhood`, `city`, `state` (UF), `zipCode` (8 dígitos).

### `/clients` (paginado)

`GET /clients` (`search` por nome/documento), `GET|PATCH|DELETE /clients/:id`, `POST /clients`. `name` e `city` obrigatórios; `document` opcional, 11 ou 14 dígitos, salvo só com dígitos, único (409). `PATCH`: `null`/vazio limpa opcionais. `DELETE` é real (409 se houver entregas).

### `/cargos` (paginado)

| Método | Rota                 | Descrição                                                                                                                       |
| ------ | -------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| GET    | `/cargos`            | Filtros: `createdFrom`/`createdTo` (`YYYY-MM-DD`), `status`, `search` (ordem, motorista, caminhão), `loadDate`, `page`, `limit` |
| GET    | `/cargos/:id`        | Romaneios, snapshot do cliente, itens, `totalVolumes`/`loadedVolumes` (carga, romaneio e item)                                  |
| POST   | `/cargos`            | Cria carga + romaneios + itens + volumes (1 transação)                                                                          |
| PATCH  | `/cargos/:id`        | Ver regras abaixo                                                                                                               |
| DELETE | `/cargos/:id`        | Só `OPEN` sem volumes carregados                                                                                                |
| POST   | `/cargos/:id/depart` | Exige `LOADING` e ≥1 volume carregado; com pendentes exige `force: true` (senão 409 com `pendingVolumes`)                       |
| POST   | `/cargos/:id/reopen` | Só `DEPARTED`; `reason` obrigatório (≤500)                                                                                      |

- `GET /cargos` sem `createdFrom`/`createdTo` retorna só o dia atual (America/Sao_Paulo); `createdFrom > createdTo` → 400.
- Itens não trazem lista de volumes; `weight` é número. `loadDate`/`issueDate` chegam em ISO UTC (`2026-10-15T00:00:00.000Z`).
- `PATCH`: permitido em qualquer status exceto `DEPARTED` (409). `deliveries` é a lista completa: com `id` mantém, sem `id` cria (exige `client` ou `clientId`), ausente remove. A lista não pode ficar vazia; sem `deliveries`, só o cabeçalho muda. Não remove romaneio/item nem reduz volumes já carregados (409; estornar antes com `/scans/undo`). Reenviar romaneio existente sem `client` mantém o snapshot.
- `romaneioNumber` e `loadOrder` duplicados → 409.

### `/scans`

| Método | Rota          | Descrição                                                                                                                                  |
| ------ | ------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| POST   | `/scans`      | `{ code, cargoId }`; header opcional `x-device-id` (≤100, grava em `ScanLog.device`)                                                       |
| POST   | `/scans/undo` | `{ code, cargoId }`; mesmo header                                                                                                          |
| GET    | `/scans`      | Filtros `cargoId`, `userId`, `result`, `createdFrom`, `createdTo`, `page`, `limit`. Sem datas, todo o histórico. Cada item traz `userName` |

- Scan: 200 sempre que a carga existe (404 se não). `ALREADY_LOADED` vira `WARNING`; as outras recusas viram `ERROR`. Precedência: `CARGO_DEPARTED` > `NOT_FOUND` > `WRONG_CARGO` > `ALREADY_LOADED`.
- Primeira bipagem aceita: `OPEN → LOADING` e preenche `startedAt`. O último volume preenche `endedAt`.
- Undo: só com carga não expedida e volume carregado. 409: carga expedida, volume de outra carga ou volume não carregado. 404: volume inexistente. Limpa `endedAt` se a carga deixa de estar completa; o status continua `LOADING`.
- Resposta (scan e undo, `ScanResponseDto`): `result, reason, message, code, cargoId, cargoStatus, totalVolumes, loadedVolumes, volume { id, number, product, romaneioNumber, loaded, loadedAt } | null`. No undo: `result: UNDO`, `reason: null`, `volume.loaded: false`. Não traz id do `ScanLog`; o estorno é pelo `code`.

### `/summary`

`GET /summary?from=&to=` (`YYYY-MM-DD`; padrão: dia 1 do mês até hoje, America/Sao_Paulo, offset fixo -03:00; 400 se `from > to`). Cargas/romaneios/volumes filtram por `Cargo.createdAt`; bipagens por `ScanLog.createdAt`.

**Relatórios estendidos**  
`GET /summary/reports?from=&to=` (mesmo período do `/summary`). Retorna:

- **operadores**: `userId`, `name`, `volumesLoaded`, `scans { ok, error, warning, undo, total }`
- **dispositivos**: `device` (string|null), `scans { ok, error, warning, undo, total }`
- **tempo de carregamento**: `cargos` (qtd com startedAt), `avgLoadSeconds` (startedAt→endedAt), `avgToDepartSeconds` (startedAt→departedAt), `longestLoad { loadOrder, seconds }`
- **expedidas com pendência**: até 10 cargas `DEPARTED` com `pendingAtDeparture > 0` (ordem decrescente), traz `loadOrder`, `pendingAtDeparture`, `departedAt`, `driverName`, `truck`
- **bipagens por dia**: array `{ day: YYYY-MM-DD, ok, error, warning, undo, total }` (fuso America/Sao_Paulo via `CONVERT_TZ(created_at, '+00:00', '-03:00')`)
- **bipagens por hora**: array 24 posições `{ hour: 0–23, total }` (mesmo fuso)
- **cargas por motorista**: top `{ label, count }` (agrupa `driverName`)
- **cargas por caminhão**: top `{ label, count }` (agrupa `truck`)
- **volumes/peso por cliente**: top 10 `{ label: clientName, volumes, weight, deliveries }`
- **volumes/peso por cidade**: top 10 `{ label: clientCity, volumes, weight, deliveries }`

> ⚠️ **Peso** — `DeliveryItem.weight` é **peso total do item** (não multiplica por `quantity`). A soma no relatório usa o valor direto.  
> ⚠️ **Fuso do banco** — `created_at` é gravado em **UTC** pelo Prisma. As queries SQL cruas de bipagens por dia/hora usam `CONVERT_TZ(created_at, '+00:00', '-03:00')` para America/Sao_Paulo (offset fixo -03:00, sem horário de verão).

```json
{
  "period": { "from": "2026-11-01", "to": "2026-11-12" },
  "cargos": { "total": 10, "open": 2, "loading": 5, "departed": 3 },
  "deliveries": 25,
  "volumes": { "total": 500, "loaded": 380, "pending": 120 },
  "pendingAtDeparture": 15,
  "scans": {
    "total": 400,
    "ok": 350,
    "error": 30,
    "warning": 15,
    "undo": 5,
    "byReason": { "NOT_FOUND": 20, "ALREADY_LOADED": 10, "WRONG_CARGO": 5, "CARGO_DEPARTED": 5 }
  }
}
```

`byReason` agrupa por `reason`, independente do `result`.

### `/license`

| Método | Rota                    | Descrição                      |
| ------ | ----------------------- | ------------------------------ |
| POST   | `/license/usage-report` | Enviar relatório de uso (202)  |
| GET    | `/license/status`       | Status da licença              |
| GET    | `/license/validate`     | Validar licença com o servidor |
| GET    | `/license/info`         | Info do token de licença       |

## Estrutura de pastas

### `wms-server/`

```
prisma/   schema.prisma · migrations/ · seeds/ (company, user, seed)
src/
  main.ts · app.module.ts · app.controller.ts · app.service.ts
  core/
    database/    prisma.module · prisma.service · prisma.config · prisma
    decorators/  current-user · public · single-instance
    guards/      jwt-auth.guard
    scripts/     database-dump · database-seed · manager-database
    utils/       date-utils · paginated-response · pagination-query.dto · phone.util · validation
  features/      controller + module + service + dto/
    cargos/ (+ cargo-lock.ts, cargo-status.service.ts) · clients/ · company/
    license-system/ (+ entities/) · scan/ (rota /scans) · summary/ (reports.service.ts, summary-range.ts) · users/
```

### `wms-app/src/app/`

```
app.config.ts · app.routes.ts · app.ts · app.html
core/      guards/auth.guard · interceptors/auth.interceptor
           services/ (auth, environment, license, platform, print, theme) · types/paginated-response
features/  pages/ · services/ · types/ · components/
  login · dashboard (components/dashboard-reports, types/reports.ts) · cargo-overview · cargo-registration · cargo-detail
  delivery-detail (components/romaneio-print) · packing-label (components/barcode, label-card)
  scan-check (LEGADO) · clients · settings (company-form, company-logo, users-list)
shared/    alerts · app-layout · offline (not-found, offline) · paginator · toastr
           utils/ (delivery-payload, delivery-progress [legado], form-utils, volume-progress)
```

### `wms-mobile/app/src/main/java/com/carga_gestor/wms_mobile/`

```
CargaGestorApp.kt · MainActivity.kt
data/  api/ (ApiService, AuthInterceptor) · model/ (AuthModels, CargoModels) · repository/ (Auth, Cargo)
di/    AppModule
ui/    navigation/ (NavGraph, Screen) · theme/ (Color, Theme, ThemeManager, Type)
       screens/ cargos/ · login/ · scan/ (ScanScreen, ScanViewModel, HardwareScanEffect [sem uso])
util/  JwtDecoder · NetworkErrorHandler · Resource · TokenManager
```

## Rotas do web (`wms-app`)

| Rota                                   | Componente          | Função                                                                                  |
| -------------------------------------- | ------------------- | --------------------------------------------------------------------------------------- |
| `''`                                   | `Login`             | Fora do layout; vai a `/dashboard` após login                                           |
| `dashboard`                            | `Dashboard`         | Resumo por período (padrão: mês atual) + relatórios do período (`/summary/reports`)     |
| `cargas`                               | `CargoOverview`     | Lista paginada, filtro por data de criação, atalhos "Esta semana" e "Este mês" (padrão) |
| `cargas/novo`                          | `CargoRegistration` | Wizard; um `POST` no último passo                                                       |
| `cargas/:cargoId`                      | `CargoDetail`       | Expedir/reabrir/excluir, editar cabeçalho, romaneios; polling de 10 s                   |
| `cargas/:cargoId/entregas/:deliveryId` | `DeliveryDetail`    | Edita romaneio, cliente e itens; imprime romaneio e etiquetas                           |
| `conferencia/:cargoId/:deliveryId`     | `ScanDelivery`      | **Legado/mock** (usa `CargoService`); a bipagem real é no Android                       |
| `clientes`                             | `Clients`           | Formulário no topo, tabela paginada com busca                                           |
| `configuracoes`                        | `Settings`          | `CompanyForm` + `UsersList`                                                             |

`authGuard` só na rota pai do `AppLayout`. Sem diferenciação por role no frontend (navbar e telas iguais para todos).

## Convenções e armadilhas

### Backend

- `PrismaService` **não** estende `PrismaClient`: use `this.prisma.client.<model>` e `this.prisma.client.$transaction`.
- Client gerado em `generated/prisma`; imports com extensão `.js` (ex.: `../../../generated/prisma/client.js`).
- `@CurrentUser('username')` injeta o usuário logado; `@Public()` marca rota sem token.
- `core/utils/validation`: `trim`, `trimOrNull`, `digits`, `digitsOrNull`, `upperOrNull`, `ValidationMessages`. DTOs com class-validator.
- Lock da carga (`SELECT ... FOR UPDATE`) antes de editar ou bipar. `cargo-lock.ts` exporta `lockCargoRow`; `scan.service` tem cópia inline (`lockCargo`).
- Transações com timeout (30 s; scans 10 s). `rethrow`: `HttpException` não vira `error`; P2002 vira 409. `PATCH` aplica só o `diff` e loga só nomes de campos. `Logger` com `actor=`.
- `buildDetail` monta a resposta da carga (totais por carga, romaneio e item).
- **Helper de período compartilhado**: `resolveRange` (`summary-range.ts`) converte `from`/`to` em `{ gte, lte }` no fuso `America/Sao_Paulo` (offset fixo -03:00). Usado por `SummaryService` e `ReportsService`.

### Web

- Ids são `number`. Cliente do romaneio é achatado (`clientName`…), não `client`.
- Services usam `environment.apiUrl`. Auth: JWT em `localStorage['token']` (payload `{ userId, username, role, iat, exp }`); interceptor só para `apiUrl`; 401 limpa o token e volta a `/`.
- Não existe endpoint por romaneio: editar romaneio é `PATCH` da carga com a lista completa (`toDeliveryDto`).
- `loadDate`/`issueDate` em ISO UTC: exibir com `date: 'dd/MM/yyyy' : 'UTC'`; `<input type="date">` com `slice(0, 10)`.
- `<input type="number">` precisa de `type` estático, senão o valor vira string e o backend rejeita.
- "Hoje" em São Paulo: `new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(new Date())`.
- `CargoDetail`: toda atualização local passa por `setCargo` (incrementa `cargoVersion` para descartar polling defasado).
- Erros do backend: `error.error.message` (string ou array); usar `httpErrorMessage`. `PATCH` de clients/company: vazio vai como `null`; documento/CNPJ/CEP só dígitos. Edição de usuário: senha vazia = não enviar `password`.
- Tema: tokens em `@theme` (`styles.css`) sobrescritos em `.dark`; `ThemeService` guarda em `localStorage['theme']`. Impressão sempre branco/preto (`--color-print-bg`, `--color-print-ink`).
- SweetAlert2 renderiza `title` como HTML: escapar texto de usuário.
- Legado, não usar: `CargoService` (`cargo-registration.service`), `types/cargo-registration`, `shared/utils/delivery-progress`.

### Android

- Base URL `http://<host>:3004/api`. Token enviado por `AuthInterceptor` (OkHttp) via `TokenManager`. Header `x-device-id` = `"$MODEL ($ANDROID_ID)"`.
- Dispositivo alvo: coletor RT40 (Android 10), scanner em **modo teclado** com sufixo Enter; sem câmera. O código é digitado num `EditText` nativo (`AndroidView`).
- Gson ignora nulidade do Kotlin: campo que o backend pode omitir deve ser `?`. `weight` é `Double?`.
- `loadDate`/`issueDate` em ISO UTC: exibir `take(10)` sem converter fuso. O scanner lê EAN também, mas a API só aceita `Volume.code` (EAN retorna `NOT_FOUND`).
- Não sincronizar texto Compose → `EditText` (`setText` no `update` derrubou o app); limpar com `text.clear()`. Não usar `FocusRequester` nem `InterceptPlatformTextInput` no campo de código.
- `AuthModels.licenseWarning` está como `Boolean?`, mas o backend envia string (hoje o campo não é usado no app).
- Código sem uso: `HardwareScanEffect`, `undoLast`/`lastOkCode` no `ScanViewModel`, `ScanUndoRequest` (contrato antigo `scanLogId`), `Log.d` de depuração.

## Como rodar

Cada projeto tem seu `package.json` (`wms-server`, `wms-app`). O server lê configuração de um `.env` na raiz de `wms-server` (o instalador Windows copia esse arquivo).

### `wms-server` (executar dentro de `wms-server/`)

| Comando                                          | O que faz                                        |
| ------------------------------------------------ | ------------------------------------------------ |
| `npm run start:dev`                              | Desenvolvimento com watch (`nest start --watch`) |
| `npm run build` / `npm run start:prod`           | Compila (`nest build`) e roda `node dist/main`   |
| `npm run prisma:generate`                        | Gera o client em `generated/prisma`              |
| `npm run prisma:migrate`                         | `prisma migrate dev`                             |
| `npm run prisma:reset`                           | `prisma migrate reset --force` (apaga o banco)   |
| `npm run prisma:seed`                            | Roda `prisma/seeds/seed.ts` (company, user)      |
| `npm run prisma:studio`                          | Prisma Studio                                    |
| `npm run lint` · `npm test` · `npm run test:e2e` | ESLint (com `--fix`), Jest unit, Jest e2e        |

### `wms-app` (executar dentro de `wms-app/`)

`npm start` (`ng serve`) · `npm run build` (`ng build`) · `npm test` (`ng test`, vitest).

### Build e distribuição (Windows)

- `npm run release`: `build` + `build:bundle` (esbuild gera `release/server.js`, alvo node18, minificado).
- `npm run copy:wms-app`: copia o build do app para `wms-server/public/dist/wms-app/browser`.
- `npm run installer:win`: antes roda `preinstaller:win` (build do server, build do `wms-app` e `copy:wms-app`); depois gera o bundle, copia `server.js`, `.env` e `public` para `nsis-installer-windows/` e executa `build.sh`.
- `npm run manager-db:win` / `manager-db:linux`: empacotam o gerenciador de banco (`core/scripts/manager-database`) em executável (`pkg`, node18) em `release/`.

### `wms-mobile`

Projeto Gradle (`./gradlew`), módulo `app`.

<!-- Preencher: chaves do .env do wms-server, porta/URL configurada no wms-app (environment.ts) e minSdk/URL base do mobile -->
