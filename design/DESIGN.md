---
name: Cohesive Velocity
colors:
  surface: '#f9f9ff'
  surface-dim: '#d8d9e3'
  surface-bright: '#f9f9ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f2f3fd'
  surface-container: '#ecedf7'
  surface-container-high: '#e7e7f1'
  surface-container-highest: '#e1e2eb'
  on-surface: '#191b22'
  on-surface-variant: '#424753'
  inverse-surface: '#2e3038'
  inverse-on-surface: '#eff0fa'
  outline: '#727785'
  outline-variant: '#c2c6d5'
  surface-tint: '#005ac1'
  primary: '#0058bd'
  on-primary: '#ffffff'
  primary-container: '#2771df'
  on-primary-container: '#fefcff'
  inverse-primary: '#adc6ff'
  secondary: '#006e2c'
  on-secondary: '#ffffff'
  secondary-container: '#86f898'
  on-secondary-container: '#00722f'
  tertiary: '#8f4a00'
  on-tertiary: '#ffffff'
  tertiary-container: '#b35e00'
  on-tertiary-container: '#fffbff'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#d8e2ff'
  primary-fixed-dim: '#adc6ff'
  on-primary-fixed: '#001a41'
  on-primary-fixed-variant: '#004494'
  secondary-fixed: '#89fa9b'
  secondary-fixed-dim: '#6ddd81'
  on-secondary-fixed: '#002108'
  on-secondary-fixed-variant: '#005320'
  tertiary-fixed: '#ffdcc4'
  tertiary-fixed-dim: '#ffb780'
  on-tertiary-fixed: '#2f1400'
  on-tertiary-fixed-variant: '#6f3800'
  background: '#f9f9ff'
  on-background: '#191b22'
  surface-variant: '#e1e2eb'
typography:
  headline-xl:
    fontFamily: Inter
    fontSize: 36px
    fontWeight: '700'
    lineHeight: 44px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Inter
    fontSize: 28px
    fontWeight: '600'
    lineHeight: 36px
    letterSpacing: -0.01em
  headline-lg-mobile:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  headline-md:
    fontFamily: Inter
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
  body-lg:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
  body-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-sm:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  label-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '500'
    lineHeight: 20px
    letterSpacing: 0.01em
  label-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  unit: 4px
  gutter: 24px
  margin-mobile: 16px
  margin-desktop: 40px
  container-max: 1440px
---

## Brand & Style
The design system is engineered for high-efficiency productivity, focusing on the "My Drive Finder" core utility of file discovery and organization. The brand personality is professional, systematic, and dependable, evoking a sense of calm control over complex data.

The style is **Modern Minimalist**, utilizing a light-touch aesthetic that prioritizes content over container. By leveraging generous whitespace and a restricted color palette, the UI directs user focus toward search results and file metadata. Visual clarity is achieved through precise alignment, soft elevation, and a distinct lack of decorative clutter, ensuring the interface remains unobtrusive during deep-work sessions.

## Colors
The palette is rooted in functional recognition. **Soft Blue (#4285F4)** serves as the primary action color, used for CTA buttons, primary navigation states, and active focus rings. **Emerald Green (#34A853)** acts as a secondary accent, specifically reserved for success states, completed uploads, and "available" status indicators.

The neutral system uses a **Slate Gray** scale (Slate 50 to 900) to maintain a cool, professional tone. 
- **Light Mode:** Uses Slate 50 for page backgrounds, White for card surfaces, and Slate 900 for primary text.
- **Dark Mode:** Transitions to Slate 900 for backgrounds, Slate 800 for surfaces, and Slate 100 for high-readability text.
- **Accents:** Borders use Slate 200 (Light) and Slate 700 (Dark) to maintain subtle containment.

## Typography
The system utilizes **Inter** exclusively to ensure maximum legibility across data-heavy tables and file lists. The type hierarchy is strictly enforced to create a clear information architecture.

- **Headlines:** Use a slightly tighter letter-spacing and heavier weights to anchor sections.
- **Body:** Optimized for long-form reading of file descriptions and metadata.
- **Labels:** Used for buttons, table headers, and status badges; the `label-sm` role utilizes a semi-bold weight and slight tracking to differentiate it from body text.
- **Scaling:** On mobile devices, the `headline-xl` and `headline-lg` roles are capped at 24px-28px to prevent excessive wrapping.

## Layout & Spacing
This design system employs a **Fluid Grid** model based on a 12-column structure for desktop and a 4-column structure for mobile. 

- **Spacing Rhythm:** All spacing is derived from a 4px base unit (e.g., 4, 8, 16, 24, 32, 48, 64).
- **Margins:** Desktop views feature a generous 40px outer margin to provide visual breathing room. 
- **Internal Spacing:** Components like cards and data tables use 24px internal padding to ensure content does not feel cramped.
- **Breakpoints:**
  - Mobile: < 640px
  - Tablet: 640px - 1024px
  - Desktop: > 1024px

## Elevation & Depth
Hierarchy is established through **Ambient Shadows** and surface layering. The system avoids heavy borders in favor of depth-based separation.

- **Low Elevation (Shadow-sm):** Used for standard file cards and interactive elements in their rest state. This creates a subtle "lift" from the background.
- **Medium Elevation (Shadow-md):** Used for hovered cards, dropdown menus, and search bar focus states. This signals interactivity and draws the user's eye.
- **Tonal Layers:** In Dark Mode, elevation is communicated by lightening the background color of the surface rather than increasing shadow opacity, ensuring a crisp look without "muddy" edges.

## Shapes
The shape language is defined by **Rounded-XL** geometry. This softened approach balances the "corporate" nature of a productivity tool with a modern, approachable feel.

- **Standard Elements:** Buttons, input fields, and small chips use a 0.5rem (8px) radius.
- **Large Elements:** Cards, modals, and container surfaces use a 1rem (16px) radius.
- **Search Bar:** Features a fully pill-shaped (rounded-full) radius to distinguish it as the primary navigation tool.

## Components
Consistent component behavior is critical for a high-utility file manager:

- **Search Bar:** Positioned prominently at the top. On focus, the border transitions to Primary Blue (#4285F4) with a soft outer glow (shadow-md).
- **Data Tables:** High-contrast layout with Slate 900 text on White/Slate 800 backgrounds. Row zebra-striping is replaced by subtle 1px bottom borders (Slate 100/700).
- **Mobile-Friendly Cards:** On smaller screens, table rows collapse into vertical cards. Each card uses `rounded-xl` and a `shadow-sm` for definition.
- **Status Badges:** Compact labels with soft background tints. 
  - *Active:* Emerald Green background (10% opacity) with Emerald Green text.
  - *Pending:* Primary Blue background (10% opacity) with Blue text.
- **Buttons:** 
  - *Primary:* Solid Blue background, White text, 8px radius.
  - *Secondary:* Ghost style with Slate 200 border and Slate 700 text.
- **Input Fields:** Minimum height of 44px for touch-friendliness, using Inter Body-md for typed content.