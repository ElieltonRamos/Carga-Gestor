# nsis-installer-windows

Gerador do instalador Windows do WMS Server.

## Arquivos necessários

Todos os arquivos abaixo devem estar nesta pasta antes do build:

| Arquivo                         | Descrição                                                                             |
| ------------------------------- | ------------------------------------------------------------------------------------- |
| `wms-server.nsi`                | Script do instalador NSIS                                                             |
| `build.sh`                      | Script de build                                                                       |
| `pm2-launcher.js`               | Launcher que sobe o app via PM2 (executado pelo serviço NSSM)                         |
| `nssm.exe`                      | Gerenciador de serviço Windows                                                        |
| `wms-server-icon.ico`           | Ícone do instalador                                                                   |
| `LICENSE.txt`                   | Licença exibida durante a instalação (UTF-8 com BOM)                                  |
| `node-v24-x64.msi`              | Instalador do Node.js 24 (Windows x64), usado se o Node da máquina for anterior à v24 |
| `server.js`                     | Bundle do servidor (copiado pelo `npm run installer:win`)                             |
| `.env`                          | Variáveis de ambiente (copiado pelo `npm run installer:win`)                          |
| `public/dist/frontend/browser/` | Build do frontend Angular (copiado pelo `npm run installer:win`)                      |

## Dependências

NSIS na máquina Linux/WSL que executa o build:

```bash
sudo apt install nsis
```

O frontend deve estar na pasta `../frontend` em relação ao backend (usada pelos scripts `build:frontend` e `copy:frontend`).

## Build

### Via npm (recomendado)

Na raiz do backend:

```bash
npm run installer:win
```

O hook `preinstaller:win` roda antes: `nest build` → `build:frontend` → `copy:frontend`. Em seguida o `installer:win` gera o bundle (`build:bundle`), copia `server.js`, `.env` e `public` para esta pasta e executa o `build.sh`.

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
