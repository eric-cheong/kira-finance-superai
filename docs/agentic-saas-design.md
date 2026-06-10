# Agentic SaaS Design Guidance

This note captures durable product-design guidance for Kira.

## Inspiration, Not Cloning

Do not copy Dribbble shots verbatim. Treat inspiration as raw material: extract
the color direction, type/spacing rhythm, and layout structure, then rebuild it
with production components that handle real data, loading, empty, error, hover,
long-string, and dense-table states.

Figma Dev Mode is useful for reading tokens and spacing. Figma-to-code export is
not a maintainable product foundation.

## Component Direction

For a serious React/Next.js B2B SaaS, prefer owned components over template
classes. shadcn/ui is a strong long-term direction because it copies accessible
Radix/Tailwind components into the repo, which makes command palettes, dense
tables, settings panels, and dashboards feel product-specific. DaisyUI is still
useful for fast prototypes and theming, but customization and ownership are
shallower.

Kira currently uses Tailwind with owned local primitives in `components/ui`.
Future shadcn migration should preserve this rule: own the component code and
keep design tokens explicit.

## Stack Alignment

Current implementation:

- Next.js App Router, React, TypeScript, and Tailwind for tokens and layout.
- DaisyUI is installed because `tailwind.config.ts` uses it for the active Kira
  theme, drawer, navbar, and utility classes.
- Owned React primitives in `components/ui` provide cards, tables, buttons,
  badges, progress, notices, and the current inline SVG icon set.
- OpenAI Agents SDK, OpenAI, Exa, and Zod are installed only for the live
  provider seams that are already wired in `lib/backend`.
- The Kira AI bot is a product surface, not a decorative chat box: it must show
  what it understood, the route/policy boundary it used, the knowledge sources it
  grounded on, and whether voice is browser-local or backed by a realtime
  session.

Deferred until a screen or component actually imports them:

- shadcn/Radix component copies for deeper owned accessibility primitives.
- TanStack Table for heavier sortable/filterable data grids.
- Recharts or Tremor for charting once dashboards need more than local bars and
  tiles.
- Lucide icons if the current owned icon set becomes a maintenance bottleneck.
- Motion for restrained transitions.
- Vercel AI SDK/UI elements for streaming agent turns and tool-call rendering.

Do not add these candidate libraries to `package.json` pre-emptively. Add them
only with the implementing feature so the lockfile reflects code that exists.

## Easy On The Eyes

For B2B users who live in the tool all day, premium means restraint:

- Neutral surfaces, graphite text, one restrained accent.
- Saturated color only for meaningful state and primary action.
- Clear hierarchy, tight alignment, and whitespace used as grouping.
- Density done well, not empty minimalism.
- Keyboard shortcuts and command palette for power users.
- Dark mode should be considered table stakes for technical audiences.

Good reference products: Linear, Vercel dashboard, and Stripe.

## Agentic UX Principle

The chat box is the easy part. The real product is trust.

Design the autonomous system so it is legible and controllable:

- Show the agent plan, tool calls, decision trace, evidence, and progress.
- Show the local knowledge base beside the assistant so users can see what the
  bot is allowed to know before they trust its answer.
- Give humans control points: pause, edit, approve, reject, resume.
- Treat loading, streaming, empty, and error states as core design, not cleanup.
- Surface evidence and citations for every recommendation.
- Keep consequential actions behind approval gates.

If the user cannot see what the agent did and why, polish will not save the
experience.

## Prompting Pattern For Design Iteration

Good prompts specify the system and constraints up front:

- Name the stack and components.
- Name the visual references and why they matter.
- Ask for one screen or component at a time.
- Request loading, empty, error, hover, and long-content states.
- Give precise feedback: spacing scale, accent saturation, hierarchy, density.

Vague prompts produce generic UI. Constrained prompts produce polish.
