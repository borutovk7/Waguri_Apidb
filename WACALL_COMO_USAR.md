# Rota `/api/maker/wacall` — Fake Call iOS (WhatsApp)

Adicionei a rota de fake call estilo WhatsApp iOS ao projeto Okarun, protegida por **apikey**, usando `canvas` (node-canvas, NÃO `@napi-rs/canvas`), no mesmo padrão das outras rotas do projeto.

---

## Arquivos gerados

| Arquivo | Descrição |
|---|---|
| `wacall_inline.js` | ✅ **Trecho pronto para COLAR DIRETO no okarun.js** (modo recomendado, já que o projeto é monolítico). Basta copiar o bloco `{ ... }` e colar no okarun.js. |
| `wacall_route.js`  | Versão modular (arquivo separado) que é chamada via `require('./wacall_route.js')(app, { ...helpers })`. |
| `assets/wacall_meme/template_call.png` | Template de fundo (cache local). |
| `assets/wacall_meme/NotoEmoji.ttf` | Fonte Noto Emoji (backup, caso não exista em `Scrapers/fontes/`). |
| `test_wacall.js` | Teste standalone que gera imagens de exemplo. |
| `test_wacall_out*.png` | Imagens de exemplo geradas. |

---

## Como instalar (jeito mais fácil — colar o inline)

1. Abra o arquivo **`okarun.js`** (em `/home/container/okarun.js` no servidor).
2. Procure um lugar **depois** de todas essas declarações (elas já existem no okarun):
   - `const { createCanvas, loadImage } = require('canvas')` (linha ~383)
   - `async function upload2(...)` (linha ~991)
   - `async function getBuffer(url) { ... }` (linha ~1038)
   - `let randomName = (ext) => uuid().split('-')[0] + (ext ? ext : '')` (linha ~1481)
   - `function delFile(file) { ... }` (linha ~1468)
   - `registerFont` das fontes (linhas ~1478-1479)
   - `const { ... existsApiKey, noMoreRequests, registerApikeyRQ, sendResJsonNoMoreRequests, sendPageNoMoreRequests ... } = require('./database/...')` (linha ~509)
   - `const criador = process.env.CRIADOR` (linha ~42)
   - `const ytTmpDir = require('path').join(process.cwd(), 'tmp')` (linha ~7)
3. Cole **todo o conteúdo** de `wacall_inline.js` (a parte marcada entre `// ---------- Início do trecho` e `// ---------- Fim do trecho`).
4. Salve e reinicie o servidor.

## Como instalar (modo modular)

1. Coloque o arquivo `wacall_route.js` na mesma pasta do `okarun.js`.
2. Depois de todas as declarações de helpers, cole:

```js
require('./wacall_route.js')(app, {
  upload2,
  getBuffer,
  randomName,
  delFile,
  existsApiKey,
  noMoreRequests,
  registerApikeyRQ,
  sendResJsonNoMoreRequests,
  sendPageNoMoreRequests,
  criador,
  tmpDir: ytTmpDir
});
```

3. Crie a pasta `assets/wacall_meme/` e coloque o `template_call.png` e opcionalmente o `NotoEmoji.ttf` dentro. O código também baixa o template automaticamente na primeira vez.

---

## Uso da rota

### Endpoint

```
GET /api/maker/wacall
```

### Parâmetros (query string)

| Parâmetro | Obrigatório | Descrição |
|---|---|---|
| `apikey`  | ✅ sim | Sua chave de API do Okarun (como em todas as rotas `/api/maker/...`). |
| `nome`    | ✅ sim | Nome do contato (aceita emojis 🔥). Alias: `name`. |
| `duracao` | ✅ sim | Texto de status/duração (ex: `00:42`, `Chamada de vídeo…`, `Tocando…`). Alias: `duration`. |
| `avatar`  | ✅ sim | URL direta da foto de perfil (JPG/PNG). Alias: `foto`. |
| `enviar`  | ❌ não | Se `file`, `1`, `arquivo`, `buffer` ou `raw` → retorna o PNG direto na resposta. Se omitido (padrão `json`), faz upload via `upload2()` e retorna JSON com a URL da imagem. |

### Exemplos

#### 1) Retorno JSON (padrão, com URL da imagem enviada para o okarunsite):

```
/api/maker/wacall?apikey=SUAKEY&nome=João%20Silva%20🔥&duracao=00:42&avatar=https://exemplo.com/foto.jpg
```

Resposta:
```json
{
  "status": true,
  "criador": "EDUHZIN DEV",
  "resultado": {
    "imagem": "https://okarunsite.com/arquivos/xxxxx.png",
    "nome": "João Silva 🔥",
    "duracao": "00:42"
  }
}
```

#### 2) Retornar imagem direto (como attachment):

```
/api/maker/wacall?apikey=SUAKEY&nome=João&duracao=00:42&avatar=https://exemplo.com/foto.jpg&enviar=file
```

Retorna `image/png` direto (útil para bots/preview no navegador).

---

## Comportamento

- **Template**: 889x1770, cacheado em `assets/wacall_meme/template_call.png` (baixa automaticamente na 1ª requisição).
- **Avatar**: recortado em círculo centralizado (cover crop, não distorce), raio = 22% da largura do canvas, posição vertical ~50% da altura.
- **Nome**: fonte em **negrito branco (#FFFFFF)**, tamanho base 42px escalado, centralizado no topo (logo abaixo do ícone de seta/expandir). Aceita até 2 linhas; reduz a fonte automaticamente se necessário, trunca com `…` no final.
- **Duração**: fonte regular cinza (#C5C5C5), tamanho base 35px, logo abaixo do nome (sempre 1 linha, truncado).
- **Emoji**: usa a fonte **Noto Emoji** já registrada no okarun (`Scrapers/fontes/NotoEmoji.ttf`), com fallback para DejaVu Sans/Arial/sans-serif.
- **Saída**: PNG. Se `upload2` falhar, cai automaticamente para `sendFile` (retorna a imagem direto), então a rota **sempre** responde com sucesso mesmo sem internet de upload.
- **Limites de texto**: nome máximo ~68% da largura da tela (para não bater nos ícones de seta/expandir e adicionar-contato).
- **Proteção por apikey**: mesma checagem padrão (`existsApiKey`, `noMoreRequests`, `registerApikeyRQ`), e consome 1 request da key.

---

## Exemplos visuais gerados nos testes

- `test_wacall_out.png` — nome curto simples.
- `test_wacall_out2.png` — nome com emojis 🔥 e texto longo de duração.
- `test_wacall_out3.png` — nome longo com quebra automática em 2 linhas.
- `test_wacall_out4.png` — palavra gigante sem espaços (quebra por caractere com `…`).
