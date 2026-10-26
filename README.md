# CargaGestor

Sistema WMS para expedição e conferência de carregamentos em depósito.

## Funcionalidades
- **Cadastro de carga (wizard):** romaneios com itens, peso, volumes e códigos.
- **Documentos:** romaneios e etiquetas com código de barras para impressão.
- **Conferência mobile (Android):** lista de cargas e bipagem de volumes por câmera, com progresso em tempo real.
- **Gestão (web):** dashboard, cargas, clientes, usuários e dados da empresa.

# WMS: instruções para IA

Gestão de cargas, romaneios e conferência de carregamento.
- Backend: NestJS + Prisma (MySQL/MariaDB). Prefixo `/api`, Swagger em `/swagger` (porta 3004).
- Frontend web: Angular. Acompanha e edita cargas, gerencia clientes, usuários e empresa. Não bipa.
- App Android (projeto separado): lista cargas e bipa (`POST /api/scans`).
- `(?)` = não confirmado.

## Como trabalhar
- Responder em pt-BR, objetivo, focado em código. Não gerar documentação (exceto este README, quando pedido).
- Não assumir campos ou tipos: conferir DTO/schema. Na dúvida, perguntar.
- Uma pergunta por vez.
- Sem diferenciação de role no frontend por enquanto (navbar e telas iguais para todos).

## Backend
- `prisma/schema.prisma`: client gerado em `generated/prisma`. Imports com extensão `.js` (ex.: `../../../generated/prisma/client.js`).
- Módulos em `src/features/<módulo>/`: `clients`, `company`, `users`, `summary`, `license-system`, `cargos`, `scans`.
- `cargos`: `cargos.controller`, `cargos.service`, `cargo-status.service` (depart/reopen), `cargo-lock` (?), `dto/` (`cargo-list-item.dto`, `cargo-response.dto`, `depart-cargo.dto`, `reopen-cargo.dto`).
- `scans`: `scans.controller`, `scan.service`, `dto/` (`scan-request`, `scan-response`, `list-scans-query`, `scan-log-response`).
- `src/core/`: `database/prisma.service`, `decorators/` (`current-user.decorator`, `public.decorator`), `utils/` (`validation`, `pagination-query.dto`, `paginated-response`, `date-utils` com `dayRange`).
- **`PrismaService` não estende `PrismaClient`**: expõe `client`. Consultas: `this.prisma.client.<model>...`; transações: `this.prisma.client.$transaction`.
- `@CurrentUser('username') actor` injeta o usuário logado. `@Public()` marca rota sem token (login).
- `core/utils/validation`: `trim`, `trimOrNull`, `digits`, `digitsOrNull`, `upperOrNull`, `ValidationMessages`.
- Padrões: DTO com class-validator + `ValidationMessages`; `Logger` com `actor=`; `rethrow` (HttpException não vira `error`; P2002 vira 409); transações com timeout (30 s; scans 10 s); lock da carga (`FOR UPDATE`) antes de editar ou bipar; `PATCH` aplica só os campos que mudaram (`diff`) e loga só nomes de campos.
- `buildDetail` monta a resposta da carga (totais de volumes por carga, romaneio e item).
- Índices: `Cargo(createdAt)`, `Cargo(status, createdAt)`, `ScanLog(createdAt)`.

## Modelo de dados
`Cargo` 1:N `Delivery` (romaneio, com snapshot achatado do cliente: `clientName`, `clientCity`…) 1:N `DeliveryItem` 1:N `Volume`.
- `Volume.code` (único) = `{cargoId}-{sequence}-{itemId}-{n}`. É o código da etiqueta e o que o `/scans` recebe.
- `ScanLog`: result `OK|ERROR|WARNING|UNDO`, reason `NOT_FOUND|ALREADY_LOADED|WRONG_CARGO|CARGO_DEPARTED`, `device`.
- `User`: role `ADMIN|OPERATOR|CHECKER`. Outros: `Client`, `Company` (registro único, licença).
- `Cargo.status`: `OPEN | LOADING | DEPARTED`. `Cargo.pendingAtDeparture` guarda os volumes pendentes na expedição.
- `Delivery.client` com `onDelete: SetNull`.

