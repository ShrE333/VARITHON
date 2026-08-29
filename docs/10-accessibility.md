# 10 · Accessibility — designing for eight to eighty

The people using this app are a village grandmother with reading glasses, a
ten-year-old walking beside her, and a volunteer holding a phone at arm's
length in direct sun. Everything below is sized for the worst of those three,
not the average one.

---

## What is in place

### Type

**Base font size is 18px**, set on `html` in
[`app/globals.css`](../app/globals.css) — not the browser default of 16.
Every Tailwind size is relative to it, so the whole app steps up together
rather than needing a per-class override.

This matters more for Marathi than for English. Devanagari matras — the marks
that distinguish `ा` from `ी` — sit above the line and are the first thing to
disappear for a presbyopic eye. Below about 17px they stop being reliably
distinguishable.

`text-size-adjust: 100%` means the OS text-size setting is honoured rather
than overridden. Someone who has already turned their system font up gets it.

Line height is 1.6 rather than the default 1.5, because Devanagari needs the
vertical room.

### Contrast

Body text is `text-neutral-600` or darker. `neutral-400` on white measures
about **3.0:1** — below the 4.5:1 WCAG AA floor, and the first thing to wash
out in sun glare. `neutral-600` is 7.1:1.

The audit that removed the last of the `neutral-400` body text also lifted
every `text-xs` (12px) to `text-sm`, and the `text-[10px]` "आज" badge on the
stage list to `text-xs`.

### Touch targets

`.tap-target` is `min-height: 64px; min-width: 64px` — well above the 44px
Apple minimum and the 48px Material one. Deliberately: this is used by people
with arthritic hands, walking, on an unsteady phone.

The SOS button is larger still (`py-7 text-2xl`), because it is the one
control that has to be hittable without aiming.

### Colour is never the only signal

The bottom nav marks the current tab with **a top border, a background tint,
and `aria-current="page"`** — not just a colour change. Around 8% of men have
red/green colour blindness, and saffron-on-white against grey-on-white is
exactly the pair that fails.

### Focus

```css
:focus-visible {
  outline: 3px solid #1d4ed8;
  outline-offset: 2px;
}
```

`:focus-visible` rather than `:focus`, so the ring appears for keyboard and
switch-control users without putting a box around every button a thumb has
just tapped.

### Motion

```css
@media (prefers-reduced-motion: reduce) { ... }
```

Someone who asked their phone to stop animating usually did so because motion
makes them ill or makes text unreadable. This affects the pulsing GPS dot and
the map's pan animation.

### Reachability

The home screen carries **🆘 Help** and **🛕 Palki** as large tiles above the
fold, duplicating two bottom-nav destinations. Redundant by design: in a
hurry, or for someone who has not learned that the strip at the bottom is
navigation, the thing they need is on the first screen.

---

## Language

Marathi is the **default**, not an option — this is an app for the Wari, and
English-first would be the wrong posture even if everyone could read it.
Hindi and English are one tap away via the toggle in the header.

The dictionary is hand-rolled ([`lib/i18n/`](../lib/i18n/)) rather than a full
i18n library, for bundle size. A key missing from Hindi falls back to Marathi,
then English — never to a raw dot-path like `home.title` on screen. See
[`lib/i18n/context.tsx`](../lib/i18n/context.tsx).

Place names are localised too: `route.json` carries `fromPlaceMr` /
`toPlaceMr` alongside the English names, so a stage reads `लोणंद → तरडगाव`
rather than transliterated English.

---

## How to check it yourself

**Contrast and structure**

```bash
npm run build && npm run start
```

Then run Lighthouse (Chrome DevTools → Lighthouse → Accessibility) against
<http://localhost:3000>. Run it against the built app, not `next dev` — the
dev overlay injects its own nodes and skews the result.

**Type scaling** — set the OS font size to its largest and reload. Nothing
should clip or overlap; cards should grow, not scroll sideways.

**Colour blindness** — DevTools → Rendering → Emulate vision deficiencies →
Deuteranopia. The active nav tab must still be identifiable.

**Reduced motion** — DevTools → Rendering → Emulate CSS
`prefers-reduced-motion: reduce`. The GPS dot should stop pulsing.

**Keyboard only** — Tab through every screen. The focus ring must be visible
at every stop, and the tab order must follow the visual order.

**The real test** — hold the phone at arm's length outdoors, in sun, and try
to read the distance number. That is the actual use case.

---

## Known gaps

- **No screen-reader pass has been done** with TalkBack or VoiceOver. The
  landmarks, `aria-current`, `aria-label`s and the progress bar's
  `role="progressbar"` are in place, but nobody has listened to the whole app
  end to end.
- **The Leaflet map is not keyboard-navigable** beyond pan and zoom, and its
  markers are not announced. The information it conveys is available as text
  elsewhere on each screen, which is the mitigation, not a fix.
- **Emoji as icons** are announced inconsistently across screen readers. They
  are marked `aria-hidden` wherever a text label sits beside them, so the
  label is what gets read.
- **No high-contrast theme.** The app is light-mode only; `prefers-color-scheme`
  is not honoured.
