# Graph Report - .  (2026-07-03)

## Corpus Check
- Large corpus: 86 files · ~933,601 words. Semantic extraction will be expensive (many Claude tokens). Consider running on a subfolder.

## Summary
- 234 nodes · 243 edges · 49 communities (44 shown, 5 thin omitted)
- Extraction: 94% EXTRACTED · 6% INFERRED · 0% AMBIGUOUS · INFERRED: 14 edges (avg confidence: 0.8)
- Token cost: 70,107 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Core UI Components|Core UI Components]]
- [[_COMMUNITY_Sanity Studio Package Config|Sanity Studio Package Config]]
- [[_COMMUNITY_Frontend Package Dependencies|Frontend Package Dependencies]]
- [[_COMMUNITY_Brand Assets & Fonts|Brand Assets & Fonts]]
- [[_COMMUNITY_App Routing & Media Pages|App Routing & Media Pages]]
- [[_COMMUNITY_Works Listing & Sanity Client|Works Listing & Sanity Client]]
- [[_COMMUNITY_Root Dev Dependencies|Root Dev Dependencies]]
- [[_COMMUNITY_Work Detail Viewer|Work Detail Viewer]]
- [[_COMMUNITY_Root Package Scripts|Root Package Scripts]]
- [[_COMMUNITY_Sanity Studio Runtime & Docs|Sanity Studio Runtime & Docs]]
- [[_COMMUNITY_Page Transition System|Page Transition System]]
- [[_COMMUNITY_Studio Package Scripts|Studio Package Scripts]]
- [[_COMMUNITY_Sanity Studio Config & Schema|Sanity Studio Config & Schema]]
- [[_COMMUNITY_Root README References|Root README References]]
- [[_COMMUNITY_Hero 3D Canvas|Hero 3D Canvas]]
- [[_COMMUNITY_Font License Info|Font License Info]]
- [[_COMMUNITY_Footer Component|Footer Component]]
- [[_COMMUNITY_Animated Menu UI|Animated Menu UI]]
- [[_COMMUNITY_Sanity Seed Script|Sanity Seed Script]]
- [[_COMMUNITY_Vercel Config|Vercel Config]]

## God Nodes (most connected - your core abstractions)
1. `useIsMobile()` - 15 edges
2. `client` - 8 edges
3. `WorkListPage()` - 6 edges
4. `scripts` - 6 edges
5. `Icon Sprite Sheet (icons.svg)` - 6 edges
6. `scripts` - 5 edges
7. `WorkPage()` - 5 edges
8. `transitionState` - 5 edges
9. `prettier` - 5 edges
10. `TheaterView()` - 4 edges

## Surprising Connections (you probably didn't know these)
- `index.html Entry Document (my-portfolio)` --references--> `Favicon (purple abstract asterisk/star mark)`  [EXTRACTED]
  index.html → public/favicon.svg
- `WorkListPage()` --calls--> `useIsMobile()`  [INFERRED]
  src/components/WorkListPage.jsx → src/hooks/useIsMobile.js
- `WorkPage()` --calls--> `useIsMobile()`  [INFERRED]
  src/pages/WorkPage.jsx → src/hooks/useIsMobile.js
- `WorksPage()` --calls--> `useIsMobile()`  [INFERRED]
  src/pages/WorksPage.jsx → src/hooks/useIsMobile.js
- `Favicon (purple abstract asterisk/star mark)` --semantically_similar_to--> `HWL Logo Asterisk/Star Mark (polygon 1)`  [INFERRED] [semantically similar]
  public/favicon.svg → public/hwl_logo.svg

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **HWL Brand Identity Assets (favicon, logo, hero images)** — public_favicon_mark, public_hwl_logo_mark, public_hwl_front_image, public_hwl_front_mobile_image [INFERRED 0.85]
- **Social/Documentation Icon Sprite Set** — public_icons_bluesky_icon, public_icons_discord_icon, public_icons_documentation_icon, public_icons_github_icon, public_icons_social_icon, public_icons_x_icon [EXTRACTED 1.00]
- **Sanity Studio Subproject (docs + runtime app)** — studio_readme_doc, studio__sanity_runtime_index_document, studio__sanity_runtime_index_inter_font [INFERRED 0.75]

## Communities (49 total, 5 thin omitted)

### Community 0 - "Core UI Components"
Cohesion: 0.12
Nodes (12): Hero(), DESKTOP, links, Navbar(), Button, buttonVariants, imageUrl(), normaliseCover() (+4 more)

