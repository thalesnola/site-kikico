/* Mini Mundo do Kikico: rolagem que conta a história.
   Sem biblioteca. Cada cena [data-cena] é alta; o palco dentro dela fica preso (sticky)
   e o progresso p (0 a 1) da cena vira a variável CSS --p.
   Cada elemento [data-entra="a b"] recebe --t: 0 antes de p=a, 1 depois de p=b, suavizado.
   Sem JavaScript, com prefers-reduced-motion, com ?calmo ou em tela baixa, tudo aparece parado e completo. */
(function () {
  "use strict";
  var raiz = document.documentElement;
  var calmo = window.matchMedia("(prefers-reduced-motion: reduce)");
  /* kikico.com.br/?calmo mostra a página parada, como quem pede "reduzir movimento" */
  var forcaCalmo = /[?&]calmo(=|&|$)/.test(window.location.search);
  /* celular deitado ou zoom grande: a tela é baixa demais para cena presa; mostra tudo parado */
  var baixa = window.matchMedia("(max-height: 500px)");
  function parado() { return calmo.matches || forcaCalmo || baixa.matches; }
  function ouve(mq, fn) { if (mq.addEventListener) mq.addEventListener("change", fn); else if (mq.addListener) mq.addListener(fn); }

  function suave(x) { return 1 - Math.pow(1 - x, 3); } /* sai rápido, pousa devagar */
  function limita(x) { return x < 0 ? 0 : x > 1 ? 1 : x; }

  var celular = window.matchMedia("(max-width: 760px)");
  var cenas = [];
  function coleta() {
    cenas = Array.prototype.map.call(document.querySelectorAll("[data-cena]"), function (cena) {
      return {
        el: cena,
        itens: Array.prototype.map.call(cena.querySelectorAll("[data-entra]"), function (el) {
          var f = el.getAttribute("data-entra").split(/\s+/).map(parseFloat);
          /* data-sai-celular vale só em tela estreita, onde as peças se revezam no mesmo lugar */
          var sai = (celular.matches && el.getAttribute("data-sai-celular")) || el.getAttribute("data-sai");
          var s = sai ? sai.split(/\s+/).map(parseFloat) : null;
          return { el: el, a: f[0], b: f[1], sa: s && s[0], sb: s && s[1], ultimo: -1 };
        }),
        ultimo: -1
      };
    });
  }

  var pedido = false;
  function quadro() {
    pedido = false;
    var alt = window.innerHeight;
    for (var i = 0; i < cenas.length; i++) {
      var c = cenas[i];
      var r = c.el.getBoundingClientRect();
      if (r.bottom < -alt || r.top > alt * 2) continue; /* longe da tela: não mexe */
      var curso = r.height - alt;
      var p = curso > 0 ? limita(-r.top / curso) : (r.top < alt ? 1 : 0);
      if (Math.abs(p - c.ultimo) < 0.0005) continue;
      c.ultimo = p;
      c.el.style.setProperty("--p", p.toFixed(4));
      for (var j = 0; j < c.itens.length; j++) {
        var it = c.itens[j];
        var t = suave(limita((p - it.a) / (it.b - it.a)));
        if (it.sa != null) t *= 1 - suave(limita((p - it.sa) / (it.sb - it.sa)));
        if (Math.abs(t - it.ultimo) < 0.001) continue;
        it.ultimo = t;
        it.el.style.setProperty("--t", t.toFixed(3));
      }
    }
  }
  function pede() { if (!pedido) { pedido = true; window.requestAnimationFrame(quadro); } }

  function liga() {
    if (parado()) {
      raiz.classList.remove("anima");
      window.removeEventListener("scroll", pede);
      window.removeEventListener("resize", pede);
      document.querySelectorAll("[data-entra]").forEach(function (el) {
        el.style.removeProperty("--t");
      });
      document.querySelectorAll("[data-cena]").forEach(function (el) { el.style.removeProperty("--p"); });
      return;
    }
    raiz.classList.add("anima");
    coleta();
    window.addEventListener("scroll", pede, { passive: true });
    window.addEventListener("resize", pede);
    quadro();
  }

  ouve(calmo, liga);
  ouve(baixa, liga);
  ouve(celular, function () { if (!parado()) { coleta(); quadro(); } });
  liga();
})();
