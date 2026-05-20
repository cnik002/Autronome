---
name: Autronome
colors:
  surface: '#131316'
  surface-dim: '#131316'
  surface-bright: '#39393c'
  surface-container-lowest: '#0e0e11'
  surface-container-low: '#1b1b1e'
  surface-container: '#1f1f22'
  surface-container-high: '#2a2a2d'
  surface-container-highest: '#353438'
  on-surface: '#e4e1e6'
  on-surface-variant: '#cfc2d6'
  inverse-surface: '#e4e1e6'
  inverse-on-surface: '#303033'
  outline: '#988d9f'
  outline-variant: '#4d4354'
  surface-tint: '#ddb7ff'
  primary: '#ddb7ff'
  on-primary: '#490080'
  primary-container: '#b76dff'
  on-primary-container: '#400071'
  inverse-primary: '#842bd2'
  secondary: '#c8c6c8'
  on-secondary: '#313032'
  secondary-container: '#474649'
  on-secondary-container: '#b7b4b7'
  tertiary: '#c3c0ff'
  on-tertiary: '#1d00a5'
  tertiary-container: '#8582ff'
  on-tertiary-container: '#180092'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#f0dbff'
  primary-fixed-dim: '#ddb7ff'
  on-primary-fixed: '#2c0051'
  on-primary-fixed-variant: '#6900b3'
  secondary-fixed: '#e5e1e4'
  secondary-fixed-dim: '#c8c6c8'
  on-secondary-fixed: '#1c1b1d'
  on-secondary-fixed-variant: '#474649'
  tertiary-fixed: '#e2dfff'
  tertiary-fixed-dim: '#c3c0ff'
  on-tertiary-fixed: '#0f0069'
  on-tertiary-fixed-variant: '#3323cc'
  background: '#131316'
  on-background: '#e4e1e6'
  surface-variant: '#353438'
  neon-purple: '#a855f7'
  charcoal-black: '#09090b'
  surface-zinc: '#18181b'
  electric-indigo: '#4f46e5'
  status-success: '#22c55e'
  status-error: '#ef4444'
  status-info: '#3b82f6'
typography:
  display-bpm:
    fontFamily: JetBrains Mono
    fontSize: 120px
    fontWeight: '800'
    lineHeight: 120px
    letterSpacing: -0.05em
  display-bpm-mobile:
    fontFamily: JetBrains Mono
    fontSize: 72px
    fontWeight: '800'
    lineHeight: 72px
  h1:
    fontFamily: Inter
    fontSize: 32px
    fontWeight: '800'
    lineHeight: 40px
    letterSpacing: -0.02em
  h2:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '700'
    lineHeight: 32px
  body-lg:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
  body-sm:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  mono-label:
    fontFamily: JetBrains Mono
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
  button-text:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '700'
    lineHeight: 24px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  base: 4px
  xs: 8px
  sm: 16px
  md: 24px
  lg: 40px
  xl: 64px
  gutter: 20px
  max-width: 1200px
---

## Brand & Style
The design system for this product is rooted in the **Cyber-Tactile** aesthetic—a fusion of modern music production software (DAWs) and high-performance SaaS interfaces. The personality is technical, precise, and authoritative, yet accessible through intuitive physical metaphors.

The style leverages **Glassmorphism** for structural layering and a **High-Contrast** color approach to ensure maximum legibility in low-light studio environments. The interface should feel like a piece of high-end hardware: responsive, weighted, and glowing with electric energy.

- **Primary Motif:** Translucent charcoal surfaces over deep void backgrounds.
- **Visual Feedback:** Neon glows and subtle scale-based animations to simulate physical button presses.
- **Target Audience:** Musicians, athletes, and producers who require "glanceable" data and high-reliability touch targets.

## Colors
The palette is centered on a high-contrast dark mode foundation. 

### Dark Mode (Default)
- **Background:** Charcoal Black (`#09090b`) for the base layer to maximize the "pop" of active elements.
- **Primary:** Neon Electric Purple (`#a855f7`) is used for active states, focal points, and rhythmic pulses.
- **Surface:** Zinc Grays (`#18181b`) provide depth for cards and container layers.

