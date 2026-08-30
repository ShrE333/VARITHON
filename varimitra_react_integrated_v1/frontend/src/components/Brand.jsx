import React from 'react';
import { Compass } from 'lucide-react';
export default function Brand({compact=false}) {
  return <div className="brand"><div className="brand-logo"><Compass size={compact?18:22}/></div><div><b>VariMitra</b><span>Safer Pilgrimage · Preserved Heritage</span></div></div>;
}
