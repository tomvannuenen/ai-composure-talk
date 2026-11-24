/* Small step-through demos for the talk. Each advances with the clicker (hidden .st-step fragments)
   or by clicking an option. Data: demo-rewrite-data.js (window.REWRITE), demo-advisers-data.js
   (window.ADVISERS). Also the opening show of hands (.sem-poll). */
(function () {
  const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;");
  function el(tag, cls, html) { const n = document.createElement(tag); if (cls) n.className = cls; if (html != null) n.innerHTML = html; return n; }

  // Wire hidden fragments in the slide to a show(i) function.
  function stepper(root, n, show) {
    const section = root.closest("section");
    const sync = () => show(Math.min(section.querySelectorAll(".st-step.visible").length, n - 1));
    Reveal.on("fragmentshown", (e) => { if (e.fragment.classList.contains("st-step") && section.contains(e.fragment)) sync(); });
    Reveal.on("fragmenthidden", (e) => { if (e.fragment.classList.contains("st-step") && section.contains(e.fragment)) sync(); });
    Reveal.on("slidechanged", (e) => { if (e.currentSlide === section) sync(); });
    show(0);
  }

  function rewrite(root) {
    const D = window.REWRITE;
    const tabs = el("div", "st-tabs");
    const text = el("p", "rw-text");
    const note = el("p", "rw-note");
    const btns = D.versions.map((v, i) => {
      const b = el("button", "pt-btn", esc(v.label)); b.type = "button";
      b.addEventListener("click", () => { show(i); b.blur(); });
      tabs.append(b); return b;
    });
    function show(i) {
      const v = D.versions[i];
      btns.forEach((b, k) => b.classList.toggle("on", k === i));
      text.innerHTML = v.html;
      note.textContent = v.changed ? `${v.changed}. Highlighted: words not in the original.` : `First paragraph of a story from ${D.source}, as the author wrote it.`;
    }
    root.append(tabs, text, note);
    stepper(root, D.versions.length, show);
  }

  function advisers(root) {
    const D = window.ADVISERS;
    const post = el("p", "ad-post", `“${esc(D.post_excerpt)}”`);
    const list = el("div", "ad-list");
    const quote = el("blockquote", "ad-quote");
    const who = el("p", "ad-who");
    const tally = el("p", "ad-tally");
    const nV = D.models.filter((m) => m.verdict).length;
    const btns = D.models.map((m, i) => {
      const b = el("button", "ad-btn" + (m.verdict ? " v" : ""), esc(m.model_label)); b.type = "button";
      b.addEventListener("click", () => { show(i, list.classList.contains("marked")); b.blur(); });
      list.append(b); return b;
    });
    // m: model index or -1 for none; marked: show the verdict tally and colour every verdict.
    function show(m, marked) {
      btns.forEach((b, k) => b.classList.toggle("on", k === m));
      list.classList.toggle("marked", !!marked);
      tally.textContent = marked ? `${nV} of ${D.models.length} advisers pass a verdict on the partner.` : "";
      if (m < 0) { quote.innerHTML = ""; who.textContent = "Pick an adviser."; return; }
      const x = D.models[m];
      quote.innerHTML = `\u201c${esc(x.quote)}\u201d`;
      who.innerHTML = `<b>${esc(x.model_label)}</b> \u00b7 ${x.verdict ? '<span class="v">passes a verdict on the partner&rsquo;s character</span>' : "no verdict on the partner\u2019s character"}`;
    }
    root.append(post, el("div", "ad-cols", ""));
    root.querySelector(".ad-cols").append(list, el("div", "ad-right", ""));
    root.querySelector(".ad-right").append(quote, who, tally);
    // Clicker order: the hand-picked advisers in D.picks (indices into D.models), then the tally.
    stepper(root, D.picks.length + 2, (k) => (k === 0 ? show(-1, false) : k <= D.picks.length ? show(D.picks[k - 1], false) : show(D.picks[D.picks.length - 1], true)));
  }

  function poll(root) {
    const key = "talk-poll-v2";
    let state = {};
    try { state = JSON.parse(localStorage.getItem(key)) || {}; } catch (e) {}
    const opts = ["nobody", "a few", "about half", "most"];
    [...root.querySelectorAll("li")].forEach((li, i) => {
      const seg = el("span", "poll-seg");
      const draw = () => [...seg.children].forEach((b, k) => b.classList.toggle("on", state[i] === k));
      opts.forEach((o, k) => {
        const b = el("button", "", o); b.type = "button";
        b.addEventListener("click", () => {
          state[i] = state[i] === k ? undefined : k;
          try { localStorage.setItem(key, JSON.stringify(state)); } catch (e) {}
          draw(); b.blur(); callbacks();
        });
        seg.append(b);
      });
      li.append(seg); draw();
    });
  }

  // Later slides show the room's answer to one show-of-hands line next to a published figure
  // (div.sem-callback[data-poll=line]). The room's bar appears only once that line has a click.
  const ROOM = [["nobody", 0], ["a few", 15], ["about half", 50], ["most", 85]];
  const REFS = [
    { rows: [["US adults online with personal or emotional chats", 27, "27%"]], src: "Elon University poll, May 2026" },
    { rows: [["US adults using chatbots for support or advice", 10, "10%"], ["US adults under 30", 20, "20%"]], src: "Pew Research Center, survey of February 2026" },
    { rows: [["US employees who presented AI-generated content as their own", 50, "50%"]], src: "University of Melbourne and KPMG, US snapshot, survey of 2024\u201325" },
    { rows: [["Sociologists using generative AI in data analysis", 14, "14%"], ["Computational sociologists", 22, "22%"]], src: "Alvero, Stoltz, Stuhler and Taylor, Sociological Science (2026), survey of 433 authors" },
  ];
  function callbacks() {
    let state = {};
    try { state = JSON.parse(localStorage.getItem("talk-poll-v2")) || {}; } catch (e) {}
    document.querySelectorAll(".sem-callback[data-poll]").forEach((d) => {
      const i = +d.dataset.poll, k = state[i], ref = REFS[i];
      d.textContent = "";
      if (!ref) return;
      const rows = [];
      if (k !== undefined && k !== null && ROOM[k]) rows.push(["This room", ROOM[k][1], ROOM[k][0], "hi"]);
      ref.rows.forEach((r) => rows.push([r[0], r[1], r[2], ""]));
      const chart = el("div", "cb-chart");
      rows.forEach(([lab, v, txt, cls]) => {
        const bar = el("span", "cb-bar"), fill = el("i", cls);
        fill.style.width = v + "%"; bar.append(fill);
        chart.append(el("span", "cb-lab " + cls, lab), bar, el("b", cls, txt));
      });
      d.append(chart, el("div", "cb-src", ref.src));
    });
  }

  function init() {
    document.querySelectorAll(".sem-rewrite").forEach(rewrite);
    if (window.ADVISERS) document.querySelectorAll(".sem-advisers").forEach(advisers);
    document.querySelectorAll(".sem-poll").forEach(poll);
    callbacks();
  }
  if (Reveal.isReady && Reveal.isReady()) init(); else Reveal.on("ready", init);
})();
