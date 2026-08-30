# VariMitra React Integrated V2

Adds two fully interactive pilgrim features to Integrated V1:

1. **Group Location Sharing** — create/join yatra groups, browser GPS watch, bad-fix rejection, accuracy-weighted smoothing, projection onto the cached Wari route, current stage, remaining route/ETA, member separation alerts, mark-member-lost/safe, call member, cross-tab demo sync, and an offline queue. The route data is copied from the supplied K-vari-files project (`public/data/route.json`, 4,197 points, 285.574 km).
2. **Darshan Booking** — choose a Vari-route temple, date, time slot and party size; confirm and generate a minimal QR Darshan Pass inspired by metro-style mobile tickets.

## Run

```powershell
cd D:\VARITHON\varimitra_react_integrated_v2
Set-ExecutionPolicy -Scope Process Bypass
.\setup.ps1
.\start_all.ps1
```

Open `http://127.0.0.1:5173`, sign in as Pilgrim, then use **Group Location Sharing** or **Darshan Booking**.

### Notes
- GPS in browsers requires HTTPS (except localhost). On a phone, use an HTTPS tunnel/deployment.
- Group create/join uses local browser storage as a working demo transport. The group service is isolated in `frontend/src/lib/groupStore.js` so it can be replaced with Supabase/WebSocket/your backend later without changing the UI or route engine.
- Offline logic deliberately does not claim stale group-member positions are live. New own-device fixes are queued until connectivity returns.
- Darshan slot availability is demo data until a temple booking API is connected; QR generation is fully functional client-side.
