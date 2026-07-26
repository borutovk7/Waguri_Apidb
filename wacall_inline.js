/**
 * ==========================================================================
 *  TRECHO PRONTO PARA COLAR DENTRO DO OKARUN.JS
 *  Rota: GET /api/maker/wacall  (fake call iOS estilo WhatsApp)
 *
 *  Como usar:
 *   1. Abra o arquivo okarun.js
 *   2. Cole esse trecho em QUALQUER lugar depois de:
 *        - const { createCanvas, loadImage } = require('canvas')
 *        - function upload2(...) { ... }
 *        - async function getBuffer(url) { ... }
 *        - let randomName = (ext) => uuid().split('-')[0] + (ext ? ext : '')
 *        - function delFile(file) { ... }
 *        - As funções existsApiKey / noMoreRequests / registerApikeyRQ /
 *          sendResJsonNoMoreRequests / sendPageNoMoreRequests
 *        - const criador = process.env.CRIADOR
 *        - const ytTmpDir = require('path').join(process.cwd(), 'tmp')
 *   3. Salve e reinicie o servidor.
 *
 *  Query params:
 *    ?apikey=SUAKEY&nome=Joao&duracao=00:42&avatar=https://...jpg
 *    (opcional) &enviar=file  → retorna a imagem PNG direto
 * ==========================================================================
 */

