---
name: Industrial Petty Cash Core
colors:
  surface: '#f6fafe'
  surface-dim: '#d6dade'
  surface-bright: '#f6fafe'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f0f4f8'
  surface-container: '#eaeef2'
  surface-container-high: '#e4e9ed'
  surface-container-highest: '#dfe3e7'
  on-surface: '#171c1f'
  on-surface-variant: '#45464d'
  inverse-surface: '#2c3134'
  inverse-on-surface: '#edf1f5'
  outline: '#76777d'
  outline-variant: '#c6c6cd'
  surface-tint: '#565e74'
  primary: '#000000'
  on-primary: '#ffffff'
  primary-container: '#131b2e'
  on-primary-container: '#7c839b'
  inverse-primary: '#bec6e0'
  secondary: '#855300'
  on-secondary: '#ffffff'
  secondary-container: '#fea619'
  on-secondary-container: '#684000'
  tertiary: '#000000'
  on-tertiary: '#ffffff'
  tertiary-container: '#0b1c30'
  on-tertiary-container: '#75859d'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#dae2fd'
  primary-fixed-dim: '#bec6e0'
  on-primary-fixed: '#131b2e'
  on-primary-fixed-variant: '#3f465c'
  secondary-fixed: '#ffddb8'
  secondary-fixed-dim: '#ffb95f'
  on-secondary-fixed: '#2a1700'
  on-secondary-fixed-variant: '#653e00'
  tertiary-fixed: '#d3e4fe'
  tertiary-fixed-dim: '#b7c8e1'
  on-tertiary-fixed: '#0b1c30'
  on-tertiary-fixed-variant: '#38485d'
  background: '#f6fafe'
  on-background: '#171c1f'
  surface-variant: '#dfe3e7'
typography:
  headline-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 28px
    fontWeight: '700'
    lineHeight: 36px
  headline-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 22px
    fontWeight: '600'
    lineHeight: 28px
  headline-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 18px
    fontWeight: '600'
    lineHeight: 24px
  body-lg:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  label-bold:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.02em
  data-display:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '700'
    lineHeight: 32px
  headline-lg-mobile:
    fontFamily: Plus Jakarta Sans
    fontSize: 24px
    fontWeight: '700'
    lineHeight: 32px
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
  sm: 12px
  md: 16px
  lg: 24px
  xl: 32px
  gutter: 16px
  margin-mobile: 16px
  margin-desktop: 40px
---

## Brand & Style

The design system is built on the philosophy of "Clean Industrial," balancing the rigorous precision required for financial auditing with the high-visibility utility of physical workspace signage. It targets office administrators who manage fast-moving cash transactions, demanding an interface that feels both professional and approachable.

The aesthetic blends **Corporate Modernism**—characterized by crisp layouts and systematic spacing—with **High-Visibility Utility**, utilizing high-contrast accents to guide the eye toward critical financial actions and data points. The emotional response is one of organized reliability; every pixel serves a functional purpose, eliminating decorative clutter in favor of legible, dense information architecture.

The design system prioritizes a Right-to-Left (RTL) flow, ensuring that the visual weight and navigational patterns are optimized for Persian script users.

## Colors

This design system utilizes a high-contrast palette designed for clarity and professional authority.

- **Primary (Deep Navy):** Used for headers, primary navigation, and high-level typography. It provides a grounded, stable foundation for financial data.
- **Secondary (Vibrant Amber):** Reserved for primary actions (CTAs), warning states, and highlighting active status. It mimics industrial "caution" or "action" colors for immediate recognition.
- **Background (Slate Gray):** A cool-toned neutral used for the application canvas to reduce eye strain and provide contrast against white surfaces.
- **Surface (Crisp White):** Used for cards, input fields, and containers to signify interactive or readable content areas.
- **Success/Error:** Use a standard Emerald Green for balance increases and Rose Red for deficits, both calibrated to sit harmoniously alongside the Amber accent.

## Typography

The typography strategy leverages **Plus Jakarta Sans** for headings to provide a friendly yet modern character, while **Inter** is utilized for body text and data-heavy tables to ensure maximum legibility at small sizes.

- **Persian Text Rendering:** Ensure that the Persian typeface used (system default or embedded) scales proportionally with Inter.
- **Numerical Data:** All financial figures should use the `data-display` or `label-bold` roles. Given the industrial theme, numbers must be clear, tabular, and high-contrast.
- **Alignment:** Text is primarily right-aligned. Maintain strict vertical rhythm to support high data density without losing readability.

## Layout & Spacing

The layout follows a **Fluid Grid** model with a focus on "purposeful density."

- **Grid:** On mobile, use a 4-column grid with 16px margins. On desktop, use a 12-column grid with 24px gutters.
- **Density:** Spacing is tight (8px/12px) within component groups to allow more data to be visible on screen, but generous (24px/32px) between major logical sections to prevent visual overwhelm.
- **RTL Logic:** Layout flows from right to left. Sidebars appear on the right, and "Back" actions point to the right.
- **Touch Targets:** Despite the dense layout, all interactive elements must maintain a minimum 44x44px hit area to remain accessible for busy administrators on the move.

## Elevation & Depth

This design system uses a **Low-Contrast Outline** approach combined with subtle depth to maintain a "flat but tactile" industrial feel.

- **Borders:** The primary method of separation is a 1px solid border (`#E2E8F0`). This creates a blueprint-like precision.
- **Shadows:** Use only one level of "Ambient Shadow." It should be highly diffused (10% opacity) with a 4px blur and 2px vertical offset, applied only to primary cards and floating action buttons.
- **Tonal Layers:** Use the Slate Gray background to distinguish the "floor" of the app, while the white surfaces represent the active "work area."
- **Focus States:** When an input is focused, use a 2px Amber border to provide high-visibility feedback.

## Shapes

The shape language is "Rounded-Industrial." While the grid is rigid, the corners are softened to make the professional environment feel more approachable.

- **Standard Elements:** Buttons, inputs, and small cards use a 0.5rem (8px) radius.
- **Large Containers:** Main surface areas and modal overlays use a 1rem (16px) radius.
- **Icons:** Use a consistent 2px stroke width for icons to match the 1px/2px border logic of the UI components.

## Components

- **Buttons:** Primary buttons are Solid Amber with Deep Navy text for maximum contrast. Secondary buttons use a Deep Navy 1px border.
- **Inputs:** Fields have 1px borders and 12px internal padding. Labels are always visible and positioned above the field for clarity during rapid data entry.
- **Data Cards:** Transaction items use a white background, 1px border, and a subtle vertical Amber strip on the right edge to denote "active" or "pending" status.
- **Status Chips:** Use a "Pill" shape with a light tonal background and dark text (e.g., Light Green background with Dark Green text) for categories like "Approved" or "Reimbursed."
- **Numerical Lists:** Use monospaced numerical variants of Inter if available to ensure decimal points align vertically in transaction lists.
- **Floating Action Button (FAB):** The primary "Add Expense" button should be Amber, circular, and positioned in the bottom-left corner (standard for RTL layouts).