## API
- `POST /users/login` (retorna `{ token }`; `licenseWarning` desativado); `/users`; `/company`; `/clients`; `/summary`; `/license/{usage-report,status,validate,info}`.
- `/cargos`: `GET` (paginado), `POST`, `GET|PATCH|DELETE /{id}`, `POST /{id}/depart`, `POST /{id}/reopen`.
- `/scans`: `POST`, `GET`, `POST /undo`.
- Paginação (cargos, clients, scans): `page` (1), `limit` (10; scans 20 no app; máx 100). Resposta `{ data, total, page, limit, totalPages }`.
- `GET /cargos`: filtra por `createdAt` com `createdFrom`/`createdTo` (`YYYY-MM-DD`); sem eles, só o dia atual (America/Sao_Paulo); `createdFrom > createdTo` → 400. Outros filtros: `status`, `search` (ordem, motorista, caminhão), `loadDate`.
- `GET /cargos` e `GET /cargos/{id}`: `totalVolumes` e `loadedVolumes` sempre presentes (carga, romaneio e item). Os itens não trazem a lista de volumes; `weight` é número.
- Datas `loadDate`/`issueDate` chegam em ISO UTC (`2026-10-15T00:00:00.000Z`).

### Scans
- `POST /scans` e `POST /scans/undo`: corpo `{ code, cargoId }`; header opcional `x-device-id` (até 100 caracteres, grava em `ScanLog.device`). Ambos respondem 200.
- Scan: 200 sempre que a carga existe (404 se não). O resultado vem em `result` (`OK|WARNING|ERROR`) e `reason`. `ALREADY_LOADED` vira `WARNING`; as outras recusas viram `ERROR`. Precedência: `CARGO_DEPARTED`, `NOT_FOUND`, `WRONG_CARGO`, `ALREADY_LOADED`.
- Primeira bipagem aceita: `OPEN` → `LOADING` e `startedAt`. O último volume preenche `endedAt`.
- Undo: só com carga não expedida e volume carregado. 409: carga expedida, volume de outra carga ou volume não carregado. 404: volume inexistente. Limpa `endedAt` se a carga deixa de estar completa; o status continua `LOADING`.
- Resposta: `result, reason, message, code, cargoId, cargoStatus, totalVolumes, loadedVolumes, volume { id, number, product, romaneioNumber, loaded, loadedAt } | null`. Não traz o id do `ScanLog`: o estorno é pelo `code`.
- `GET /scans`: filtros `cargoId`, `userId`, `result`, `createdFrom`, `createdTo`, `page`, `limit`. Sem datas, lista todo o histórico. Cada item traz `userName`.

### Users
- `GET /users` **não é paginado** (array). Filtros: `username` (contém), `role`, `active` (padrão: só ativos).
- `POST`: `name` (≤191), `username` (3–50, `[A-Za-z0-9._-]`, único → 409), `password` (6–72), `role` (padrão `OPERATOR`), `active`. `PATCH` = todos opcionais (`password` troca a senha).
- Resposta: `id, name, username, role, active, createdAt, updatedAt` (sem senha).
- `DELETE` **desativa** (`active=false`). Usuário de ID 1 é protegido (400 em PATCH/DELETE). Usuário não pode desativar a si mesmo. Inativo não é encontrado por `GET /{id}` nem `PATCH` (404): não existe reativação.

### Company
- Registro único. `GET /company` e `PATCH /company` (sem id). 404 se não cadastrada.
- Campos: `cnpj` (14 dígitos, aceita máscara), `name` (= razão social, obrigatório), `tradeName`, `stateRegistration` (≤20), `phone` (≤20), `street`, `streetNumber` (≤20), `neighborhood`, `city`, `state` (UF), `zipCode` (8 dígitos).
- Resposta também traz `id`, `licenseKey` (mascarada, `****XXXX`), `settings`, `createdAt`, `updatedAt`. `licenseToken` nunca sai.
- `null` ou texto vazio limpa campo opcional. Alterar o CNPJ faz a licença ser revalidada.

