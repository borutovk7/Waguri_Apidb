/**
 * ============================================================
 *  ROTA /api/maker/wacall — Fake Call estilo WhatsApp (iOS)
 *  Compatível com o projeto Okarun.js (node-canvas + Express)
 * ============================================================
 *
 * PARÂMETROS (query string):
 *   - apikey  (obrigatório)
 *   - nome    (obrigatório)  — nome do contato
 *   - duracao (obrigatório)  — texto de duração ex: "00:42", "Chamada de vídeo…"
 *   - avatar  (obrigatório)  — URL direta da foto de perfil
 *   - enviar  (opcional)     — "file"/"1" retorna imagem direto; padrão = JSON com URL
 *
 * RESPOSTA (padrão okarun):
 *   { status:true, criador, resultado:{ imagem, nome, duracao } }
 *
 * MODO DE USAR 1 (recomendado — arquivo separado):
 *   No okarun.js, depois que todas as variáveis/helpers
 *   (upload2, getBuffer, randomName, delFile, existsApiKey, etc.)
 *   já tiverem sido declaradas, cole:
 *
 *     require('./wacall_route.js')(app, {
 *       upload2, getBuffer, randomName, delFile,
 *       existsApiKey, noMoreRequests, registerApikeyRQ,
 *       sendResJsonNoMoreRequests, sendPageNoMoreRequests,
 *       criador, tmpDir: ytTmpDir
 *     });
 *
 * MODO DE USAR 2 (inline): veja o arquivo wacall_inline.js
 * ============================================================
 */

const path = require('path');
const fs = require('fs');
const { createCanvas, loadImage, registerFont } = require('canvas');

// -------- Configuráveis --------
const BG_URL    = 'https://raw.githubusercontent.com/ryyntwx/allimagerin/refs/heads/main/353dc125-a39c-4d27-9ba5-9ec7dfa6624a.png';
const ASSETS_DIR = path.join(process.cwd(), 'assets', 'wacall_meme');
const BG_LOCAL   = path.join(ASSETS_DIR, 'template_call.png');

// Tenta registrar fontes caso ainda não existam (fallback).
// No okarun.js as fontes já são registradas via registerFont() do ultimate-text-to-image,
// mas aqui fazemos um "register defensivo" para o caso de a rota ser usada standalone.
(function registerFallbackFonts() {
  try { if (!fs.existsSync(ASSETS_DIR)) fs.mkdirSync(ASSETS_DIR, { recursive: true }); } catch (e) {}
  const candidates = [
    { path: path.join(process.cwd(), 'Scrapers/fontes/NotoEmoji.ttf'),      family: 'Noto Emoji' },
    { path: path.join(ASSETS_DIR, 'NotoEmoji.ttf'),                         family: 'Noto Emoji' },
    { path: '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',              family: 'DejaVu Sans' },
    { path: '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf',         family: 'DejaVu Sans Bold' },
  ];
  for (const c of candidates) {
    try {
      if (fs.existsSync(c.path)) registerFont(c.path, { family: c.family });
    } catch (e) { /* ignora */ }
  }
})();

// Baixa/usa cache do template BG
async function getBgBuffer() {
  if (fs.existsSync(BG_LOCAL) && fs.statSync(BG_LOCAL).size > 50000) return fs.readFileSync(BG_LOCAL);
  const axios = require('axios');
  const resp = await axios.get(BG_URL, { responseType: 'arraybuffer', timeout: 20000 });
  const buf = Buffer.from(resp.data);
  fs.writeFileSync(BG_LOCAL, buf);
  return buf;
}

// Desenha avatar em formato circular (cover crop)
function drawCircularAvatar(ctx, img, cx, cy, radius) {
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2, true);
  ctx.closePath();
  ctx.clip();
  const iw = img.width || img.naturalWidth;
  const ih = img.height || img.naturalHeight;
  const ms = Math.min(iw, ih);
  const sx = (iw - ms) / 2;
  const sy = (ih - ms) / 2;
  const d  = radius * 2;
  ctx.drawImage(img, sx, sy, ms, ms, cx - radius, cy - radius, d, d);
  ctx.restore();
}

