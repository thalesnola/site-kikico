/* Mini Mundo do Kikico · interações da versão para os pais. Sem biblioteca, sem rede, sem cookies.
   Com prefers-reduced-motion ou ?calmo, o movimento some e tudo continua funcionando. */
(function () {
  "use strict";
  var raiz = document.documentElement;
  var mq = window.matchMedia("(prefers-reduced-motion: reduce)");
  var calmo = mq.matches || /[?&]calmo(=|&|$)/.test(location.search);
  if (calmo) raiz.classList.add("reduz");
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  function guarda(k, v) { try { if (v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v); } catch (e) {} return null; }

  /* ---------- aparecer ao rolar ---------- */
  var rev = $$("[data-rev]");
  if ("IntersectionObserver" in window && !calmo) {
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add("vis"); io.unobserve(e.target); } });
    }, { threshold: 0.12, rootMargin: "0px 0px -6% 0px" });
    rev.forEach(function (el) { io.observe(el); });
  } else rev.forEach(function (el) { el.classList.add("vis"); });

  /* ---------- paralaxe da sala (mouse e inclinação) ---------- */
  var mundo = $("#mundo");
  $$("[data-prof]", mundo).forEach(function (el) { el.style.setProperty("--p", el.getAttribute("data-prof")); });
  if (!calmo && mundo) {
    var alvoX = 0, alvoY = 0, x = 0, y = 0, rodando = false;
    function passo() {
      x += (alvoX - x) * 0.06; y += (alvoY - y) * 0.06;
      raiz.style.setProperty("--mx", x.toFixed(3)); raiz.style.setProperty("--my", y.toFixed(3));
      if (Math.abs(alvoX - x) > 0.002 || Math.abs(alvoY - y) > 0.002) requestAnimationFrame(passo); else rodando = false;
    }
    function mexe() { if (!rodando) { rodando = true; requestAnimationFrame(passo); } }
    window.addEventListener("pointermove", function (e) {
      if (e.pointerType === "touch") return;
      alvoX = (e.clientX / innerWidth - 0.5) * 2; alvoY = (e.clientY / innerHeight - 0.5) * 2; mexe();
    }, { passive: true });
    window.addEventListener("deviceorientation", function (e) {
      if (e.gamma == null) return;
      alvoX = Math.max(-1, Math.min(1, e.gamma / 25)); alvoY = Math.max(-1, Math.min(1, (e.beta - 45) / 25)); mexe();
    }, { passive: true });
  }

  /* ---------- céu: escurece conforme a página desce; menu marca a seção ---------- */
  var secoes = $$("main > section");
  var links = $$(".menu a");
  var noite = $("#assistir");
  var pedido = false;
  function rola() {
    pedido = false;
    var h = innerHeight, r = noite.getBoundingClientRect();
    /* 0 até a noite entrar na tela, 1 quando ela ocupa metade */
    var p = Math.max(0, Math.min(1, (h - r.top) / (h * 0.9)));
    raiz.style.setProperty("--noite-p", (p * p).toFixed(3));
    var atual = "";
    secoes.forEach(function (s) { var b = s.getBoundingClientRect(); if (b.top < h * 0.4 && b.bottom > h * 0.4) atual = s.id; });
    links.forEach(function (a) { a.classList.toggle("ativo", a.getAttribute("href") === "#" + atual); });
  }
  window.addEventListener("scroll", function () { if (!pedido) { pedido = true; requestAnimationFrame(rola); } }, { passive: true });
  rola();

  /* ---------- som: convite educado, controle sempre à mão ---------- */
  var painelSom = $("#som"), botaoSom = $("#som-botao"), volSom = $("#som-vol"), convite = $("#convite");
  var M = window.Musica;
  function mostraSom() {
    painelSom.hidden = false;
    var on = !!(M && M.ativa);
    botaoSom.setAttribute("aria-pressed", on);
    botaoSom.setAttribute("aria-label", on ? "Desligar música suave" : "Ligar música suave");
    painelSom.classList.toggle("aberto", on);
  }
  if (M && M.suportado) {
    var pref = guarda("kikico-som");
    volSom.value = guarda("kikico-vol") || 55; M.volume(volSom.value / 100);
    mostraSom();
    if (pref === "1") {
      /* o navegador só deixa tocar depois de um toque: o primeiro toque na página liga a música de novo */
      var primeiro = function () { M.ligar(); mostraSom(); ["pointerdown", "keydown"].forEach(function (t) { window.removeEventListener(t, primeiro, true); }); };
      ["pointerdown", "keydown"].forEach(function (t) { window.addEventListener(t, primeiro, true); });
    } else if (pref !== "0") {
      setTimeout(function () { if (!M.ativa) convite.hidden = false; }, 3500);
    }
    botaoSom.addEventListener("click", function () { guarda("kikico-som", M.alternar() ? "1" : "0"); convite.hidden = true; mostraSom(); });
    volSom.addEventListener("input", function () { M.volume(volSom.value / 100); guarda("kikico-vol", volSom.value); });
    $("#convite-sim").addEventListener("click", function () { M.ligar(); guarda("kikico-som", "1"); convite.hidden = true; mostraSom(); });
    $("#convite-nao").addEventListener("click", function () { guarda("kikico-som", "0"); convite.hidden = true; });
  }

  /* ---------- puffs: tocam, pulam e escrevem KIKICO ---------- */
  var puffs = $$(".puff"), seq = 0, dica = $("#dica-puff"), notas = $("#notas");
  var cores = ["#D45711", "#FDB324", "#B09A41", "#7DA0C0", "#B9728F", "#DA6B55"];
  function voa(botao, i) {
    if (calmo) return;
    var m = mundo.getBoundingClientRect(), b = botao.getBoundingClientRect(), n = document.createElement("span");
    n.className = "nota-voa"; n.textContent = ["♪", "♫", "♩", "✦"][Math.floor(Math.random() * 4)]; n.style.color = cores[i];
    n.style.left = (b.left - m.left + b.width / 2 - 10) + "px"; n.style.top = (b.top - m.top) + "px";
    n.style.setProperty("--dx", (Math.random() * 90 - 45) + "px"); n.style.setProperty("--rot", (Math.random() * 60 - 30) + "deg");
    notas.appendChild(n); setTimeout(function () { n.remove(); }, 2700);
  }
  puffs.forEach(function (p) {
    p.addEventListener("click", function () {
      var i = +p.getAttribute("data-i");
      p.classList.remove("toca"); void p.offsetWidth; p.classList.add("toca");
      voa(p, i);
      if (M) M.nota(i);
      dica.classList.add("some");
      seq = (i === seq) ? seq + 1 : (i === 0 ? 1 : 0);
      if (seq === 6) { seq = 0; festa(); }
      if (M && !M.ativa && M.suportado && !guarda("kikico-som")) { convite.hidden = false; }
    });
    p.addEventListener("animationend", function (e) { if (e.animationName === "pula") p.classList.remove("toca"); });
  });
  function festa() {
    puffs.forEach(function (p, i) { setTimeout(function () { p.classList.remove("toca"); void p.offsetWidth; p.classList.add("toca"); voa(p, i); if (M) M.nota(i); }, i * 160); });
    dica.textContent = "KIKICO! Você achou o segredo dos puffs. ✨"; dica.classList.remove("some");
    setTimeout(function () { dica.classList.add("some"); }, 4200);
  }

  /* ---------- comparador agitado x calmo ---------- */
  var comp = $("#comparador"), corte = $("#corte");
  if (comp && corte) {
    var ajusta = function () { comp.style.setProperty("--corte", corte.value + "%"); };
    corte.addEventListener("input", ajusta); ajusta();
    /* convite: uma balançada sozinha quando entra na tela */
    if (!calmo && "IntersectionObserver" in window) {
      var vez = new IntersectionObserver(function (es) {
        if (!es[0].isIntersecting) return; vez.disconnect();
        var t0 = performance.now();
        (function anim(t) { var k = (t - t0) / 1800; if (k >= 1 || +corte.value !== 50) { return; }
          corte.value = 50 + Math.sin(k * Math.PI * 2) * 28 * (1 - k); ajusta(); requestAnimationFrame(anim); })(t0);
      }, { threshold: 0.6 });
      vez.observe(comp);
    }
  }

  /* ---------- seu momento do dia ---------- */
  var MOMENTOS = {
    manha: { img: "assets/sala-960.webp", selo: "Mini Mundo do Kikico · estreia em breve", titulo: "Histórias do dia a dia",
      desc: "Episódios longos com Kikico, Nina e Tião. Dê o play, tome o café ainda quente e volte quando o final chegar.",
      dica: "<b>Dica:</b> sente ao lado nos primeiros minutos e comente o que aparece. Depois, a criança segue sozinha." },
    jantar: { img: "assets/abc-960.webp", selo: "Abecedário das Virtudes · em preparo", titulo: "Uma virtude por vez",
      desc: "De A de Amizade a Z de Zelo, cada episódio traz uma virtude, uma música e um jeito simples de falar dela com a criança.",
      dica: "<b>Dica:</b> use a pergunta da seção “Uma pergunta para fazer junto” na hora de pôr a mesa." },
    carro: { img: "assets/sala-960.webp", selo: "Viagens pelas Cidades · em preparo", titulo: "Cidades em papel e bordado",
      desc: "Passeios curtos por cidades desenhadas em papel e bordado, com a turma do Kikico. Boa companhia para trajetos em que todo mundo precisa de calma.",
      dica: "<b>Dica:</b> deixe o volume baixo e aponte o que passa na janela: o desenho e a estrada conversam." },
    dormir: { img: "assets/noite-960.webp", selo: "Noite de Histórias · em preparo", titulo: "Histórias para dormir",
      desc: "No quarto do Kikico, os avós contam histórias com piano lento e luz de abajur. Um jeito de a noite descer devagar.",
      dica: "<b>Dica:</b> luz fraca, volume baixo e, quando o final chegar, desligue e dê o beijo de boa noite." }
  };
  var painel = $("#painel-momento"), fichas = $$(".ficha");
  function momento(k) {
    var m = MOMENTOS[k]; if (!m) return;
    fichas.forEach(function (f) { f.setAttribute("aria-checked", f.getAttribute("data-m") === k); });
    painel.classList.add("troca");
    setTimeout(function () {
      $("#pm-img").src = m.img; $("#pm-selo").textContent = m.selo; $("#pm-titulo").textContent = m.titulo;
      $("#pm-desc").textContent = m.desc; $("#pm-dica").innerHTML = m.dica;
      painel.classList.remove("troca");
    }, calmo ? 0 : 300);
  }
  fichas.forEach(function (f) { f.addEventListener("click", function () { momento(f.getAttribute("data-m")); }); });
  /* setas movem entre as fichas (padrão de grupo de rádio) */
  $(".fichas").addEventListener("keydown", function (e) {
    var i = fichas.indexOf(document.activeElement), n = fichas.length;
    if (i < 0) return;
    if (e.key === "ArrowRight" || e.key === "ArrowDown") { fichas[(i + 1) % n].focus(); fichas[(i + 1) % n].click(); e.preventDefault(); }
    if (e.key === "ArrowLeft" || e.key === "ArrowUp") { fichas[(i + n - 1) % n].focus(); fichas[(i + n - 1) % n].click(); e.preventDefault(); }
  });

  /* ---------- cronômetro dos 15 minutos ---------- */
  var DICAS = ["Tome o café ainda quente.", "Solte os ombros e o maxilar.", "Beba um copo de água.", "Alongue o pescoço, devagar.",
    "Escreva uma coisa boa de hoje.", "Olhe pela janela por um minuto.", "Não faça nada. É permitido."];
  var rel = $("#relogio"), progresso = $("#r-prog"), tempo = $("#r-tempo"), dicaRel = $("#r-dica"), iniciar = $("#r-iniciar");
  var CIRC = 2 * Math.PI * 88, total = 15 * 60, restante = total, fim = 0, tic = null, dicaI = 0;
  progresso.style.strokeDasharray = CIRC;
  function fmt(s) { s = Math.max(0, Math.ceil(s)); return String(Math.floor(s / 60)).padStart(2, "0") + ":" + String(s % 60).padStart(2, "0"); }
  function pinta() {
    tempo.textContent = fmt(restante);
    progresso.style.strokeDashoffset = CIRC * (1 - restante / total);
  }
  function para() { clearInterval(tic); tic = null; iniciar.textContent = restante === total || restante <= 0 ? "Começar" : "Continuar"; }
  function tictac() {
    restante = (fim - Date.now()) / 1000;
    var decor = Math.floor((total - restante) / 150); /* nova dica a cada 2:30 */
    if (decor !== dicaI) { dicaI = decor; dicaRel.textContent = DICAS[dicaI % DICAS.length]; }
    if (restante <= 0) {
      restante = 0; para(); iniciar.textContent = "De novo"; rel.classList.add("fim");
      dicaRel.textContent = "Acabou o tempo. Que tal brincar juntos agora?";
      if (M) M.sino();
    }
    pinta();
  }
  iniciar.addEventListener("click", function () {
    if (tic) { para(); return; }
    if (restante <= 0) restante = total;
    rel.classList.remove("fim");
    if (restante === total) { dicaI = 0; dicaRel.textContent = DICAS[0]; }
    fim = Date.now() + restante * 1000; iniciar.textContent = "Pausar";
    tic = setInterval(tictac, 250); tictac();
  });
  function zera(min) {
    para(); total = min * 60; restante = total; rel.classList.remove("fim"); iniciar.textContent = "Começar";
    dicaRel.textContent = "Toque em começar e solte o ar."; pinta();
  }
  $("#r-zerar").addEventListener("click", function () { zera(total / 60); });
  $$(".mini").forEach(function (b) {
    b.addEventListener("click", function () {
      $$(".mini").forEach(function (x) { x.setAttribute("aria-pressed", x === b); });
      zera(+b.getAttribute("data-min"));
    });
  });
  pinta();

  /* ---------- respire com o Kikico: 4 s entrando, 6 s saindo ---------- */
  var resp = $("#respira"), respTxt = $("#respira-texto"), respBtn = $("#respira-botao"), respT = null, ciclos = 0;
  function fase(dentro) {
    resp.style.setProperty("--dur", (dentro ? 4 : 6) + "s");
    resp.style.setProperty("--e", dentro ? 1.7 : 1);
    respTxt.textContent = dentro ? "Inspire…" : "Solte devagar…";
  }
  function ciclo() {
    fase(true);
    respT = setTimeout(function () { fase(false); respT = setTimeout(function () { ciclos++; if (ciclos >= 6) { paraResp(true); } else ciclo(); }, 6000); }, 4000);
  }
  function paraResp(fimNatural) {
    clearTimeout(respT); respT = null; ciclos = 0;
    resp.style.setProperty("--dur", "1.2s"); resp.style.setProperty("--e", 1);
    respBtn.textContent = "Respirar"; respBtn.setAttribute("aria-pressed", "false");
    respTxt.textContent = fimNatural ? "Pronto. Um minuto só seu. 💛" : "Um minuto só para você.";
  }
  respBtn.addEventListener("click", function () {
    if (respT) { paraResp(false); return; }
    respBtn.textContent = "Parar"; respBtn.setAttribute("aria-pressed", "true"); ciclos = 0; ciclo();
  });

  /* ---------- uma pergunta para fazer junto ---------- */
  var PERGUNTAS = {
    amizade: { l: "A", c: "#D45711", q: ["Quem brincou com o Kikico hoje? E com quem você brinca?", "A Nina corre e volta para ver se todos vêm junto. Quem espera você?", "O que a gente pode fazer para um amigo ficar feliz?"] },
    paciencia: { l: "P", c: "#E09A12", q: ["O Tião esperou deitadinho. O que a gente faz quando precisa esperar?", "O feijão demora para brotar. O que mais demora e vale a pena?", "Vamos respirar fundo juntos? Um, dois, três…"] },
    obediencia: { l: "O", c: "#B09A41", q: ["Quando a mamãe ou o papai chama, o que a gente faz?", "Por que a gente dá a mão para atravessar a rua?", "Qual combinado da nossa casa você já sabe de cor?"] },
    gratidao: { l: "G", c: "#7DA0C0", q: ["Do que você gostou mais hoje? Vamos dizer obrigado?", "Quem cuidou de você hoje? Vamos mandar um abraço?", "Qual brinquedo é seu amigo favorito, e por quê?"] },
    zelo: { l: "Z", c: "#B9728F", q: ["Como a gente cuida do nosso brinquedo para ele durar?", "Como a gente cuida de um bichinho? E de uma plantinha?", "Vamos arrumar a sala juntos, como o Kikico arruma o tapete?"] }
  };
  var carta = $("#carta"), letrasBtn = $$(".letra"), virtude = "amizade", qi = 0;
  function mostraCarta(troca) {
    var v = PERGUNTAS[virtude];
    function aplica() {
      $("#carta-letra").textContent = v.l; $("#carta-pergunta").textContent = v.q[qi % v.q.length]; carta.style.setProperty("--cor-carta", v.c);
    }
    if (troca && !calmo) { carta.classList.add("gira"); setTimeout(function () { aplica(); carta.classList.remove("gira"); }, 260); } else aplica();
  }
  letrasBtn.forEach(function (b) {
    b.addEventListener("click", function () {
      virtude = b.getAttribute("data-v"); qi = 0;
      letrasBtn.forEach(function (x) { x.setAttribute("aria-selected", x === b); });
      mostraCarta(true);
    });
  });
  $("#outra").addEventListener("click", function () { qi++; mostraCarta(true); });
  mostraCarta(false);

  /* ---------- turma: toque faz o personagem pular ---------- */
  $$(".bicho").forEach(function (b) {
    function pula() { b.classList.remove("pula"); void b.offsetWidth; b.classList.add("pula"); setTimeout(function () { b.classList.remove("pula"); }, 900); }
    b.addEventListener("click", pula);
    b.addEventListener("keydown", function (e) { if (e.key === "Enter" || e.key === " ") { pula(); e.preventDefault(); } });
  });
})();
