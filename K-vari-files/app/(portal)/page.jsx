'use client';

/**
 * The pilgrim home. Most tiles here open an explainer via the shared
 * [data-modal] layer in public/assets/features.js; the "Live Yatra Services"
 * row and the four matching sidebar entries are different — they leave the
 * portal for the Wari location features, which read the pilgrim's actual GPS
 * and keep working with no network.
 */

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { PageScripts } from '@/components/portal/PortalScripts';

const PAGE_SCRIPTS = ['/assets/features.js', '/assets/hero-slider.js'];

export default function VariMitraPage() {
  const router = useRouter();
  const [navOpen, setNavOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  // No auth required for the pilgrim portal anymore.
  // Admins can log in via /admin-login to access the dashboard.
  useEffect(() => {
    const saved = localStorage.getItem('varimitra_user');
    if (saved) {
      setIsLoggedIn(true);
      try {
        if (JSON.parse(saved).role === 'admin') {
          // Optional: router.replace('/command-dashboard');
        }
      } catch (e) {
        // ignore
      }
    }
  }, [router]);

  const goTo = useCallback(
    (href) => (event) => {
      event.preventDefault();
      setNavOpen(false);
      router.push(href);
    },
    [router],
  );

  const handleLogout = (event) => {
    event.preventDefault();
    localStorage.removeItem('varimitra_user');
    router.push('/admin-login');
  };

  return (
    <div className="vm-pilgrim">
      <PageScripts sources={PAGE_SCRIPTS} />
<header className="topbar">
  <div className="brand">
    <button
      className="sidebar-toggle"
      id="sidebarToggle"
      type="button"
      onClick={() => setNavOpen(!navOpen)}
      aria-label="Open navigation menu"
      aria-expanded={navOpen}
    >
      <i className="fa-solid fa-bars"></i>
    </button>
    <div className="logo"><i className="fa-solid fa-place-of-worship"></i></div>
    <div>
      <div className="name">VariMitra</div>
      <div className="tagline" data-i18n-html="common.taglineHtml">One Platform. Safer Pilgrimage.<br />Preserved Heritage.</div>
    </div>
  </div>

  <div className="search-box">
    <i className="fa-solid fa-magnifying-glass"></i>
    <input type="text" data-i18n-placeholder="pilgrim.searchPlaceholder" placeholder="Search services, temples, help..." />
    <kbd>⌘K</kbd>
  </div>

  <nav className="main-nav">
    <a href="#" className="active" data-i18n="pilgrim.navHome">Home</a>
    <a href="#" data-modal data-feature="services-menu" tabIndex="0"><span data-i18n="pilgrim.navServices">Services</span> <i className="fa-solid fa-chevron-down" style={{"fontSize":"10px"}}></i></a>
    <a href="#" data-modal data-feature="yatra-menu" tabIndex="0"><span data-i18n="pilgrim.navYatra">Yatra</span> <i className="fa-solid fa-chevron-down" style={{"fontSize":"10px"}}></i></a>
    <a href="#" data-modal data-feature="heritage-menu" tabIndex="0"><span data-i18n="pilgrim.navHeritage">Heritage</span> <i className="fa-solid fa-chevron-down" style={{"fontSize":"10px"}}></i></a>
    <a href="#" data-modal data-feature="help-support" tabIndex="0"><span data-i18n="pilgrim.navHelp">Help & Support</span> <i className="fa-solid fa-chevron-down" style={{"fontSize":"10px"}}></i></a>
  </nav>

  <div className="topbar-right">
    <div className="lang-pick" tabIndex="0"><i className="fa-solid fa-globe"></i> <span className="lang-pick-label">English</span> <i className="fa-solid fa-chevron-down" style={{"fontSize":"10px"}}></i></div>
    <div className="bell" onClick={() => setNotifOpen(!notifOpen)} style={{ cursor: 'pointer' }} tabIndex="0"><i className="fa-regular fa-bell"></i><span className="dot">9+</span></div>
    {isLoggedIn && (
      <div className="user-chip" data-modal data-feature="profile" tabIndex="0">
        <img src="https://i.pravatar.cc/64?img=13" alt="user" />
        <div className="who" id="userChipName">Namaskar, <b>Vitthal Bhakt</b></div>
        <i className="fa-solid fa-chevron-down" style={{"fontSize":"10px","color":"#B3AAA0"}}></i>
      </div>
    )}
    <a href="/admin-login" onClick={handleLogout}  data-i18n-title="common.signOutTitle" title="Admin Login" style={{"color":"var(--maroon)","fontSize":"15px","padding":"6px 10px","borderRadius":"8px","background":"var(--cream)","border":"1px solid var(--card-border)","display":"flex","alignItems":"center","gap":"6px","fontWeight":"600"}}><i className="fa-solid fa-user-shield"></i> <span style={{"fontSize":"12px"}} data-i18n="common.adminLogin">Admin Login</span></a>
  </div>
</header>

<div
  className={(navOpen || notifOpen) ? 'sidebar-overlay open' : 'sidebar-overlay'}
  onClick={() => { setNavOpen(false); setNotifOpen(false); }}
></div>

<aside className={notifOpen ? 'notifications-sidebar open' : 'notifications-sidebar'}>
  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', padding: '0 4px' }}>
    <h3 style={{ margin: 0, fontSize: '15px', color: 'var(--maroon)' }}>Notifications</h3>
    <button onClick={() => setNotifOpen(false)} style={{ background: 'none', border: 'none', fontSize: '16px', color: 'var(--text-muted)' }}><i className="fa-solid fa-xmark"></i></button>
  </div>
  
  <div className="notif-item">
    <b>High Footfall at Main Chowk</b>
    Consider the East Entry route or wait 15–20 minutes.
    <br/><span>Just now</span>
  </div>
  <div className="notif-item">
    <b>Light Rain Expected</b>
    Carry rain cover and watch for slippery ghats.
    <br/><span>1 hr ago</span>
  </div>
  <div className="notif-item">
    <b>Solapur Road Closed</b>
    Use alternative route via Gopalpur.
    <br/><span>2 hrs ago</span>
  </div>
</aside>

<div className="layout">

  
  <aside className={navOpen ? 'sidebar open' : 'sidebar'} id="sidebar">
    <a className="side-link active"><span className="l"><i className="icn fa-solid fa-house"></i><span data-i18n="pilgrim.sidebarHome">Home</span></span></a>
    <a className="side-link" href="/route" onClick={goTo('/route')}><span className="l"><i className="icn fa-solid fa-map-location-dot"></i><span>Check Route</span></span><i className="chev fa-solid fa-chevron-right"></i></a>
    <a className="side-link" href="/palki" onClick={goTo('/palki')}><span className="l"><i className="icn fa-solid fa-place-of-worship"></i><span>Track Palki Live</span></span><i className="chev fa-solid fa-chevron-right"></i></a>
    <a className="side-link" href="/help" onClick={goTo('/help')}><span className="l"><i className="icn fa-solid fa-truck-medical"></i><span>Report SOS</span></span><i className="chev fa-solid fa-chevron-right"></i></a>
    <a className="side-link" href="/live" onClick={goTo('/live')}><span className="l"><i className="icn fa-solid fa-location-crosshairs"></i><span>My Live Location</span></span><i className="chev fa-solid fa-chevron-right"></i></a>
    <a className="side-link" href="/darshan-booking" onClick={goTo('/darshan-booking')}><span className="l"><i className="icn fa-solid fa-calendar-check"></i><span data-i18n="pilgrim.sidebarDarshan">Darshan & Booking</span></span><i className="chev fa-solid fa-chevron-right"></i></a>
    <a className="side-link" href="/live-darshan" onClick={goTo('/live-darshan')}><span className="l"><i className="icn fa-solid fa-video"></i><span data-i18n="pilgrim.sidebarLiveDarshan">Live Darshan</span></span><i className="chev fa-solid fa-chevron-right"></i></a>
    <a className="side-link" href="/crowd-status" onClick={goTo('/crowd-status')}><span className="l"><i className="icn fa-solid fa-users"></i><span data-i18n="pilgrim.sidebarCrowd">Crowd & Safety</span></span><i className="chev fa-solid fa-chevron-right"></i></a>
    <a className="side-link" href="/route-weather" onClick={goTo('/route-weather')}><span className="l"><i className="icn fa-solid fa-route"></i><span data-i18n="pilgrim.sidebarRoute">Route & Travel</span></span><i className="chev fa-solid fa-chevron-right"></i></a>
    <a className="side-link" href="/group-yatra" onClick={goTo('/group-yatra')}><span className="l"><i className="icn fa-solid fa-people-group"></i><span data-i18n="pilgrim.sidebarGroup">Group Yatra</span></span><i className="chev fa-solid fa-chevron-right"></i></a>
    <a className="side-link" href="/lost-found" onClick={goTo('/lost-found')}><span className="l"><i className="icn fa-solid fa-magnifying-glass"></i><span data-i18n="pilgrim.sidebarLostFound">Lost & Found</span></span><i className="chev fa-solid fa-chevron-right"></i></a>
    <a className="side-link" href="/medical-help" onClick={goTo('/medical-help')}><span className="l"><i className="icn fa-solid fa-briefcase-medical"></i><span data-i18n="pilgrim.sidebarMedical">Medical Help</span></span><i className="chev fa-solid fa-chevron-right"></i></a>
    <a className="side-link emergency" href="/medical-help" onClick={goTo('/medical-help')}><span className="l"><i className="icn fa-solid fa-triangle-exclamation"></i><span data-i18n="pilgrim.sidebarEmergency">Emergency</span></span><span className="badge">112</span></a>
    <a className="side-link" data-modal data-feature="heritage-hub" tabIndex="0"><span className="l"><i className="icn fa-solid fa-landmark-dome"></i><span data-i18n="pilgrim.sidebarHeritage">AI Heritage Guide</span></span><i className="chev fa-solid fa-chevron-right"></i></a>
    <a className="side-link" data-modal data-feature="heritage-hub" tabIndex="0"><span className="l"><i className="icn fa-solid fa-book-open"></i><span data-i18n="pilgrim.sidebarAbhang">Abhang & Stories</span></span><i className="chev fa-solid fa-chevron-right"></i></a>
    <a className="side-link" data-modal data-feature="notifications" tabIndex="0"><span className="l"><i className="icn fa-regular fa-bell"></i><span data-i18n="pilgrim.sidebarAlerts">Alerts & Updates</span></span><i className="chev fa-solid fa-chevron-right"></i></a>
    <a className="side-link" data-modal data-title="Feedback & Report" data-icon="fa-regular fa-comment-dots" data-color="#0EA5A5" data-tag="Support" data-body="Tell us what worked and what didn't — your feedback goes straight to the Wari operations team." tabIndex="0"><span className="l"><i className="icn fa-regular fa-comment-dots"></i><span data-i18n="pilgrim.sidebarFeedback">Feedback & Report</span></span><i className="chev fa-solid fa-chevron-right"></i></a>

    <div className="side-assistant">
      <div className="a-top">
        <div className="av"><i className="fa-solid fa-om"></i></div>
        <div>
          <b data-i18n="pilgrim.assistantTitle">VariMitra Assistant</b>
          <span data-i18n="pilgrim.assistantDesc">Ask anything about your yatra</span>
        </div>
      </div>
      <button className="btn-maroon" data-modal data-feature="whatsapp" data-i18n="pilgrim.chatNow">Chat Now</button>
    </div>

    <div className="side-promo">
      <b data-i18n="pilgrim.wariTitle">Pandharpur Wari (Vari)</b>
      <span data-i18n="pilgrim.wariDates">Dates: 12 Jun – 10 Jul 2025</span>
      <button data-modal data-title="Wari Calendar" data-icon="fa-regular fa-calendar" data-color="#C94F06" data-tag="Pandharpur Wari 2025" data-body="The full Wari runs 12 Jun – 10 Jul 2025. Key darshan dates, route halts and festival days are all listed on the full calendar." data-i18n="pilgrim.viewCalendar">View Full Calendar</button>
    </div>
  </aside>

  
  <main className="content">

    
    <section className="notices-banner" style={{ background: 'var(--maroon-dark)', color: '#fff', padding: '16px 24px', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '20px' }}>
      <div style={{ background: 'var(--orange)', width: '40px', height: '40px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', flexShrink: 0 }}>
        <i className="fa-solid fa-bullhorn"></i>
      </div>
      <div>
        <h2 style={{ fontSize: '16px', margin: '0 0 4px', fontWeight: '800' }}>Important Notices & Lost and Found</h2>
        <p style={{ fontSize: '13px', margin: '0', opacity: '0.9' }}>Recent missing items reported at Main Chowk. Please contact support if found. Weather alert: Light rain expected on the route.</p>
      </div>
      <button onClick={goTo('/lost-found')} style={{ marginLeft: 'auto', background: '#fff', color: 'var(--maroon-dark)', padding: '8px 16px', borderRadius: '8px', fontSize: '12.5px', fontWeight: '700', whiteSpace: 'nowrap' }}>
        View Lost & Found
      </button>
    </section>

    <div className="hero-services">
      <div className="hs-card" onClick={goTo('/route')}>
        <div className="hs-top">
          <div className="hs-icon" style={{background: "#2563EB"}}><i className="fa-solid fa-map-location-dot"></i></div>
          <span className="hs-badge" style={{background: "#DBEAFE", color: "#1D4ED8"}}>OFFLINE MAP</span>
        </div>
        <h4 className="hs-title">Check Route</h4>
        <p className="hs-desc">The full walking route with all 15 day-stage halts and where today's stage ends.</p>
        <span className="hs-link">View Route &rarr;</span>
      </div>
      <div className="hs-card" onClick={goTo('/palki')}>
        <div className="hs-top">
          <div className="hs-icon" style={{background: "#7F1D1D"}}><i className="fa-solid fa-om"></i></div>
          <span className="hs-badge" style={{background: "#DBEAFE", color: "#1D4ED8"}}>WORKS OFFLINE</span>
        </div>
        <h4 className="hs-title">Track Palki Live</h4>
        <p className="hs-desc">The Palki's live position and its forecast for the next eight hours — no network needed.</p>
        <span className="hs-link">Track Palki &rarr;</span>
      </div>
      <div className="hs-card" onClick={goTo('/medical-help')}>
        <div className="hs-top">
          <div className="hs-icon" style={{background: "#DC2626"}}><i className="fa-solid fa-truck-medical"></i></div>
          <span className="hs-badge" style={{background: "#DCFCE7", color: "#16A34A"}}>SOS</span>
        </div>
        <h4 className="hs-title">Report SOS</h4>
        <p className="hs-desc">One tap finds the nearest medical camp; food, water and shelter are ranked by distance too.</p>
        <span className="hs-link">Find Help &rarr;</span>
      </div>
      <div className="hs-card" onClick={goTo('/live-darshan')}>
        <div className="hs-top">
          <div className="hs-icon" style={{background: "#EA580C"}}><i className="fa-solid fa-person-walking"></i></div>
          <span className="hs-badge" style={{background: "#DCFCE7", color: "#16A34A"}}>LIVE GPS</span>
        </div>
        <h4 className="hs-title">My Live Location</h4>
        <p className="hs-desc">How far is left, how long it should take, and whether you have drifted off the route.</p>
        <span className="hs-link">Open &rarr;</span>
      </div>
    </div>



    <h3 className="section-title"><span className="sic" style={{"background":"linear-gradient(135deg,#E8630C,#C94F06)"}}><i className="fa-solid fa-list-check"></i></span><span data-i18n="pilgrim.quickActions">What would you like to do today?</span></h3>
    <div className="quick-actions">
      <div className="qa-card" onClick={goTo('/darshan-booking')} style={{cursor: 'pointer'}}><div className="ic" style={{"background":"#E8630C"}}><i className="fa-solid fa-calendar-days"></i></div><span data-i18n="pilgrim.qaDarshan">Darshan Slot Booking</span></div>
      <div className="qa-card" onClick={goTo('/live-darshan')} style={{cursor: 'pointer'}}><div className="ic" style={{"background":"#D64545"}}><i className="fa-solid fa-play"></i></div><span data-i18n="pilgrim.qaLive">Live Darshan Stream</span></div>
      <div className="qa-card" onClick={goTo('/crowd-status')} style={{cursor: 'pointer'}}><div className="ic" style={{"background":"#2563EB"}}><i className="fa-solid fa-chart-simple"></i></div><span data-i18n="pilgrim.qaCrowd">Crowd Status & Safety</span></div>
      <div className="qa-card" onClick={goTo('/route-weather')} style={{cursor: 'pointer'}}><div className="ic" style={{"background":"#1F9D55"}}><i className="fa-solid fa-map-location-dot"></i></div><span data-i18n="pilgrim.qaRoute">Route & Weather Updates</span></div>
      <div className="qa-card" onClick={goTo('/group-yatra')} style={{cursor: 'pointer'}}><div className="ic" style={{"background":"#7C3AED"}}><i className="fa-solid fa-people-group"></i></div><span data-i18n="pilgrim.qaGroup">Create / Join Group Yatra</span></div>
      <div className="qa-card" onClick={goTo('/lost-found')} style={{cursor: 'pointer'}}><div className="ic" style={{"background":"#8B1B1B"}}><i className="fa-solid fa-briefcase"></i></div><span data-i18n="pilgrim.qaLostFound">Lost & Found Services</span></div>
      <div className="qa-card" onClick={goTo('/medical-help')} style={{cursor: 'pointer'}}><div className="ic" style={{"background":"#D64545"}}><i className="fa-solid fa-truck-medical"></i></div><span data-i18n="pilgrim.qaMedical">Medical Help & Emergency</span></div>
      <div className="qa-card" data-modal data-feature="heritage-hub" tabIndex="0"><div className="ic" style={{"background":"#6B4A2E"}}><i className="fa-solid fa-landmark-dome"></i></div><span data-i18n="pilgrim.qaHeritage">AI Heritage Guide</span></div>
    </div>




  </main>

  
  <aside className="right-rail">

    <div className="rail-card">
      <div className="rail-head">
        <div><b><i className="fa-solid fa-id-card ric"></i>Pilgrim Profile</b><span>Manage your yatra at a glance</span></div>
        <span style={{"fontSize":"11px","color":"var(--orange)","fontWeight":"600"}}><i className="fa-solid fa-circle-check"></i> Verified</span>
      </div>
      <div className="yatri-box" data-modal data-feature="profile" tabIndex="0">
        <img src="https://i.pravatar.cc/64?img=13" alt="" />
        <div><div className="nm">Vitthal Bhakt</div><div className="id">Yatri ID: VM2506120815</div></div>
        <span className="verified"><i className="fa-solid fa-circle-check"></i> Verified</span>
      </div>
      <div className="stat-grid">
        <div className="stat-box" data-modal data-feature="eticketing" data-icon="fa-solid fa-calendar-check" data-color="#E8630C" tabIndex="0"><i className="fa-solid fa-calendar-check"></i><b>2</b><span>Bookings Active</span></div>
        <div className="stat-box" data-modal data-feature="group-location" data-icon="fa-solid fa-users" data-color="#7C3AED" tabIndex="0"><i className="fa-solid fa-users"></i><b>4</b><span>Family Members</span></div>
        <div className="stat-box" data-modal data-feature="group-location" data-icon="fa-solid fa-people-group" data-color="#7C3AED" tabIndex="0"><i className="fa-solid fa-people-group"></i><b>1</b><span>Groups</span></div>
        <div className="stat-box" data-modal data-title="Your Reports" data-icon="fa-solid fa-file-lines" data-color="#4A423C" data-tag="Feedback & Report" data-body="You haven't filed any reports yet. Lost & found reports, complaints and feedback you submit will show up here with live status." tabIndex="0"><i className="fa-solid fa-file-lines"></i><b>0</b><span>Reports</span></div>
      </div>
    </div>

    <div className="rail-card crowd-status">
      <div className="rail-head">
        <div><b><i className="fa-solid fa-users-line ric"></i>Current Crowd Status</b></div>
        <span style={{"fontSize":"10.5px","color":"var(--text-muted)"}}>10:30 AM, 12 Jun 2025</span>
      </div>
      <div className="place">Pandharpur Temple</div>
      <div className="queue">Main Darshan Queue</div>

      <svg className="gauge-svg" width="220" height="120" viewBox="0 0 220 120">
        <path d="M20,110 A90,90 0 0,1 200,110" fill="none" stroke="#EDEDED" strokeWidth="16" strokeLinecap="round"/>
        <path d="M20,110 A90,90 0 0,1 200,110" fill="none" stroke="url(#g1)" strokeWidth="16" strokeLinecap="round"
              strokeDasharray="230" strokeDashoffset="20"/>
        <defs>
          <linearGradient id="g1" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#1F9D55"/>
            <stop offset="50%" stopColor="#E0A825"/>
            <stop offset="100%" stopColor="#D64545"/>
          </linearGradient>
        </defs>
      </svg>
      <div className="gauge-center">
        <b>82%</b>
        <span>High Density</span>
      </div>
      <div className="wait-row">
        <div><span style={{"color":"var(--text-muted)"}}>Estimated Wait Time</span><b>90 - 120 min</b></div>
        <button className="view-btn" data-modal data-feature="crowd-safety">View Details</button>
      </div>
    </div>

    <div className="rail-card">
      <div className="rail-head"><b><i className="fa-solid fa-ticket ric"></i>My Bookings</b></div>
      <div className="booking-item" data-modal data-feature="eticketing" tabIndex="0">
        <div><b>Pandharpur Temple</b><span>12 Jun 2025 • 08:00 AM - 10:00 AM</span><br /><span>Booking ID: VM2506120815</span></div>
        <span className="qr-chip"><i className="fa-solid fa-qrcode"></i> QR Code</span>
      </div>
    </div>

    <div className="rail-card">
      <div className="rail-head"><b><i className="fa-solid fa-bell ric"></i>Recent Alerts</b></div>
      <div className="alert-row" data-modal data-icon="fa-solid fa-triangle-exclamation" data-color="var(--amber)" data-tag="30 min ago" data-title="High Crowd at Main Gate" data-body="Density at Main Gate has crossed 80%. Estimated wait time is 90–120 minutes; consider the East Entry as an alternative." tabIndex="0"><i className="fa-solid fa-triangle-exclamation" style={{"color":"var(--amber)"}}></i><b>High crowd at Main Gate</b><span className="tm">30 min ago</span></div>
      <div className="alert-row" data-modal data-icon="fa-solid fa-cloud-rain" data-color="var(--blue)" data-tag="1 hr ago" data-title="Light Rain Expected" data-body="Light rain is expected in Pandharpur over the next few hours. Carry a rain cover and watch for slippery ghats." tabIndex="0"><i className="fa-solid fa-cloud-rain" style={{"color":"var(--blue)"}}></i><b>Light rain expected</b><span className="tm">1 hr ago</span></div>
      <div className="alert-row" data-modal data-icon="fa-solid fa-road" data-color="var(--red)" data-tag="2 hrs ago" data-title="Traffic Diversion — Solapur Road" data-body="Solapur Road is closed for the Wari procession. VariMitra's route guidance has an alternative path ready for you." tabIndex="0"><i className="fa-solid fa-road" style={{"color":"var(--red)"}}></i><b>Traffic diversion on Solapur Road</b><span className="tm">2 hrs ago</span></div>
      <a href="#" data-modal data-feature="notifications" tabIndex="0" style={{"fontSize":"11.5px","color":"var(--orange)","fontWeight":"700","display":"block","marginTop":"8px"}}>View All Alerts</a>
    </div>

    <div className="rail-card">
      <div className="rail-head"><b><i className="fa-solid fa-list-check ric"></i>Services Availability</b></div>
      <div className="avail-row" data-modal data-icon="fa-solid fa-kit-medical" data-color="var(--red)" data-tag="Services Availability" data-title="Medical Camps" data-body="Medical camps are currently available across the route, including the 24×7 Main Medical Center and mobile units." tabIndex="0"><i className="fa-solid fa-kit-medical"></i>Medical Camps<span className="avail-tag ok">Available</span></div>
      <div className="avail-row" data-modal data-icon="fa-solid fa-droplet" data-color="var(--blue)" data-tag="Services Availability" data-title="Water Points" data-body="32 water points are active along the Wari route, marked on the live map." tabIndex="0"><i className="fa-solid fa-droplet"></i>Water Points<span className="avail-tag ok">Available</span></div>
      <div className="avail-row" data-modal data-icon="fa-solid fa-bed" data-color="#E0A825" data-tag="Services Availability" data-title="Rest Shelters" data-body="24 shelter units are currently open, with high availability along the main route." tabIndex="0"><i className="fa-solid fa-bed"></i>Rest Shelters<span className="avail-tag low">High Availability</span></div>
      <div className="avail-row" data-modal data-icon="fa-solid fa-bowl-food" data-color="#E8630C" data-tag="Services Availability" data-title="Food Seva" data-body="Food seva points run continuously through the day, run by partner Seva organisations." tabIndex="0"><i className="fa-solid fa-bowl-food"></i>Food Seva<span className="avail-tag ok">Available</span></div>
      <div className="avail-row" data-modal data-icon="fa-solid fa-restroom" data-color="#6B4A2E" data-tag="Services Availability" data-title="Toilets" data-body="Public sanitation facilities are available and monitored across all major halts." tabIndex="0"><i className="fa-solid fa-restroom"></i>Toilets<span className="avail-tag ok">Available</span></div>
      <a href="#" data-modal data-feature="crowd-safety" tabIndex="0" style={{"fontSize":"11.5px","color":"var(--orange)","fontWeight":"700","display":"block","marginTop":"6px"}}>View All Services</a>
    </div>

  </aside>
</div>


<div className="content" style={{"paddingTop":"0"}}>
  <div className="alerts-head" style={{"marginTop":"6px"}}>
    <h3 className="section-title" style={{"margin":"0"}}><span className="sic" style={{"background":"linear-gradient(135deg,#1F9D55,#0EA5A5)"}}><i className="fa-brands fa-whatsapp"></i></span>Your Multilingual Digital Companion</h3>
  </div>
  <div className="split-section">
    <div className="phone-mock">
      <div className="phone-screen">
        <div className="phone-head">
          <div className="av"><i className="fa-brands fa-whatsapp"></i></div>
          <div><b>VariMitra Assistant</b><span>● Online</span></div>
        </div>
        <div className="phone-body">
          <div className="bubble">Hi! How can I assist you today with your yatra needs? 🙏</div>
          <div className="menu-chip" data-modal data-feature="eticketing" tabIndex="0"><i className="fa-solid fa-ticket"></i> e-Ticket / Darshan</div>
          <div className="menu-chip" data-modal data-feature="notifications" tabIndex="0"><i className="fa-solid fa-bell"></i> Info (News / Alerts)</div>
          <div className="menu-chip" data-modal data-feature="help-support" tabIndex="0"><i className="fa-solid fa-hand"></i> Help / I need Help</div>
          <div className="menu-chip" data-modal data-feature="medical-help" tabIndex="0"><i className="fa-solid fa-briefcase-medical"></i> Medical Help</div>
          <div className="menu-chip" data-modal data-feature="profile" tabIndex="0"><i className="fa-solid fa-user"></i> My Profile</div>
          <div className="bubble me">Book darshan slot for tomorrow 7 AM</div>
        </div>
      </div>
    </div>

    <div className="heritage-cards" style={{"alignContent":"start"}}>
      <div className="heritage-card" data-modal data-feature="whatsapp" tabIndex="0">
        <div className="ic" style={{"background":"var(--orange)"}}><i className="fa-brands fa-whatsapp"></i></div>
        <h4>WhatsApp & Voice Access</h4>
        <p>Easy, multilingual interaction for every pilgrim — no app download needed.</p>
      </div>
      <div className="heritage-card" data-modal data-feature="eticketing" tabIndex="0">
        <div className="ic" style={{"background":"#7C3AED"}}><i className="fa-solid fa-ticket"></i></div>
        <h4>e-Ticketing & Darshan Updates</h4>
        <p>Live slot booking and queue information straight to your phone.</p>
      </div>
      <div className="heritage-card" data-modal data-feature="crowd-safety" tabIndex="0">
        <div className="ic" style={{"background":"var(--red)"}}><i className="fa-solid fa-chart-line"></i></div>
        <h4>Crowd & Safety Analytics</h4>
        <p>AI insights and real-time monitoring across every ghat and gate.</p>
      </div>
      <div className="heritage-card" data-modal data-feature="group-location" tabIndex="0">
        <div className="ic" style={{"background":"var(--blue)"}}><i className="fa-solid fa-location-dot"></i></div>
        <h4>Group Location Sharing</h4>
        <p>Priority-first spot location sharing to keep families and groups together.</p>
      </div>
      <div className="heritage-card" data-modal data-feature="cameras-monitoring" tabIndex="0">
        <div className="ic" style={{"background":"#0EA5A5"}}><i className="fa-solid fa-camera"></i></div>
        <h4>Cameras & System Monitoring</h4>
        <p>Uptime checks and health monitoring across the camera network.</p>
      </div>
      <div className="heritage-card" data-modal data-feature="heritage-hub" tabIndex="0">
        <div className="ic" style={{"background":"#6B4A2E"}}><i className="fa-solid fa-book-open"></i></div>
        <h4>Heritage & Archive Hub</h4>
        <p>Abhang, stories and digital preservation of Vari's living heritage.</p>
      </div>
    </div>
  </div>




<footer className="footer">
  <div className="foot-stats">
    <div className="fs" data-modal data-icon="fa-solid fa-users" data-color="var(--orange)" data-tag="VariMitra Reach" data-title="10L+ Pilgrims Connected" data-body="Over 1 million pilgrims are reachable through VariMitra's WhatsApp, web and voice channels during the Wari." tabIndex="0"><i className="fa-solid fa-users"></i><div><b>10L+</b><span>Pilgrims Connected</span></div></div>
    <div className="fs" data-modal data-icon="fa-solid fa-landmark" data-color="var(--orange)" data-tag="VariMitra Reach" data-title="200+ Temples & Locations" data-body="VariMitra covers 200+ temples and key locations along the Pandharpur Wari route." tabIndex="0"><i className="fa-solid fa-landmark"></i><div><b>200+</b><span>Temples & Locations</span></div></div>
    <div className="fs" data-modal data-feature="help-support" data-icon="fa-solid fa-headset" data-color="var(--orange)" tabIndex="0"><i className="fa-solid fa-headset"></i><div><b>24/7</b><span>Support & Assistance</span></div></div>
    <div className="fs" data-modal data-icon="fa-solid fa-handshake" data-color="var(--orange)" data-tag="VariMitra Reach" data-title="50+ Seva & Partner Orgs" data-body="50+ Seva organisations and partner NGOs work with VariMitra to run medical camps, shelters and food seva." tabIndex="0"><i className="fa-solid fa-handshake"></i><div><b>50+</b><span>Seva & Partner Orgs</span></div></div>
  </div>
  <div className="foot-tagline">
    <div className="marathi">॥ माऊलीच्या पायी, तेच आमुची साथ ॥</div>
    <div className="eng">One Platform. Safer Pilgrimage. Preserved Heritage.</div>
  </div>
  <div className="foot-app">
    <div style={{"textAlign":"right","fontSize":"11px"}}>
      <div>Download the App</div>
      <div style={{"opacity":".7","fontSize":"10px"}}>Scan QR to download</div>
    </div>
    <div className="qr" data-modal data-icon="fa-solid fa-qrcode" data-color="#5C1010" data-tag="Download the App" data-title="Scan to Download" data-body="Scan this QR code with your phone camera to download the VariMitra app from your device's app store." tabIndex="0"><i className="fa-solid fa-qrcode"></i></div>
    <div className="badges">
      <div data-modal data-icon="fa-brands fa-google-play" data-color="#1F9D55" data-tag="Download the App" data-title="Get it on Google Play" data-body="The VariMitra Android app will be available on Google Play ahead of the Wari — check back soon." tabIndex="0"><i className="fa-brands fa-google-play"></i> Google Play</div>
      <div data-modal data-icon="fa-brands fa-apple" data-color="#2B2320" data-tag="Download the App" data-title="Download on the App Store" data-body="The VariMitra iOS app will be available on the App Store ahead of the Wari — check back soon." tabIndex="0"><i className="fa-brands fa-apple"></i> App Store</div>
    </div>
  </div>
</footer>









</div>
    </div>
  );
}
