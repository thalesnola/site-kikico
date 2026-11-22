/* Mini Mundo do Kikico: trilha de fundo = tema de abertura do Mini Mundo (versão instrumental, sem vozes),
   a 75% da velocidade, em assets/trilha-lenta.m4a (85 s, em laço). As notas dos puffs e o sino do cronômetro
   continuam sintetizados em código (Web Audio).
   Nunca toca sozinha: só depois de um toque da pessoa (regra dos navegadores e boa educação).
   API: Musica.ligar(), Musica.desligar(), Musica.alternar(), Musica.volume(0..1), Musica.nota(i), Musica.sino(), Musica.ativa */
(function () {
  "use strict";
  var AC = window.AudioContext || window.webkitAudioContext;
  var faixa = null, fadeFaixa = null, ctx = null, mestre = null, entrada = null, tocando = false, timer = null, proxima = 0, compasso = 0, vol = 0.6;

  /* fá maior pentatônica + extensões. Frequências em Hz. */
  var N = { F3: 174.61, A3: 220.0, C4: 261.63, D4: 293.66, F4: 349.23, G4: 392.0, A4: 440.0, Bb3: 233.08, Bb4: 466.16,
            C5: 523.25, D5: 587.33, E5: 659.25, F5: 698.46, G5: 783.99, A5: 880.0, Bb2: 116.54, C3: 130.81, D3: 146.83, F2: 87.31, E4: 329.63 };
  /* quatro acordes, 8 tempos cada (~9 s): Fmaj7, Dm7, Bbmaj7, C add9 */
  var ACORDES = [
    { baixo: N.F2,  pad: [N.F3, N.A3, N.C4, N.E4],  mel: [N.F4, N.A4, N.C5, N.E5, N.G4] },
    { baixo: N.D3,  pad: [N.D3, N.F3, N.A3, N.C4],  mel: [N.D4, N.F4, N.A4, N.C5, N.D5] },
    { baixo: N.Bb2, pad: [N.Bb3, N.D4, N.F4, N.A4], mel: [N.F4, N.A4, N.D5, N.C5, N.G4] },
    { baixo: N.C3,  pad: [N.C4, N.E4, N.G4, N.D4],  mel: [N.G4, N.C5, N.D5, N.E5, N.G5] }
  ];
  var TEMPO = 60 / 52; /* segundos por batida */
  var BATIDAS = 8;
  var PUFFS = [N.F4, N.A4, N.C5, N.A4, N.D5, N.F5]; /* K I K I C O */

  function monta() {
    if (ctx || !AC) return !!ctx;
    ctx = new AC();
    mestre = ctx.createGain(); mestre.gain.value = 0;
    var comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -24; comp.ratio.value = 3; comp.attack.value = 0.05; comp.release.value = 0.4;
    entrada = ctx.createGain();
    /* eco longo e macio: resposta ao impulso de ruído que decai */
    var conv = ctx.createConvolver(), dur = 3.2, n = Math.floor(ctx.sampleRate * dur), ir = ctx.createBuffer(2, n, ctx.sampleRate);
    for (var c = 0; c < 2; c++) { var d = ir.getChannelData(c); for (var i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, 2.6); }
    conv.buffer = ir;
    var molhado = ctx.createGain(); molhado.gain.value = 0.55;
    var seco = ctx.createGain(); seco.gain.value = 0.7;
    var atraso = ctx.createDelay(2); atraso.delayTime.value = TEMPO * 0.75;
    var realim = ctx.createGain(); realim.gain.value = 0.32;
    var filtroAtraso = ctx.createBiquadFilter(); filtroAtraso.type = "lowpass"; filtroAtraso.frequency.value = 1800;
    entrada.connect(seco); seco.connect(comp);
    entrada.connect(conv); conv.connect(molhado); molhado.connect(comp);
    entrada.connect(atraso); atraso.connect(filtroAtraso); filtroAtraso.connect(realim); realim.connect(atraso); filtroAtraso.connect(molhado);
    comp.connect(mestre); mestre.connect(ctx.destination);
    return true;
  }

  /* caixa de música: seno + parcial agudo, ataque curto, queda longa */
  function sino(freq, t, ganho, dur) {
    var o1 = ctx.createOscillator(), o2 = ctx.createOscillator(), g = ctx.createGain();
    o1.type = "sine"; o1.frequency.value = freq;
    o2.type = "sine"; o2.frequency.value = freq * 2.005;
    var g2 = ctx.createGain(); g2.gain.value = 0.22;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(ganho, t + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o1.connect(g); o2.connect(g2); g2.connect(g); g.connect(entrada);
    o1.start(t); o2.start(t); o1.stop(t + dur + 0.1); o2.stop(t + dur + 0.1);
  }

  /* colchão: duas ondas levemente desafinadas por nota, filtro baixo, ataque e saída lentos */
  function pad(freq, t, dur, ganho) {
    var g = ctx.createGain(), f = ctx.createBiquadFilter();
    f.type = "lowpass"; f.frequency.value = 780; f.Q.value = 0.3;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(ganho, t + dur * 0.38);
    g.gain.linearRampToValueAtTime(0.0001, t + dur + 2.2);
    [["sine", -3], ["triangle", 4]].forEach(function (p) {
      var o = ctx.createOscillator(); o.type = p[0]; o.frequency.value = freq; o.detune.value = p[1];
      o.connect(f); o.start(t); o.stop(t + dur + 2.4);
    });
    f.connect(g); g.connect(entrada);
  }

  function agenda(c, t0) {
    var a = ACORDES[c % ACORDES.length];
    pad(a.baixo, t0, BATIDAS * TEMPO, 0.085);
    a.pad.forEach(function (f, i) { pad(f, t0 + i * 0.35, BATIDAS * TEMPO - i * 0.2, 0.034); });
    /* melodia esparsa: nota a cada 1 ou 2 batidas, com pausas; sobe e desce devagar */
    var passo = 0, pos = (c * 3) % a.mel.length;
    for (var b = 0; b < BATIDAS; b += 1) {
      var sorte = Math.random();
      if (b === 0 || sorte > 0.46) {
        pos = Math.max(0, Math.min(a.mel.length - 1, pos + (Math.random() < 0.5 ? -1 : 1) * (Math.random() < 0.7 ? 1 : 2)));
        sino(a.mel[pos], t0 + b * TEMPO + Math.random() * 0.05, 0.1 + Math.random() * 0.05, 3.2);
        passo++;
      }
    }
  }

  /* faixa gravada: laço com fade de volume feito à mão (o elemento <audio> não tem rampa) */
  function faixaMonta() {
    if (faixa) return faixa;
    faixa = new Audio("assets/trilha-lenta.m4a");
    faixa.loop = true; faixa.preload = "auto"; faixa.volume = 0;
    return faixa;
  }
  function faixaFade(alvo, seg, fim) {
    clearInterval(fadeFaixa);
    var a = faixaMonta(), de = a.volume, t0 = performance.now();
    fadeFaixa = setInterval(function () {
      var k = Math.min(1, (performance.now() - t0) / (seg * 1000));
      a.volume = Math.max(0, Math.min(1, de + (alvo - de) * k));
      if (k >= 1) { clearInterval(fadeFaixa); if (fim) fim(); }
    }, 50);
  }

  function laco() {
    if (!tocando || !ctx) return;
    while (proxima < ctx.currentTime + 1.5) {
      agenda(compasso++, proxima);
      proxima += BATIDAS * TEMPO;
    }
  }

  var api = {
    ativa: false,
    suportado: !!AC,
    ligar: function () {
      if (!AC) return false;
      monta();
      if (ctx.state === "suspended") ctx.resume();
      if (tocando) return true;
      tocando = true; api.ativa = true;
      var t = ctx.currentTime;
      mestre.gain.cancelScheduledValues(t);
      mestre.gain.setValueAtTime(mestre.gain.value, t);
      mestre.gain.linearRampToValueAtTime(vol * 0.9, t + 0.4); /* só as notas dos puffs passam por aqui */
      var a = faixaMonta(), p = a.play();
      if (p && p.catch) p.catch(function () { tocando = false; api.ativa = false; });
      faixaFade(vol * 0.9, 5); /* entra em 5 segundos */
      return true;
    },
    desligar: function () {
      if (!ctx || !tocando) { api.ativa = false; return; }
      tocando = false; api.ativa = false;
      var t = ctx.currentTime;
      mestre.gain.cancelScheduledValues(t);
      mestre.gain.setValueAtTime(mestre.gain.value, t);
      mestre.gain.linearRampToValueAtTime(0, t + 2.5);
      faixaFade(0, 2.5, function () { if (!tocando && faixa) faixa.pause(); }); /* sai em 2,5 segundos */
      setTimeout(function () { if (!tocando && ctx) ctx.suspend(); }, 3200);
    },
    alternar: function () { if (api.ativa) api.desligar(); else api.ligar(); return api.ativa; },
    volume: function (v) {
      vol = Math.max(0, Math.min(1, v));
      if (faixa && tocando) faixaFade(vol * 0.9, 0.4);
      if (ctx && tocando) { var t = ctx.currentTime; mestre.gain.cancelScheduledValues(t); mestre.gain.setValueAtTime(mestre.gain.value, t); mestre.gain.linearRampToValueAtTime(vol * 0.9, t + 0.4); }
    },
    /* nota de um puff (0 a 5): só soa com o som ligado */
    nota: function (i) {
      if (!ctx || !api.ativa) return;
      sino(PUFFS[i % PUFFS.length], ctx.currentTime + 0.01, 0.2, 2.6);
    },
    /* três notas suaves: o tempo acabou */
    sino: function () {
      if (!ctx || !api.ativa) return;
      var t = ctx.currentTime + 0.05;
      [N.C5, N.E5, N.G5].forEach(function (f, i) { sino(f, t + i * 0.5, 0.2, 3.4); });
    }
  };

  /* aba escondida: pausa o relógio de áudio e economiza bateria */
  document.addEventListener("visibilitychange", function () {
    if (!ctx) return;
    if (document.hidden) { ctx.suspend(); if (faixa) faixa.pause(); }
    else if (tocando) { ctx.resume(); if (faixa) faixa.play(); }
  });
  window.Musica = api;
})();