### Clients
- `GET /clients` paginado, `search` por nome ou documento. `POST`, `GET|PATCH|DELETE /{id}`.
- Campos: `name` (obrigatório, ≤191), `document` (opcional, 11 ou 14 dígitos, aceita máscara, salvo só com dígitos, único → 409), `address`, `neighborhood`, `city` (obrigatória), `state` (UF), `zipCode` (8 dígitos), `phone` (≤20).
- `PATCH`: `null` ou vazio limpa opcionais. `DELETE` é real, com 409 se houver entregas vinculadas.

### Summary
- `GET /summary?from=YYYY-MM-DD&to=YYYY-MM-DD`. Padrão: dia 1 do mês até hoje (America/Sao_Paulo, offset fixo -03:00). 400 se `from > to`.
- Cargas, romaneios e volumes filtram por `Cargo.createdAt`; bipagens por `ScanLog.createdAt`.
- Resposta: `period`, `cargos {total, open, loading, departed}`, `deliveries`, `volumes {total, loaded, pending}`, `pendingAtDeparture`, `scans {total, ok, error, warning, undo, byReason}`. `byReason` agrupa por `reason` independente do `result`.

## Regras de negócio (cargo)
- Editar: qualquer status exceto `DEPARTED` (409).
- Expedir: `LOADING` e ao menos 1 volume carregado. Com pendentes exige `force: true` (senão 409 com `pendingVolumes`).
- Reabrir: só `DEPARTED`; `reason` obrigatório (até 500).
- Excluir: só `OPEN` e sem volumes carregados.
- `PATCH /cargos/{id}`:
  - `deliveries` é a lista completa: com `id` mantém, sem `id` cria (exige `client` ou `clientId`), ausente remove.
  - Não remove romaneio/item nem reduz volumes já carregados (409; estornar antes com `/scans/undo`).
  - Reenviar romaneios existentes sem `client` (snapshot intacto).
  - Sem `deliveries`, só o cabeçalho muda. A lista não pode ficar vazia.
- `romaneioNumber` e `loadOrder` são únicos (409).

## Frontend web (`src/app/`)
Angular standalone, `inject()`, signals/computed, control flow (`@if/@for/@switch`), reactive forms, Tailwind v4 com tokens de tema (light/dark), ngx-toastr, SweetAlert2, locale pt-BR.

- `app.routes.ts`, `app.config.ts`.
- `layout/app-layout`: casca das rotas autenticadas (navbar no topo, `<router-outlet />` no `<main>`).
- `core/`: `interceptors/auth.interceptor`, `guards/auth.guard`, `services/` (`auth.service`, `environment` com `environment.apiUrl`, `theme.service`, `license.service`), `types/paginated-response`.
- `shared/`: `utils/` (`volume-progress`, `delivery-payload` com `toDeliveryDto`, `form-utils`), `toastr/notification.service` (`success`, `error`, `warning`), `alerts/custom-alerts` (`alertError`, `alertLoading`, `closeLoading`, `alertConfirm`, `alertSuccess`, `alertWarning`).
- `form-utils`: `digitsLength(lengths)` (validator), `onlyDigits`, `orNull`, `httpErrorMessage(err, fallback)`.
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
| `conferencia/:cargoId/:deliveryId` | `ScanDelivery` | validação; a bipagem real é no Android |
| `clientes` | `Clients` | formulário de cadastro no topo, tabela paginada com busca abaixo; editar (carrega no formulário) e excluir |
| `configuracoes` | `Settings` | página única: `CompanyForm` + `UsersList` |

`authGuard` fica só na rota pai do `AppLayout`; os filhos não repetem. `''` (Login) fica fora do layout.

