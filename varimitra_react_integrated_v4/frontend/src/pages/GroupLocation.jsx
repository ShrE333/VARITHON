import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Users, WifiOff, Navigation, ShieldAlert, Route, Copy, UserPlus,
  Plus, Phone, AlertTriangle, CheckCircle2, LocateFixed, Footprints
} from 'lucide-react';
import { readUser } from '../auth';
import {
  RouteEngine, LocationTracker, formatDistance, formatEta, haversineMeters
} from '../lib/routeEngine';
import {
  addDemoMembers, createGroup, flushQueue, getCurrentGroup, joinGroup,
  leaveGroup, queuedCount, setMemberStatus, subscribe, updateMyPosition
} from '../lib/groupStore';

function RouteSvg({ bundle, group, myPhone }) {
  if (!bundle || !group || !bundle.coordinates?.length) return null;

  const coords = bundle.coordinates;
  const xs = coords.map((c) => c[0]);
  const ys = coords.map((c) => c[1]);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);

  const project = (coord) => {
    const dx = Math.max(1e-9, maxX - minX);
    const dy = Math.max(1e-9, maxY - minY);
    return [
      30 + ((coord[0] - minX) / dx) * 740,
      350 - ((coord[1] - minY) / dy) * 310,
    ];
  };

  const step = Math.max(1, Math.floor(coords.length / 300));
  const points = coords
    .filter((_, index) => index % step === 0)
    .map((coord) => project(coord).join(','))
    .join(' ');

  return (
    <svg viewBox="0 0 800 380" className="group-map-svg">
      <rect width="800" height="380" rx="18" fill="#f5efe5" />
      <polyline points={points} fill="none" stroke="#d9c6b3" strokeWidth="7" strokeLinecap="round" />
      <polyline points={points} fill="none" stroke="#e8630c" strokeWidth="3" strokeLinecap="round" />

      {group.members
        .filter((member) => member.lat != null && member.lng != null)
        .map((member) => {
          const [x, y] = project([member.lng, member.lat]);
          const mine = member.phone === myPhone;
          const fill = member.status === 'lost' ? '#D64545' : mine ? '#8B1B1B' : '#2563EB';

          return (
            <g key={member.phone} transform={`translate(${x} ${y})`}>
              <circle r={mine ? 12 : 10} fill={fill} stroke="#fff" strokeWidth="4" />
              <text y="-16" textAnchor="middle" fontSize="10" fontWeight="800" fill="#2B2320">
                {member.name}
              </text>
            </g>
          );
        })}
    </svg>
  );
}