// Quebra texto em múltiplas linhas centralizadas, com limite configurável de linhas.
// Quebra por palavras; se uma palavra for mais larga que maxWidth, quebra por caractere.
function wrapTextCenter(ctx, text, maxWidth, maxLines = 2) {
  const raw = String(text || '');
  const words = raw.split(/\s+/);
  const lines = [];
  let cur = '';
  for (const w of words) {
    const test = cur ? cur + ' ' + w : w;
    if (ctx.measureText(test).width > maxWidth) {
      if (cur) lines.push(cur);
      // Se a palavra sozinha não cabe na linha, quebra por caractere
      if (ctx.measureText(w).width > maxWidth) {
        let frag = '';
        for (const ch of w) {
          const t2 = frag + ch;
          if (ctx.measureText(t2).width > maxWidth && frag) {
            lines.push(frag);
            frag = ch;
          } else {
            frag = t2;
          }
        }
        cur = frag;
      } else {
        cur = w;
      }
    } else {
      cur = test;
    }
  }
  if (cur) lines.push(cur);
  if (lines.length > maxLines) {
    while (lines.length > maxLines) lines.pop();
    let last = lines[maxLines - 1];
    while (ctx.measureText(last + '…').width > maxWidth && last.length > 1) last = last.slice(0, -1);
    lines[maxLines - 1] = last + '…';
  }
  return lines;
}

