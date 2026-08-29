/* ===== VariMitra shared interactive layer =====
   Reads feature content from assets/features-data.js (must be
   loaded first). Elements tagged data-feature="key" navigate to
   the full feature page (the "bigger picture"). Elements with
   only data-title/data-body (one-off data points like a single
   alert, a table row, a live stat) still show a quick popup,
   since there's no dedicated page for a single data point. */

(function(){

  var FEATURES = window.VariMitraFeatures || {};

  function getFeature(key){
    if(window.VariMitraGetFeature){
      return window.VariMitraGetFeature(key);
    }
    return FEATURES[key];
  }

  /* ---------- Navigation for real features ---------- */
  /* Absolute, because the merged app routes are "/varimitra" rather than
     "varimitra.html" — the last path segment alone would resolve relative to
     whatever page is asking. */
  function currentPage(){
    return location.pathname || "/";
  }

  function goToFeature(key){
    var back = currentPage();
    if(key === "eticketing"){
      if(window.reactNavigate) { window.reactNavigate("/darshan-booking?back=" + encodeURIComponent(back)); } else { location.href = "/darshan-booking?back=" + encodeURIComponent(back); }
      return;
    }
    if(window.reactNavigate) { window.reactNavigate("/feature?key=" + encodeURIComponent(key) + "&back=" + encodeURIComponent(back)); } else { location.href = "/feature?key=" + encodeURIComponent(key) + "&back=" + encodeURIComponent(back); }
  }

  /* ---------- Quick popup engine (for one-off data points only) ---------- */
  var overlay, icEl, tagEl, titleEl, bodyEl;

  function inject(){
    var wrap = document.createElement("div");
    wrap.innerHTML =
      '<div class="vm-modal-overlay" id="vmModalOverlay">' +
        '<div class="vm-modal" role="dialog" aria-modal="true" aria-labelledby="vmModalTitle">' +
          '<div class="vm-modal-head">' +
            '<div class="vm-modal-ic" id="vmModalIcon"><i></i></div>' +
            '<div class="vm-modal-titlewrap">' +
              '<span class="vm-modal-tag" id="vmModalTag"></span>' +
              '<h3 class="vm-modal-title" id="vmModalTitle"></h3>' +
            '</div>' +
            '<button class="vm-modal-close" id="vmModalClose" aria-label="Close"><i class="fa-solid fa-xmark"></i></button>' +
          '</div>' +
          '<div class="vm-modal-body" id="vmModalBody"></div>' +
          '<div class="vm-modal-foot"><button id="vmModalOk">' + (window.VariMitraT ? window.VariMitraT('common.gotIt') : 'Got it') + '</button></div>' +
        '</div>' +
      '</div>';
    document.body.appendChild(wrap.firstChild);
    overlay = document.getElementById("vmModalOverlay");
    icEl = document.getElementById("vmModalIcon");
    tagEl = document.getElementById("vmModalTag");
    titleEl = document.getElementById("vmModalTitle");
    bodyEl = document.getElementById("vmModalBody");

    document.getElementById("vmModalClose").addEventListener("click", closePopup);
    document.getElementById("vmModalOk").addEventListener("click", closePopup);
    overlay.addEventListener("click", function(e){ if(e.target === overlay) closePopup(); });
    document.addEventListener("keydown", function(e){ if(e.key === "Escape") closePopup(); });
  }

  function openPopup(data){
    if(!overlay) inject();
    icEl.style.background = data.color || "#E8630C";
    icEl.innerHTML = '<i class="' + (data.icon || "fa-solid fa-circle-info") + '"></i>';
    tagEl.textContent = data.tag || "";
    titleEl.textContent = data.title || "Details";
    bodyEl.innerHTML = data.desc ? "<p>" + data.desc + "</p>" : "";
    overlay.classList.add("open");
  }

  function closePopup(){
    if(overlay) overlay.classList.remove("open");
  }

  /* ---------- Dispatch ---------- */
  function handleTrigger(el){
    var key = el.getAttribute("data-feature");
    if(key && getFeature(key)){
      goToFeature(key);
      return;
    }
    openPopup({
      icon: el.getAttribute("data-icon") || "fa-solid fa-circle-info",
      color: el.getAttribute("data-color") || "#E8630C",
      tag: el.getAttribute("data-tag") || "",
      title: el.getAttribute("data-title") || "Details",
      desc: el.getAttribute("data-body") || ""
    });
  }

  document.addEventListener("click", function(e){
    var el = e.target.closest("[data-modal]");
    if(!el) return;
    if(el.tagName === "A") e.preventDefault();
    handleTrigger(el);
  });

  document.addEventListener("keydown", function(e){
    if(e.key !== "Enter" && e.key !== " ") return;
    var el = e.target.closest("[data-modal]");
    if(!el) return;
    e.preventDefault();
    handleTrigger(el);
  });

})();
