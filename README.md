# Waguri_Apidb — `/api/maker/wacall` (Fake Call iOS / WhatsApp)

Rota maker para o **Okarun.js** que gera imagem de "chamada falsa" estilo tela de chamada do WhatsApp iOS.

## O que tem aqui

| Arquivo | Descrição |
|---|---|
| `wacall_inline.js` | Trecho pronto para **colar direto** dentro do seu `okarun.js` (modo recomendado). |
| `wacall_route.js`  | Versão modular, usa `require('./wacall_route.js')(app, { helpers })`. |
| `assets/wacall_meme/template_call.png` | Template de fundo (889x1770) — já baixado, sem precisar de internet na 1ª req. |
| `assets/wacall_meme/NotoEmoji.ttf` | Fonte Noto Emoji (para emojis 🔥 coloridos no nome). |
| `WACALL_COMO_USAR.md` | Guia de instalação e uso. |

## Quick start

1. Copie a pasta `assets/wacall_meme/` para a pasta do seu bot (no mesmo diretório do `okarun.js`).
2. Abra `okarun.js` e cole o conteúdo de `wacall_inline.js` em um lugar **depois** dessas declarações:
   - `const { createCanvas, loadImage } = require('canvas')`
   - `async function upload2(...)`
   - `async function getBuffer(url)`
   - `let randomName = ...`
   - `function delFile(file)`
   - `const criador = process.env.CRIADOR`
   - `const ytTmpDir = ...`
   - Os imports de `existsApiKey, noMoreRequests, registerApikeyRQ, sendResJsonNoMoreRequests, sendPageNoMoreRequests`
3. Reinicie o servidor.

## Uso

```
GET /api/maker/wacall?apikey=SUAKEY&nome=João%20Silva%20🔥&duracao=00:42&avatar=https://...foto.jpg
```

Parâmetro opcional `&enviar=file` retorna o PNG direto (em vez de JSON com URL).

Resposta padrão:

```json
{
  "status": true,
  "criador": "...",
  "resultado": {
    "imagem": "https://...url-da-imagem.png",
    "nome": "João Silva 🔥",
    "duracao": "00:42"
  }
}
```

## Autor

- Feito para o **Okarun.js** (Eduh Dev / @borutovk7)
- Usa `canvas` (node-canvas) — **não** precisa de `@napi-rs/canvas`.
- Protegido por apikey no mesmo padrão das outras rotas `/api/maker/*`.
