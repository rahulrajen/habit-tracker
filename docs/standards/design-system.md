# Design System — Glass Theme (Habit Tracker)
**Originated in:** Habit Tracker (app #1, Phase 0–4)
**Purpose:** Shared design tokens, components, and animation principles for the TMag ecosystem.
**Absorbed by:** Ragul's Mission Control `config-standards-manager` module (when built).

---

## 1. Core Philosophy

Minimal, glassmorphic UI. Every surface is a translucent card layered over a deep gradient background. Content takes priority; decoration is subtle and functional.

### Principles
1. **Translucency over opacity** — Use `backdrop-filter: blur()` for depth, not solid fills.
2. **Motion with purpose** — All animations serve as feedback (state change confirmed visually). Default duration 200–400ms, spring easing.
3. **Touch-first** — Minimum 44×44px tap targets on coarse-pointer devices.
4. **Reduced motion respected** — `prefers-reduced-motion: reduce` disables all non-essential animation immediately.

---

## 2. Design Tokens

### Colors

#### Glass Surfaces
| Token | CSS Variable | Value | Usage |
|-------|-------------|-------|-------|
| glass-bg | `--glass-bg` | `rgba(255, 255, 255, 0.08)` | Default card surface |
| glass-bg-strong | `--glass-bg-strong` | `rgba(255, 255, 255, 0.12)` | Elevated / focused state |
| glass-border | `--glass-border` | `rgba(255, 255, 255, 0.15)` | Card border |
| glass-shadow | `--glass-shadow` | `rgba(0, 0, 0, 0.25)` | Card shadow |
| glass-hover | `--glass-hover` | `rgba(255, 255, 255, 0.12)` | Hover state background |
| glass-active | `--glass-active` | `rgba(255, 255, 255, 0.18)` | Active / selected state |

#### Accent Palette
| Token | Tailwind Class | Value | Usage |
|-------|---------------|-------|-------|
| accent-primary | `text-accent-primary` | `#6C63FF` | Links, buttons, focus rings |
| accent-success | `text-accent-success` | `#34D399` | Completion states, positive feedback |
| accent-warning | `text-accent-warning` | `#FBBF24` | Caution, threshold warnings |
| accent-danger | `text-accent-danger` | `#F87171` | Errors, destructive actions |

#### Surface Palette
| Token | Tailwind Class | Value | Usage |
|-------|---------------|-------|-------|
| surface-dark | `bg-surface-dark` | `#0F172A` | Page background (gradient start/end) |
| surface-card | `bg-surface-card` | `#1E293B` | Page background (gradient middle) |
| surface-elevated | `bg-surface-elevated` | `#334155` | Elevated surfaces, modals |

### Typography
- **Font family:** Inter (primary), system-ui fallback
- **Base size:** 16px (1rem)
- **Heading scale:** h1 = 2xl (1.5rem), h2 = lg (1.125rem), body default

### Spacing
- Base unit: 4px
- Card padding: 16px (default), 8px (compact)
- Section gap: 24px (`space-y-6`)

---

## 3. Glass Card Component

```css
.glass-card {
  background: var(--glass-bg);
  border: 1px solid var(--glass-border);
  border-radius: 16px;
  box-shadow: 0 8px 32px var(--glass-shadow), inset 0 1px 0 rgba(255,255,255,0.05);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  transition: background 0.2s var(--ease-smooth), border-color 0.2s var(--ease-smooth), box-shadow 0.2s var(--ease-smooth);
}

.glass-card:hover {
  background: var(--glass-hover);
  border-color: rgba(255,255,255,0.2);
  box-shadow: 0 12px 40px var(--glass-shadow), inset 0 1px 0 rgba(255,255,255,0.08);
}

.glass-card--active { background: var(--glass-active); border-color: rgba(255,255,255,0.25); }
.glass-card--strong { background: var(--glass-bg-strong); }
```

---

## 4. Component Utilities

| Class | Purpose | Key Properties |
|-------|---------|---------------|
| `.habit-card-glass` | Individual habit card | blur(8px), border, radius 12px |
| `.profile-btn` | Profile switcher button | transparent bg, accent-primary on active |
| `.glass-input` | Form inputs | focus ring with accent-primary glow |
| `.chart-tooltip-glass` | Recharts tooltip | glassmorphic popup |
| `.skeleton` | Loading placeholder | shimmer animation |
| `.progress-bar-fill` | Progress bar width | spring easing transition |

---

## 5. Animation System

### Keyframes
| Name | Duration | Easing | Description |
|------|----------|--------|-------------|
| `fadeIn` | 300ms | ease-out | Opacity 0 → 1 |
| `slideUp` | 400ms | cubic-bezier(0.16,1,0.3,1) | Y:16px→0 with fade in |
| `scaleIn` | 250ms | cubic-bezier(0.16,1,0.3,1) | Scale 0.95→1 with fade in |
| `slideDown` | 300ms | cubic-bezier(0.16,1,0.3,1) | Y:-8px→0 with fade in |
| `pulseGlow` | 2s (loop) | ease-in-out | Accent-primary box-shadow pulse |
| `shimmer` | 1.5s (loop) | ease-in-out | Skeleton loading gradient sweep |

### Tailwind Animation Classes
```
animate-fade-in        animate-slide-up       animate-scale-in
animate-slide-down     animate-pulse-glow     animate-shimmer
```

### Timing Functions
| Name | Value | Use Case |
|------|-------|----------|
| `--ease-spring` | `cubic-bezier(0.16, 1, 0.3, 1)` | Entry animations, bouncy feel |
| `--ease-smooth` | `cubic-bezier(0.4, 0, 0.2, 1)` | State transitions, hover effects |

### Accessibility
```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

---

## 6. Responsive Breakpoints

| Device Class | Viewport | Notes |
|-------------|----------|-------|
| Mobile (coarse pointer) | < 640px | 44px minimum tap targets, larger padding on cards |
| Tablet | 640–1024px | Standard spacing |
| Desktop | > 1024px | Max content width 768px centered |

---

## 7. Sound / Haptics (Future)

Not implemented in Phase 0–4. If added later:
- **Completion tap:** Short, soft click sound (~50ms)
- **Target met:** Confetti burst + subtle vibration on supported devices (`navigator.vibrate([50, 30, 50])`)
- **Error:** Double-pulse haptic, no sound

---

## 8. Absorption Protocol

When Mission Control's `config-standards-manager` module exists:
1. Push this file to the shared standards repo (or copy into Mission Control's `docs/standards/`).
2. The `config-standards-manager` absorbs it as `design-system.md`.
3. Subsequent apps import tokens from there instead of defining locally.