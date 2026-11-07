# Configuração de impressão (Elgin L42Pro, etiqueta 100 × 50 mm)

O app imprime etiquetas de **100 × 50 mm** (`@page { size: 100mm 50mm; margin: 0 }`). A impressora precisa ter um papel com essa mesma medida e o sensor calibrado.

## Requisitos

- Impressora Elgin L42Pro com driver instalado (Windows)
- Rolo de etiquetas 100 × 50 mm pré-moldadas (com espaço/gap entre etiquetas)

## 1. Criar o papel de etiquetas no driver

1. Painel de Controle → Dispositivos e Impressoras → botão direito em **ELGIN L42Pro** → **Preferências de impressão**.
2. Aba **Configuração de página** → em "Papel de etiquetas", clique em **Novo...**.
3. Preencha:

| Campo                              | Valor                                                                                                              |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| Nome                               | `Etiqueta 100x50`                                                                                                  |
| Tipo                               | Etiquetas cortadas com molde                                                                                       |
| Largura                            | `100.0 mm`                                                                                                         |
| Altura                             | `50.0 mm`                                                                                                          |
| Cartela exposta (Esquerda/Direita) | `0.0 mm` se o liner tem a mesma largura da etiqueta; se sobra papel nas laterais, usar a sobra medida de cada lado |

4. **OK**, selecione `Etiqueta 100x50` no campo Nome, **Aplicar** e **OK**.
5. Orientação: **Retrato**. Se a impressão sair rotacionada, trocar para **Paisagem**.

## 2. Calibrar o sensor de etiquetas

Sempre que criar/trocar o papel ou trocar o rolo:

1. Com as etiquetas instaladas, ligue a impressora e aguarde inicializar (somente o LED verde aceso).
2. Mantenha o botão **FEED** pressionado até o LED verde piscar **2 vezes** e solte.
3. Algumas etiquetas avançam sozinhas para a impressora reconhecer a altura.

Piscadas do FEED (manual L42Pro): 1 = auto teste (imprime configurações), 2 = calibração.

## 3. Diálogo de impressão do app

- Impressora: **ELGIN L42Pro**
- Margens: **Nenhuma**
- Escala: **100%**

## 4. Teste

Imprima **uma** etiqueta. Se o conteúdo sair alinhado dentro dela, está correto.

## Problemas comuns

| Sintoma                                                           | Causa provável                               | Ação                                                                 |
| ----------------------------------------------------------------- | -------------------------------------------- | -------------------------------------------------------------------- |
| Conteúdo deslocado (cabeçalho em uma etiqueta, resto na seguinte) | Sensor não calibrado para o papel            | Refazer a calibração (item 2)                                        |
| Deslocamento aumenta a cada etiqueta                              | Medida do papel diferente da etiqueta física | Medir a etiqueta com régua e corrigir largura/altura no papel criado |
| Deslocamento vertical                                             | Margem ou escala errada no diálogo           | Margens "Nenhuma" e escala 100%                                      |
| Saída rotacionada                                                 | Orientação                                   | Alternar Retrato/Paisagem                                            |
