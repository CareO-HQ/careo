# CareO Design System & Aesthetics

CareO is built with a clean, surgical, and premium clinical design system. It is optimized for high readability, low cognitive load, and ease of use in fast-paced UK care home environments. The system uses a modern, light-first theme with high contrast, precise color ranges using modern OKLCH coordinates, and smooth micro-interactions.

---

## 1. Technical Foundations

* **CSS Framework**: Tailwind CSS v4.0 (utilizing the new `@import "tailwindcss"` and `@theme inline` directives).
* **Base Typography**: Geist Sans (sans-serif) and Geist Mono (monospace) via `next/font/google`.
* **Icons**: Lucide React for consistent, thin-stroke (2px), and highly legible iconography.
* **Component Library**: Radix UI primitives styled via Tailwind CSS, implementing standard Shadcn-like configurations.

---

## 2. Color Palette (OKLCH Theme)

CareO defines its design tokens using the **OKLCH** color space in `app/globals.css`. OKLCH provides perceptually uniform color adjustments, ensuring optimal contrast and accessibility.

| Token | CSS Variable | OKLCH Value | Description |
| :--- | :--- | :--- | :--- |
| **Background** | `--background` / `--card` / `--popover` | `oklch(1 0 0)` | Pure Clinical White. Maximum contrast for data reading. |
| **Foreground** | `--foreground` / `--card-foreground` | `oklch(0.141 0.005 285.823)` | Deep slate-purple/black. Highly legible text color. |
| **Primary** | `--primary` | `oklch(0.21 0.006 285.885)` | Deep corporate slate-navy. Used for main active links, headers, and primary actions. |
| **Primary FG** | `--primary-foreground` | `oklch(0.985 0 0)` | Near-white. Contrast text on primary elements. |
| **Secondary** | `--secondary` / `--muted` / `--accent` | `oklch(0.967 0.001 286.375)` | Soft, light slate-grey with subtle purple undertone. Used for secondary buttons and backgrounds. |
| **Muted FG** | `--muted-foreground` | `oklch(0.552 0.016 285.938)` | Medium slate-grey. Secondary labels and helper text. |
| **Destructive** | `--destructive` | `oklch(0.577 0.245 27.325)` | Strong clinical/emergency red. Used for high-severity alerts. |
| **Border** | `--border` / `--input` | `oklch(0.92 0.004 286.32)` | Clean, thin separation line. |
| **Ring** | `--ring` | `oklch(0.705 0.015 286.067)` | Semi-transparent focus ring. |

### Status Badge Colors
* **Critical Severity**: Red solid background (`bg-destructive` / `text-white`).
* **Moderate Severity**: Orange tint (`bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400`).
* **Minor Severity**: Yellow tint (`bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400`).
* **Low / Default Severity**: Slate-grey (`bg-secondary text-secondary-foreground`).
* **Success / Returned / Healed**: Green tint (`bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400`).
* **Sidebar Notification Count**: Solid red pill (`bg-red-500 text-white`).

---

## 3. Typography & Hierarchy

### Geist Sans (Primary Interface Font)
* Used for dashboard content, text fields, headers, and UI controls.
* High legibility in dense lists and complex tables.

### Geist Mono (Secondary/Data Font)
* Used for time stamps, date listings, reference codes, numeric metrics, and logs.
* Ensures uniform alignment in data tables and timelines.

### Scale & Weighting
* **Screen Title**: `text-2xl font-medium tracking-tight` (e.g., Welcome header).
* **Section Heading**: `text-base font-medium` (e.g., Card headers, sidebar labels).
* **Table Headers**: `text-xs font-medium text-muted-foreground`.
* **Standard Body**: `text-sm font-normal text-foreground`.
* **Helper Text / Sub-labels**: `text-xs text-muted-foreground`.

---

## 4. Layout Architecture

### Shell (Dashboard Layout)
* **Sidebar**: Uses a left-aligned, collapsible sidebar (`collapsible="offcanvas"`). It houses:
  * Care home or team switcher switcher (`TeamSwitcher`).
  * Grouped navigation lists under distinct clinical categories (Management, Operations, Clinical, Audit).
  * Notification badges showing real-time unread alerts.
* **Content View**:
  * Clean, flexible layout using `flex flex-col flex-1 min-w-0`.
  * Padding: `px-6 py-10` on the viewport wrapper.
  * Sidebars and sheet overlays (e.g., Vaul drawer controls) provide responsive access on tablet/mobile viewports.

---

## 5. UI Component Specifications

### Buttons
* **Default**: `bg-primary text-primary-foreground shadow-xs hover:bg-primary/90` (Deep slate navy).
* **Destructive**: `bg-destructive text-white shadow-xs hover:bg-destructive/90` (Clinical red).
* **Outline**: `border bg-background shadow-xs hover:bg-accent hover:text-accent-foreground` (Clean light border).
* **Secondary**: `bg-secondary text-secondary-foreground shadow-xs hover:bg-secondary/80` (Subtle light grey).
* **Ghost**: `hover:bg-accent hover:text-accent-foreground` (No-border hover utility).
* **Sizes**:
  * Default: `h-9 px-4 py-2`
  * Small: `h-8 px-3 rounded-md`
  * Large: `h-10 px-6 rounded-md`
  * Icon: `size-9` (Equal height & width)

### Cards
* **Visuals**: Solid background (`bg-card`), thin borders (`border`), rounded corners (`rounded-xl` / `rounded-sm`), subtle shadow (`shadow-sm`).
* **Header Slotting**: Standard layout uses `@container/card-header` to support responsive layouts. Supports a custom `CardAction` slot aligned to the top-right of the header for contextual action buttons.

### Tables
* **Aesthetic**: Minimalist borders, light background for headers (`bg-muted/30`), clean rows.
* **Interactions**: Interactive rows use `cursor-pointer hover:bg-muted/30` to visual-feedback clicks.

---

## 6. Key UX Patterns

### Form View Mode (`.form-view-mode`)
To maintain consistency and avoid duplicate code for "Editing" vs "Reading" data views, CareO implements a custom global utility in CSS:
* Adding the class `.form-view-mode` to a container wrapper automatically restyles all native inputs, textareas, selects, and buttons inside it:
  * Borders, shadows, and background colors are removed.
  * Pointer interactions are disabled (`pointer-events: none`).
  * Inputs align naturally to the left with default margins.
  * Arrow icons, chevron indicators, and Lucide calendar icons are hidden automatically (`display: none`).
* This permits users to view complex forms (such as Wound Folders, Incident Logs, and Assessments) as beautifully structured static documents, while retaining the exact same markup.

---

## 7. Animations & Transitions

* **Page / View Mounts**: A gentle CSS fade-in animation (`fadeIn` 150ms ease-in) is applied on the `main` layout, `[role="main"]`, and `.container` elements.
* **View Transitions**: Supports native browser `::view-transition` API with a matched 150ms animation duration.
* **Interactive Elements**: Micro-transitions on hover state variations (`transition-all`, `transition-transform duration-200`).
