/* ===== VariMitra hero photo slider =====
   Auto-slides the hero background through the Wari photo set.
   Pauses on hover/focus and resumes, and supports manual dot navigation. */
(function(){
  var track = document.getElementById("heroTrack");
  var dots = document.querySelectorAll("#heroDots span");
  if(!track || !dots.length) return;

  var total = dots.length;
  var idx = 0;
  var timer = null;
  var intervalMs = 4200;

  function render(){
    track.style.transform = "translateX(-" + (idx * (100 / total)) + "%)";
    dots.forEach(function(d, j){ d.classList.toggle("active", j === idx); });
  }

  function go(i){
    idx = (i + total) % total;
    render();
  }

  function next(){ go(idx + 1); }

  function start(){
    stop();
    timer = setInterval(next, intervalMs);
  }
  function stop(){
    if(timer) clearInterval(timer);
    timer = null;
  }

  dots.forEach(function(d){
    d.addEventListener("click", function(){
      go(parseInt(d.getAttribute("data-i"), 10));
      start();
    });
  });

  var hero = track.closest(".hero");
  if(hero){
    hero.addEventListener("mouseenter", stop);
    hero.addEventListener("mouseleave", start);
  }

  render();
  start();
})();
