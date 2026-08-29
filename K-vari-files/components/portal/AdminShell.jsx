'use client';

/**
 * The Temple Command Dashboard chrome — topbar, sidebar, layout — lifted out
 * of the dashboard page so more than one admin screen can wear it.
 *
 * It exists because the superadmin Location Management screen needs to look
 * like part of the dashboard rather than a separate tool bolted on. Anything
 * rendered as {children} lands in the same <main className="content"> the
 * dashboard's own panels sit in.
 *
 * Sidebar entries still tagged data-modal are handled by the shared
 * public/assets/features.js click layer; the two that route to real pages
 * (Overview, Location Management) use the Next router instead.
 */

import { useCallback, useState } from 'react';
import { useRouter } from 'next/navigation';

export function AdminShell({
  active = 'overview',
  title = 'VariMitra Temple Command Dashboard',
  subtitle = 'Temple Management & Crowd Response Subsystem',
  children,
}) {
  const router = useRouter();
  const [navOpen, setNavOpen] = useState(false);

  const goTo = useCallback(
    (href) => (event) => {
      event.preventDefault();
      setNavOpen(false);
      router.push(href);
    },
    [router],
  );

  const onSignOut = useCallback(
    (event) => {
      event.preventDefault();
      localStorage.removeItem('varimitra_user');
      router.push('/');
    },
    [router],
  );

  return (
    <>
      <header className="topbar">

        <div className="brand">

          <button
            className="sidebar-toggle"
            id="sidebarToggle"
            type="button"
            aria-label="Open navigation menu"
            aria-expanded={navOpen}
            onClick={() => setNavOpen((open) => !open)}
          >
            <i className="fa-solid fa-bars"></i>
          </button>

          <div className="logo">
            <i className="fa-solid fa-place-of-worship"></i>
          </div>

          <div>
            <div className="name">VariMitra</div>

            <div className="tagline" data-i18n-html="common.taglineHtml">
              One Platform. Safer Pilgrimage.
              <br />
              Preserved Heritage.
            </div>
          </div>

        </div>


        <div className="page-title">

          <h1>{title}</h1>

          <p>{subtitle}</p>

        </div>


        <div className="search-box">

          <i className="fa-solid fa-magnifying-glass"></i>

          <input
            type="text"
            data-i18n-placeholder="admin.searchPlaceholder"
            placeholder="Search temples, locations, incidents..."
           />

          <kbd>⌘K</kbd>

        </div>


        <div className="topbar-right">

          <div className="dt-chip">

            <i
              className="fa-regular fa-calendar"
              style={{"color":"var(--orange)"}}
            ></i>

            12 Jun 2025, Thu
            <br />
            10:30:44 AM

          </div>


          <div
            className="lang-pick"
            tabIndex="0"
          >

            <i className="fa-solid fa-globe" style={{"fontSize":"14px"}}></i>
            <span className="lang-pick-label">English</span>

            <i
              className="fa-solid fa-chevron-down"
              style={{"fontSize":"9px"}}
            ></i>

          </div>


          <div
            className="bell"
            data-modal
            data-feature="alerts-admin"
            tabIndex="0"
          >

            <i className="fa-regular fa-bell"></i>

            <span className="dot">
              12
            </span>

          </div>


          <div
            className="user-chip"
            data-modal
            data-title="Super Admin"
            data-icon="fa-solid fa-user-shield"
            data-color="#8B1B1B"
            data-tag="Command Dashboard Account"
            data-body="You're signed in as Super Admin, with full access to incident management, dispatch and system settings."
            tabIndex="0"
          >

            <img
              src="https://i.pravatar.cc/64?img=51"
              alt="admin"
             />

            <div
              className="who"
              id="adminChipName"
            >
              <span data-i18n="common.admin">Admin</span>
              <b data-i18n="admin.superAdmin">Super Admin</b>
            </div>

            <i
              className="fa-solid fa-chevron-down"
              style={{"fontSize":"9px","color":"#B3AAA0"}}
            ></i>

          </div>


          <a
            href="/"
            onClick={onSignOut}
            data-i18n-title="common.signOutTitle"
            title="Sign Out / Switch Role"
            style={{"color":"var(--maroon)","fontSize":"13px","padding":"5px 10px","borderRadius":"8px","background":"var(--cream)","border":"1px solid var(--card-border)","display":"flex","alignItems":"center","gap":"6px","fontWeight":"600"}}
          >

            <i className="fa-solid fa-arrow-right-from-bracket"></i>

            <span data-i18n="common.signOut">Sign Out</span>

          </a>

        </div>

      </header>


      <div
        className={navOpen ? 'sidebar-overlay open' : 'sidebar-overlay'}
        id="sidebarOverlay"
        onClick={() => setNavOpen(false)}
      ></div>

      <div className="layout">




      <aside className={navOpen ? 'sidebar open' : 'sidebar'} id="sidebar">

        <a
          className={active === 'overview' ? 'side-link active' : 'side-link'}
          href="/command-dashboard"
          onClick={goTo('/command-dashboard')}
          tabIndex="0"
        >

          <span className="l">

            <i className="icn fa-solid fa-gauge"></i>

            <span data-i18n="admin.sidebarOverview">Overview</span>

          </span>

        </a>


        <a
          className={active === 'crowd' ? 'side-link active' : 'side-link'}
          href="/superadmin/crowd"
          onClick={goTo('/superadmin/crowd')}
          tabIndex="0"
        >

          <span className="l">

            <i className="icn fa-solid fa-users"></i>

            <span>Crowd Congestion</span>

          </span>

          <i className="chev fa-solid fa-chevron-right"></i>

        </a>


        <a
          className="side-link"
          data-modal
          data-feature="crowd-heatmap"
          tabIndex="0"
        >

          <span className="l">

            <i className="icn fa-solid fa-fire"></i>

            <span data-i18n="admin.sidebarHeatmap">Crowd Heatmap</span>

          </span>

          <i className="chev fa-solid fa-chevron-right"></i>

        </a>


        <a
          className="side-link"
          data-modal
          data-feature="temple-map"
          tabIndex="0"
        >

          <span className="l">

            <i className="icn fa-solid fa-map"></i>

            <span data-i18n="admin.sidebarMap">Temple Map</span>

          </span>

          <i className="chev fa-solid fa-chevron-right"></i>

        </a>


        <a
          className="side-link"
          data-modal
          data-feature="volunteer-dispatch"
          tabIndex="0"
        >

          <span className="l">

            <i className="icn fa-solid fa-people-group"></i>

            <span data-i18n="admin.sidebarDispatch">Volunteer Dispatch</span>

          </span>

          <i className="chev fa-solid fa-chevron-right"></i>

        </a>


        <a
          className="side-link"
          data-modal
          data-feature="healthcare-centers"
          tabIndex="0"
        >

          <span className="l">

            <i className="icn fa-solid fa-briefcase-medical"></i>

            <span data-i18n="admin.sidebarHealthcare">Healthcare Centers</span>

          </span>

          <i className="chev fa-solid fa-chevron-right"></i>

        </a>


        <a
          className="side-link"
          data-modal
          data-feature="incident-mgmt"
          tabIndex="0"
        >

          <span className="l">

            <i className="icn fa-solid fa-triangle-exclamation"></i>

            <span data-i18n="admin.sidebarIncidents">Incident Management</span>

          </span>

          <i className="chev fa-solid fa-chevron-right"></i>

        </a>


        <a
          className="side-link"
          data-modal
          data-feature="alerts-admin"
          tabIndex="0"
        >

          <span className="l">

            <i className="icn fa-regular fa-bell"></i>

            <span data-i18n="admin.sidebarAlerts">Alerts</span>

          </span>

          <span className="badge">
            12
          </span>

        </a>


        <a
          className="side-link"
          data-modal
          data-feature="reports"
          tabIndex="0"
        >

          <span className="l">

            <i className="icn fa-solid fa-file-lines"></i>

            <span data-i18n="admin.sidebarReports">Reports</span>

          </span>

          <i className="chev fa-solid fa-chevron-right"></i>

        </a>


        <div className="side-section-label">
          <i className="fa-solid fa-shield-halved"></i>
          <span>Super Admin</span>
        </div>

        <a
          className={active === 'locations' ? 'side-link active' : 'side-link'}
          href="/superadmin/locations"
          onClick={goTo('/superadmin/locations')}
        >

          <span className="l">

            <i className="icn fa-solid fa-map-location-dot"></i>

            <span>Location Management</span>

          </span>

          <i className="chev fa-solid fa-chevron-right"></i>

        </a>

        <a
          className={active === 'lost-found' ? 'side-link active' : 'side-link'}
          href="/superadmin/lost-found"
          onClick={goTo('/superadmin/lost-found')}
        >

          <span className="l">

            <i className="icn fa-solid fa-magnifying-glass-location"></i>

            <span>Lost &amp; Found</span>

          </span>

          <i className="chev fa-solid fa-chevron-right"></i>

        </a>

        <a
          className="side-link"
          data-modal
          data-feature="settings"
          tabIndex="0"
        >

          <span className="l">

            <i className="icn fa-solid fa-gear"></i>

            <span data-i18n="admin.sidebarSettings">Settings</span>

          </span>

          <i className="chev fa-solid fa-chevron-right"></i>

        </a>


        <div
          className="side-promo"
          data-modal
          data-icon="fa-solid fa-circle"
          data-color="#8B1B1B"
          data-tag="Live Operations"
          data-title="Pandharpur Wari (Vari)"
          data-body="Main Temple Complex is under live operational monitoring — cameras, sensors and response teams are all active."
          tabIndex="0"
        >

          <b>
            PANDHARPUR WARI (VARI)
          </b>

          <span>
            Main Temple Complex
          </span>

          <span>
            <i className="fa-solid fa-circle"></i>
            Live Operations
          </span>

        </div>


        <div className="side-status">

          <div className="row">

            <i className="fa-solid fa-circle"></i>

            <span data-i18n="admin.systemStatus">System Status</span>

          </div>

          <p data-i18n="admin.allOperational">
            All Systems Operational
          </p>

          <button
            data-modal
            data-feature="system-logs"
            data-i18n="admin.viewLogs"
          >
            View System Logs
          </button>

        </div>

      </aside>


<main className="content">
{children}
</main>

</div>
    </>
  );
}
