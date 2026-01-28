# Public Documentation Routes

The `/docs` route serves the content from the root `docs/` folder of the monorepo.

## Structure
- `/docs`: Renders `docs/index.md`
- `/docs/[...slug]`: Renders `docs/[...slug].md`

## Implementation
- **Source**: `apps/dashboard/src/lib/docs.ts`
- **Page**: `apps/dashboard/app/docs/[[...slug]]/page.tsx`
- **Rendering**: Uses `unified`, `remark`, and `rehype` to render Markdown to HTML, preserving JSON-LD scripts (`rehype-raw`).

## Adding New Docs
Simply add markdown files to the root `docs/` folder. They will be automatically available at `payflux.dev/docs/<path>`.
Ensure you include a Level 1 Header (`# Title`) for the page title.
