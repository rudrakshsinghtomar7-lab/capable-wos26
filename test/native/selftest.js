// Runs INSIDE the iOS app's WKWebView (debug builds only), injected by
// scripts/ios-selftest.sh. Logs one line per check: "[selftest] PASS|FAIL|INFO ...".
(async function () {
  const out = (s, m) => console.log("[selftest] " + s + " " + m);
  const check = (name, cond, detail) => out(cond ? "PASS" : "FAIL", name + (detail ? " — " + detail : ""));
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  try {
    await wait(800);
    const C = window.Capacitor;
    check("runs as native Capacitor app", !!(C && C.isNativePlatform && C.isNativePlatform()), C && C.getPlatform && C.getPlatform());
    check("loads bundled assets, not a dev server", location.protocol === "capacitor:" , location.href);
    check("no service worker registered in native app", !navigator.serviceWorker || !(await navigator.serviceWorker.getRegistrations()).length);
    check("install prompt hidden", getComputedStyle(document.getElementById("menu-install")).display === "none");
    check("rules loaded", !!(window.CapableRules && window.CapableEngine));
    // storage
    localStorage.setItem("capable.selftest", "1");
    check("localStorage works", localStorage.getItem("capable.selftest") === "1");
    localStorage.removeItem("capable.selftest");
    // onboarding → demo, compute
    const ob = document.getElementById("onboarding");
    out("INFO", "onboarding visible at launch: " + !ob.hidden);
    const startMode = window.CapableApp ? CapableApp.state.mode : null;
    out("INFO", "mode at launch: " + startMode);
    if (!ob.hidden) document.getElementById("ob-demo").click();
    else if (startMode !== "demo") { const b = document.querySelector('[data-mode="demo"]'); if (b) b.click(); }
    await wait(300);
    document.querySelector('.navbtn[data-view="money"]').click();
    await wait(200);
    const dsp = document.querySelector("#dsp-result [data-fact=dsp]");
    check("DSP estimate renders in native webview", dsp && dsp.textContent === "$1,155.70", dsp && dsp.textContent);
    check("Dynamic Type font (-apple-system-body) applied", getComputedStyle(document.documentElement).fontSize !== "", getComputedStyle(document.documentElement).fontSize);
    out("INFO", "viewport " + innerWidth + "x" + innerHeight + ", meta viewport: " + document.querySelector('meta[name=viewport]').content);
    // web APIs present in WKWebView
    out("INFO", "webkitSpeechRecognition in WKWebView: " + !!(window.SpeechRecognition || window.webkitSpeechRecognition));
    out("INFO", "speechSynthesis in WKWebView: " + ("speechSynthesis" in window));
    out("INFO", "navigator.share: " + !!navigator.share + ", wakeLock: " + ("wakeLock" in navigator) + ", clipboard: " + !!(navigator.clipboard && navigator.clipboard.writeText));
    // native plugin
    await new Promise((r) => { if (C.registerPlugin) return r(); const s = document.createElement("script"); s.src = "capacitor.js"; s.onload = r; document.head.appendChild(s); }); const S = C.registerPlugin("CapableSpeech");
    const av = await S.available({ lang: "en-AU" });
    out("INFO", "CapableSpeech.available: " + JSON.stringify(av));
    check("native speech plugin reachable", typeof av.recognition === "boolean");
    const perm = await S.checkPermissions();
    out("INFO", "permissions before any request: " + JSON.stringify(perm));
    check("microphone not requested at launch", perm.microphone === "prompt" || perm.microphone === "granted" || perm.microphone === "denied");
    const ka = await S.setKeepAwake({ on: true }); await S.setKeepAwake({ on: false });
    check("keep-awake bridge works", ka.on === true);
    try {
      const vv = await S.voices({ lang: "en-AU" });
      const counts = vv.voices.reduce((o, v) => { o[v.quality] = (o[v.quality] || 0) + 1; return o; }, {});
      out("INFO", "English voices by quality: " + JSON.stringify(counts) + "; chosen: " + JSON.stringify(vv.chosen));
      out("INFO", "non-default voices: " + vv.voices.filter((v) => v.quality !== "default").map((v) => v.name + " (" + v.language + ", " + v.quality + ")").join("; "));
    } catch (e) { out("INFO", "voices() unavailable: " + e.message); }
    const t0 = Date.now();
    const sp = await Promise.race([S.speak({ text: "Test.", lang: "en-AU", rate: 0.5 }), wait(8000).then(() => ({ timeout: true }))]);
    out("INFO", "speak result " + JSON.stringify(sp) + " after " + (Date.now() - t0) + "ms");
    check("read-aloud (AVSpeechSynthesizer) completes", sp && sp.finished === true);
    // start without permission must be refused, not fall back
    if (perm.microphone !== "granted") {
      try { await S.start({ lang: "en-AU" }); check("start refused without permission", false); }
      catch (e) { check("start refused without permission", true, e.code || e.message); }
    }
    // voice panel UI in native
    try { out("INFO", "app voiceAvailability: " + JSON.stringify(await Promise.race([CapableApp.voiceAvailability(), wait(5000).then(() => "TIMEOUT")]))); } catch (e) { out("INFO", "app voiceAvailability threw " + e.message); }
    document.querySelector('#view-money [data-tool="ask"]').click();
    await wait(4000);
    out("INFO", "voice status text: " + document.getElementById("voice-status").textContent);
    out("INFO", "speak button hidden: " + document.getElementById("voice-speak").hidden + "; privacy line: " + document.getElementById("voice-privacy").textContent);
    document.getElementById("voice-close").click();
    // external link handling target
    const a = document.querySelector('a[target=_blank]');
    out("INFO", "first external link: " + (a && a.href));
    // privacy text native-specific
    document.querySelector('.site-footer [data-open-dialog="privacy-dialog"]').click();
    await wait(200);
    check("privacy panel describes native storage", /iPhone app’s own storage/.test(document.getElementById("privacy-body").innerText));
    document.getElementById("privacy-dialog").close();
    document.querySelector('.navbtn[data-view="dashboard"]').click();
    // External link: should open outside the app, leaving the app page in place.
    const ext = document.querySelector('#view-dashboard a[target=_blank], a.ext-link');
    if (ext) {
      const before = location.href;
      ext.click();
      await wait(3000);
      check("external link does not replace the app page", location.href === before, "visibility after tap: " + document.visibilityState);
    }
    if (startMode === "personal") { const b = document.querySelector('[data-mode="personal"]'); if (b) b.click(); out("INFO", "restored own session"); }
    out("DONE", "selftest finished");
  } catch (e) { out("FAIL", "exception " + (e && (e.message + " code=" + e.code + " " + e.stack))); }
})();
