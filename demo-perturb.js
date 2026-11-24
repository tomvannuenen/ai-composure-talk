/* Perturbation demo: one AITA post, small changes, four models' verdicts.
   Data: demo-perturb-data.js (window.PERTURB), from artifact-fragility/data.json.
   Verdicts are coloured by type (no one, narrator, the other party, everyone); rows that changed get a light highlight.
   Steps advance with the clicker (hidden fragments) or by clicking a version. */
(function () {
  function el(tag, cls, html) { const n = document.createElement(tag); if (cls) n.className = cls; if (html != null) n.innerHTML = html; return n; }
  const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;");

  function build(root) {
    const D = window.PERTURB;
    const base = D.versions[0].verdicts;
    const list = el("div", "pt-list");
    const change = el("div", "pt-change");
    const grid = el("div", "pt-grid");
    const rows = D.models.map((m) => {
      const r = el("div", "pt-row");
      r.append(el("span", "pt-model", esc(m)), el("span", "pt-verdict"));
      grid.append(r);
      return r;
    });
    const btns = D.versions.map((v, i) => {
      const b = el("button", "pt-btn", esc(v.label));
      b.type = "button";
      b.addEventListener("click", () => { show(i); b.blur(); });
      list.append(b);
      return b;
    });
    const tally = el("p", "pt-tally");

    function show(i) {
      const v = D.versions[i];
      btns.forEach((b, k) => b.classList.toggle("on", k === i));
      if (!v.kind) change.innerHTML = `<span class="pt-note">The post as written. Verdict = most common of three runs.</span>`;
      else if (v.kind === "add") change.innerHTML = `<span class="pt-note">Added:</span> <ins>${esc(v.change)}</ins>`;
      else if (v.kind === "del") change.innerHTML = `<span class="pt-note">Removed:</span> <del>${esc(v.change)}</del>`;
      else change.innerHTML = `<del>${esc(v.change[0])}</del> <span class="pt-arrow">→</span> <ins>${esc(v.change[1])}</ins>`;
      let moved = 0;
      v.verdicts.forEach((verdict, k) => {
        const flip = i > 0 && verdict !== base[k];
        if (flip) moved++;
        const runs = i === 0 ? ` <small>${v.agreement[k].replace("/", " of ")} runs</small>` : "";
        rows[k].querySelector(".pt-verdict").innerHTML = esc(verdict) + runs;
        const vc = /^no one/i.test(verdict) ? "v-noone" : /^narrator/i.test(verdict) ? "v-narrator" : /^(everyone|both)/i.test(verdict) ? "v-everyone" : "v-other";
        rows[k].querySelector(".pt-verdict").className = "pt-verdict " + vc;
        rows[k].classList.toggle("flip", flip);
      });
      tally.textContent = i === 0 ? "" : moved === 0 ? "No model changed its verdict." : `${moved} of ${D.models.length} models changed their verdict.`;
    }

    root.append(el("div", "pt-left", ""), el("div", "pt-right", ""));
    root.querySelector(".pt-left").append(el("p", "pt-title", esc(D.title)), list);
    root.querySelector(".pt-right").append(change, grid, tally);
    show(0);

    const section = root.closest("section");
    function fromFragments() {
      const shown = section.querySelectorAll(".pt-step.visible");
      show(shown.length ? Math.min(shown.length, D.versions.length - 1) : 0);
    }
    Reveal.on("fragmentshown", (e) => { if (e.fragment.classList.contains("pt-step")) fromFragments(); });
    Reveal.on("fragmenthidden", (e) => { if (e.fragment.classList.contains("pt-step")) fromFragments(); });
    Reveal.on("slidechanged", (e) => { if (e.currentSlide === section) fromFragments(); });
  }

  function init() { document.querySelectorAll(".sem-perturb").forEach(build); }
  if (Reveal.isReady && Reveal.isReady()) init();
  else Reveal.on("ready", init);
})();