export default function GroupLocation() {
  const user = readUser();
  const [route, setRoute] = useState(null);
  const [group, setGroup] = useState(getCurrentGroup());
  const [name, setName] = useState('My Wari Group');
  const [code, setCode] = useState('');
  const [tracked, setTracked] = useState(null);
  const [error, setError] = useState('');
  const [online, setOnline] = useState(navigator.onLine);
  const [queue, setQueue] = useState(queuedCount());
  const trackerRef = useRef(null);

  const engine = useMemo(() => (route ? new RouteEngine(route) : null), [route]);

  useEffect(() => {
    fetch('/data/route.json')
      .then((response) => {
        if (!response.ok) throw new Error('Could not load cached Wari route.');
        return response.json();
      })
      .then(setRoute)
      .catch((err) => setError(err.message));

    return subscribe(setGroup);
  }, []);

  useEffect(() => {
    const onConnectivityChange = () => {
      const isOnline = navigator.onLine;
      setOnline(isOnline);
      if (isOnline) {
        flushQueue();
        setQueue(queuedCount());
      }
    };

    window.addEventListener('online', onConnectivityChange);
    window.addEventListener('offline', onConnectivityChange);
    return () => {
      window.removeEventListener('online', onConnectivityChange);
      window.removeEventListener('offline', onConnectivityChange);
    };
  }, []);

  useEffect(() => {
    if (!engine || !group) return undefined;

    const tracker = new LocationTracker(engine);
    trackerRef.current = tracker;

    try {
      tracker.start(
        (position) => {
          setTracked(position);
          setGroup(updateMyPosition(user, position, position.route));
          setQueue(queuedCount());
        },
        (err) => setError(err.message),
        () => setError('Waiting for a more accurate GPS fix (≤50 m)…')
      );
    } catch (err) {
      setError(err.message);
    }

    return () => tracker.stop();
  }, [engine, group?.code, user?.phone]);

  const mine = group?.members?.find((member) => member.phone === user?.phone);
  const stage = mine?.chainageKm != null && engine ? engine.stageAt(mine.chainageKm) : null;

  const distances = (group?.members || [])
    .filter((member) => member.phone !== user?.phone && member.lat != null && mine?.lat != null)
    .map((member) => ({ ...member, distance: haversineMeters(mine, member) }))
    .sort((a, b) => a.distance - b.distance);

  const separated = distances.filter((member) => member.distance > 500);

  const create = () => {
    try {
      setGroup(createGroup(name, user));
      setError('');
    } catch (err) {
      setError(err.message);
    }
  };

  const join = () => {
    try {
      setGroup(joinGroup(code.trim().toUpperCase(), user));
      setError('');
    } catch (err) {
      setError(err.message);
    }
  };

  if (!group) {
    return (
      <div className="feature-screen">
        <div className="feature-topbar">
          <Link to="/portal">← Back to VariMitra</Link>
          <b>Group Location Sharing</b>
        </div>

        <div className="group-setup">
          <div className="group-intro">
            <div className="big-icon"><Users /></div>
            <h1>Stay together through the Wari</h1>
            <p>
              Create a private yatra group or join one using a code. Once joined,
              every member gets route-aware live location, separation warnings and
              offline-safe route monitoring.
            </p>
          </div>

          <div className="setup-grid">
            <div className="setup-card">
              <Plus />
              <h2>Create Group</h2>
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Group name" />
              <button className="primary-btn" onClick={create}>Create & start sharing</button>
            </div>

            <div className="setup-card">
              <UserPlus />
              <h2>Join Group</h2>
              <input value={code} onChange={(e) => setCode(e.target.value)} placeholder="VMXXXXX" />
              <button className="secondary-btn" onClick={join}>Join with code</button>
            </div>
          </div>

          {error && <p className="group-error">{error}</p>}
        </div>
      </div>
    );
  }

  return (
    <div className="feature-screen">
      <div className="feature-topbar">
        <Link to="/portal">← Back to VariMitra</Link>
        <b>Group Location Sharing</b>
        <span className={online ? 'net-chip online' : 'net-chip'}>
          {online ? '● Online' : '● Offline mode'}
        </span>
      </div>

      <main className="group-page">
        <section className="group-head">
          <div>
            <span className="eyebrow">ACTIVE YATRA GROUP</span>
            <h1>{group.name}</h1>
            <div className="group-code">
              Code <b>{group.code}</b>
              <button onClick={() => navigator.clipboard?.writeText(group.code)} aria-label="Copy group code">
                <Copy size={14} />
              </button>
            </div>
          </div>

          <div className="group-head-actions">
            <button
              className="secondary-btn"
              onClick={() => {
                if (!engine) return;
                addDemoMembers(engine);
                setGroup(getCurrentGroup());
              }}
            >
              Add demo members
            </button>
            <button
              className="secondary-btn"
              onClick={() => {
                leaveGroup();
                setGroup(null);
              }}
            >
              Leave
            </button>
          </div>
        </section>

        <section className="group-stats">
          <div><LocateFixed /><b>{tracked?.fix?.accuracy ? `±${Math.round(tracked.fix.accuracy)} m` : 'Waiting'}</b><span>GPS accuracy</span></div>
          <div><Route /><b>{mine?.chainageKm != null ? formatDistance(mine.chainageKm) : '—'}</b><span>Route covered</span></div>
          <div><Footprints /><b>{mine?.chainageKm != null && route ? formatDistance(Math.max(0, route.totalKm - mine.chainageKm)) : '—'}</b><span>To Pandharpur</span></div>
          <div><Users /><b>{group.members.length}</b><span>Group members</span></div>
          <div><WifiOff /><b>{queue}</b><span>Offline updates queued</span></div>
        </section>

        {!online && (
          <div className="offline-callout">
            <WifiOff />
            <div>
              <b>Offline mode active</b>
              <span>
                Cached Wari route, chainage and stage calculations continue locally.
                Other members are shown at their last synced location; your own new
                fixes are queued for sync when connectivity returns.
              </span>
            </div>
          </div>
        )}

        <div className="group-grid">
          <section className="panel">
            <div className="panel-title">
              <h2><Navigation size={17} /> Live group map</h2>
              <span>Route-aware · cached offline</span>
            </div>
            <RouteSvg bundle={route} group={group} myPhone={user?.phone} />
            <div className="route-summary">
              <b>{stage ? `${stage.fromPlace} → ${stage.toPlace}` : 'Finding current stage…'}</b>
              <span>
                {tracked?.route && !tracked.route.onRoute
                  ? `Off route by ${formatDistance(tracked.route.offsetM / 1000)} — rejoin the highlighted Wari corridor`
                  : 'On the Wari route'}
              </span>
            </div>
          </section>

          <section className="panel">
            <div className="panel-title">
              <h2><Users size={17} /> Members</h2>
              <span>{separated.length ? `${separated.length} separated` : 'Everyone nearby'}</span>
            </div>

            <div className="member-list">
              {group.members.map((member) => {
                const distance = member.phone === user?.phone
                  ? 0
                  : mine?.lat != null && member.lat != null
                    ? haversineMeters(mine, member)
                    : null;

                return (
                  <div className={`member-row ${member.status === 'lost' ? 'member-lost' : ''}`} key={member.phone}>
                    <div className="avatar">{member.name.slice(0, 1).toUpperCase()}</div>
                    <div className="member-main">
                      <b>{member.name}{member.phone === user?.phone ? ' · You' : ''}</b>
                      <span>
                        {member.lastSeen
                          ? `Updated ${new Date(member.lastSeen).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                          : 'No location yet'}
                        {' · '}{member.offline ? 'offline' : 'online'}
                      </span>
                      <small>{member.chainageKm != null ? `${formatDistance(member.chainageKm)} along route` : ''}</small>
                    </div>

                    <div className="member-actions">
                      {distance != null && member.phone !== user?.phone && (
                        <strong className={distance > 500 ? 'warn' : ''}>
                          {distance < 1000 ? `${Math.round(distance)} m` : `${(distance / 1000).toFixed(1)} km`}
                        </strong>
                      )}

                      {member.phone !== user?.phone && (
                        <button
                          title={member.status === 'lost' ? 'Mark safe' : 'Mark as lost'}
                          onClick={() => {
                            setMemberStatus(member.phone, member.status === 'lost' ? 'safe' : 'lost');
                            setGroup(getCurrentGroup());
                          }}
                        >
                          {member.status === 'lost' ? <CheckCircle2 size={17} /> : <ShieldAlert size={17} />}
                        </button>
                      )}

                      <a href={`tel:${member.phone}`} aria-label={`Call ${member.name}`}><Phone size={16} /></a>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        </div>

        {separated.length > 0 && (
          <section className="separation-alert">
            <AlertTriangle />
            <div>
              <b>Group separation detected</b>
              <span>
                {separated.map((item) => item.name).join(', ')} {separated.length === 1 ? 'is' : 'are'} more than
                500 m from you. Use the route position above to rejoin the group.
              </span>
            </div>
          </section>
        )}

        <section className="panel">
          <div className="panel-title">
            <h2><Route size={17} /> Route monitor & offline prediction</h2>
            <span>Fixed Wari polyline · no routing API</span>
          </div>

          <div className="route-monitor-grid">
            <div><span>Current stage</span><b>{stage ? `${stage.dayNumber}. ${stage.fromPlace} → ${stage.toPlace}` : '—'}</b></div>
            <div><span>Remaining route</span><b>{mine?.chainageKm != null && route ? formatDistance(route.totalKm - mine.chainageKm) : '—'}</b></div>
            <div><span>Walking ETA @ 3 km/h</span><b>{mine?.chainageKm != null && route ? formatEta(route.totalKm - mine.chainageKm) : '—'}</b></div>
            <div><span>GPS samples accepted</span><b>{tracked?.sampleCount || 0}</b></div>
          </div>

          <p className="honesty-note">
            Prediction is route-constrained, not a road-directions API. When offline,
            VariMitra uses the cached route and last-synced member positions and never
            labels stale member positions as live.
          </p>
        </section>

        {error && <div className="group-error">{error}</div>}
      </main>
    </div>
  );
}