// ---------- Início do trecho (cole a partir daqui) ----------
{
  const _wacallPath = require('path');
  const _wacallFs   = require('fs');
  const _wacallAxios = require('axios');
  const { createCanvas: _wacallCreateCanvas, loadImage: _wacallLoadImage } = require('canvas');

  const _WACALL_BG_URL = 'https://raw.githubusercontent.com/ryyntwx/allimagerin/refs/heads/main/353dc125-a39c-4d27-9ba5-9ec7dfa6624a.png';
  const _WACALL_ASSETS = _wacallPath.join(process.cwd(), 'assets', 'wacall_meme');
  const _WACALL_BG_LOCAL = _wacallPath.join(_WACALL_ASSETS, 'template_call.png');
  try { if (!_wacallFs.existsSync(_WACALL_ASSETS)) _wacallFs.mkdirSync(_WACALL_ASSETS, { recursive: true }); } catch(e){}

  async function _wacallGetBg() {
    if (_wacallFs.existsSync(_WACALL_BG_LOCAL) && _wacallFs.statSync(_WACALL_BG_LOCAL).size > 50000) {
      return _wacallFs.readFileSync(_WACALL_BG_LOCAL);
    }
    const r = await _wacallAxios.get(_WACALL_BG_URL, { responseType: 'arraybuffer', timeout: 20000 });
    const buf = Buffer.from(r.data);
    _wacallFs.writeFileSync(_WACALL_BG_LOCAL, buf);
    return buf;
  }
  function _wacallCircleAvatar(ctx, img, cx, cy, r) {
    ctx.save();
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI*2, true); ctx.closePath(); ctx.clip();
    const iw=img.width, ih=img.height, ms=Math.min(iw,ih);
    ctx.drawImage(img,(iw-ms)/2,(ih-ms)/2,ms,ms, cx-r,cy-r, r*2, r*2);
    ctx.restore();
  }
  function _wacallWrap(ctx, text, maxW, maxLines = 2) {
    const raw = String(text||'');
    // Quebra por palavras
    const words = raw.split(/\s+/);
    const lines = [];
    let cur = '';
  for (const w of words) {
    const t = cur ? cur + ' ' + w : w;
    if (ctx.measureText(t).width > maxW) {
      if (cur) lines.push(cur);
      if (ctx.measureText(w).width > maxW) {
        let frag = '';
        for (const ch of w) {
          const t2 = frag + ch;
          if (ctx.measureText(t2).width > maxW && frag) { lines.push(frag); frag = ch; } else frag = t2;
        }
        cur = frag;
      } else {
        cur = w;
      }
    } else {
      cur = t;
    }
  }
  if (cur) lines.push(cur);
    // Limita a maxLines linhas, trunca a última com "…"
    if (lines.length > maxLines) {
      while (lines.length > maxLines) lines.pop();
      let last = lines[maxLines - 1];
      while (ctx.measureText(last + '…').width > maxW && last.length > 1) last = last.slice(0,-1);
      lines[maxLines - 1] = last + '…';
    }
    return lines;
  }

  app.get('/api/maker/wacall', async (req, res) => {
    const apikey  = req.query.apikey;
    const nome    = String(req.query.nome    || req.query.name     || '').trim();
    const duracao = String(req.query.duracao || req.query.duration || '').trim();
    const avatar  = String(req.query.avatar  || req.query.foto     || '').trim();
    const enviar  = String(req.query.enviar  || req.query.send     || 'json').toLowerCase();

    if (!apikey) return res.json({ status: false, message: '- Cade o parametro apikey?' });
    if (!await existsApiKey(apikey))  return sendPageNoMoreRequests(res);
    if (await noMoreRequests(apikey)) return sendResJsonNoMoreRequests(res);
    await registerApikeyRQ(apikey, req);

    if (!nome)    return res.json({ status: false, message: 'Parâmetro obrigatório: nome' });
    if (!duracao) return res.json({ status: false, message: 'Parâmetro obrigatório: duracao' });
    if (!avatar)  return res.json({ status: false, message: 'Parâmetro obrigatório: avatar (URL da foto)' });

    let tmpFile = null;
    try {
      const [bgBuf, avBuf] = await Promise.all([
        _wacallGetBg(),
        getBuffer(avatar).catch(() => null),
      ]);
      if (!avBuf) return res.json({ status: false, message: 'Falha ao baixar o avatar (URL inválida?).' });

      const [bgImg, avImg] = await Promise.all([_wacallLoadImage(bgBuf), _wacallLoadImage(avBuf)]);
      const canvas = _wacallCreateCanvas(bgImg.width, bgImg.height);
      const ctx = canvas.getContext('2d');
      ctx.drawImage(bgImg, 0, 0, canvas.width, canvas.height);

      const W = canvas.width, H = canvas.height;
      const scale = W / 889;
      const ppX = W/2, ppY = H*0.50, ppR = W*0.22;
      _wacallCircleAvatar(ctx, avImg, ppX, ppY, ppR);

      const nomeSize = Math.round(42*scale),  durSize = Math.round(35*scale);
      const nomeBase = Math.round(75*scale),  durBase = Math.round(133*scale);

      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      ctx.fillStyle = '#FFFFFF';
      // Ajusta fonte do nome dinamicamente se houver quebra de linha
      const nomeMaxW = W * 0.68; // margem lateral para não bater nos ícones
      let _nSize = nomeSize;
      let nL = [];
      // Primeiro define o tamanho da fonte para caber em até 2 linhas
      for (; _nSize >= 22; _nSize -= 2) {
        ctx.font = `700 ${_nSize}px "Noto Emoji", "DejaVu Sans", "Arial", sans-serif`;
        nL = _wacallWrap(ctx, nome, nomeMaxW, 2);
        if (nL.length <= 2) break;
      }
      ctx.font = `700 ${_nSize}px "Noto Emoji", "DejaVu Sans", "Arial", sans-serif`;
      nL = _wacallWrap(ctx, nome, nomeMaxW, 2);
      const lhN = _nSize*1.2, nStart = nomeBase + _nSize/2, nBlock = (nL.length-1)*lhN;
      nL.forEach((ln,i)=>ctx.fillText(ln, ppX, nStart - nBlock/2 + i*lhN));

      ctx.font = `400 ${durSize}px "Noto Emoji", "DejaVu Sans", "Arial", sans-serif`;
      ctx.fillStyle = '#C5C5C5';
      const dL = _wacallWrap(ctx, duracao, nomeMaxW, 1);
      const lhD = durSize*1.2, dStart = durBase + durSize/2, dBlock = (dL.length-1)*lhD;
      dL.forEach((ln,i)=>ctx.fillText(ln, ppX, dStart - dBlock/2 + i*lhD));

      const outBuf = canvas.toBuffer('image/png');

      if (['file','1','arquivo','buffer','raw'].includes(enviar)) {
        tmpFile = _wacallPath.join(ytTmpDir, randomName('.png'));
        _wacallFs.writeFileSync(tmpFile, outBuf);
        return res.sendFile(tmpFile, () => delFile(tmpFile));
      }

      let imagemUrl = '';
      try {
        imagemUrl = await upload2(outBuf, randomName('.png'));
      } catch (upErr) {
        console.log('[wacall] upload2 falhou, enviando arquivo direto:', upErr && upErr.message);
        tmpFile = _wacallPath.join(ytTmpDir, randomName('.png'));
        _wacallFs.writeFileSync(tmpFile, outBuf);
        return res.sendFile(tmpFile, () => delFile(tmpFile));
      }

      return res.json({
        status: true,
        criador: criador,
        resultado: { imagem: imagemUrl, nome, duracao },
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
}
// ---------- Fim do trecho ----------
