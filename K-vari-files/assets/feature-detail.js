(function(){
  var FEATURES = window.VariMitraFeatures || {};

  function getFeature(key){
    if(window.VariMitraGetFeature){
      return window.VariMitraGetFeature(key);
    }
    return FEATURES[key];
  }

  function qs(name){
    var m = new RegExp("[?&]" + name + "=([^&]*)").exec(location.search);
    return m ? decodeURIComponent(m[1]) : null;
  }

  function t(key){
    return window.VariMitraT ? window.VariMitraT(key) : key;
  }

  var savedUser = null;
  try {
    var raw = localStorage.getItem('varimitra_user');
    if (raw) savedUser = JSON.parse(raw);
  } catch(e){}

  var userRole = (savedUser && savedUser.role) ? savedUser.role : 'user';

  var key = qs("key");
  var back = qs("back") || (userRole === 'admin' ? "command-dashboard.html" : "varimitra.html");

  if (userRole === 'user' || (back.indexOf("command-dashboard") !== -1 && userRole !== 'admin')) {
    back = "varimitra.html";
  }

  function render(){
    var data = getFeature(key);

    var backLabel = back.indexOf("command-dashboard") !== -1
      ? t('common.backToDashboard')
      : t('common.backToPortal');
    var fdBack = document.getElementById("fdBack");
    if (fdBack) {
      fdBack.href = back;
      fdBack.innerHTML = '<i class="fa-solid fa-arrow-left"></i> ' + backLabel;
    }

    if (!data) {
      document.getElementById("fdTitle").textContent = t('common.featureNotFound');
      document.getElementById("fdDesc").textContent = t('common.featureNotFoundDesc');
      var body = document.querySelector(".fd-body");
      if (body) body.style.display = "none";
      return;
    }

    if (key === "profile" && savedUser) {
      var name = savedUser.name || "Pilgrim Devotee";
      var phone = savedUser.phone || "";
      var age = savedUser.age || "N/A";
      var yatriId = phone ? ("VM" + phone.slice(-6)) : "VM2506120815";

      data = Object.assign({}, data, {
        title: name + "'s Profile",
        desc: "Verified Pilgrim Identity — Full Name: " + name + " | Mobile: +91 " + (phone || "N/A") + (age && age !== "N/A" ? " | Age: " + age : "") + " | Role: Pilgrim / Devotee",
        stats: [
          { value: name, label: t('login.fullName') },
          { value: phone ? ("+91 " + phone) : "N/A", label: t('login.mobile') },
          { value: (age && age !== "N/A") ? (age + " yrs") : "N/A", label: t('login.age') },
          { value: yatriId, label: t('pilgrim.yatriId').replace(':', '') }
        ],
        points: [
          t('login.fullName') + ": " + name,
          t('login.mobile') + ": " + (phone ? ("+91 " + phone) : "Not specified"),
          t('login.age') + ": " + age,
          "Role: Pilgrim / Devotee",
          t('pilgrim.yatriId') + " " + yatriId
        ]
      });
    }

    document.title = "VariMitra — " + data.title;

    var hero = document.getElementById("fdHero");
    if (hero) hero.style.background = "linear-gradient(135deg, " + data.color + ", " + shade(data.color, -28) + ")";

    var fdTag = document.getElementById("fdTag");
    if (fdTag) fdTag.textContent = data.tag || t('common.feature');
    var fdIcon = document.getElementById("fdIcon");
    if (fdIcon) fdIcon.innerHTML = '<i class="' + data.icon + '"></i>';
    var fdTitle = document.getElementById("fdTitle");
    if (fdTitle) fdTitle.textContent = data.title;
    var fdDesc = document.getElementById("fdDesc");
    if (fdDesc) fdDesc.textContent = data.desc;
    var fdLong = document.getElementById("fdLong");
    if (fdLong) fdLong.textContent = data.long || data.desc;

    var statsWrap = document.getElementById("fdStats");
    if (statsWrap && data.stats && data.stats.length) {
      statsWrap.innerHTML = data.stats.map(function(s){
        return '<div class="fd-stat"><b>' + s.value + '</b><span>' + s.label + '</span></div>';
      }).join("");
    }

    var hWrap = document.getElementById("fdHighlights");
    if (hWrap) {
      hWrap.innerHTML = (data.points || []).map(function(p, i){
        return '<div class="fd-hcard"><div class="num" style="background:' + data.color + '">' + (i+1) + '</div><p>' + p + '</p></div>';
      }).join("");
    }

    var ctaBtn = document.getElementById("fdCtaBtn");
    var ctaText = document.getElementById("fdCtaText");
    if (ctaText && ctaBtn) {
      if (userRole === 'admin') {
        ctaText.textContent = t('pilgrim.manageCta').replace('{title}', data.title);
        ctaBtn.href = "command-dashboard.html";
        ctaBtn.textContent = t('pilgrim.backDashboard');
      } else {
        ctaText.textContent = t('pilgrim.exploreCta').replace('{title}', data.title);
        ctaBtn.href = "varimitra.html";
        ctaBtn.textContent = t('pilgrim.backPortal');
      }
    }

    var relWrap = document.getElementById("fdRelated");
    if (relWrap) {
      var related = Object.keys(FEATURES).filter(function(k){
        return k !== key && FEATURES[k].audience === data.audience;
      });
      var picked = [];
      var startIdx = Math.abs(hashCode(key)) % (related.length || 1);
      for(var i = 0; i < related.length && picked.length < 3; i++){
        picked.push(related[(startIdx + i) % related.length]);
      }
      relWrap.innerHTML = picked.map(function(k){
        var f = getFeature(k);
        return '<a class="fd-rcard" href="feature.html?key=' + encodeURIComponent(k) + '&back=' + encodeURIComponent(back) + '">' +
          '<div class="ic" style="background:' + f.color + '"><i class="' + f.icon + '"></i></div>' +
          '<b>' + f.title + '</b><span>' + f.desc + '</span></a>';
      }).join("");
    }
  }

  function hashCode(str){
    var h = 0;
    for(var i = 0; i < str.length; i++){ h = ((h << 5) - h) + str.charCodeAt(i); h |= 0; }
    return h;
  }

  function shade(hex, percent){
    hex = hex.replace("#", "");
    if(hex.length === 3) hex = hex.split("").map(function(c){ return c+c; }).join("");
    var num = parseInt(hex, 16);
    var r = Math.min(255, Math.max(0, (num >> 16) + Math.round(2.55 * percent)));
    var g = Math.min(255, Math.max(0, ((num >> 8) & 0x00FF) + Math.round(2.55 * percent)));
    var b = Math.min(255, Math.max(0, (num & 0x0000FF) + Math.round(2.55 * percent)));
    return "#" + (0x1000000 + r*0x10000 + g*0x100 + b).toString(16).slice(1);
  }

  var data = getFeature(key);
  if (data && data.audience === 'admin' && userRole === 'user') {
    location.href = "varimitra.html";
    return;
  }

  render();
  document.addEventListener('varimitra:langchange', render);
})();
