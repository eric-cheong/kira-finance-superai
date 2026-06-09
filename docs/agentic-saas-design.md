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

## Stack Preference

- Tailwind for tokens and layout.
- Owned React primitives / shadcn-style components for product surfaces.
- TanStack Table for serious data tables.
- Recharts or Tremor for dashboards.
- Lucide-style icons for tool buttons and nav.
- Motion for restrained transitions only.
- Vercel AI SDK/UI elements are worth evaluating for streaming agent turns and
  tool-call rendering.

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
