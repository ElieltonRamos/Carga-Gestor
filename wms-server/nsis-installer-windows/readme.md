# nsis-installer-windows

Gerador do instalador Windows do WMS Server.

## Arquivos necessários

Todos os arquivos abaixo devem estar nesta pasta antes do build:

| Arquivo                        | Descrição                                                                             |
| ------------------------------ | ------------------------------------------------------------------------------------- |
| `wms-server.nsi`               | Script do instalador NSIS                                                             |
| `build.sh`                     | Script de build                                                                       |
| `pm2-launcher.js`              | Launcher que sobe o app via PM2 (executado pelo serviço NSSM)                         |
| `nssm.exe`                     | Gerenciador de serviço Windows                                                        |
| `wms-server-icon.ico`          | Ícone do instalador                                                                   |
| `LICENSE.txt`                  | Licença exibida durante a instalação (UTF-8 com BOM)                                  |
| `node-v24-x64.msi`             | Instalador do Node.js 24 (Windows x64), usado se o Node da máquina for anterior à v24 |
| `server.js`                    | Bundle do servidor (copiado pelo `npm run installer:win`)                             |
| `.env`                         | Variáveis de ambiente (copiado pelo `npm run installer:win`)                          |
| `public/dist/wms-app/browser/` | Build do frontend Angular (copiado pelo `npm run installer:win`)                      |

## Dependências

NSIS na máquina Linux/WSL que executa o build:

```bash
sudo apt install nsis
```

O frontend deve estar na pasta `../wms-app` em relação ao backend (usada pelos scripts `build:wms-app` e `copy:wms-app`).

## Build

### Via npm (recomendado)

Na raiz do backend:

```bash
npm run installer:win
```

O hook `preinstaller:win` roda antes: `nest build` → `build:wms-app` → `copy:wms-app`. Em seguida o `installer:win` gera o bundle (`build:bundle`), copia `server.js`, `.env` e `public` para esta pasta e executa o `build.sh`.

### Manual

```bash
chmod +x build.sh   # apenas na primeira vez
./build.sh
```

O arquivo gerado é `WMSServer-Setup-<versão>.exe`, com a versão lida do `package.json`.

## O que o instalador faz

