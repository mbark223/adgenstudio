# AdGen Studio

## Overview

AdGen Studio is an AI-powered ad variation generator that helps advertisers create multiple creative variations from existing static images and video ads. The platform connects to multiple AI models and outputs variations across multiple sizes for major ad platforms including Meta, TikTok, Snapchat, Moloco, and Google UAC. Users can upload source assets, apply AI-powered transformations, and view all variations on a single screen for rapid review and comparison.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React with TypeScript using Vite as the build tool
- **Routing**: Wouter for lightweight client-side routing
- **State Management**: TanStack React Query for server state management
- **UI Components**: shadcn/ui component library built on Radix UI primitives
- **Styling**: Tailwind CSS with CSS variables for theming (light/dark mode support)
- **Design System**: Professional productivity tool aesthetic with Inter font family, information density focus, and consistent spacing patterns

### Backend Architecture
- **Runtime**: Node.js with Express.js
- **Language**: TypeScript with ES modules
- **API Design**: RESTful endpoints under `/api` prefix
- **Build Process**: Custom build script using esbuild for server bundling and Vite for client

### Data Storage
- **ORM**: Drizzle ORM with PostgreSQL dialect
- **Schema Location**: `shared/schema.ts` contains all data models
- **Current Storage**: In-memory storage implementation (`MemStorage` class) with interface abstraction (`IStorage`) for easy database migration
- **Database Config**: Drizzle Kit configured for PostgreSQL migrations

### Key Data Models
- **Projects**: Container for ad generation sessions
- **Assets**: Uploaded images and videos (supports jpg, png, webp, mp4, mov, webm)
- **Variations**: Generated ad variations with size configurations
- **GenerationJobs**: Queue management for AI generation tasks

### Platform Size Presets
The system includes predefined ad size configurations for:
- Meta (Facebook/Instagram): Feed, Stories, Reels formats
- TikTok: In-Feed, TopView, Spark Ads
- Snapchat: Snap Ads, Story Ads, Collections
- Moloco: Interstitial, Banner, Native formats
- Google UAC: YouTube and Display formats

### Project Structure
```
├── client/           # React frontend
│   └── src/
│       ├── components/   # UI components (shadcn/ui + custom)
│       │   ├── ui/       # Base shadcn/ui components
│       │   ├── theme-provider.tsx  # Dark/light mode context
│       │   ├── theme-toggle.tsx    # Theme switch button
│       │   ├── upload-zone.tsx     # Drag-and-drop asset upload
│       │   ├── variation-config.tsx # Variation count, types, prompts
│       │   ├── size-selector.tsx   # Platform ad size selection
│       │   ├── model-selector.tsx  # AI model picker
│       │   ├── generation-queue.tsx # Progress tracking panel
│       │   ├── results-grid.tsx    # Variation card grid with filters
│       │   ├── variation-card.tsx  # Individual variation display
│       │   ├── detail-panel.tsx    # Right sidebar detail view
│       │   ├── lightbox.tsx        # Fullscreen variation viewer
│       │   └── export-modal.tsx    # Download configuration
│       ├── pages/        # Route pages
│       │   └── studio.tsx  # Main application page
│       ├── hooks/        # Custom React hooks
│       └── lib/          # Utilities
├── server/           # Express backend
│   ├── routes.ts     # API endpoints
│   └── storage.ts    # In-memory storage implementation
├── shared/           # Shared types and schemas
│   └── schema.ts     # Zod schemas, platform presets, AI models
└── design_guidelines.md  # UI/UX design specifications
```

## Recent Changes
- **January 2025**: Initial MVP implementation
  - Three-panel layout (left config sidebar, center results grid, right detail panel)
  - Upload zone with drag-and-drop support
  - Configuration accordion (Variation Settings, Output Sizes, AI Model)
  - Generation queue with real-time progress tracking
  - Results grid with filtering by size and multi-select
  - Lightbox viewer with keyboard navigation
  - Export modal with naming convention templates
  - Dark/light theme toggle with localStorage persistence
  - Project save/load functionality

## External Dependencies

### AI/ML Services
- OpenAI SDK configured for AI model integration
- Google Generative AI SDK for additional model support

### Database
- PostgreSQL (via `pg` driver)
- Drizzle ORM for type-safe database operations
- `connect-pg-simple` for session storage

### UI Libraries
- Radix UI (complete primitive set for accessible components)
- Embla Carousel for image carousels
- React Day Picker for calendar functionality
- Recharts for data visualization
- CMDK for command palette
- Vaul for drawer components

### Build Tools
- Vite with React plugin
- esbuild for server bundling
- Tailwind CSS with PostCSS

### Validation
- Zod for runtime type validation
- Drizzle-Zod for schema-to-Zod type generation
- React Hook Form with Zod resolver

### File Handling
- Multer for file uploads
- Support for image formats (jpg, jpeg, png, webp) up to 20MB
- Support for video formats (mp4, mov, webm) up to 500MB, 60 seconds max