### Community 1 - "Sanity Studio Package Config"
Cohesion: 0.08
Nodes (24): dependencies, react, react-dom, sanity, @sanity/orderable-document-list, @sanity/vision, styled-components, devDependencies (+16 more)

### Community 2 - "Frontend Package Dependencies"
Cohesion: 0.11
Nodes (18): dependencies, class-variance-authority, clsx, framer-motion, gsap, lenis, postprocessing, @radix-ui/react-slot (+10 more)

### Community 3 - "Brand Assets & Fonts"
Cohesion: 0.13
Nodes (16): index.html Entry Document (my-portfolio), League Spartan Google Font, Nanum Gothic Google Font, Favicon (purple abstract asterisk/star mark), HWL Front Hero Image, Desktop (*HWL wordmark on black), HWL Front Hero Image, Mobile (*HWL wordmark on black), HWL Logo Asterisk/Star Mark (polygon 1), HWL Logo (asterisk + wordmark) (+8 more)

### Community 4 - "App Routing & Media Pages"
Cohesion: 0.17
Nodes (7): App(), WipeTransition(), imageUrl(), WorkListPage(), JpgPage(), Mp4Page(), ObjPage()

### Community 5 - "Works Listing & Sanity Client"
Cohesion: 0.15
Nodes (4): ArchivePage(), CATEGORIES, WorksPage(), client

### Community 6 - "Root Dev Dependencies"
Cohesion: 0.14
Nodes (14): devDependencies, autoprefixer, eslint, @eslint/js, eslint-plugin-react-hooks, eslint-plugin-react-refresh, globals, @playwright/test (+6 more)

### Community 7 - "Work Detail Viewer"
Cohesion: 0.24
Nodes (7): fileUrl(), fmtTime(), TheaterView(), WorkLoading(), fileUrl(), imageUrl(), WorkPage()

### Community 8 - "Root Package Scripts"
Cohesion: 0.20
Nodes (9): name, private, scripts, build, dev, lint, preview, type (+1 more)

### Community 9 - "Sanity Studio Runtime & Docs"
Cohesion: 0.22
Nodes (9): Sanity Core Bridge Script (core.sanity-cdn.com/bridge.js), Sanity Studio Runtime HTML (auto-generated), Sanity Error Channel Pub/Sub Mechanism, Inter Font (Sanity Studio UI), React GitHub Issue #10384 (duplicate dev-mode error throw), Sanity Community, Sanity Clean Content Studio README, Sanity Plugin Extension Docs (+1 more)

### Community 10 - "Page Transition System"
Cohesion: 0.25
Nodes (3): EASE, variants, transitionState

### Community 11 - "Studio Package Scripts"
Cohesion: 0.33
Nodes (6): scripts, build, deploy, deploy-graphql, dev, start

### Community 13 - "Root README References"
Cohesion: 0.40
Nodes (5): React Compiler, React + Vite Template README, TypeScript + typescript-eslint Template, @vitejs/plugin-react (Oxc), @vitejs/plugin-react-swc (SWC)

### Community 14 - "Hero 3D Canvas"
Cohesion: 0.67
Nodes (3): HeroCanvas, imgUrl(), isMob()

### Community 15 - "Font License Info"
Cohesion: 0.67
Nodes (3): SIL Open Font License 1.1 (Noto Fonts), The Noto Project Authors, Noto Sans Mono Variable Font README

## Knowledge Gaps
- **94 isolated node(s):** `name`, `private`, `version`, `type`, `dev` (+89 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **5 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `useIsMobile()` connect `Core UI Components` to `App Routing & Media Pages`, `Works Listing & Sanity Client`, `Work Detail Viewer`?**
  _High betweenness centrality (0.034) - this node is a cross-community bridge._
- **Why does `dependencies` connect `Frontend Package Dependencies` to `Root Package Scripts`?**
  _High betweenness centrality (0.020) - this node is a cross-community bridge._
- **Why does `transitionState` connect `Page Transition System` to `Core UI Components`, `Work Detail Viewer`?**
  _High betweenness centrality (0.020) - this node is a cross-community bridge._
- **Are the 7 inferred relationships involving `useIsMobile()` (e.g. with `Hero()` and `Navbar()`) actually correct?**
  _`useIsMobile()` has 7 INFERRED edges - model-reasoned connections that need verification._
- **What connects `name`, `private`, `version` to the rest of the system?**
  _94 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Core UI Components` be split into smaller, more focused modules?**
  _Cohesion score 0.11666666666666667 - nodes in this community are weakly interconnected._
- **Should `Sanity Studio Package Config` be split into smaller, more focused modules?**
  _Cohesion score 0.08 - nodes in this community are weakly interconnected._