/* ===== VariMitra i18n engine ===== */
(function(){

  var STORAGE_KEY = "varimitra_lang";
  var SUPPORTED = ["en", "mr", "hi"];
  var LANG_LABELS = { en: "English", mr: "मराठी", hi: "हिंदी" };

  function getLang(){
    var lang = localStorage.getItem(STORAGE_KEY) || "en";
    return SUPPORTED.indexOf(lang) >= 0 ? lang : "en";
  }

  function setLang(lang){
    if(SUPPORTED.indexOf(lang) < 0) return;
    localStorage.setItem(STORAGE_KEY, lang);
    apply();
    document.dispatchEvent(new CustomEvent("varimitra:langchange", {
      detail: { lang: lang }
    }));
  }

  function t(key){
    var lang = getLang();
    var dict = window.VariMitraTranslations || {};
    var parts = key.split(".");
    var val = dict[lang];
    var i;

    for(i = 0; i < parts.length && val; i++){
      val = val[parts[i]];
    }

    if(val === undefined && lang !== "en"){
      val = dict.en;
      for(i = 0; i < parts.length && val; i++){
        val = val[parts[i]];
      }
    }

    return val !== undefined ? val : key;
  }

  function getFeature(key){
    var base = (window.VariMitraFeatures || {})[key];
    if(!base) return null;

    var lang = getLang();
    if(lang === "en") return base;

    var tr = ((window.VariMitraFeatureTranslations || {})[lang] || {})[key];
    if(!tr) return base;

    return Object.assign({}, base, tr);
  }

  function apply(){
    var lang = getLang();
    document.documentElement.lang = lang === "mr" ? "mr" : (lang === "hi" ? "hi" : "en");

    document.querySelectorAll("[data-i18n]").forEach(function(el){
      el.textContent = t(el.getAttribute("data-i18n"));
    });

    document.querySelectorAll("[data-i18n-html]").forEach(function(el){
      el.innerHTML = t(el.getAttribute("data-i18n-html"));
    });

    document.querySelectorAll("[data-i18n-placeholder]").forEach(function(el){
      el.placeholder = t(el.getAttribute("data-i18n-placeholder"));
    });

    document.querySelectorAll("[data-i18n-title]").forEach(function(el){
      el.title = t(el.getAttribute("data-i18n-title"));
    });

    document.querySelectorAll("[data-i18n-aria]").forEach(function(el){
      el.setAttribute("aria-label", t(el.getAttribute("data-i18n-aria")));
    });

    document.querySelectorAll(".lang-pick-label").forEach(function(el){
      el.textContent = LANG_LABELS[lang];
    });

    var modalOk = document.getElementById("vmModalOk");
    if(modalOk) modalOk.textContent = t("common.gotIt");

    document.querySelectorAll(".lang-option").forEach(function(btn){
      btn.classList.toggle("active", btn.getAttribute("data-lang") === lang);
    });
  }

  function initLanguagePickers(){
    document.querySelectorAll(".lang-pick").forEach(function(pick){
      if(pick.getAttribute("data-i18n-ready")) return;
      pick.setAttribute("data-i18n-ready", "1");
      pick.removeAttribute("data-modal");
      pick.removeAttribute("data-feature");
      pick.setAttribute("role", "button");
      pick.setAttribute("tabindex", "0");

      var menu = document.createElement("div");
      menu.className = "lang-menu";
      menu.innerHTML =
        '<button type="button" class="lang-option" data-lang="en">English</button>' +
        '<button type="button" class="lang-option" data-lang="mr">मराठी</button>' +
        '<button type="button" class="lang-option" data-lang="hi">हिंदी</button>';

      var label = pick.querySelector(".lang-pick-label");
      if(!label){
        var text = pick.textContent.trim();
        pick.innerHTML = pick.innerHTML;
        var globe = pick.querySelector("i.fa-globe, i.fa-earth-americas");
        pick.innerHTML = "";
        if(globe) pick.appendChild(globe);
        label = document.createElement("span");
        label.className = "lang-pick-label";
        label.textContent = LANG_LABELS[getLang()];
        pick.appendChild(label);
        var chev = document.createElement("i");
        chev.className = "fa-solid fa-chevron-down";
        chev.style.fontSize = "9px";
        pick.appendChild(chev);
      }

      pick.appendChild(menu);

      function toggleMenu(open){
        pick.classList.toggle("open", open);
      }

      pick.addEventListener("click", function(e){
        if(e.target.closest(".lang-option")){
          e.stopPropagation();
          setLang(e.target.closest(".lang-option").getAttribute("data-lang"));
          toggleMenu(false);
          return;
        }
        e.stopPropagation();
        toggleMenu(!pick.classList.contains("open"));
      });

      pick.addEventListener("keydown", function(e){
        if(e.key === "Enter" || e.key === " "){
          e.preventDefault();
          toggleMenu(!pick.classList.contains("open"));
        }
        if(e.key === "Escape") toggleMenu(false);
      });
    });

    document.addEventListener("click", function(){
      document.querySelectorAll(".lang-pick.open").forEach(function(p){
        p.classList.remove("open");
      });
    });
  }

  function initLoginSwitcher(){
    var box = document.getElementById("loginLangSwitcher");
    if(!box) return;

    box.innerHTML =
      '<button type="button" class="lang-option' + (getLang() === "en" ? " active" : "") + '" data-lang="en">English</button>' +
      '<button type="button" class="lang-option' + (getLang() === "mr" ? " active" : "") + '" data-lang="mr">मराठी</button>' +
      '<button type="button" class="lang-option' + (getLang() === "hi" ? " active" : "") + '" data-lang="hi">हिंदी</button>';

    box.querySelectorAll(".lang-option").forEach(function(btn){
      btn.addEventListener("click", function(){
        setLang(btn.getAttribute("data-lang"));
        initLoginSwitcher();
      });
    });
  }

  window.VariMitraI18n = {
    getLang: getLang,
    setLang: setLang,
    t: t,
    getFeature: getFeature,
    apply: apply
  };
  window.VariMitraGetFeature = getFeature;
  window.VariMitraT = t;

  function boot(){
    initLanguagePickers();
    initLoginSwitcher();
    apply();
  }

  if(document.readyState === "loading"){
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }

})();