- Copia os arquivos para `C:\wms-server\`
- Instala o Node.js 24 se não houver Node v24 ou superior
- Instala o PM2 globalmente se ainda não existir (requer internet)
- Registra o serviço `WMSServer` via NSSM, com início automático, executando `pm2-launcher.js`
- Usa `PM2_HOME=C:\wms-server\pm2-home`
- Cria `logs\` com rotação a cada 5 MB (`service.log` e `error.log`)
- Registra o desinstalador no Windows (Configurações → Aplicativos)

## Logs

- Launcher/NSSM: `C:\wms-server\logs\service.log` e `error.log`
- App (PM2):

```bat
set PM2_HOME=C:\wms-server\pm2-home && pm2 logs wms-server
```

## Desinstalação

Configurações → Aplicativos → WMS Server → Desinstalar.

O desinstalador para o serviço, encerra o PM2, remove o serviço e apaga os arquivos instalados, `logs`, `pm2-home` e `public`. Node.js e PM2 não são removidos.


## Replicando o instalador para outro projeto

Passos para reaproveitar este instalador em outro backend NestJS (com ou sem front servido pelo backend).

### 1. Copiar a pasta

Copie `nsis-installer-windows/` para a raiz do novo backend. Os binários `nssm.exe` e `node-v24-x64.msi` podem ser reaproveitados sem alteração.

### 2. Definir os nomes do novo projeto

Escolha os valores abaixo e use os mesmos em todos os arquivos. Para dois produtos coexistirem na mesma máquina, nenhum deles pode repetir o de outro produto.

| Item | Exemplo (WMS) |
|---|---|
| Nome da aplicação | `WMS Server` |
| Nome do serviço Windows | `WMSServer` |
| Nome do app no PM2 | `wms-server` |
| Diretório de instalação | `C:\wms-server` |
| PM2_HOME | `C:\wms-server\pm2-home` |
| Publisher | `Grupo-Sae` |
| Ícone | `wms-server-icon.ico` |
| Porta | `3004` |

### 3. Arquivos a alterar

**`<projeto>.nsi`** (renomeie o arquivo):
- `APP_NAME`, `APP_PUBLISHER`, `SERVICE_NAME`
- `OutFile`
- `InstallDir` e o `StrCpy $INSTDIR` dentro do `.onInit` (os dois lugares)
- `MUI_ICON`, `MUI_UNICON`, `File "<icone>.ico"`, `DisplayIcon` e o `Delete` do ícone na seção `Uninstall`
- Texto do `Description` do serviço

**`pm2-launcher.js`**, apenas o `CONFIG`:
```javascript
appName: 'novo-app',
pm2Home: process.env.PM2_HOME ?? (OS === 'WINDOWS' ? 'C:\\novo-app\\pm2-home' : path.join(os.homedir(), '.pm2')),
```

**`build.sh`**:
- Título do cabeçalho e nome do `.nsi` (na lista `REQUIRED_FILES` e no `makensis`)
- Nome do ícone na lista `REQUIRED_FILES`
- Caminho do `index.html` do front (veja o passo 5)
- Nome do `.exe` na mensagem final

**`LICENSE.txt`**: troque o produto, o titular e o contato. Salve como **UTF-8 com BOM**, senão os acentos quebram no NSIS Unicode.

### 4. Scripts do `package.json` do backend

```json
"build:bundle": "npx esbuild dist/src/main.js --bundle --platform=node --target=node18 --outfile=release/server.js --minify --external:@nestjs/microservices --external:@nestjs/websockets --external:class-transformer/storage --external:@fastify/static",
"build:<front>": "cd ../<pasta-do-front> && npm run build",
"copy:<front>": "rm -rf public/dist/<projeto-angular>/browser && mkdir -p public/dist/<projeto-angular>/browser && cp -r ../<pasta-do-front>/dist/<projeto-angular>/browser/. public/dist/<projeto-angular>/browser/",
"preinstaller:win": "npm run build && npm run build:<front> && npm run copy:<front>",
"installer:win": "npm run build:bundle && cp release/server.js nsis-installer-windows/server.js && cp .env nsis-installer-windows/.env && rm -rf nsis-installer-windows/public && cp -r public nsis-installer-windows/public && cd nsis-installer-windows && bash build.sh"
```

- `<projeto-angular>` é o nome em `ls <pasta-do-front>/dist`.
- O `rm -rf nsis-installer-windows/public` evita que o `cp -r` crie `public/public` a partir da segunda execução.
- Se o esbuild acusar `Could not resolve "<pacote>"` de um módulo opcional do Nest, adicione `--external:<pacote>` ao `build:bundle`.
- Se o projeto não tem front, remova os scripts `build:<front>` e `copy:<front>`, tire-os do `preinstaller:win`, remova o `cp -r public` do `installer:win` e o `File /r "public\*"` do `.nsi`, e tire a verificação do `index.html` do `build.sh`.

### 5. Alinhar o caminho do front com o backend

O mesmo caminho precisa aparecer em três lugares:

1. Destino do `copy:<front>` no `package.json`
2. Verificação do `index.html` no `build.sh`
3. `rootPath` do `ServeStaticModule` no `app.module.ts`:

```typescript
ServeStaticModule.forRoot({
  rootPath: join(process.cwd(), 'public', 'dist', '<projeto-angular>', 'browser'),
  exclude: ['/api/{*splat}', '/swagger/{*splat}'],
}),
```

O `process.cwd()` funciona em produção porque o `pm2-launcher.js` define `cwd` como a pasta do `server.js`. Se os caminhos divergirem, o servidor sobe normalmente, mas a raiz `/` não serve nada.

### 6. Conferir antes do primeiro build

- `.env` na raiz do backend com `PORT`, `JWT_SECRET` e as variáveis de banco
- `main.ts` com `app.setGlobalPrefix('api')`, que o `exclude` acima espera
- Pasta `nsis-installer-windows/` com `build.sh`, `<projeto>.nsi`, `pm2-launcher.js`, `nssm.exe`, `<icone>.ico`, `LICENSE.txt` e `node-v24-x64.msi`
- `nsis` instalado (`sudo apt install nsis`)

Depois, na raiz do backend:

```bash
npm run installer:win
```