### Layout
- Navbar: Dashboard, Cargas, Clientes, Configurações (`routerLinkActive="nav-active"`), voltar/avançar (`Location.back()/forward()`), tema, sair, chip do usuário (payload do JWT).
- `ThemeService`: signal `theme` (`'dark' | 'light'`), `toggle()`, classe `dark`/`light` no `<html>`, `localStorage['theme']`, padrão claro.
- Páginas filhas não repetem `min-h-screen`, fundo nem padding (o layout dá `h-screen`, fundo e `p-6`). Wrapper padrão: `max-w-5xl mx-auto flex flex-col gap-6 text-text-primary`.

### Estilo (`styles.css`)
- Tokens em `@theme`, sobrescritos em `.dark`. Utilitários: `bg-bg-base|card|surface|surface-low`, `border-border`, `text-text-primary|secondary|muted|inverse`, `bg-btn-primary-bg`/`hover:bg-btn-primary-hover`, `btn-secondary-{bg,hover,text,border}`, `input-{bg,border,border-focus,text,placeholder}`, `success|warning|danger|info` (+ `-subtle`), `rounded-input|card|badge`.
- Botão primário: `bg-btn-primary-bg text-text-inverse h-10 px-6 rounded-input font-semibold text-sm hover:bg-btn-primary-hover`. Input: `h-10 px-3 rounded-input border border-input-border bg-input-bg text-input-text focus:border-input-border-focus focus:outline-none`.
- Impressão (romaneio/etiqueta): `--color-print-bg` e `--color-print-ink`, sempre branco/preto, mesmo no tema escuro.

### Auth
- JWT em `localStorage['token']`, payload `{ userId, username, role, iat, exp }`; `AuthService.getTokenPayload()`.
- Interceptor: `Authorization: Bearer` só para `apiUrl`; 401 limpa o token e volta para `/`.
- Guard: token existe, é válido (`exp`) e, opcionalmente, `route.data.role`.
- A tela de login remove o token ao abrir.

### Armadilhas (web)
- Ids são `number`. Cliente do romaneio é achatado (`clientName`…), não `client`.
- Services usam `environment.apiUrl` (de `core/services/environment`).
- `<input type="number">` precisa de `type` estático, senão o valor vira string e o backend rejeita.
- `loadDate`/`issueDate` em ISO UTC: exibir com `date: 'dd/MM/yyyy' : 'UTC'`; no `<input type="date">` usar `slice(0, 10)`.
- "Hoje" em America/Sao_Paulo: `new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(new Date())`.
- Não existe endpoint por romaneio: editar romaneio é `PATCH` da carga com a lista completa (`toDeliveryDto`).
- `CargoDetail`: toda atualização local passa por `setCargo` (incrementa `cargoVersion`, que descarta respostas de polling defasadas).
- Erros do backend: `error.error.message` (string ou array); usar `httpErrorMessage`.
- `PATCH` de clients e company: campo vazio vai como `null`. Documento/CNPJ/CEP: só dígitos.
- Edição de usuário: senha vazia = manter; não enviar `password`.
- SweetAlert2 renderiza `title` como HTML: escapar texto de usuário. Cores do `alertConfirm` são fixas.
- Legado do mock, não usar: `CargoService` (`cargo-registration.service`), `types/cargo-registration`, `shared/utils/delivery-progress`.

## App Android (`com.carga_gestor.wms_mobile`)

### Visão geral
- Kotlin, Jetpack Compose (Material 3), Hilt, Retrofit com Gson. Base URL `http://<host>:3004/api`.
- Escopo: login, listar cargas e bipar volumes por **câmera**. Não expede, reabre nem edita cargas.

