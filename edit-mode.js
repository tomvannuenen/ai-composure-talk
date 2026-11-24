/* Edit mode: press E to edit the text and the speaker notes of the current slide, Cmd/Ctrl+S to save, Esc to cancel.
   Saving needs the edit server (tools/serve_edit.py); with a plain web server the page says so.
   The list of text blocks must match editable() in tools/serve_edit.py. */
(function () {
  const EDITABLE = "h1, h2, h3, h4, p, li, td, th, figcaption, blockquote";
  let active = null; // { section, els, before }

  function blocks(section) {
    return [...section.querySelectorAll(EDITABLE)].filter((el) =>
      !el.closest("aside") && !el.closest(".sem-perturb, .sem-rewrite, .sem-advisers") && !el.closest(".slide-masthead") && !el.querySelector(EDITABLE));
  }

  const bar = document.createElement("div");
  bar.className = "edit-bar";
  bar.innerHTML = '<span class="msg"></span><button type="button" data-a="save">Save</button><button type="button" data-a="cancel">Cancel</button>';
  document.addEventListener("DOMContentLoaded", () => document.body.append(bar));
  if (document.readyState !== "loading") document.body.append(bar);
  const msg = (s) => (bar.querySelector(".msg").textContent = s);

  // Speaker notes: shown in a box at the bottom while editing, one note per line.
  const notesBox = document.createElement("div");
  notesBox.style.cssText = "display:none; position:fixed; left:0; right:0; bottom:0; z-index:2000; background:#fffdf6; border-top:3px solid #7a2418; padding:10px 18px 14px; font:15px/1.4 -apple-system, Helvetica, Arial, sans-serif; color:#222; box-shadow:0 -6px 20px rgba(0,0,0,0.15);";
  notesBox.innerHTML = '<div style="margin:0 0 6px; font-weight:600;">Speaker notes for this slide <span style="font-weight:400; color:#666;">(one note per line; Cmd/Ctrl+S saves the slide and the notes, Esc cancels)</span></div><textarea rows="7" style="width:100%; box-sizing:border-box; font:16px/1.45 -apple-system, Helvetica, Arial, sans-serif; padding:8px 10px; border:1px solid #bbb; border-radius:6px; resize:vertical;"></textarea>';
  const notesArea = notesBox.querySelector("textarea");
  document.addEventListener("DOMContentLoaded", () => document.body.append(notesBox));
  if (document.readyState !== "loading") document.body.append(notesBox);
  function readNotes(section) {
    const aside = section.querySelector("aside.notes");
    if (!aside) return "";
    const lis = [...aside.querySelectorAll("li")];
    const lines = lis.length ? lis.map((li) => li.textContent) : [aside.textContent];
    return lines.map((t) => t.replace(/\s+/g, " ").trim()).filter(Boolean).join("\n");
  }
  function writeNotes(section, lines) {
    let aside = section.querySelector("aside.notes");
    if (!lines.length) { if (aside) aside.remove(); return; }
    if (!aside) { aside = document.createElement("aside"); aside.className = "notes"; section.append(aside); }
    const ul = document.createElement("ul");
    lines.forEach((t) => { const li = document.createElement("li"); li.textContent = t; ul.append(li); });
    aside.replaceChildren(ul);
  }

  function clean(el) {
    const c = el.cloneNode(true);
    c.querySelectorAll(".poll-seg").forEach((n) => n.remove());
    c.querySelectorAll("*").forEach((n) => {
      n.classList.remove("visible", "current-fragment");
      if (!n.className) n.removeAttribute("class");
      n.removeAttribute("contenteditable");
    });
    return c.innerHTML;
  }

  function start() {
    const section = Reveal.getCurrentSlide();
    if (!section || !section.dataset.noteId) { msg("This slide can't be edited here."); return; }
    if (section.classList.contains("iframe-slide")) { msg("Embedded demo: edit its own page instead."); return; }
    const els = blocks(section);
    section.querySelectorAll(".fragment").forEach((f) => f.classList.add("visible"));
    els.forEach((el) => { el.contentEditable = "true"; el.classList.add("editing"); });
    const notesBefore = readNotes(section);
    notesArea.value = notesBefore;
    notesBox.style.display = "block";
    active = { section, els, before: els.map(clean), notesBefore };
    document.body.classList.add("edit-on");
    msg(`Editing this slide (${els.length} text blocks). Cmd/Ctrl+S saves, Esc cancels.`);
    if (els[0]) els[0].focus();
  }

  function stop(restore) {
    if (!active) return;
    active.els.forEach((el, i) => {
      if (restore) el.innerHTML = active.before[i];
      el.removeAttribute("contenteditable");
      el.classList.remove("editing");
    });
    active = null;
    notesBox.style.display = "none";
    document.body.classList.remove("edit-on");
  }

  async function post(url, data) {
    const r = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
    return r.json().catch(() => ({ ok: false, error: "The edit server isn't running (see tools/serve_edit.py)." }));
  }

  async function save() {
    if (!active) return;
    const changes = [];
    active.els.forEach((el, i) => { const now = clean(el); if (now !== active.before[i]) changes.push({ index: i, html: now }); });
    const lines = notesArea.value.split("\n").map((t) => t.replace(/\s+/g, " ").trim()).filter(Boolean);
    const notesChanged = lines.join("\n") !== active.notesBefore;
    if (!changes.length && !notesChanged) { msg("No changes."); stop(false); return; }
    try {
      const done = [];
      if (changes.length) {
        const j = await post("/save", { noteId: active.section.dataset.noteId, count: active.els.length, changes });
        if (!j.ok) { msg("Not saved: " + j.error); return; }
        done.push(`${j.saved} text change(s)`);
      }
      if (notesChanged) {
        const j = await post("/save-notes", { noteId: active.section.dataset.noteId, lines });
        if (!j.ok) { msg("Notes not saved: " + j.error); return; }
        writeNotes(active.section, lines);
        done.push("the notes");
      }
      msg(`Saved ${done.join(" and ")}. A backup is in _edit_backups/.`);
      stop(false);
    } catch (e) {
      msg("Not saved: the edit server isn't running (see tools/serve_edit.py).");
    }
  }

  bar.addEventListener("click", (e) => {
    const a = e.target.dataset.a;
    if (a === "save") save();
    if (a === "cancel") { stop(true); msg("Cancelled."); }
  });
  document.addEventListener("keydown", (e) => {
    if (active && (e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "s") { e.preventDefault(); save(); return; }
    if (active && e.key === "Escape") { e.preventDefault(); e.stopPropagation(); stop(true); msg("Cancelled."); return; }
    if (!active && (e.key === "e" || e.key === "E") && !e.metaKey && !e.ctrlKey && !e.altKey && !e.target.isContentEditable && e.target.tagName !== "INPUT") {
      e.preventDefault(); e.stopPropagation(); start();
    }
  }, true);
  Reveal.on("slidechanged", () => { if (active) { stop(true); msg("Left the slide: edits cancelled."); } });
})();
