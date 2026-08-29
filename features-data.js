/* ===== VariMitra shared feature data =====
   Single source of truth for every feature's content — used by
   the click-handler (assets/features.js) to know where to send
   people, and by the full detail page (feature.html) to render
   the "bigger picture" view. Grounded in the Varithon PDR deck. */

(function(){

  var FEATURES = {

    /* ---------- Pilgrim-facing ---------- */
    "whatsapp": {
      icon:"fa-brands fa-whatsapp", color:"#1F9D55", audience:"pilgrim",
      tag:"Pilgrim-Facing Digital Companion",
      title:"WhatsApp & Voice Access",
      desc:"Talk to VariMitra the way you'd talk to family — over WhatsApp, in your own language, with nothing to install.",
      long:"VariMitra's digital companion lives where pilgrims already are: WhatsApp. Built on the official WhatsApp Business API, it offers a guided, low-learning-curve menu alongside a natural-language and voice assistant, so first-time yatris and lifelong Wari veterans alike can book, ask and get help without downloading anything new.",
      points:["Guided, low-learning-curve menu for every pilgrim","Voice & natural-language assistant in Marathi, Hindi & English","Built on the official WhatsApp Business API","Darshan slot booking with instant QR confirmation","Create a group, invite members & share live location"],
      stats:[{value:"10L+",label:"Pilgrims Reachable"},{value:"3",label:"Languages Supported"},{value:"0",label:"App Downloads Needed"}]
    },
    "eticketing": {
      icon:"fa-solid fa-ticket", color:"#7C3AED", audience:"pilgrim",
      tag:"Darshan & Booking",
      title:"e-Ticketing & Darshan Updates",
      desc:"Live slot booking and queue information, delivered straight to your phone — no standing in the wrong line.",
      long:"e-Ticketing turns darshan planning from guesswork into a booking. Pilgrims see live slot availability the moment it opens up, confirm in one tap, and carry a QR pass that speeds up entry at the gate — while VariMitra keeps them updated on queue length in real time.",
      points:["Real-time darshan slot availability across temples","Instant QR-code booking confirmation","Live queue length & wait-time updates","Digital ticket wallet with full booking history"],
      stats:[{value:"2",label:"Active Bookings (avg.)"},{value:"<1 min",label:"To Confirm a Slot"},{value:"200+",label:"Temples Covered"}]
    },
    "crowd-safety": {
      icon:"fa-solid fa-chart-simple", color:"#2563EB", audience:"pilgrim",
      tag:"Safety & Operations",
      title:"Crowd & Safety Analytics",
      desc:"AI-powered crowd monitoring and hazard detection keep every ghat and gate visible in real time.",
      long:"Every camera along the Wari route feeds a crowd-density and hazard-detection model. Pilgrims see a simple density read-out and wait time before they walk into a zone; the same model powers the risk-scoring engine that alerts the command centre the moment a zone turns critical.",
      points:["Live crowd-density heatmaps by zone","AI hazard & risk-scoring alerts","Estimated wait times updated continuously","Instant push alerts when a zone turns critical"],
      stats:[{value:"82%",label:"Current Peak Density"},{value:"90–120 min",label:"Est. Wait, Main Gate"},{value:"24×7",label:"Live Monitoring"}]
    },
    "group-location": {
      icon:"fa-solid fa-people-group", color:"#7C3AED", audience:"pilgrim",
      tag:"Stay Together",
      title:"Group Location Sharing",
      desc:"Create or join a family / group yatra and keep everyone's location visible to each other, priority-first.",
      long:"Family separation is one of the most common Wari incidents. Group Location Sharing lets a family or group create a shared yatra, see each member's live position with priority-first accuracy, and get alerted instantly if someone drifts out of range.",
      points:["Create a group and invite members in seconds","Priority-first location sharing so families never lose each other","Group chat & shared alerts","Quick 'find my group' on the live map"],
      stats:[{value:"4",label:"Family Members (avg. group)"},{value:"1-tap",label:"To Invite & Join"},{value:"Live",label:"Location Refresh"}]
    },
    "cameras-monitoring": {
      icon:"fa-solid fa-camera", color:"#0EA5A5", audience:"pilgrim",
      tag:"Safety & Operations",
      title:"Cameras & System Monitoring",
      desc:"Continuous uptime checks and health monitoring keep the camera network — and every service depending on it — reliable.",
      long:"Crowd analytics, incident detection and the live darshan feed all depend on cameras staying online. This layer continuously checks uptime and health across the network, samples frames for the AI models, and flags faults before they become blind spots.",
      points:["Live health status for every CCTV feed","Automatic fault detection & maintenance alerts","Frame sampling feeds the crowd & hazard AI models","24×7 uptime dashboard for operations teams"],
      stats:[{value:"99.4%",label:"Network Uptime"},{value:"24×7",label:"Health Monitoring"},{value:"Auto",label:"Fault Detection"}]
    },
    "heritage-hub": {
      icon:"fa-solid fa-book-open", color:"#6B4A2E", audience:"pilgrim",
      tag:"Heritage & Culture",
      title:"Heritage & Archive Hub",
      desc:"Abhang, stories and the living heritage of Vari — preserved digitally and always within reach.",
      long:"Beyond safety and logistics, VariMitra preserves what makes the Wari worth walking: its stories. The AI Heritage Guide and Abhang Assistant bring the history of Sant Dnyaneshwar, temple rituals and cultural traditions to every pilgrim's phone, with location-aware content along the route.",
      points:["AI Heritage Guide on Vari, Sant Dnyaneshwar & rituals","AI Abhang Assistant to read, listen & explore","Location-aware cultural content along your route","Digitised archive of stories, photos & traditions"],
      stats:[{value:"200+","label":"Temples & Locations"},{value:"Digitised",label:"Abhang Archive"},{value:"Location-aware",label:"Cultural Content"}]
    },
    "lost-found": {
      icon:"fa-solid fa-briefcase", color:"#8B1B1B", audience:"pilgrim",
      tag:"Pilgrim Services",
      title:"Lost & Found Services",
      desc:"Report a lost person or item, or check on one already reported — fast, with photo support.",
      long:"In a crowd of lakhs, losing a person or item is one of the most stressful moments of the Wari. VariMitra lets pilgrims report either with a photo, tracks the case by ticket number, and alerts the reporter the moment a match is found nearby.",
      points:["Report lost persons or items with a photo","Track your report's status by ticket number","Search items already found nearby","Alerts sent the moment a match is found"],
      stats:[{value:"Photo-based",label:"Reporting"},{value:"Live",label:"Ticket Status"},{value:"Auto",label:"Match Alerts"}]
    },
    "medical-help": {
      icon:"fa-solid fa-truck-medical", color:"#D64545", audience:"pilgrim",
      tag:"Safety & Operations",
      title:"Medical Help & Emergency",
      desc:"24×7 medical assistance — the nearest responder is dispatched automatically the moment you ask for help.",
      long:"One tap from WhatsApp or the web portal raises a medical request that goes straight into the command centre's dispatch queue. The nearest medical team is routed automatically with a live ETA, and pilgrims can see healthcare-centre occupancy before they even set out.",
      points:["One-tap medical request from WhatsApp or the app","Nearest medical team auto-dispatched with live ETA","Direct emergency call to 112","Healthcare centre occupancy visible before you go"],
      stats:[{value:"18",label:"Cases Handled Today"},{value:"3 min",label:"Avg. Response ETA"},{value:"112",label:"Direct Emergency Line"}]
    },
    "route-weather": {
      icon:"fa-solid fa-map-location-dot", color:"#1F9D55", audience:"pilgrim",
      tag:"Yatra Planning",
      title:"Route & Weather Updates",
      desc:"Yatra routes, distances, facilities and live weather — everything you need before you set out.",
      long:"Before setting out on any leg of the Wari, pilgrims can check the route, distance and nearby facilities like water points and shelters, plus live weather along the path — with instant alerts if a diversion or closure changes the plan.",
      points:["Turn-by-turn yatra route guidance","Live weather along your path","Nearby facilities: water points, shelters, toilets","Diversion & closure alerts in real time"],
      stats:[{value:"28°C",label:"Current Temperature"},{value:"32",label:"Water Points Live"},{value:"Real-time",label:"Diversion Alerts"}]
    },
    "multilingual": {
      icon:"fa-solid fa-language", color:"#2563EB", audience:"pilgrim",
      tag:"Inclusive Access",
      title:"Multilingual Access",
      desc:"VariMitra speaks the way you do — switch languages any time, on any service.",
      long:"Inclusive access was a core design goal: voice and text support in Marathi, Hindi and English (with more on the way) so elderly and low-literacy pilgrims aren't left out. The same language choice applies everywhere — web, WhatsApp and the voice assistant.",
      points:["Marathi, Hindi, English and more","Voice & text support for elderly and low-literacy pilgrims","Same experience across WhatsApp, web & voice","One-tap language switch, no restart needed"],
      stats:[{value:"5+",label:"Languages"},{value:"1-tap",label:"To Switch"},{value:"Voice + Text",label:"Both Supported"}]
    },
    "live-darshan": {
      icon:"fa-solid fa-play", color:"#D64545", audience:"pilgrim",
      tag:"Pilgrim Services",
      title:"Live Darshan Stream",
      desc:"Watch darshan live from Pandharpur and partner temples, wherever you are in the crowd.",
      long:"Not everyone can reach the front of the queue at the moment darshan happens. The live stream brings Pandharpur and partner temple feeds to every pilgrim's phone, alongside queue status, so no one misses the moment they walked for.",
      points:["Live HD darshan feed, updated continuously","Multiple temple feeds in one place","Queue status shown alongside the stream","Get notified when your booked slot is near"],
      stats:[{value:"Live",label:"HD Stream"},{value:"Multiple",label:"Temple Feeds"},{value:"Auto",label:"Slot Reminders"}]
    },
    "help-support": {
      icon:"fa-solid fa-hand", color:"#E8630C", audience:"pilgrim",
      tag:"Support",
      title:"Help & I Need Help",
      desc:"A single tap connects you to the right kind of help — medical, safety, lost & found or a human volunteer.",
      long:"When a pilgrim isn't sure which service they need, Help routes the request to the right place — medical, safety, lost & found, or a human volunteer — and tracks it until it's resolved, over WhatsApp, voice or the web.",
      points:["Guided help menu for any situation","Escalates automatically to the nearest volunteer team","Works over WhatsApp, voice or the web portal","Every request is tracked until resolved"],
      stats:[{value:"248",label:"Volunteers Ready"},{value:"Any channel",label:"WhatsApp, Voice, Web"},{value:"Tracked",label:"Until Resolved"}]
    },
    "profile": {
      icon:"fa-solid fa-user", color:"#E8630C", audience:"pilgrim",
      tag:"My Account",
      title:"Yatri Profile",
      desc:"Your verified pilgrim identity — bookings, group members and reports, all in one place.",
      long:"A single verified Yatri ID follows a pilgrim across every service — faster check-ins at the gate, all active bookings and QR passes in one wallet, family or group membership, and the status of anything they've reported.",
      points:["Verified Yatri ID for faster check-ins","Active bookings & QR passes","Family / group membership","Your submitted reports & their status"],
      stats:[{value:"2",label:"Active Bookings"},{value:"4",label:"Family Members"},{value:"Verified",label:"Yatri ID"}]
    },
    "language": {
      icon:"fa-solid fa-globe", color:"#2563EB", audience:"pilgrim",
      tag:"Preferences",
      title:"Choose Your Language",
      desc:"Switch the interface language for the whole platform — website, WhatsApp and voice assistant together.",
      long:"Language choice is applied once and carried everywhere — the website, WhatsApp assistant and voice guide all switch together, so pilgrims never have to reconfigure a service mid-conversation.",
      points:["मराठी · हिंदी · English · தமிழ் · తెలుగు and more","Applies instantly across every VariMitra service","Voice assistant matches your chosen language"],
      stats:[{value:"5+",label:"Languages"},{value:"Instant",label:"Switch"}]
    },
    "notifications": {
      icon:"fa-regular fa-bell", color:"#D64545", audience:"pilgrim",
      tag:"Alerts & Updates",
      title:"Notifications",
      desc:"Every crowd, weather, route and seva alert relevant to your yatra, in one feed.",
      long:"Rather than pilgrims having to check separately, VariMitra pushes crowd, weather, route-diversion and seva updates straight to them the moment conditions change, with full detail one tap away.",
      points:["Real-time crowd & safety alerts","Weather and route-diversion updates","Seva & facility announcements","Tap any alert for full details"],
      stats:[{value:"9+",label:"Alerts Today"},{value:"Real-time",label:"Delivery"}]
    },
    "services-menu": {
      icon:"fa-solid fa-grip", color:"#7C3AED", audience:"pilgrim",
      tag:"Navigation",
      title:"Services",
      desc:"Everything VariMitra offers for pilgrims, grouped in one menu.",
      long:"The Services menu is the front door to every pilgrim-facing capability — booking, safety, route planning, and support — organised so a first-time user finds what they need in one tap.",
      points:["Darshan Slot Booking","Live Crowd Status & Safety","Route & Weather Updates","Lost & Found · Medical Help"],
      stats:[]
    },
    "yatra-menu": {
      icon:"fa-solid fa-route", color:"#1F9D55", audience:"pilgrim",
      tag:"Navigation",
      title:"Yatra",
      desc:"Plan and track your Pandharpur Wari journey end to end.",
      long:"From forming a group to booking a slot to checking the weather along the way, the Yatra menu keeps every planning tool for the journey itself in one place.",
      points:["Create or join a group yatra","Route guidance & live weather","Darshan bookings & QR passes"],
      stats:[]
    },
    "heritage-menu": {
      icon:"fa-solid fa-landmark-dome", color:"#6B4A2E", audience:"pilgrim",
      tag:"Navigation",
      title:"Heritage",
      desc:"Explore the culture and history behind the Wari.",
      long:"The Heritage menu gathers everything cultural — guided history, abhang, and temple traditions — for pilgrims who want to understand the meaning behind the walk, not just complete it.",
      points:["AI Heritage Guide","Abhang & Stories archive","Temple history & rituals"],
      stats:[]
    },

    /* ---------- Command Dashboard ---------- */
    "overview": {
      icon:"fa-solid fa-gauge", color:"#8B1B1B", audience:"admin",
      tag:"Command Dashboard",
      title:"Operations Overview",
      desc:"The single-screen summary of footfall, risk zones, alerts and response times across the entire Wari.",
      long:"Overview is the command centre's first screen every shift — footfall, risk zones, active alerts and resource availability distilled into one glance, so operators know exactly where attention is needed before drilling into any single panel.",
      points:["Live footfall & risk-zone counts","Active alerts requiring attention","Volunteer & medical resource availability"],
      stats:[{value:"56,842",label:"Current Footfall"},{value:"3",label:"High-Risk Zones"},{value:"12",label:"Active Alerts"}]
    },
    "live-cctv": {
      icon:"fa-solid fa-video", color:"#8B1B1B", audience:"admin",
      tag:"Safety & Operations",
      title:"Live CCTV Monitoring",
      desc:"Every camera stream, density-scored in real time by the crowd AI model.",
      long:"Every ghat, gate and queue camera streams into one grid, each tile density-scored live by the crowd AI. A feed that goes offline or crosses a density threshold is flagged automatically, so operators aren't watching dozens of screens by eye.",
      points:["Live feeds from every ghat, gate & queue","AI density scoring per camera (Low → Critical)","Automatic flag when a feed goes offline","One tap to expand any camera to full screen"],
      stats:[{value:"92%",label:"Main Gate Density"},{value:"4+",label:"Live Feeds Monitored"},{value:"Auto",label:"Offline Detection"}]
    },
    "crowd-heatmap": {
      icon:"fa-solid fa-fire", color:"#E0A825", audience:"admin",
      tag:"Safety & Operations",
      title:"Crowd Heatmap",
      desc:"Zone-by-zone density built from camera frame sampling and AI detection models.",
      long:"Frame samples from every camera feed a detection model that scores each zone Low through Critical. The heatmap is the visual layer operators use to spot a building crowd before it becomes an incident.",
      points:["Colour-coded density: Low, Moderate, High, Critical","Updated continuously from live camera frames","Feeds the risk-scoring & alert engine directly"],
      stats:[{value:"3",label:"Zones at High/Critical"},{value:"Continuous",label:"Frame Sampling"}]
    },
    "temple-map": {
      icon:"fa-solid fa-map", color:"#2563EB", audience:"admin",
      tag:"Command Dashboard",
      title:"Temple Map & Live Congestion",
      desc:"A real-time geographic view of events, occupancy and incidents by zone.",
      long:"The temple map ties every incident, hazard and occupancy reading to its physical location, so dispatch decisions are made with the actual geography of the complex in view — not just a list of alerts.",
      points:["Live incident & hazard pins by location","Zone occupancy overlays","Nearest-responder routing for dispatch"],
      stats:[{value:"7",label:"Zones Tracked"},{value:"Live",label:"Incident Pins"}]
    },
    "volunteer-dispatch": {
      icon:"fa-solid fa-people-group", color:"#1F9D55", audience:"admin",
      tag:"Field Response",
      title:"Volunteer Dispatch",
      desc:"Send the nearest available team to an incident and track them until it's resolved.",
      long:"Dispatch matches the nearest available team to an incident automatically, with live ETA tracking until the job is marked resolved — and escalates on its own if no team responds in time.",
      points:["248 of 320 volunteers currently available","One-tap dispatch with live ETA","Team roster & avatars for every active job","Auto-escalation if no team responds in time"],
      stats:[{value:"248/320",label:"Volunteers Available"},{value:"2–5 min",label:"Typical ETA"}]
    },
    "healthcare-centers": {
      icon:"fa-solid fa-briefcase-medical", color:"#D64545", audience:"admin",
      tag:"Field Response",
      title:"Healthcare Centers",
      desc:"Live occupancy across every medical centre and mobile unit on the route.",
      long:"Every fixed medical centre and mobile unit reports live occupancy, so a medical dispatch can route to whichever facility has capacity right now — not just the nearest one on paper.",
      points:["Real-time bed / capacity occupancy per centre","Operational status at a glance","Mobile medical unit locations","Direct dispatch to the nearest facility"],
      stats:[{value:"62%",label:"Main Center Occupancy"},{value:"4",label:"Centers & Mobile Units"}]
    },
    "incident-mgmt": {
      icon:"fa-solid fa-triangle-exclamation", color:"#D64545", audience:"admin",
      tag:"Safety & Operations",
      title:"Incident Management",
      desc:"Every complaint, lost-person report and incident tracked from open to resolved, with SLAs.",
      long:"Incidents — whether raised by a pilgrim, an AI alert, or an operator — enter the same tracked timeline with severity tagging, an assigned team, a live ETA, and an SLA clock, giving a full audit trail for every case.",
      points:["Centralised incident timeline with SLAs","Severity tagging: High / Medium / Low","Assigned team & live ETA per incident","Full audit trail for reporting"],
      stats:[{value:"12",label:"Active Incidents"},{value:"4.3 min",label:"Avg. Response Time"}]
    },
    "alerts-admin": {
      icon:"fa-regular fa-bell", color:"#D64545", audience:"admin",
      tag:"Command Dashboard",
      title:"Priority Alerts",
      desc:"The highest-severity events across the Wari, ranked by urgency.",
      long:"Priority Alerts surfaces the events that need a human decision right now — high-congestion and medical events first — with a one-tap path to dispatch and a full history for later review.",
      points:["High-congestion & medical events surfaced first","One tap to dispatch the nearest team","Full alert history & audit log"],
      stats:[{value:"12",label:"Active Alerts"},{value:"+3",label:"New in Last Hour"}]
    },
    "reports": {
      icon:"fa-solid fa-file-lines", color:"#6B4A2E", audience:"admin",
      tag:"Command Dashboard",
      title:"Reports",
      desc:"Performance and operational reports for authorities and partner organisations.",
      long:"Daily footfall and incident summaries, response-time performance against SLA, and exportable reports give temple authorities and partner organisations the same evidence-based view the command centre works from.",
      points:["Daily footfall & incident summaries","Response-time performance vs. SLA","Exportable reports for temple authorities"],
      stats:[{value:"Daily",label:"Summary Reports"},{value:"Exportable",label:"For Authorities"}]
    },
    "settings": {
      icon:"fa-solid fa-gear", color:"#4A423C", audience:"admin",
      tag:"Command Dashboard",
      title:"Settings",
      desc:"Configure roles, alert thresholds and system integrations for the command centre.",
      long:"Settings is where the command centre is tuned — who has which role, at what density a zone should trigger an alert, and how cameras and sensors integrate with the platform.",
      points:["Manage admin & responder roles","Set crowd-density alert thresholds","Camera & sensor integration settings"],
      stats:[]
    },
    "force-dispatch": {
      icon:"fa-solid fa-truck-fast", color:"#2563EB", audience:"admin",
      tag:"Quick Action",
      title:"Force Dispatch",
      desc:"Manually override the automated routing to send a specific team to a location immediately.",
      long:"When automated routing isn't the right call, Force Dispatch lets an operator bypass the queue and send a specific team to a specific location immediately, with instant confirmation to that team.",
      points:["Bypasses the queue for urgent situations","Choose the team and destination directly","Confirmation sent to the team instantly"],
      stats:[]
    },
    "broadcast": {
      icon:"fa-solid fa-bullhorn", color:"#E0A825", audience:"admin",
      tag:"Quick Action",
      title:"Broadcast Message",
      desc:"Send an announcement to pilgrims in a zone via WhatsApp, web and public-address systems together.",
      long:"A single broadcast reaches pilgrims in a target zone — or the whole Wari — across WhatsApp, the web portal and public-address systems at once, in every supported language.",
      points:["Target a specific zone or the whole Wari","Delivered via WhatsApp, web & PA systems","Multilingual broadcast in one send"],
      stats:[]
    },
    "open-incident": {
      icon:"fa-solid fa-triangle-exclamation", color:"#D64545", audience:"admin",
      tag:"Quick Action",
      title:"Open Incident",
      desc:"Log a new incident manually so it enters the same tracked, SLA-timed workflow as automated alerts.",
      long:"Not every incident starts with an automated alert. Open Incident lets an operator log severity, location and description manually, and the case is auto-assigned to the nearest available team on the same tracked timeline.",
      points:["Set severity, location & description","Auto-assigns to the nearest available team","Tracked on the same incident timeline"],
      stats:[]
    },
    "medical-alert": {
      icon:"fa-solid fa-kit-medical", color:"#D64545", audience:"admin",
      tag:"Quick Action",
      title:"Medical Alert",
      desc:"Flag a medical emergency and dispatch the nearest medical team in one action.",
      long:"One action flags a medical emergency, auto-dispatches the nearest medical team, places the nearest healthcare centre on standby, and tracks live ETA until the team arrives on scene.",
      points:["Nearest medical team dispatched automatically","Nearest healthcare centre placed on standby","Live ETA tracked until the team arrives"],
      stats:[]
    },
    "crowd-control": {
      icon:"fa-solid fa-people-group", color:"#E8630C", audience:"admin",
      tag:"Quick Action",
      title:"Crowd Control",
      desc:"Trigger a crowd-management response — barriers, volunteer redeployment and flow diversion.",
      long:"Crowd Control redeploys volunteers to an affected zone, suggests alternate routes to pilgrims through the app, and escalates to security automatically if density stays critical after the first response.",
      points:["Redeploys volunteers to the affected zone","Suggests alternate routes for pilgrims","Escalates to security if density stays critical"],
      stats:[]
    },
    "emergency-call": {
      icon:"fa-solid fa-phone-volume", color:"#8B1B1B", audience:"admin",
      tag:"Quick Action",
      title:"Emergency Call",
      desc:"Direct voice line to local emergency services and the temple security control room.",
      long:"Emergency Call opens a direct voice line to local emergency services (112) and, in parallel, the temple's own security control room — with the call logged automatically against the active incident.",
      points:["One tap to reach emergency services (112)","Parallel line to temple security control room","Call is logged against the active incident"],
      stats:[]
    },
    "system-logs": {
      icon:"fa-solid fa-file-lines", color:"#4A423C", audience:"admin",
      tag:"System",
      title:"System Logs",
      desc:"Full technical log of camera, sensor and platform health for the operations team.",
      long:"For the technical team behind the command centre, System Logs holds the full uptime history for cameras and IoT sensors, platform and API health events, and a downloadable export for audits.",
      points:["Camera & IoT sensor uptime history","API and platform health events","Downloadable log export for audits"],
      stats:[]
    }
  };

  window.VariMitraFeatures = FEATURES;
})();