### Estrutura
- `data/api/ApiService`: interface Retrofit (`suspend`).
- `data/model/`: `CargoSummary`, `CargoDetail`, `DeliveryDetail`, `DeliveryItemDetail`, `ScanRequest`, `ScanResponse`, `ScanVolume`, `ScanLog`, `PaginatedResponse`, enums (`CargoStatus`, `ScanResult`, `ScanReason`).
- `data/repository/`: `AuthRepository` (login, token, logout), `CargoRepository` (cargas e scans).
- `util/`: `Resource`, `NetworkErrorHandler`, `JwtDecoder`, `TokenManager`.
- `ui/navigation/`: `ScreenRoutes`, `buildNavGraph`.
- `ui/theme/`: `Color`, `Theme`, `Type`, `ThemeManager`.
- `ui/screens/login/`: `LoginScreen`, `LoginViewModel`. `ui/screens/cargolist/`: `CargoListScreen`, `CargoListViewModel`.

### Camadas
- Screen (Composable) observa `uiState` com `collectAsStateWithLifecycle` e dispara ações no ViewModel.
- ViewModel (Hilt) guarda um `MutableStateFlow<UiState>`; o carregamento é controlado por flags no estado (`isLoading`, `isLoadingMore`).
- Repository usa `safeCall`: executa a chamada e devolve `Resource.Success(data)` ou `Resource.Error(message)`; repassa `CancellationException`.
- `Resource`: `Success(data)`, `Error(message, code, throwable)`, `Loading` (sem uso).
- `NetworkErrorHandler` converte exceção em mensagem pt-BR: 400 "Dados inválidos: ...", 401 fixa, 403, 404 e 409 com o `message` do corpo (?), 500, demais "Erro <code>"; falhas de rede (host, conexão, timeout). O `message` do corpo pode ser string ou array.
- Token enviado em `Authorization: Bearer` por interceptor do OkHttp (?).

### Fluxo
1. `login`: ao abrir, `checkSavedToken()` (token salvo e não expirado, via `JwtDecoder`) leva direto a `main`. No login manual: `POST /users/login`, decodifica o JWT (`userId`, `username`, `role`), salva token, username e role e vai a `main`. Erro vira snackbar.
2. `main`: lista de cargas; tocar numa carga navega para `scan/{cargoId}`.
3. Sair: `AuthRepository.logout()` limpa o token e depois navega para `login` com `popUpTo(main) { inclusive }`.
4. Validação do login: usuário e senha vazios são inválidos; o erro aparece ao sair do campo ou ao enviar.

### Lista de cargas
- Filtros por `createdAt` (`createdFrom`/`createdTo`, `YYYY-MM-DD`), com datas em America/Sao_Paulo (`LocalDate.now(ZoneId)`):
  - Hoje: hoje → hoje.
  - Esta semana (padrão): segunda-feira anterior ou igual a hoje → hoje (?).
  - Este mês: dia 1 → hoje.
  - Data início / data fim: abrem `DatePicker` e mudam o filtro para `CUSTOM`. Início > fim mostra snackbar e não recarrega.
- `reload()` cancela a carga em andamento e volta à página 1. `loadMore()` pede `page + 1` quando faltam até 3 itens para o fim da lista, sem carga em andamento e com `page < totalPages`; os resultados são mesclados com `distinctBy { id }`. Página de 20.
- Aparecem todas as cargas, inclusive `DEPARTED`. Card: `loadOrder`, badge (`OPEN` Aberta, `LOADING` Carregando, `DEPARTED` Expedida), motorista · caminhão, `loadDate`, número de romaneios e barra `loadedVolumes/totalVolumes`.

### Bipagem (a implementar)
- A câmera lê o `Volume.code` (`{cargoId}-{sequence}-{itemId}-{n}`). Biblioteca de leitura e formato do código: (?).
- `CargoRepository.scan(code, cargoId)` chama `POST /scans` com o header `x-device-id` = `"$MODEL ($ANDROID_ID)"` (até 100 caracteres).
- A resposta é 200 mesmo quando recusa: o feedback vem de `result` (`OK` carregado, `WARNING` já carregado, `ERROR` com `reason`) e de `message`. 404 significa carga inexistente.
- O progresso e o status da tela vêm da própria resposta (`totalVolumes`, `loadedVolumes`, `cargoStatus`), sem recarregar a carga.
- Desfazer: `CargoRepository.undoScan(code, cargoId)` com o `code` da última bipagem `OK` (a resposta não traz id de `ScanLog`). Erros 404/409 chegam como `Resource.Error`.
- Carga `DEPARTED` recusa a bipagem com `CARGO_DEPARTED`.

