'use client';

import { useLang } from '@/lib/i18n/context';

export function LangToggle() {
  const { lang, setLang } = useLang();

  return (
    <button
      onClick={() => setLang(lang === 'mr' ? 'hi' : lang === 'hi' ? 'en' : 'mr')}
      className="tap-target px-3 rounded-full border border-neutral-300 text-sm font-semibold text-neutral-600 bg-white"
      aria-label="Toggle language"
    >
      {lang === 'mr' ? 'हि' : lang === 'hi' ? 'EN' : 'मर'}
    </button>
  );
}
