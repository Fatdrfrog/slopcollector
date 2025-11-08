## Supabase Lisbon AI Hackathon 2025 Context

- **Event**: 24-hour Supabase AI Hackathon, Lisbon 2025 (AI Week). Team has Supabase backend access and Figma Make for rapid UI design.
- **Goal**: Ship a focused, defensible MVP with strong UX, clear PMF, and simple build scope. Stack target: Next.js + Tailwind + Supabase SDK + OpenAI.
- **Judging Priorities**: Deep Supabase integration (auth, realtime, storage, edge functions), tangible business value, polished Figma-driven UI, open-source delivery with demo video.

### Preferred Project Direction: AI-Enhanced Schema Optimizer

- **Audience**: Supabase/Postgres developers and small B2B teams who struggle with manual schema tuning.
- **Problem**: Detecting missing indexes and inefficient structures early is time-consuming; Advisor tooling is rule-based and static.
- **Solution Outline**:
  - Import schema via SQL dump or API, store history in Supabase.
  - Run OpenAI analysis to suggest optimizations with risk scoring.
  - Present diffs in a minimal dashboard; optional sandbox apply.
  - Open-source Edge Function + UI to maximize community adoption.
- **Why It Wins**: Directly extends Supabase Advisors with AI foresight, showcases realtime updates, and provides clear business utility. Judges (Supabase + Figma) value ecosystem boosters with crisp UI polish.

### Figma & UX Notes

- Build a calm, data-first dashboard: schema upload pane, AI insight panel, change preview diff.
- Leverage Figma for components, export to Tailwind for implementation speed.

### Next Steps

- Scaffold repo (`/app`, `/edge/functions`) with MIT license.
- Prototype schema upload flow and AI suggestion endpoint.
- Design Figma mockups for dashboard states (empty, analysis results, apply).
- Prepare 60s demo highlighting Supabase + OpenAI interplay and OSS availability.