### Light Mode (Toggle)
In light mode, the system flips to a high-legibility "Sheet Music" palette:
- **Background:** White (`#ffffff`).
- **Surface:** Pale Gray (`#f4f4f5`).
- **Primary:** Deep Purple (`#7e22ce`) to maintain brand recognition while ensuring accessibility.

### Semantic States
- **Success:** Vibrant Emerald for "Ready" or "Synced" states.
- **Error:** Bright Red for hardware/API failures.
- **Action:** Electric Indigo for secondary interactive elements like the Tap Zone.

## Typography
The system uses a dual-font approach to balance professional UI clarity with technical data precision.

- **Inter (Sleek Sans-Serif):** Handles all narrative text, headings, and interface labels. It provides a modern, neutral foundation that stays out of the way of the content.
- **JetBrains Mono (Technical Monospace):** Reserved for BPM readouts, durations, and routine steps. This mimics the look of digital displays on hardware metronomes and ensures numbers don't "jump" when changing values.

**Scaling Strategy:** The `display-bpm` level is the hero of the interface. On mobile, it scales down but remains the largest visual element to ensure visibility from a distance (e.g., when the phone is on a music stand).

## Layout & Spacing
The layout follows a **Fluid Grid** model with a strong focus on the center-vertical axis. 

- **Grid:** A 12-column system is used for desktop, collapsing to a single column for mobile.
- **Rhythm:** An 8px base unit drives all padding and margins, ensuring vertical rhythm between control blocks.
- **Mobile Strategy:** Elements like the "Master Play Button" and "Tap Zone" occupy at least 75% of the screen width to provide large, error-proof touch targets for users in motion.
- **Safe Zones:** Generous margins (40px+) are maintained around the main BPM display to prevent visual clutter and accidental taps.

## Elevation & Depth
Depth is created through **Glassmorphism** and **Tonal Layering**, simulating light passing through acrylic panels.

- **Base Layer:** The deepest void (#09090b).
- **Surface Layer:** `bg-zinc-900/50` with a `backdrop-blur-md` and a thin `1px` border (white/10% opacity). This creates the "Control Panel" feel.
- **Active Elevation:** Buttons do not use traditional shadows. Instead, they use **Inner Glows** (box-shadow: inset) and **Outer Neon Halos** when active. 
- **The Glow:** Active elements (like the current step in a routine) should have a soft `drop-shadow` using the `primary` color with 40% opacity to suggest luminosity.

## Shapes
The shape language is "Squircle-Modern"—organic but structured.

- **Containers:** Use `rounded-2xl` (16px) to soften the technical nature of the app.
- **Interactive Elements:** Buttons and Input fields use `rounded-xl` (12px) for a comfortable touch feel.
- **Status Pills:** The Loop Indicator and Chips use `rounded-full` (pill-shape) to distinguish them from actionable buttons.
- **Borders:** Always use thin, crisp borders (1px) to define edges in dark mode, preventing the interface from bleeding together.

## Components

### Tactile Buttons
Buttons must feel heavy. Use a slight gradient from top to bottom and a `active:scale-95` transition. The **Master Play Button** is the primary CTA: it should transform from Purple (Start) to Red (Stop) with a high-contrast label.

### Glassmorphism Cards
The **AI Controls** and **Routine History** sections are housed in cards with a background of `rgba(24, 24, 27, 0.6)` and a blur of `12px`. Borders should be `1px solid rgba(255, 255, 255, 0.1)`.

### Custom Sliders
The **BPM Slider** should remove the default browser styling. The track should be a thin gray line, and the thumb should be a large, circular Neon Purple orb that glows when dragged.

### Tap Zone Pad
A large, dedicated area with a dashed border. Upon interaction, it should trigger a momentary background flash of `primary` at 10% opacity to provide instant rhythmic feedback.

### AI Routine List
Steps are styled as vertical timeline items. The **Active Step** uses a gradient background from Purple to Indigo and a "pulsing" border to indicate it is currently governing the metronome.

### Input Fields
The AI prompt input uses a dark background with a focus ring of Neon Purple. The text is Inter, while any numeric output within the field uses JetBrains Mono.