# CargaGestor

Sistema operacional WMS focado na gestão de expedição e conferência de carregamentos em depósito.

### 🚀 Funcionalidades Principais

- **Cadastro de Carga (Wizard):** Criação sequencial de entregas com geração de romaneios, peso, volume e códigos.
- **Emissão de Documentos:** Visualização e impressão de romaneios detalhados e etiquetas operacionais com código de barras.
- **Conferência Mobile:** Dashboard para bipagem e validação de itens no carregamento em tempo real com indicadores de status.

# WMS: instruções para IA

Gestão de cargas, romaneios e conferência de carregamento.

- Backend: NestJS + Prisma (MySQL/MariaDB). Prefixo `/api`, Swagger em `/swagger` (porta 3004).
- Frontend web: Angular. Acompanha e edita cargas.
- App Android (outro projeto): faz a bipagem real (`POST /api/scans`). O web só monitora.
- `(?)` = caminho não confirmado.

## Como trabalhar

- Responder em pt-BR, objetivo, focado em código. Não gerar documentação.
- Não assumir campos ou tipos: conferir DTO/schema. Na dúvida, perguntar.
- Uma pergunta por vez.

## Backend

- `prisma/schema.prisma`: client gerado em `generated/prisma`.
- `src/core/`: `database/prisma.service`, `decorators/current-user.decorator`, `utils/` (`validation`, `pagination-query.dto`, `paginated-response`).
- `src/<módulos>/cargos/` (?): `cargos.controller`, `cargos.service`, `cargo-status.service` (depart/reopen), `cargo-lock`, `dto/`.
- Outros módulos (?): `users`, `license`, `company`, `clients`, `scans`.
- Padrões: DTO com class-validator + `ValidationMessages`; `Logger` com `actor=`; `rethrow` converte P2002 em 409; transações com timeout de 30 s; `lockCargoRow` antes de editar.
- `buildDetail` monta a resposta da carga (totais de volumes por carga, romaneio e item).

## Modelo de dados

`Cargo` 1:N `Delivery` (romaneio, com snapshot achatado do cliente: `clientName`, `clientCity`…) 1:N `DeliveryItem` 1:N `Volume`.

- `Volume.code` (único) = `{cargoId}-{sequence}-{itemId}-{n}`. É o código de barras da etiqueta e o que o `/scans` recebe.
- Outros: `ScanLog` (result `OK|ERROR|WARNING|UNDO`, reason `NOT_FOUND|ALREADY_LOADED|WRONG_CARGO|CARGO_DEPARTED`), `User` (role `ADMIN|OPERATOR|CHECKER`), `Client`, `Company` (licença).
- `Cargo.status`: `OPEN | LOADING | DEPARTED`.

## API

- `POST /users/login`; `/users` (CRUD, DELETE desativa); `/company` (GET, PATCH); `/clients` (CRUD); `/license/{usage-report,status,validate,info}`.
- `/cargos`: `GET` (paginado), `POST`, `GET|PATCH|DELETE /{id}`, `POST /{id}/depart`, `POST /{id}/reopen`.
- `/scans`: `POST`, `GET`, `POST /undo`.
- Paginação: `page` (1), `limit` (10, máx 100). Resposta `{ data, total, page, limit, totalPages }`.
- `GET /cargos`: sem `createdFrom`/`createdTo`, filtra o dia atual por `createdAt` (America/Sao_Paulo). Filtros: `status`, `search`, `loadDate`.

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

Angular standalone, `inject()`, signals/computed, control flow (`@if/@for/@switch`), reactive forms, Tailwind com tokens de tema (light/dark), ngx-toastr, locale pt-BR.

- `app.routes.ts`, `app.config.ts`.
- `core/`: `interceptors/auth.interceptor`, `guards/auth.guard`, `services/auth.service`, `services/environment` (`apiUrl`), `types/paginated-response`.
- `shared/`: `utils/volume-progress`, `utils/delivery-payload` (`toDeliveryDto`), `toastr/notification.service`.
- `features/cargo-registration/`: `pages/cargo-registration`, `services/cargos.service` (**service da API**), `types/cargo` (**tipos da API**).
- Demais features: `login`, `cargo-overview`, `cargo-detail`, `delivery-detail`, `packing-label` (etiqueta), `scan-check`.

| Rota                                   | Componente          | Função                                                                                         |
| -------------------------------------- | ------------------- | ---------------------------------------------------------------------------------------------- |
| `''`                                   | `Login`             | autenticação                                                                                   |
| `cargas`                               | `CargoOverview`     | lista paginada, filtro por data de criação                                                     |
| `cargas/novo`                          | `CargoRegistration` | wizard; envia tudo em um `POST` no último passo                                                |
| `cargas/:cargoId`                      | `CargoDetail`       | status, expedir/reabrir/excluir, editar cabeçalho, adicionar/remover romaneio, polling de 10 s |
| `cargas/:cargoId/entregas/:deliveryId` | `DeliveryDetail`    | edita romaneio, cliente e itens; imprime romaneio e etiquetas                                  |
| `conferencia/:cargoId/:deliveryId`     | `ScanDelivery`      | só validação; não integrado (bipagem é no Android)                                             |

Todas, exceto `''`, usam `canActivate: [authGuard]`.

### Auth

- JWT em `localStorage['token']`, payload `{ userId, username, role, iat, exp }`.
- Interceptor: `Authorization: Bearer` só para `apiUrl`; 401 limpa o token e volta para `/`.
- Guard: token existe, é válido (`exp`) e, opcionalmente, `route.data.role`.

### Armadilhas

- Ids são `number`. Cliente do romaneio é achatado (`clientName`…), não `client`.
- `<input type="number">` precisa de `type` estático, senão o valor vira string e o backend rejeita.
- `loadDate`/`issueDate` vêm em ISO UTC: exibir com `date: 'dd/MM/yyyy' : 'UTC'`; no `<input type="date">` usar `slice(0, 10)`.
- Não existe endpoint por romaneio: editar romaneio é `PATCH` da carga com a lista completa (`toDeliveryDto`).
- `CargoDetail`: toda atualização local passa por `setCargo` (incrementa `cargoVersion`, que descarta respostas de polling defasadas).
- Erros do backend: `error.error.message` (string ou array).
- Legado do mock, não usar: `CargoService` (`cargo-registration.service`), `types/cargo-registration`, `shared/utils/delivery-progress`.

## Pendências

- Telas inexistentes: usuários, empresa, clientes, licença.
- `totalVolumes`/`loadedVolumes` por romaneio e item no `GET /cargos/{id}`: confirmar no backend; depois remover o `?` em `types/cargo`.
- Listagem sem filtros de busca/status nem modo "todas as datas" (a API não tem "sem filtro de criação").
- Decidir se `ScanDelivery` e a rota `conferencia/...` saem do projeto.
