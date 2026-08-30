const GROUPS='varimitra_groups_v2'; const CURRENT='varimitra_current_group_v2'; const QUEUE='varimitra_group_sync_queue_v2';
const read=(k,f)=>{try{return JSON.parse(localStorage.getItem(k))??f}catch{return f}};
const write=(k,v)=>localStorage.setItem(k,JSON.stringify(v));
export const getGroups=()=>read(GROUPS,{});
export const currentGroupCode=()=>localStorage.getItem(CURRENT)||'';
export function createGroup(name,owner){const all=getGroups();let code='VM'+Math.random().toString(36).slice(2,7).toUpperCase();while(all[code])code='VM'+Math.random().toString(36).slice(2,7).toUpperCase();all[code]={code,name,createdAt:new Date().toISOString(),ownerPhone:owner.phone,members:[memberFromUser(owner,'Organizer')]};write(GROUPS,all);localStorage.setItem(CURRENT,code);return all[code]}
export function joinGroup(code,user){const all=getGroups(),g=all[code.toUpperCase()];if(!g)throw new Error('Group code not found on this device/demo store.');if(!g.members.some(m=>m.phone===user.phone))g.members.push(memberFromUser(user,'Member'));all[g.code]=g;write(GROUPS,all);localStorage.setItem(CURRENT,g.code);return g}
export function getCurrentGroup(){const c=currentGroupCode();return c?getGroups()[c]||null:null}
export function updateMyPosition(user,pos,route){const all=getGroups(),g=all[currentGroupCode()];if(!g)return null;const m=g.members.find(x=>x.phone===user.phone);if(m){Object.assign(m,{lat:pos.fix.lat,lng:pos.fix.lng,accuracy:pos.fix.accuracy,lastSeen:new Date().toISOString(),chainageKm:route?.chainageKm??m.chainageKm,status:'safe',offline:!navigator.onLine})}write(GROUPS,all);if(!navigator.onLine)enqueue({type:'location',code:g.code,phone:user.phone,payload:m,at:Date.now()});broadcast(g);return g}
export function setMemberStatus(phone,status){const all=getGroups(),g=all[currentGroupCode()];if(!g)return;const m=g.members.find(x=>x.phone===phone);if(m)m.status=status;write(GROUPS,all);broadcast(g)}
export function addDemoMembers(engine){const all=getGroups(),g=all[currentGroupCode()];if(!g)return;const seeds=[['Aai','9000000001',.31],['Baba','9000000002',.305],['Kaka','9000000003',.325]];for(const [name,phone,f] of seeds){if(g.members.some(m=>m.phone===phone))continue;const km=engine.bundle.totalKm*f,c=engine.coordAt(km);g.members.push({id:phone,name,phone,role:'Member',lat:c.lat,lng:c.lng,chainageKm:km,accuracy:12,lastSeen:new Date().toISOString(),status:'safe',offline:false})}write(GROUPS,all);broadcast(g)}
function memberFromUser(u,role){return{id:u.phone||crypto.randomUUID(),name:u.name||'Pilgrim',phone:u.phone||'',role,lat:null,lng:null,chainageKm:null,accuracy:null,lastSeen:null,status:'safe',offline:false}}
function enqueue(x){const q=read(QUEUE,[]);q.push(x);write(QUEUE,q)}
export function queuedCount(){return read(QUEUE,[]).length}
export function flushQueue(){if(!navigator.onLine)return 0;const n=queuedCount();write(QUEUE,[]);return n}
export function leaveGroup(){localStorage.removeItem(CURRENT)}
export function subscribe(cb){const bc='BroadcastChannel'in window?new BroadcastChannel('varimitra-group'):null;const h=e=>{if(e.key===GROUPS)cb(getCurrentGroup())};window.addEventListener('storage',h);if(bc)bc.onmessage=()=>cb(getCurrentGroup());return()=>{window.removeEventListener('storage',h);bc?.close()}}
function broadcast(g){if('BroadcastChannel'in window){const bc=new BroadcastChannel('varimitra-group');bc.postMessage({code:g.code});bc.close()}}
