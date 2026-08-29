'use client';

/**
 * The Temple Command Dashboard. Its chrome lives in AdminShell so the Super
 * Admin screens can wear the same header and sidebar.
 */

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AdminShell } from '@/components/portal/AdminShell';
import { PageScripts } from '@/components/portal/PortalScripts';

const PAGE_SCRIPTS = ['/assets/features.js'];

export default function CommandDashboardPage() {
  const router = useRouter();

  useEffect(() => {
    const saved = localStorage.getItem('varimitra_user');
    if (!saved) {
      router.replace('/');
      return;
    }
    try {
      if (JSON.parse(saved).role !== 'admin') router.replace('/');
    } catch {
      router.replace('/');
    }
  }, [router]);

  return (
    <div className="vm-admin">
      <PageScripts sources={PAGE_SCRIPTS} />
      <AdminShell active="overview">

<a
  className="sos-cta"
  href="/superadmin/locations"
  onClick={(event) => {
    event.preventDefault();
    router.push('/superadmin/locations');
  }}
>
  <div className="sos-cta-ic"><i className="fa-solid fa-truck-medical"></i></div>
  <div className="sos-cta-body">
    <b>🆘 Super Admin — Add SOS, Hospital &amp; Facility Locations</b>
    <span>Add or edit medical camps, hospitals, ambulance points, temples and every location pilgrims see in SOS.</span>
  </div>
  <span className="sos-cta-go">Open Location Management <i className="fa-solid fa-arrow-right"></i></span>
</a>

<div className="stat-strip">


  <div
    className="stat-card"
    data-modal
    data-feature="crowd-heatmap"
    data-icon="fa-solid fa-users"
    data-color="var(--orange)"
    tabIndex="0"
  >

    <div
      className="ic"
      style={{"background":"var(--orange)"}}
    >

      <i className="fa-solid fa-users"></i>

    </div>

    <div>

      <div className="lbl" data-i18n="admin.footfall">
        Current Footfall
      </div>

      <div className="val">
        56,842
      </div>

      <div className="delta up">
        +12.6% vs yesterday
      </div>

    </div>

  </div>


  <div
    className="stat-card"
    data-modal
    data-icon="fa-solid fa-triangle-exclamation"
    data-color="var(--amber)"
    data-tag="Command Dashboard"
    data-title="High-Risk Zones"
    data-body="3 zones are currently flagged high-risk, down from 5 yesterday — Main Gate, Darshan Queue Zone 2 and East Entry."
    tabIndex="0"
  >

    <div
      className="ic"
      style={{"background":"var(--amber)"}}
    >

      <i className="fa-solid fa-triangle-exclamation"></i>

    </div>

    <div>

      <div className="lbl" data-i18n="admin.riskZones">
        High-Risk Zones
      </div>

      <div className="val">
        3
      </div>

      <div className="delta neutral">
        vs 5 yesterday
      </div>

    </div>

  </div>


  <div
    className="stat-card"
    data-modal
    data-feature="alerts-admin"
    data-icon="fa-solid fa-bell"
    data-color="var(--red)"
    tabIndex="0"
  >

    <div
      className="ic"
      style={{"background":"var(--red)"}}
    >

      <i className="fa-solid fa-bell"></i>

    </div>

    <div>

      <div className="lbl" data-i18n="admin.activeAlerts">
        Active Alerts
      </div>

      <div className="val">
        12
      </div>

      <div className="delta up">
        +3 new
      </div>

    </div>

  </div>


  <div
    className="stat-card"
    data-modal
    data-feature="volunteer-dispatch"
    data-icon="fa-solid fa-people-group"
    data-color="var(--green)"
    tabIndex="0"
  >

    <div
      className="ic"
      style={{"background":"var(--green)"}}
    >

      <i className="fa-solid fa-people-group"></i>

    </div>

    <div>

      <div className="lbl" data-i18n="admin.volunteers">
        Available Volunteers
      </div>

      <div className="val">
        248
      </div>

      <div className="delta neutral">
        Online & Ready
      </div>

    </div>

  </div>


  <div
    className="stat-card"
    data-modal
    data-feature="healthcare-centers"
    data-icon="fa-solid fa-kit-medical"
    data-color="var(--red)"
    tabIndex="0"
  >

    <div
      className="ic"
      style={{"background":"var(--red)"}}
    >

      <i className="fa-solid fa-kit-medical"></i>

    </div>

    <div>

      <div className="lbl" data-i18n="admin.medicalCases">
        Medical Cases
      </div>

      <div className="val">
        18
      </div>

      <div className="delta up">
        +4 in last 2 hrs
      </div>

    </div>

  </div>


  <div
    className="stat-card"
    data-modal
    data-icon="fa-regular fa-clock"
    data-color="var(--blue)"
    data-tag="Command Dashboard"
    data-title="Avg. Wait Time (Darshan)"
    data-body="Average darshan queue wait time is 68 minutes, down 10 minutes from yesterday."
    tabIndex="0"
  >

    <div
      className="ic"
      style={{"background":"var(--blue)"}}
    >

      <i className="fa-regular fa-clock"></i>

    </div>

    <div>

      <div className="lbl" data-i18n="admin.avgWait">
        Avg. Wait Time (Darshan)
      </div>

      <div className="val">
        68 min
      </div>

      <div className="delta upgood">
        −10 min vs yesterday
      </div>

    </div>

  </div>

</div>




<div className="main-grid">




<div className="panel cctv-panel">

  <div className="panel-head">

    <h3>

      Live CCTV Monitoring

      <span className="tag-live" data-i18n="common.live">
        LIVE
      </span>

    </h3>

    <a
      href="#"
      data-modal
      data-feature="live-cctv"
      tabIndex="0"
    >

      View All Cameras

      <i
        className="fa-solid fa-up-right-from-square"
        style={{"fontSize":"9px"}}
      ></i>

    </a>

  </div>


  <div className="cctv-grid">


    

    <div
      className="cctv-tile"

      data-modal

      data-icon="fa-solid fa-video"

      data-color="#5C1010"

      data-tag="Camera Feed · Live"

      data-title="Main Gate"

      data-body="Density reading: 92% — High Congestion. AI has flagged this feed for crowd control response."

      tabIndex="0"

      style={{"background":"linear-gradient(\r\n            160deg,\r\n            #8b5a3c,\r\n            #3a2416\r\n          )","gridColumn":"1","gridRow":"1"}}
    >

      <div className="tag">

        <span className="dot"></span>

        Main Gate

        <i
          className="fa-solid fa-circle"
          style={{"fontSize":"6px"}}
        ></i>

        Live

      </div>


      <div>

        <span
          className="badge"
          style={{"background":"var(--red)"}}
        >
          High Congestion
        </span>

        <div className="density">
          Density: 92%
        </div>

      </div>

    </div>


    

    <div
      className="cctv-tile"

      data-modal

      data-icon="fa-solid fa-video"

      data-color="#7a4a2b"

      data-tag="Camera Feed · Live"

      data-title="Darshan Queue"

      data-body="Density reading: 76%. Queue is moving steadily; monitored continuously by the crowd AI model."

      tabIndex="0"

      style={{"background":"linear-gradient(\r\n            160deg,\r\n            #d0a66a,\r\n            #76502f\r\n          )","gridColumn":"2","gridRow":"1"}}
    >

      <div className="tag">

        <span className="dot"></span>

        Darshan Queue

      </div>


      <div>

        <div
          className="density"
          style={{"background":"rgba(224,168,37,.85)"}}
        >
          Density: 76%
        </div>

      </div>

    </div>


    

    <div
      className="cctv-tile"

      data-modal

      data-icon="fa-solid fa-video"

      data-color="#8B1B1B"

      data-tag="Camera Feed · Live"

      data-title="Darshan Queue — Camera 03"

      data-body="Density reading: 76%. Queue movement is being monitored continuously by the crowd AI model."

      tabIndex="0"

      style={{"background":"linear-gradient(\r\n            145deg,\r\n            #7f8c80,\r\n            #273d31\r\n          )","gridColumn":"3","gridRow":"1 / span 2"}}
    >

      <div className="tag">

        <span className="dot"></span>

        Darshan Queue

        <i
          className="fa-solid fa-circle"
          style={{"fontSize":"6px"}}
        ></i>

        Live

      </div>


      <div>

        <span
          className="badge"
          style={{"background":"var(--red)"}}
        >
          High Congestion
        </span>

        <div className="density">
          Density: 76%
        </div>

      </div>

    </div>


    

    <div
      className="cctv-tile"

      data-modal

      data-icon="fa-solid fa-video"

      data-color="#8B1B1B"

      data-tag="Camera Feed · Live"

      data-title="Darshan Queue — Camera 04"

      data-body="Density reading: 72%. Crowd movement is under live observation; a medical event has also been flagged."

      tabIndex="0"

      style={{"background":"linear-gradient(\r\n            145deg,\r\n            #7b8f79,\r\n            #344c3d\r\n          )","gridColumn":"4","gridRow":"1 / span 2"}}
    >

      <div className="tag">

        <span className="dot"></span>

        Darshan Queue

        <i
          className="fa-solid fa-circle"
          style={{"fontSize":"6px"}}
        ></i>

        Live

      </div>


      <div>

        <span
          className="badge"
          style={{"background":"var(--red)"}}
        >
          High Congestion
        </span>

        <div className="density">
          Density: 72%
        </div>

        <div
          className="density"
          style={{"marginTop":"4px"}}
        >
          <i className="fa-solid fa-kit-medical"></i>
          Medical Event
        </div>

      </div>

    </div>


    

    <div
      className="cctv-tile"

      data-modal

      data-icon="fa-solid fa-video"

      data-color="#1F9D55"

      data-tag="Camera Feed · Live"

      data-title="Sabha Mandap"

      data-body="Density reading: 45% — comfortable levels, no action needed."

      tabIndex="0"

      style={{"background":"linear-gradient(\r\n            160deg,\r\n            #59785a,\r\n            #26392a\r\n          )","gridColumn":"1","gridRow":"2"}}
    >

      <div className="tag">

        <span className="dot"></span>

        Sabha Mandap

      </div>


      <div>

        <div
          className="density"
          style={{"background":"rgba(31,157,85,.8)"}}
        >
          Density: 45%
        </div>

      </div>

    </div>


    

    <div
      className="cctv-tile"

      data-modal

      data-icon="fa-solid fa-video"

      data-color="#2b2118"

      data-tag="Camera Feed · Live"

      data-title="East Entry"

      data-body="A medical event has been detected on this feed. Medical Team dispatched, ETA 3 minutes."

      tabIndex="0"

      style={{"background":"linear-gradient(\r\n            160deg,\r\n            #8f705b,\r\n            #2b2118\r\n          )","gridColumn":"2","gridRow":"2"}}
    >

      <div className="tag">

        <span className="dot"></span>

        East Entry

      </div>


      <div>

        <span
          className="badge"
          style={{"background":"var(--red)"}}
        >

          <i className="fa-solid fa-kit-medical"></i>

          Medical Event

        </span>

      </div>

    </div>


  </div>


  <div className="cctv-dots">

    <span className="on"></span>

    <span></span>

    <span></span>

    <span></span>

  </div>

</div>




<div className="panel map-panel">

  <div className="panel-head">

    <h3>
      Temple Map & Live Congestion Heatmap
    </h3>

    <a
      href="#"
      data-modal
      data-feature="temple-map"
      tabIndex="0"
    >

      <i
        className="fa-solid fa-circle"
        style={{"color":"var(--green)","fontSize":"8px"}}
      ></i>

      Live

      <i
        className="fa-solid fa-chevron-down"
        style={{"fontSize":"9px"}}
      ></i>

    </a>

  </div>


  

  <div className="map-legend-top">

    <span>

      <i
        className="dot"
        style={{"background":"var(--green)"}}
      ></i>

      Low

    </span>


    <span>

      <i
        className="dot"
        style={{"background":"var(--amber)"}}
      ></i>

      Moderate

    </span>


    <span>

      <i
        className="dot"
        style={{"background":"#F97316"}}
      ></i>

      High

    </span>


    <span>

      <i
        className="dot"
        style={{"background":"var(--red)"}}
      ></i>

      Critical

    </span>


    <span>

      <i
        className="fa-solid fa-circle-exclamation"
        style={{"color":"var(--red)","fontSize":"10px"}}
      ></i>

      Incidents

    </span>

  </div>


  

  <div className="map-panel-wrap">


    

    <span
      className="map-node"
      style={{"top":"8px","left":"44%"}}
    >
      North Gate
    </span>


    <span
      className="map-node"
      style={{"top":"60px","left":"38%"}}
    >
      Sabha
      <br />
      Mandap
    </span>


    <span
      className="map-node"
      style={{"top":"100px","left":"46%"}}
    >
      Main
      <br />
      Temple
    </span>


    <span
      className="map-node"
      style={{"top":"8px","left":"10%"}}
    >
      Annadan
      <br />
      Center
    </span>


    <span
      className="map-node"
      style={{"top":"100px","left":"78%"}}
    >
      East Entry
    </span>


    <span
      className="map-node"
      style={{"bottom":"10px","left":"5%"}}
    >
      Parking Area
    </span>


    <span
      className="map-node"
      style={{"bottom":"6px","left":"55%"}}
    >
      Main Gate
    </span>


    

    <div
      className="map-pin"
      style={{"background":"var(--red)","top":"82px","left":"30%"}}
    >
      <i className="fa-solid fa-exclamation"></i>
    </div>


    <div
      className="map-pin"
      style={{"background":"var(--red)","top":"44px","left":"63%"}}
    >
      <i className="fa-solid fa-exclamation"></i>
    </div>


    <div
      className="map-pin"
      style={{"background":"var(--red)","top":"135px","left":"8%"}}
    >
      <i className="fa-solid fa-exclamation"></i>
    </div>


    

    <div
      className="map-pin"
      style={{"background":"var(--green)","width":"20px","height":"20px","top":"20px","left":"70%","fontSize":"9px"}}
    >

      <i className="fa-solid fa-user"></i>

    </div>


    <div
      className="map-pin"
      style={{"background":"var(--green)","width":"20px","height":"20px","top":"70px","left":"20%","fontSize":"9px"}}
    >

      <i className="fa-solid fa-user"></i>

    </div>


    

    <div
      className="map-pin"
      style={{"background":"var(--blue)","width":"20px","height":"20px","top":"100px","left":"88%","fontSize":"9px"}}
    >

      <i className="fa-solid fa-kit-medical"></i>

    </div>


    

    <div
      className="map-pin"
      style={{"background":"#7C3AED","width":"20px","height":"20px","top":"130px","left":"70%","fontSize":"9px"}}
    >

      <i className="fa-solid fa-user"></i>

    </div>


    

    <div
      style={{"position":"absolute","top":"105px","left":"60%","background":"#fff","border":"1px solid var(--card-border)","borderRadius":"8px","padding":"6px 10px","fontSize":"9.5px","fontWeight":"700","boxShadow":"0 4px 10px\r\n          rgba(0,0,0,.08)"}}
    >

      Event Detected
      <br />

      by CCTV 10:26 AM

    </div>


  </div>


  

  <div className="map-legend-bottom">

    <span>

      <i
        className="fa-solid fa-circle-exclamation"
        style={{"color":"var(--red)"}}
      ></i>

      Incident

    </span>


    <span>

      <i
        className="fa-solid fa-triangle-exclamation"
        style={{"color":"var(--amber)"}}
      ></i>

      High Congestion

    </span>


    <span>

      <i
        className="fa-solid fa-user"
        style={{"color":"var(--red)"}}
      ></i>

      Lost Person

    </span>


    <span>

      <i
        className="fa-solid fa-kit-medical"
        style={{"color":"var(--blue)"}}
      ></i>

      Medical Aid

    </span>


    <span>

      <i
        className="fa-solid fa-user-group"
        style={{"color":"var(--green)"}}
      ></i>

      Volunteer

    </span>

  </div>

</div>




<div
  style={{"display":"flex","flexDirection":"column","gap":"16px"}}
>

  <div className="panel">

    <div className="panel-head">

      <h3>
        Priority Alerts
      </h3>

      <a
        href="#"
        data-modal
        data-feature="alerts-admin"
        tabIndex="0"
      >
        View All (12)
      </a>

    </div>


    <div
      className="pa-item"
      data-modal
      data-icon="fa-solid fa-users"
      data-color="var(--red)"
      data-tag="High Severity · Just now"
      data-title="High Congestion — Main Gate"
      data-body="Density at Main Gate has reached 92%. Team Alpha (12 members) dispatched, ETA 2 minutes."
      tabIndex="0"
    >

      <div
        className="ic"
        style={{"background":"var(--red)"}}
      >
        <i className="fa-solid fa-users"></i>
      </div>

      <div>

        <b>
          High Congestion
        </b>

        <span className="loc">
          Main Gate
        </span>

        <br />

        <span className="tm">
          10:30 AM • Just now
        </span>

      </div>

      <span className="sev-tag high">
        High
      </span>

    </div>


    <div
      className="pa-item"
      data-modal
      data-icon="fa-solid fa-kit-medical"
      data-color="var(--red)"
      data-tag="High Severity · 2 min ago"
      data-title="Medical Event — Darshan Queue Zone 2"
      data-body="A medical event was flagged in Darshan Queue Zone 2. Medical Team (2 members) dispatched, ETA 3 minutes."
      tabIndex="0"
    >

      <div
        className="ic"
        style={{"background":"var(--red)"}}
      >
        <i className="fa-solid fa-kit-medical"></i>
      </div>

      <div>

        <b>
          Medical Event
        </b>

        <span className="loc">
          Darshan Queue Zone 2
        </span>

        <br />

        <span className="tm">
          10:28 AM • 2 min ago
        </span>

      </div>

      <span className="sev-tag high">
        High
      </span>

    </div>


    <div
      className="pa-item"
      data-modal
      data-icon="fa-solid fa-magnifying-glass"
      data-color="var(--amber)"
      data-tag="Medium Severity · 5 min ago"
      data-title="Lost Person Report — Near Sabha Mandap"
      data-body="A lost-person report was filed near Sabha Mandap. Team Bravo (6 members) is en route, ETA 4 minutes."
      tabIndex="0"
    >

      <div
        className="ic"
        style={{"background":"var(--amber)"}}
      >
        <i className="fa-solid fa-magnifying-glass"></i>
      </div>

      <div>

        <b>
          Lost Person Report
        </b>

        <span className="loc">
          Near Sabha Mandap
        </span>

        <br />

        <span className="tm">
          10:25 AM • 5 min ago
        </span>

      </div>

      <span className="sev-tag medium">
        Medium
      </span>

    </div>


    <div
      className="pa-item"
      data-modal
      data-icon="fa-solid fa-users"
      data-color="var(--amber)"
      data-tag="Medium Severity · 10 min ago"
      data-title="High Congestion — East Entry"
      data-body="Density at East Entry is elevated. Team Charlie (8 members) dispatched, ETA 5 minutes."
      tabIndex="0"
    >

      <div
        className="ic"
        style={{"background":"var(--amber)"}}
      >
        <i className="fa-solid fa-users"></i>
      </div>

      <div>

        <b>
          High Congestion
        </b>

        <span className="loc">
          East Entry
        </span>

        <br />

        <span className="tm">
          10:20 AM • 10 min ago
        </span>

      </div>

      <span className="sev-tag medium">
        Medium
      </span>

    </div>

  </div>




<div className="panel">

  <div
    className="panel-head"
    style={{"marginBottom":"8px"}}
  >

    <h3>
      Quick Actions
    </h3>

  </div>


  <div className="qa-grid">

    <div
      className="qa-btn"
      data-modal
      data-feature="force-dispatch"
      tabIndex="0"
    >

      <i
        className="fa-solid fa-truck-fast"
        style={{"color":"var(--blue)"}}
      ></i>

      Force Dispatch

    </div>


    <div
      className="qa-btn"
      data-modal
      data-feature="broadcast"
      tabIndex="0"
    >

      <i
        className="fa-solid fa-bullhorn"
        style={{"color":"var(--amber)"}}
      ></i>

      Broadcast Message

    </div>


    <div
      className="qa-btn"
      data-modal
      data-feature="open-incident"
      tabIndex="0"
    >

      <i
        className="fa-solid fa-triangle-exclamation"
        style={{"color":"var(--red)"}}
      ></i>

      Open Incident

    </div>


    <div
      className="qa-btn"
      data-modal
      data-feature="medical-alert"
      tabIndex="0"
    >

      <i
        className="fa-solid fa-kit-medical"
        style={{"color":"var(--red)"}}
      ></i>

      Medical Alert

    </div>


    <div
      className="qa-btn"
      data-modal
      data-feature="crowd-control"
      tabIndex="0"
    >

      <i
        className="fa-solid fa-people-group"
        style={{"color":"var(--orange)"}}
      ></i>

      Crowd Control

    </div>


    <div
      className="qa-btn"
      data-modal
      data-feature="emergency-call"
      tabIndex="0"
    >

      <i
        className="fa-solid fa-phone-volume"
        style={{"color":"var(--maroon)"}}
      ></i>

      Emergency Call

    </div>

  </div>

</div>




<div className="panel">

  <div
    className="panel-head"
    style={{"marginBottom":"8px"}}
  >

    <h3>
      Temple Status Overview
    </h3>

  </div>


  <div
    className="tso-row"
    data-modal
    data-icon="fa-solid fa-place-of-worship"
    data-color="#1F9D55"
    data-tag="Temple Status"
    data-title="Temple Operational Status"
    data-body="The temple complex is fully operational with no disruptions to services or darshan."
    tabIndex="0"
  >

    Temple Operational Status

    <span className="tso-tag ok">
      Operational
    </span>

  </div>


  <div
    className="tso-row"
    data-modal
    data-icon="fa-solid fa-cloud-sun"
    data-color="#E0A825"
    data-tag="Temple Status"
    data-title="Weather Condition"
    data-body="Currently 28°C and partly cloudy at the temple complex, with light rain possible later today."
    tabIndex="0"
  >

    Weather Condition

    <span>

      28°C

      <i
        className="fa-solid fa-cloud-sun"
        style={{"color":"var(--amber)"}}
      ></i>

      Partly Cloudy

    </span>

  </div>


  <div
    className="tso-row"
    data-modal
    data-icon="fa-solid fa-shield-halved"
    data-color="#2563EB"
    data-tag="Temple Status"
    data-title="Security Status"
    data-body="Security posture is Normal — all checkpoints staffed and no active threats."
    tabIndex="0"
  >

    Security Status

    <span className="tso-tag ok">
      Normal
    </span>

  </div>


  <div
    className="tso-row"
    data-modal
    data-icon="fa-solid fa-bolt"
    data-color="#2563EB"
    data-tag="Temple Status"
    data-title="Power Backup"
    data-body="Backup power is Online and ready, in case of any grid disruption during peak hours."
    tabIndex="0"
  >

    Power Backup

    <span className="tso-tag info">
      Online
    </span>

  </div>


  <div
    className="tso-row"
    data-modal
    data-icon="fa-solid fa-bullhorn"
    data-color="#1F9D55"
    data-tag="Temple Status"
    data-title="Public Announcement"
    data-body="The public announcement system is Active and being used for live crowd guidance."
    tabIndex="0"
  >

    Public Announcement

    <span className="tso-tag ok">
      Active
    </span>

  </div>

</div>

</div>

</div>




<div className="incidents-row">

  <div className="panel">

    <div className="panel-head">

      <h3>
        Active Incidents & Dispatch
      </h3>

    </div>


    <table className="inc-table">

      <thead>

        <tr>

          <th>Severity</th>
          <th>Incident</th>
          <th>Location</th>
          <th>Time</th>
          <th>Assigned Team</th>
          <th>Status</th>
          <th>ETA</th>

        </tr>

      </thead>


      <tbody>


        <tr
          data-modal
          data-icon="fa-solid fa-users"
          data-color="var(--red)"
          data-tag="High · Dispatched"
          data-title="High Congestion — Main Gate"
          data-body="Reported 10:30 AM. Team Alpha (12 members) dispatched, ETA 2 minutes."
          tabIndex="0"
        >

          <td>
            <span className="sev-pill High">
              High
            </span>
          </td>

          <td>
            High Congestion
          </td>

          <td>
            Main Gate
          </td>

          <td>
            10:30 AM
          </td>

          <td>
            Team Alpha (12)
          </td>

          <td>
            <span className="status-pill Dispatched">
              Dispatched
            </span>
          </td>

          <td>
            2 min
          </td>

        </tr>


        <tr
          data-modal
          data-icon="fa-solid fa-kit-medical"
          data-color="var(--red)"
          data-tag="High · Dispatched"
          data-title="Medical Event — Darshan Queue Zone 2"
          data-body="Reported 10:28 AM. Medical Team (2 members) dispatched, ETA 3 minutes."
          tabIndex="0"
        >

          <td>
            <span className="sev-pill High">
              High
            </span>
          </td>

          <td>
            Medical Event
          </td>

          <td>
            Darshan Queue Zone 2
          </td>

          <td>
            10:28 AM
          </td>

          <td>
            Medical Team (2)
          </td>

          <td>
            <span className="status-pill Dispatched">
              Dispatched
            </span>
          </td>

          <td>
            3 min
          </td>

        </tr>


        <tr
          data-modal
          data-icon="fa-solid fa-magnifying-glass"
          data-color="var(--amber)"
          data-tag="Medium · En Route"
          data-title="Lost Person Report — Near Sabha Mandap"
          data-body="Reported 10:25 AM. Team Bravo (6 members) en route, ETA 4 minutes."
          tabIndex="0"
        >

          <td>
            <span className="sev-pill Medium">
              Medium
            </span>
          </td>

          <td>
            Lost Person Report
          </td>

          <td>
            Near Sabha Mandap
          </td>

          <td>
            10:25 AM
          </td>

          <td>
            Team Bravo (6)
          </td>

          <td>
            <span className="status-pill EnRoute">
              En Route
            </span>
          </td>

          <td>
            4 min
          </td>

        </tr>


        <tr
          data-modal
          data-icon="fa-solid fa-users"
          data-color="var(--amber)"
          data-tag="Medium · Dispatched"
          data-title="High Congestion — East Entry"
          data-body="Reported 10:20 AM. Team Charlie (8 members) dispatched, ETA 5 minutes."
          tabIndex="0"
        >

          <td>
            <span className="sev-pill Medium">
              Medium
            </span>
          </td>

          <td>
            High Congestion
          </td>

          <td>
            East Entry
          </td>

          <td>
            10:20 AM
          </td>

          <td>
            Team Charlie (8)
          </td>

          <td>
            <span className="status-pill Dispatched">
              Dispatched
            </span>
          </td>

          <td>
            5 min
          </td>

        </tr>


      </tbody>

    </table>

  </div>


  

  <div>


    <div
      className="dispatch-card"
      data-modal
      data-icon="fa-solid fa-vest"
      data-color="var(--green)"
      data-tag="Dispatch · ETA 2 min"
      data-title="Team Alpha Dispatched"
      data-body="12 volunteers en route to Main Gate to respond to High Congestion."
      tabIndex="0"
    >

      <div className="dispatch-top">

        <div
          className="ic"
          style={{"background":"var(--green)"}}
        >
          <i className="fa-solid fa-vest"></i>
        </div>

        <div>

          <b>
            Team Alpha Dispatched
          </b>

          <span>
            To: Main Gate (High Congestion)
          </span>

        </div>

        <i
          className="chev fa-solid fa-chevron-right"
        ></i>

      </div>


      <div className="dispatch-bottom">

        <div className="avatars">

          <img
            src="https://i.pravatar.cc/40?img=11"
           />

          <img
            src="https://i.pravatar.cc/40?img=12"
           />

          <img
            src="https://i.pravatar.cc/40?img=14"
           />

          <img
            src="https://i.pravatar.cc/40?img=15"
           />

          <div className="more">
            +7
          </div>

        </div>


        <span
          className="eta-pill"
          style={{"background":"var(--green)"}}
        >
          ETA 2 min
        </span>

      </div>

    </div>


    <div
      className="dispatch-card"
      data-modal
      data-icon="fa-solid fa-truck-medical"
      data-color="var(--red)"
      data-tag="Dispatch · ETA 3 min"
      data-title="Medical Team Dispatched"
      data-body="A dedicated medical team is en route to Darshan Queue Zone 2."
      tabIndex="0"
    >

      <div className="dispatch-top">

        <div
          className="ic"
          style={{"background":"var(--red)"}}
        >

          <i className="fa-solid fa-truck-medical"></i>

        </div>

        <div>

          <b>
            Medical Team Dispatched
          </b>

          <span>
            To: Darshan Queue Zone 2
          </span>

        </div>

        <i
          className="chev fa-solid fa-chevron-right"
        ></i>

      </div>


      <div className="dispatch-bottom">

        <div className="avatars">

          <img
            src="https://i.pravatar.cc/40?img=16"
           />

          <img
            src="https://i.pravatar.cc/40?img=17"
           />

          <div className="more">
            +0
          </div>

        </div>

        <span
          className="eta-pill"
          style={{"background":"var(--red)"}}
        >
          ETA 3 min
        </span>

      </div>

    </div>


    <div
      className="dispatch-card"
      data-modal
      data-icon="fa-solid fa-person-running"
      data-color="var(--amber)"
      data-tag="Dispatch · ETA 4 min"
      data-title="Team Bravo En Route"
      data-body="6 volunteers are searching near Sabha Mandap for the reported lost person."
      tabIndex="0"
    >

      <div className="dispatch-top">

        <div
          className="ic"
          style={{"background":"var(--amber)"}}
        >

          <i className="fa-solid fa-person-running"></i>

        </div>

        <div>

          <b>
            Team Bravo En Route
          </b>

          <span>
            Near Sabha Mandap
          </span>

        </div>

        <i
          className="chev fa-solid fa-chevron-right"
        ></i>

      </div>


      <div className="dispatch-bottom">

        <div className="avatars">

          <img
            src="https://i.pravatar.cc/40?img=18"
           />

          <img
            src="https://i.pravatar.cc/40?img=19"
           />

          <div className="more">
            +4
          </div>

        </div>

        <span
          className="eta-pill"
          style={{"background":"var(--amber)"}}
        >
          ETA 4 min
        </span>

      </div>

    </div>


  </div>

</div>




<div className="bottom-grid">


  <div className="bstat-strip">


    <div
      className="bstat-card"
      data-modal
      data-icon="fa-solid fa-triangle-exclamation"
      data-color="var(--amber)"
      data-tag="Command Dashboard"
      data-title="Active Incidents"
      data-body="There are currently 12 active incidents being monitored and handled by response teams."
      tabIndex="0"
    >

      <div className="top">

        <div className="lbl">

          <i
            className="fa-solid fa-triangle-exclamation"
          ></i>

          Active Incidents

        </div>

      </div>

      <div className="val">
        12
      </div>

      <div className="delta up">
        ↑ 3 vs last 1 hr
      </div>


      <svg
        className="mini-chart"
        viewBox="0 0 100 26"
        preserveAspectRatio="none"
      >

        <polyline
          points="
            0,20
            15,18
            30,14
            45,16
            60,10
            75,12
            100,4
          "
          fill="none"
          stroke="var(--amber)"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

      </svg>

    </div>


    <div
      className="bstat-card"
      data-modal
      data-icon="fa-regular fa-clock"
      data-color="var(--orange)"
      data-tag="Command Dashboard"
      data-title="Avg. Queue Wait Time"
      data-body="Average darshan queue wait time is 68 minutes, down 10 minutes from yesterday."
      tabIndex="0"
    >

      <div className="top">

        <div className="lbl">

          <i
            className="fa-regular fa-clock"
          ></i>

          Avg. Queue Wait Time

        </div>

      </div>

      <div className="val">
        68 min
      </div>

      <div className="delta upgood">
        ↓ 10 vs yesterday
      </div>


      <svg
        className="mini-chart"
        viewBox="0 0 100 26"
        preserveAspectRatio="none"
      >

        <polyline
          points="
            0,6
            15,10
            30,8
            45,16
            60,14
            75,20
            100,18
          "
          fill="none"
          stroke="var(--orange)"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

      </svg>

    </div>


    <div
      className="bstat-card"
      data-modal
      data-feature="healthcare-centers"
      data-icon="fa-solid fa-hospital"
      data-color="var(--green)"
      tabIndex="0"
      style={{"display":"flex","alignItems":"center","gap":"12px"}}
    >

      <div
        className="ring-sm"
        style={{"background":"conic-gradient(\r\n            var(--green) 0% 62%,\r\n            #EFE9DF 62% 100%\r\n          )"}}
      >

        <div className="hole">
          62%
        </div>

      </div>


      <div>

        <div className="lbl">

          <i
            className="fa-solid fa-hospital"
          ></i>

          Healthcare Occupancy

        </div>

        <div
          className="delta up"
          style={{"marginTop":"4px"}}
        >
          ↑ 8% vs yesterday
        </div>

      </div>

    </div>


    <div
      className="bstat-card"
      data-modal
      data-icon="fa-solid fa-kit-medical"
      data-color="var(--red)"
      data-tag="Command Dashboard"
      data-title="Emergency Cases (Today)"
      data-body="18 emergency cases handled today, up 4 from yesterday. All currently assigned to a response team."
      tabIndex="0"
    >

      <div className="top">

        <div className="lbl">

          <i
            className="fa-solid fa-kit-medical"
          ></i>

          Emergency Cases (Today)

        </div>

      </div>

      <div className="val">
        18
      </div>

      <div className="delta up">
        ↑ 4 vs yesterday
      </div>

    </div>


    <div
      className="bstat-card"
      data-modal
      data-icon="fa-solid fa-square-check"
      data-color="#4A423C"
      data-tag="Command Dashboard"
      data-title="Service Counters"
      data-body="24 of 32 service counters are currently operational across ticketing, information and registration desks."
      tabIndex="0"
    >

      <div className="top">

        <div className="lbl">

          <i
            className="fa-solid fa-square-check"
          ></i>

          Service Counters

        </div>

      </div>

      <div className="val">
        24 / 32
      </div>

      <div className="delta neutral">
        Operational
      </div>

    </div>


  </div>




<div className="panel">

  <div className="panel-head">

    <h3>
      Healthcare Centers Status
    </h3>

    <a
      href="#"
      data-modal
      data-feature="healthcare-centers"
      tabIndex="0"
    >
      View All
    </a>

  </div>


  <table className="hc-table">

    <thead>

      <tr>

        <th>
          Center
        </th>

        <th>
          Occupancy
        </th>

        <th>
          Status
        </th>

      </tr>

    </thead>


    <tbody>


      <tr
        data-modal
        data-icon="fa-solid fa-hospital"
        data-color="var(--red)"
        data-tag="62% Occupied · Operational"
        data-title="Main Medical Center"
        data-body="The Main Medical Center is running at 62% occupancy and fully operational."
        tabIndex="0"
      >

        <td>

          <div className="hc-name">

            <i
              style={{"background":"var(--red)"}}
              className="fa-solid fa-hospital"
            ></i>

            Main Medical Center

          </div>

        </td>


        <td>

          <span className="occ-bar">

            <span
              style={{"width":"62%"}}
            ></span>

          </span>

          62%

        </td>


        <td>

          <span className="op-tag">

            <i
              className="fa-solid fa-circle"
            ></i>

            Operational

          </span>

        </td>

      </tr>


      <tr
        data-modal
        data-icon="fa-solid fa-hospital"
        data-color="var(--green)"
        data-tag="48% Occupied · Operational"
        data-title="East Side Clinic"
        data-body="East Side Clinic is running at 48% occupancy and fully operational."
        tabIndex="0"
      >

        <td>

          <div className="hc-name">

            <i
              style={{"background":"var(--green)"}}
              className="fa-solid fa-hospital"
            ></i>

            East Side Clinic

          </div>

        </td>


        <td>

          <span className="occ-bar">

            <span
              style={{"width":"48%"}}
            ></span>

          </span>

          48%

        </td>


        <td>

          <span className="op-tag">

            <i
              className="fa-solid fa-circle"
            ></i>

            Operational

          </span>

        </td>

      </tr>


      <tr
        data-modal
        data-icon="fa-solid fa-hospital"
        data-color="var(--red)"
        data-tag="35% Occupied · Operational"
        data-title="North Gate Aid Post"
        data-body="North Gate Aid Post is running at 35% occupancy and fully operational."
        tabIndex="0"
      >

        <td>

          <div className="hc-name">

            <i
              style={{"background":"var(--red)"}}
              className="fa-solid fa-hospital"
            ></i>

            North Gate Aid Post

          </div>

        </td>


        <td>

          <span className="occ-bar">

            <span
              style={{"width":"35%"}}
            ></span>

          </span>

          35%

        </td>


        <td>

          <span className="op-tag">

            <i
              className="fa-solid fa-circle"
            ></i>

            Operational

          </span>

        </td>

      </tr>


      <tr
        data-modal
        data-icon="fa-solid fa-truck-medical"
        data-color="var(--orange)"
        data-tag="22% Occupied · Operational"
        data-title="Mobile Medical Unit 1"
        data-body="Mobile Medical Unit 1 is running at 22% occupancy and fully operational, currently positioned near the main route."
        tabIndex="0"
      >

        <td>

          <div className="hc-name">

            <i
              style={{"background":"var(--orange)"}}
              className="fa-solid fa-truck-medical"
            ></i>

            Mobile Medical Unit 1

          </div>

        </td>


        <td>

          <span className="occ-bar">

            <span
              style={{"width":"22%"}}
            ></span>

          </span>

          22%

        </td>


        <td>

          <span className="op-tag">

            <i
              className="fa-solid fa-circle"
            ></i>

            Operational

          </span>

        </td>

      </tr>


    </tbody>

  </table>

</div>

</div>




<div className="charts-row">


  

  <div
    className="panel"
    data-modal
    data-feature="crowd-heatmap"
    data-icon="fa-solid fa-chart-line"
    data-color="#C94F06"
    tabIndex="0"
  >

    <div
      className="panel-head"
      style={{"marginBottom":"4px"}}
    >

      <h3 style={{"fontSize":"13px"}}>
        Crowd Trend (Today)
      </h3>

    </div>


    <div className="chart-legend">

      <span>

        <i
          style={{"background":"var(--orange)"}}
        ></i>

        Total Footfall

      </span>


      <span>

        <i className="dashed"></i>

        Expected Trend

      </span>

    </div>


    <svg
      viewBox="0 0 300 140"
      width="100%"
      height="140"
      preserveAspectRatio="none"
    >

      <defs>

        <linearGradient
          id="gradA"
          x1="0"
          y1="0"
          x2="0"
          y2="1"
        >

          <stop
            offset="0%"
            stopColor="#E8630C"
            stopOpacity=".4"
          />

          <stop
            offset="100%"
            stopColor="#E8630C"
            stopOpacity="0"
          />

        </linearGradient>

      </defs>


      <line
        x1="0"
        y1="10"
        x2="300"
        y2="10"
        stroke="#F1EAE0"
      />

      <line
        x1="0"
        y1="42"
        x2="300"
        y2="42"
        stroke="#F1EAE0"
      />

      <line
        x1="0"
        y1="74"
        x2="300"
        y2="74"
        stroke="#F1EAE0"
      />

      <line
        x1="0"
        y1="106"
        x2="300"
        y2="106"
        stroke="#F1EAE0"
      />


      <path
        d="
          M0,130
          C30,127 55,124 80,95
          C100,73 105,58 120,55
          C138,51 148,32 160,30
          C172,28 182,24 190,25
          C202,26.5 210,30 220,35
          C238,44 248,52 260,60
          C273,68.5 288,71.5 300,75
        "
        fill="none"
        stroke="#B3AAA0"
        strokeWidth="1.5"
        strokeDasharray="4 4"
      />


      <path
        d="
          M0,130
          C30,127 55,120 80,90
          C100,66 105,50 120,45
          C138,39 148,25 160,22
          C172,19.5 182,16.5 190,18
          C202,20 210,26 220,32
          C238,42.5 248,50 260,58
          C273,67 288,69.5 300,72
          L300,140
          L0,140
          Z
        "
        fill="url(#gradA)"
      />


      <path
        d="
          M0,130
          C30,127 55,120 80,90
          C100,66 105,50 120,45
          C138,39 148,25 160,22
          C172,19.5 182,16.5 190,18
          C202,20 210,26 220,32
          C238,42.5 248,50 260,58
          C273,67 288,69.5 300,72
        "
        fill="none"
        stroke="var(--orange)"
        strokeWidth="2.75"
        strokeLinecap="round"
        style={{"filter":"drop-shadow(\r\n            0 3px 5px\r\n            rgba(232,99,12,.3)\r\n          )"}}
      />


      <circle
        cx="190"
        cy="18"
        r="5"
        fill="var(--orange)"
        stroke="#fff"
        strokeWidth="2"
      />

    </svg>


    <div className="axis-labels">

      <span>12 AM</span>
      <span>4 AM</span>
      <span>8 AM</span>
      <span>12 PM</span>
      <span>4 PM</span>
      <span>8 PM</span>
      <span>12 AM</span>

    </div>

  </div>


  

  <div
    className="panel"
    data-modal
    data-feature="incident-mgmt"
    data-icon="fa-solid fa-chart-column"
    data-color="#1F3A5F"
    tabIndex="0"
  >

    <div
      className="panel-head"
      style={{"marginBottom":"4px"}}
    >

      <h3 style={{"fontSize":"13px"}}>
        Average Response Time
      </h3>

    </div>


    <div className="chart-legend">

      <span>

        <i
          className="dashed"
          style={{"background":"var(--green)"}}
        ></i>

        Target (&lt; 5 min)

      </span>

    </div>


    <div className="bar-values">

      <span>4.2 min</span>
      <span>4.6 min</span>
      <span>3.8 min</span>
      <span>4.1 min</span>
      <span>4.7 min</span>
      <span>4.3 min</span>
      <span>4.0 min</span>

    </div>


    <svg
      viewBox="0 0 300 130"
      width="100%"
      height="120"
    >

      <defs>

        <linearGradient
          id="gradBar"
          x1="0"
          y1="0"
          x2="0"
          y2="1"
        >

          <stop
            offset="0%"
            stopColor="#2563EB"
          />

          <stop
            offset="100%"
            stopColor="#1F3A5F"
          />

        </linearGradient>

      </defs>


      <line
        x1="0"
        y1="20"
        x2="300"
        y2="20"
        stroke="var(--green)"
        strokeWidth="1.5"
        strokeDasharray="5 4"
      />


      <g fill="url(#gradBar)">

        <rect
          x="6"
          y="46"
          width="28"
          height="74"
          rx="5"
        ></rect>

        <rect
          x="48"
          y="34"
          width="28"
          height="86"
          rx="5"
        ></rect>

        <rect
          x="90"
          y="58"
          width="28"
          height="62"
          rx="5"
        ></rect>

        <rect
          x="132"
          y="42"
          width="28"
          height="78"
          rx="5"
        ></rect>

        <rect
          x="174"
          y="26"
          width="28"
          height="94"
          rx="5"
          fill="var(--orange)"
        ></rect>

        <rect
          x="216"
          y="38"
          width="28"
          height="82"
          rx="5"
        ></rect>

        <rect
          x="258"
          y="48"
          width="28"
          height="72"
          rx="5"
        ></rect>

      </g>

    </svg>


    <div className="axis-labels">

      <span>12 AM</span>
      <span>4 AM</span>
      <span>8 AM</span>
      <span>12 PM</span>
      <span>4 PM</span>
      <span>8 PM</span>
      <span>12 AM</span>

    </div>

  </div>

</div>



      </AdminShell>
    </div>
  );
}
