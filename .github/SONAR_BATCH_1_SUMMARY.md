# Sonar Batch 1: Mechanical Refactors

**Branch**: `chore/sonar-batch-1`  
**Status**: ✅ Ready for Review  
**Commits**: 2  
**Build Status**: ✅ PASSED

## Summary

This batch contains 2 mechanical Sonar fixes that reduce code noise without changing behavior. All changes are strictly refactoring - no logic changes, no UI changes, no routing changes.

## Fixes Applied

### 1. Cognitive Complexity Reduction in `docs.ts`
**Sonar Issue**: Cognitive complexity 20 (threshold: 15)  
**File**: `apps/dashboard/src/lib/docs.ts`  
**Function**: `getDocBySlug(slug: string[])`

**Changes**:
- Extracted 5 helper functions:
  - `resolveRelativePath(slug)` - handles path resolution logic
  - `isTraversalAttempt(relativePath)` - security check
  - `extractTitle(content, relativePath)` - title extraction
  - `extractDescription(content)` - description extraction with skip rules
  - `renderMarkdownToHtml(content)` - markdown pipeline + link normalization

**Result**: Complexity reduced from 20 to ~8

**Verification**:
- ✅ Build passed
- ✅ Docs bundle verified (3 tripwires rendered correctly)
- ✅ Zero behavior change - all extraction logic identical

### 2. Duplicate String Literals Extraction (with Hygiene)
**Sonar Issue**: Duplicate string literals  
**Files Modified**: 2 files

**Changes**:
- Created `apps/dashboard/src/lib/urls.ts` with 2 focused constants:
  - `STRIPE_OAUTH_URL = 'https://connect.stripe.com/oauth/authorize'`
  - `CANONICAL_SITE_URL = 'https://payflux.dev'`
- Localhost defaults (`http://localhost:3000`, `http://localhost:19090`) remain inline to avoid constant dumping ground

**Replaced in**:
- `app/api/stripe/connect/route.ts` (STRIPE_OAUTH_URL)
- `app/docs/[[...slug]]/page.tsx` (CANONICAL_SITE_URL)

**Result**: 2 external service URLs extracted to focused `urls.ts` file

**Verification**:
- ✅ Build passed
- ✅ All URLs remain functionally identical
- ✅ Zero behavior change
- ✅ Constants file remains focused and maintainable


## Files Changed

| File | Lines Changed | Type |
|:-----|:--------------|:-----|
| `apps/dashboard/src/lib/docs.ts` | +70, -55 | Refactor |
| `apps/dashboard/src/lib/urls.ts` | +6 | New file |
| `apps/dashboard/src/app/api/stripe/connect/route.ts` | +2, -2 | Refactor |
| `apps/dashboard/src/app/docs/[[...slug]]/page.tsx` | +1, -1 | Refactor |

**Total**: 4 files, +79 insertions, -58 deletions


## Verification Commands Run

```bash
# Build verification (ran twice - once per fix)
cd apps/dashboard
npm run build

# Both builds passed with:
# ✅ Docs bundle verified. All tripwires present and renderable.
```

## Safety Checklist

- ✅ No behavior changes
- ✅ No UI changes
- ✅ No routing changes
- ✅ No dependency changes
- ✅ No Netlify config changes
- ✅ No CI/CD changes
- ✅ Build passes
- ✅ Docs render correctly
- ✅ All changes are mechanical refactors

## Commits

1. `b715318` - chore(sonar): reduce cognitive complexity in docs getDocBySlug
2. `a490593` - chore(sonar): extract duplicate string literals to constants

## Next Steps

**DO NOT MERGE** until explicitly approved. This branch is ready for:
1. Code review
2. Single Netlify preview deploy (not 10+)
3. Approval before merge to main

## Sonar Issues Resolved

- ✅ Cognitive complexity in `getDocBySlug` (20 → ~8)
- ✅ Duplicate string literals for external service URLs (2 constants in focused `urls.ts`)

## Safety Validation

### docs.ts Behavior Equivalence - ✅ VERIFIED
- **Path resolution**: `resolveRelativePath` identical to old logic (undefined/[], .md suffix, nested paths)
- **Description extraction**: Skip rules and 160-char truncation unchanged
- **Markdown pipeline**: Plugin order and options identical (remarkParse → remarkRehype → rehypeRaw → rehypeSlug → rehypeStringify)

### Constants Hygiene - ✅ APPLIED
- Renamed `constants.ts` → `urls.ts`
- Kept only external service URLs (STRIPE_OAUTH_URL, CANONICAL_SITE_URL)
- Localhost defaults remain inline to prevent dumping ground pattern

