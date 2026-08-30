import React from 'react';
export default function StatusPill({ok,label}) { return <span className={`status-pill ${ok?'ok':'bad'}`}><i></i>{label || (ok?'ONLINE':'OFFLINE')}</span>; }
