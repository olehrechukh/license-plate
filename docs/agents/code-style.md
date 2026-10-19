# Code style

Owner of: how JavaScript/JSX in this repo is written. Derived from the existing code — when in
doubt, copy the nearest similar file. Formatting is Prettier's job (`npm run format`); CSS
conventions are owned by [architecture.md](architecture.md#styling-srcstyles).

Rules marked **(lint)** are enforced by `eslint.config.js` and fail CI; the rest are checked in
review ([review-guidelines](../../.factory/skills/review-guidelines/SKILL.md)).

## Files and exports

| Kind                | File                            | Export                                      |
| ------------------- | ------------------------------- | ------------------------------------------- |
| Page (route screen) | `src/pages/PascalCase.jsx`      | `export default function PascalCase()`      |
| Component           | `src/components/PascalCase.jsx` | `export default function PascalCase(props)` |
| Context             | `src/<area>/NameContext.jsx`    | named `NameProvider` + `useName()` hook     |
| Hook                | `src/<area>/useName.js`         | named `export function useName()`           |
| Plain module        | `src/<area>/camelCase.js`       | named function/const exports                |

- One component per file; the file name equals the component name.
- `.jsx` only for files that contain JSX; everything else is `.js` **(lint)**.
- Components are function declarations, never arrow-function constants **(lint)**.
- Context hooks throw when used outside their provider:
  `if (!ctx) throw new Error('useFeed must be used within a FeedProvider')`.
- No barrel (`index.js`) files and no path aliases.

## Imports

- Relative paths with the explicit extension: `'../data/feedApi.js'`, `'./CategoryBadge.jsx'`.
- Order: `react`, then third-party packages, then local modules.
- Import only what is used (`no-unused-vars`, **lint**).

## Naming

- `PascalCase` components and providers; `camelCase` functions, variables and hooks (`useX`) **(lint)**.
- `SCREAMING_SNAKE_CASE` for module-level constants: `PAGE`, `PHOTO_BUCKET`, `MAX_AUTHOR_LENGTH`.
- Database columns stay `snake_case` (`text_uk`, `comment_count`); convert to the camelCase UI
  shape in one mapper (`toComment()` in `feedApi.js`), not throughout components.
- Event handlers are short verbs declared inside the component: `submit`, `update`, `remove`,
  `cast`, `retry`, `changeSort`. DOM listener callbacks use `onX` (`onKeyDown`, `onPointerDown`).
- Booleans read as states: `loading`, `saving`, `invalid`, `hasMore`, `isAdmin`.
- localStorage keys are prefixed `lp-` ([storage keys](architecture.md#local-storage-keys)).
- Analytics events are `snake_case` `noun_verb` (`plate_search`, `comment_published`)
  ([event list](operations.md#analytics)).
- i18n keys are camelCase, grouped by page or component (`newComment.fields.plate.help`).

## Components

- Destructure props in the signature with defaults there:
  `function CommentCard({ comment, showPlate = true })`.
- Read context through hooks (`useI18n()`, `useFeed()`, `useAuth()`) at the top of the component.
- Early-return for gated or empty states (see `NewComment`, `Province`).
- Conditional rendering with `cond && (...)` or a ternary; build class names with a template
  string and the CSS modifier/state classes:
  ``className={`votebtn votebtn--up ${myVote === 1 ? 'is-active' : ''}`}``.
- Inline arrow functions are fine for one-line `onClick` handlers; anything longer becomes a
  named handler above the `return`.
- Lists use a stable `key` from the data (`c.id`, `p.slug`), never the array index **(lint)**.
- No `dangerouslySetInnerHTML` **(lint)**.
- Accessibility: `aria-label` on icon-only buttons, `aria-pressed` on toggles, `role="alert"` on
  error messages, `aria-hidden="true"` on decorative elements.

## Hooks and state

- `useState` for local UI state; derive values during render instead of storing them.
- Context providers wrap their value in `useMemo` and their functions in `useCallback`.
  Ordinary components do not memoize.
- Use a ref when an async callback needs the latest value without re-creating itself
  (`userRef`, `sessionVotesRef` in `FeedContext.jsx`).
- Optimistic updates roll back when the request fails (`castVote` in `FeedContext.jsx`).
- Effects that fetch ignore stale results with a `cancelled` flag and a cleanup:

  ```js
  useEffect(() => {
    let cancelled = false
    fetchPlate(code).then((r) => {
      if (!cancelled) setRecord(r)
    })
    return () => {
      cancelled = true
    }
  }, [code])
  ```

## Async and errors

- Paged queries keep a stable tiebreaker (`.order('id')`) so pages never overlap.
- `async`/`await` for mutations; `.then()` with the cancelled flag inside effects.
- **Reads** (`feedApi.js`) never throw: log and return an empty value.
  `console.warn('[feed] fetchPlate failed:', error.message || error)` then `return null` / `[]` / `{}`.
- **Writes** throw `new Error(message)` with a readable message; the calling component catches,
  logs `console.warn('[scope] … failed:', …)`, and shows a localized error with `role="alert"`.
- Log with `console.warn` and a `[scope]` prefix (`[feed]`, `[comment]`); no `console.log`
  in committed code **(lint)**.
- Wrap every `localStorage` access in `try/catch` — it can throw in private mode.
- Use `===` / `!==` **(lint)**; `const` by default, `let` only when reassigned, never `var` **(lint)**.
- Template literals instead of string concatenation **(lint)**; object shorthand **(lint)**.

## Comments

- Explain **why**, not what: constraints, trade-offs, non-obvious behavior
  (see `AuthControl.jsx`, `FeedContext.jsx`). Full sentences, `//` line comments.
- Exported data functions get a short `/** … */` block describing inputs and the returned shape
  (see `fetchComments`).
- No commented-out code and no TODOs without context.