module.exports = function registerWacallRoute(app, h) {
  const upload2         = h.upload2;
  const getBuffer       = h.getBuffer;
  const randomName      = h.randomName;
  const delFile         = h.delFile;
  const existsApiKey    = h.existsApiKey;
  const noMoreRequests  = h.noMoreRequests;
  const registerApikeyRQ = h.registerApikeyRQ;
  const sendResJsonNoMoreRequests = h.sendResJsonNoMoreRequests;
  const sendPageNoMoreRequests    = h.sendPageNoMoreRequests;
  const criador         = h.criador;
  const tmpDir          = h.tmpDir || path.join(process.cwd(), 'tmp');
  if (!fs.existsSync(tmpDir)) { try { fs.mkdirSync(tmpDir, { recursive: true }); } catch(e){} }

  app.get('/api/maker/wacall', async (req, res) => {
    const apikey  = req.query.apikey;
    const nome    = String(req.query.nome    || req.query.name     || '').trim();
    const duracao = String(req.query.duracao || req.query.duration || '').trim();
    const avatar  = String(req.query.avatar  || req.query.foto     || '').trim();
    const enviar  = String(req.query.enviar  || req.query.send     || 'json').toLowerCase();

    // ---- checagem de apikey (padrão do okarun) ----
    if (!apikey) return res.json({ status: false, message: '- Cade o parametro apikey?' });
    if (!await existsApiKey(apikey))  return sendPageNoMoreRequests(res);
    if (await noMoreRequests(apikey)) return sendResJsonNoMoreRequests(res);
    await registerApikeyRQ(apikey, req);

    if (!nome)    return res.json({ status: false, message: 'Parâmetro obrigatório: nome' });
    if (!duracao) return res.json({ status: false, message: 'Parâmetro obrigatório: duracao' });
    if (!avatar)  return res.json({ status: false, message: 'Parâmetro obrigatório: avatar (URL da foto)' });

    let tmpFile = null;
    try {
      // 1) Baixar assets em paralelo
      const [bgBuf, avBuf] = await Promise.all([
        getBgBuffer(),
        getBuffer(avatar).catch(() => null),
      ]);
      if (!avBuf) return res.json({ status: false, message: 'Falha ao baixar o avatar (URL inválida?).' });

      const [bgImg, avImg] = await Promise.all([loadImage(bgBuf), loadImage(avBuf)]);

      // 2) Montar canvas
      const canvas = createCanvas(bgImg.width, bgImg.height);
      const ctx = canvas.getContext('2d');
      ctx.drawImage(bgImg, 0, 0, canvas.width, canvas.height);

      const W = canvas.width, H = canvas.height;
      const scale = W / 889; // referência do template base 889x1770

      // Avatar circular (mesma lógica do handler original)
      const ppX      = W / 2;
      const ppY      = H * 0.50;
      const ppRadius = W * 0.22;
      drawCircularAvatar(ctx, avImg, ppX, ppY, ppRadius);

      // Nome
      const nomeSize    = Math.round(42 * scale);
      const duracaoSize = Math.round(35 * scale);
      const nomeBaseY   = Math.round(75  * scale);
      const duracaoBaseY= Math.round(133 * scale);

      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      const nomeFont    = `700 ${nomeSize}px "Noto Emoji", "DejaVu Sans Bold", "DejaVu Sans", "Arial", sans-serif`;
      const duracaoFont = `400 ${duracaoSize}px "Noto Emoji", "DejaVu Sans", "Arial", sans-serif`;

      // Desenhar nome (branco) — reduz fonte automaticamente se o nome for muito longo
      ctx.fillStyle = '#FFFFFF';
      const nomeMaxW = W * 0.68; // deixa margem para não bater nos ícones laterais
      let _nomeSize = nomeSize;
      for (; _nomeSize >= Math.round(22 * scale); _nomeSize -= 2) {
        ctx.font = `700 ${_nomeSize}px "Noto Emoji", "DejaVu Sans Bold", "DejaVu Sans", "Arial", sans-serif`;
        const tentative = wrapTextCenter(ctx, nome, nomeMaxW, 2);
        if (tentative.length <= 2) break;
      }
      ctx.font = `700 ${_nomeSize}px "Noto Emoji", "DejaVu Sans Bold", "DejaVu Sans", "Arial", sans-serif`;
      const nomeLines = wrapTextCenter(ctx, nome, nomeMaxW, 2);
      const lhN = _nomeSize * 1.2;
      const nomeStartY = nomeBaseY + (_nomeSize / 2);
      const nomeBlockH = (nomeLines.length - 1) * lhN;
      nomeLines.forEach((ln, i) => {
        ctx.fillText(ln, ppX, nomeStartY - nomeBlockH / 2 + i * lhN);
      });

      // Desenhar duração (cinza) — uma linha só (trunca com …)
      ctx.font = duracaoFont;
      ctx.fillStyle = '#C5C5C5';
      const durLines = wrapTextCenter(ctx, duracao, nomeMaxW, 1);
      const lhD = duracaoSize * 1.2;
      const durStartY = duracaoBaseY + (duracaoSize / 2);
      const durBlockH = (durLines.length - 1) * lhD;
      durLines.forEach((ln, i) => {
        ctx.fillText(ln, ppX, durStartY - durBlockH / 2 + i * lhD);
      });

      // 3) Exportar PNG
      const outBuf = canvas.toBuffer('image/png');

      // 4) Modo "enviar arquivo direto"
      if (['file', '1', 'arquivo', 'buffer', 'raw'].includes(enviar)) {
        tmpFile = path.join(tmpDir, randomName('.png'));
        fs.writeFileSync(tmpFile, outBuf);
        return res.sendFile(tmpFile, () => delFile(tmpFile));
      }

      // 5) Upload + JSON
      let imagemUrl = '';
      try {
        imagemUrl = await upload2(outBuf, randomName('.png'));
      } catch (upErr) {
        console.log('[wacall] upload2 falhou, enviando arquivo direto:', upErr && upErr.message);
        tmpFile = path.join(tmpDir, randomName('.png'));
        fs.writeFileSync(tmpFile, outBuf);
        return res.sendFile(tmpFile, () => delFile(tmpFile));
      }

      return res.json({
        status: true,
        criador: criador,
        resultado: {
          imagem: imagemUrl,
          nome,
          duracao,
        },
      });
    } catch (err) {
      console.error('[wacall] erro:', err);
      return res.status(500).json({
        status: false,
        message: 'Erro ao gerar imagem do fake call',
        error: err && err.message ? err.message : String(err),
      });
    }
  });
};