### Tema
- Tokens do web em `Color.kt`, mapeados para `lightColorScheme`/`darkColorScheme` em `Theme.kt`. Tokens sem equivalente no Material 3 ficam em `MaterialTheme.extraColors` (`success`, `warning`, `primarySubtle`, `bgCard`, `inputBg`, `printBg`, `printInk`…).
- Cor dinâmica (Android 12+) desligada, para manter a paleta. Shapes: 4 dp (input, card) e 12 dp (badge). Botão primário: texto `#FFFFFF` nos dois temas.
- `ThemeManager`: `override` nulo = segue o sistema; `set(dark)` persiste em `SharedPreferences`. `WmsmobileTheme(darkTheme: Boolean? = null)`. O toggle fica na tela de login.

### Armadilhas (Android)
- O Gson ignora a nulidade do Kotlin: campo que o backend pode omitir deve ser `?`. Os itens do romaneio não trazem `volumes`; `weight` é `Double?`.
- `loadDate`/`issueDate` chegam em ISO UTC: exibir `take(10)` em `dd/MM/yyyy`, sem converter fuso.
- `java.time` exige `minSdk` 26 ou desugaring. O `DatePicker` devolve milissegundos em UTC: converter com `ZoneOffset.UTC`.
- O scroll da tela de login com teclado depende de `adjustResize` no Manifest e de `enableEdgeToEdge()` (?).
- `@SuppressLint("HardwareIds")` não vale em propriedade `by lazy`: fica na função que lê o `ANDROID_ID`.
- Dois contratos que mudaram: o undo recebe `{ code, cargoId }` (não `scanLogId`/`reason`) e `GET /scans` filtra por `createdFrom`/`createdTo`.

## Pendências

### Concluídas
- [x] Filtros de período e botões "Esta semana"/"Este mês" no `CargoOverview`
- [x] Rota `/configuracoes` e página Settings (`CompanyForm` + `UsersList`)
- [x] Dashboard com `SummaryService`
- [x] Rotas 404 e offline (`NotFound`, `OfflineComponent`)
- [x] Validação `createdFrom > createdTo` no frontend e no backend (400)
- [x] Índices no schema Prisma
- [x] `totalVolumes`/`loadedVolumes` por romaneio e item no backend; `?` removidos dos types do frontend
- [x] Soft delete de usuário; backend impede o usuário de se desativar
- [x] Tela de licença
- [x] Filtros `status`, `search` e `loadDate` e modo "todas as datas" no `CargoOverview`
- [x] CSS: `avatar-gradient`, `nav-active`, `bg-grid`, `--color-bg-sidebar`
- [x] Decisão sobre o `ScanDelivery` / rota `conferencia/...`
- [x] Android: tema, login, repositórios, lista de cargas com filtros e `x-device-id`

### Em aberto (Android)
- [ ] **Tela de bipagem por câmera** (`scan/{cargoId}`): leitura, feedback por `result`/`reason`, progresso e desfazer a última bipagem
- [ ] **Confirmar que a etiqueta (`PackingLabel`) imprime código de barras ou QR real do `Volume.code`** (a classe `.barcode` do `styles.css` é só um desenho em CSS)
- [ ] **Limpar o `ApiService`**: remover `departCargo` e `reopenCargo`; `getCompany()` retorna `User` (tipo errado)
- [ ] **Remover código sem uso**: `MainPlaceholderScreen`, a sealed `Screen` e `CARGO_LIST`
- [ ] **Rotas `cargo_detail` e `settings`**: ainda são placeholders; implementar ou remover

Backend e frontend web: sem pendências.