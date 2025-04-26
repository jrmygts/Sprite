# Character‑Design & Sprite‑Animation Split

> **Why**  Faster iteration: user locks the look first, then spins up sprite sheets without re‑prompting.

---

## 1 File map (current → new)

| Old file | Becomes | Purpose |
|----------|---------|---------|
| `/app/sprites/generate/page.js` | **/app/design/page.js** | Single‑image generator (concept pass) |
| `/app/api/sprites/generate/route.js` | **/app/api/design/generate/route.js** | Returns 512×512 PNG + saves a row in `designs` |
| — | **/app/animate/page.js** | Upload OR pick‑last‑design ➜ choose motions |
| — | **/app/api/animate/route.js** | Wraps existing sprite pipeline + Redis queue |

## 2 DB additions

```sql
create table designs (
  id        uuid primary key default gen_random_uuid(),
  user_id   uuid references auth.users(id),
  prompt    text,
  seed      int,
  style     text,
  url512    text,
  created_at timestamptz default now()
);
```

`generations` table stays as‑is (sprite atlases).

## 3 Design Flow (`/design`)
1. Renders existing `<SpriteGenerator>` **but forces**:
   * size 512×512
   * motions disabled
2. On *Generate* → POST `/api/design/generate`.
3. API calls **GPT Image 1** once (concept pass) → saves to Storage `designs/{id}.png` and inserts row.
4. UI shows thumbnail with **“Animate”** button (passes `designId` to `/animate`).

## 4 Animation Flow (`/animate`)
1. Accept `?design=<uuid>` or file upload.
2. Displays `<MotionSelector>` (idle, walk, run… default walk).
3. Submit → POST `/api/animate` with `{ designId | imageUrl, motions, style }`.

### `/api/animate` specifics
* Re‑use `processMotion()` + Redis queue (now moved here).
* If `designId` provided → load PNG from Storage as base image.
* For MVP **don’t** implement in‑painting; just feed prompt + seed from `designs` row.

## 5 Refactor notes
* Move motion pipeline code from _old_ `/api/sprites/generate` into `/api/animate`.
* Keep `libs/queue.js` unchanged.
* Update sidebar links.

## 6 To‑do cut
* Mirroring logic can stay.
* In‑painting = backlog.

---
### Acceptance checklist
- [ ] Can design a concept PNG and see it in Dashboard.
- [ ] Clicking *Animate* opens page with motion check‑boxes.
- [ ] Submitting produces atlas + JSON in Storage and a `generations` row.
- [ ] Old `/sprites/generate` route removed.

