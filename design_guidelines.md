# AdGen Studio Design Guidelines

## Design Approach

**Selected Approach:** Design System (shadcn/ui Foundation)

**Justification:** AdGen Studio is a professional productivity tool requiring information density, clear data visualization, and consistent patterns. The application demands efficient workflows for comparing multiple ad variations across formats. We'll follow shadcn/ui's principles combined with Linear's data-density approach and Notion's clarity.

**Core Principles:**
- Functional clarity over decorative elements
- Information density without clutter
- Rapid scanning and comparison capabilities
- Professional, trustworthy aesthetic for enterprise users

---

## Typography

**Font Families:**
- Primary: Inter (400, 500, 600) via Google Fonts
- Monospace: JetBrains Mono (400, 500) for file names, dimensions, technical data

**Type Scale:**
- Display/Headers: text-2xl (24px), font-semibold
- Section Headers: text-lg (18px), font-medium
- Body: text-sm (14px), font-normal
- Captions/Meta: text-xs (12px), font-normal
- Labels: text-xs (12px), font-medium, uppercase tracking-wide

---

## Layout System

**Spacing Primitives:** Tailwind units of 2, 4, 6, 8, 12, 16, 24 (focus on 4, 8, 12 for consistency)

**Container Structure:**
- Main workspace: Full-width with max-w-[1920px] mx-auto
- Content padding: px-8 py-6
- Card/Panel spacing: p-6
- Component gaps: gap-4 (standard), gap-6 (section separation)

**Grid Systems:**
- Results grid: 4-column on desktop (grid-cols-4), 2-column tablet (md:grid-cols-2), single mobile
- Configuration panels: 2-column layout for controls (grid-cols-2 gap-6)
- Platform size selector: 3-column grouped layout

---

## Component Library

### Core Layout Components

**Header/Navigation:**
- Fixed top bar: h-16, border-b with subtle shadow
- Logo left, project name center, user menu/settings right
- "New Project" and "Save Project" primary actions in header

**Main Workspace Structure:**
Three-panel layout:
1. **Left Sidebar (320px fixed):** Configuration panel with accordion sections for Upload, Variation Settings, Size Selection, AI Model
2. **Center Canvas (flex-1):** Results grid with filter bar at top
3. **Right Detail Panel (360px, collapsible):** Selected variation details, metadata, export options

### Upload Module

**Drag-Drop Zone:**
- Large target area: min-h-[240px]
- Dashed border (border-2 border-dashed)
- Center-aligned icon (w-12 h-12) + text
- Shows file specs below (text-xs)
- Uploaded preview: aspect-video container with play overlay for videos

### Configuration Panels

**Accordion-Style Sections:**
- Each config section in collapsible accordion
- Section headers: flex justify-between items-center, h-12, px-4
- Expanded content: p-4 pt-2
- Active section indicated with subtle left border accent

**Variation Controls:**
- Slider with numeric input inline (flex items-center gap-4)
- Checkbox groups for variation types in 2-column grid
- Prompt textarea: min-h-[120px], font-mono for technical accuracy

**Platform Size Selector:**
- Grouped by platform with platform logo/icon
- Checkbox + label + dimensions (text-xs) in row layout
- "Select All Platform" toggle per group
- Visual aspect ratio indicator boxes (small squares showing ratio)
- Maximum 6 selection badge/warning

### AI Model Selector

**Card-Based Selection:**
- Radio button cards in single column
- Each card shows: Model name (text-base font-medium), provider (text-xs), capabilities badges, cost estimate (text-sm), generation time
- Selected state with border highlight
- Expandable info tooltip (Radix Tooltip component)

### Generation Queue

**Progress List:**
- Fixed bottom panel: h-[180px], border-t, scrollable
- Each job as row: thumbnail (64px square) + metadata + progress bar + actions
- Status badges (queued/processing/completed/failed)
- Overall progress at panel header
- Compact spacing: py-2 px-4 per row

### Results Grid

**Filter Bar:**
- Sticky top position below header
- Size filter chips (inline-flex gap-2)
- View controls: grid/list toggle
- Bulk actions: "Select All", "Download Selected", "Delete Selected"

**Variation Cards:**
- Aspect-fit preview with play button overlay for video
- Metadata overlay on hover: dimensions, model used, generation time
- Action buttons in bottom-right corner group (download, fullscreen, delete)
- Checkbox top-left corner for multi-select
- Border on selected state

**Card Spacing:**
- gap-4 between cards
- Card padding: p-3
- Consistent border-radius: rounded-lg

### Detail Panel (Right)

**Selected Variation Info:**
- Large preview at top (aspect-fit, max-h-[320px])
- Metadata table: Key-value pairs (text-xs), py-2 per row
- Download section: Format selector + custom naming + download button
- "Refine This Variation" section with prompt input + generate button

### Modals/Overlays

**Lightbox/Fullscreen View:**
- Dark backdrop (bg-black/90)
- Centered content with navigation arrows
- Close button top-right
- Metadata sidebar (optional toggle)

**Export Modal:**
- Naming convention template builder
- Preview of generated filenames (font-mono, text-xs)
- Platform format selector
- Bulk download progress

---

## Interaction Patterns

**Loading States:**
- Skeleton screens for grid during generation
- Spinner + percentage for individual variations
- Shimmer effect for image loading

**Empty States:**
- Centered icon + heading + description + CTA
- "Upload your first asset to begin" in empty workspace

**Feedback:**
- Toast notifications (Radix Toast) top-right for completions/errors
- Inline validation messages below form fields
- Confirm dialogs for destructive actions

---

## Responsive Behavior

**Desktop (1280px+):** Three-panel layout as described
**Tablet (768-1279px):** Left sidebar collapsible, results grid 2-column
**Mobile (<768px):** Stack layout, full-width panels, single-column grid, bottom sheet for configurations

---

## Accessibility

- All interactive elements keyboard navigable
- ARIA labels for icon-only buttons
- Focus visible states (ring-2 ring-offset-2)
- Adequate contrast ratios throughout
- Alt text for all generated variations

---

## Images

No hero images required. This is a data-dense application interface. Use platform logos (Meta, TikTok, Snapchat, etc.) as small icons in size selectors. Variation previews are user-generated content, not design assets.