# Motion Generation Feature — Implementation Spec

> **Goal**: let a user select one or more common motions (idle, walk, run, attack, …) and receive a ready‑to‑use sprite **atlas + metadata JSON** while minimising OpenAI credit spend.

---

## 1. User Flow (UI)

1. **Prompt Wizard**  
   *Inputs*: `prompt`, `style` (dropdown), **Motion selector** (multi‑select check‑boxes).  
   *Default motions*: `idle` + `walk`.
2. **Concept pass** — generate 512×512 single thumbnail (cost ≈ $0.01) until user clicks **Approve**.
3. **Sheet generation** — backend produces the full motion set and returns:
   ```json
   {
     "atlasUrl": "https://…/ninja_atlas.png",
     "metaUrl" : "https://…/ninja_animations.json"
   }
   ```
4. **Gallery / History** card shows 4‑frame GIF hover preview per motion and a **Download All** link.

---

## 2. API

### `POST /api/sprites/generate`

```jsonc
{
  "prompt" : "fox‑spirit ninja",
  "style"  : "octopath-traveler",
  "motions": ["idle", "walk", "run"],
  "seed"   : 123456789   // optional → reuse for regen
}
```

* **Auth required** (Supabase cookie).
* **Quota check**: deny if user has >20 generations today.
* Loop through requested motions → `processMotion()` (see §3).
* When all motions finished: `buildAtlas()` + `buildMeta()`.
* Insert a row into `generations` table:
  ```sql
  (id, user_id, prompt, seed, style, motions[], atlas_url, meta_url, created_at)
  ```
* Respond with URLs.

**Status codes**
| Code | Meaning |
|------|---------|
| 200  | Success, returns URLs |
| 402  | Daily quota exceeded |
| 429  | Queue throttle hit |
| 500  | Unhandled error |

---

## 3. `processMotion(prompt, style, motion, seed)`

1. **Cache key** = `sha1(prompt|style|motion|seed)`.
2. **Cache lookup** (Supabase Storage). If hit → return URLs.
3. **OpenAI call** (GPT Image 1)
   * `size : "1024x1024"`
   * `quality : "medium"`
   * `background : "transparent"`
   * `output_format : "png"`
   * `seed : seed`
   * `prompt` string:
     ```txt
     {prompt}, {styleSnippet[style]}, {motionSentence[motion]},
     4 × 4 grid of 256‑pixel transparent tiles, centered character,
     pixel‑art, no painterly texture, crisp pixels
     ```
4. **Sharp processing**
   * Slice sheet → 256‑px frames
   * `sharp.resize` to emit 512‑px + 256‑px down‑scales
5. **Upload**
   * `sprites/{hash}/{motion}_1024.png`
   * `sprites/{hash}/{motion}_512.png`
   * `sprites/{hash}/{motion}_256.png`
6. **Return** object `{ motion, url1024, url512, url256 }`.

---

## 4. `buildAtlas()`

* Concatenate all `*_1024.png` vertically (`sharp.joinChannel` or manual composite).  
* Output: `atlas.png` width 1024, height = motions × 1024.

## 5. `buildMeta()` (animations.json)
```json
{
  "walk":  { "row":1, "frames":4, "fps":8 },
  "run" :  { "row":2, "frames":6, "fps":12 },
  "attack":{ "row":3, "frames":6, "fps":10 }
}
```

---

## 6. Motion → Sentence → Frame map

| Motion key | Frames | Default FPS | Sentence fragment |
|------------|--------|-------------|-------------------|
| idle  | 1 | 4  | "single idle pose" |
| walk  | 4 | 8  | "4‑frame south‑walk cycle (down, down‑left, down‑right, down)" |
| run   | 6 | 12 | "6‑frame side‑run cycle facing right" |
| attack| 6 | 10 | "6‑frame sword‑slash combo facing forward" |
| jump  | 4 | 8  | "4‑frame jump arc" |
| hurt  | 3 | 6  | "3‑frame recoil / hurt animation" |

Store this table in `motions.js` so both frontend dropdown and backend share one source.

---

## 7. Queue / Throttle

* Use BullMQ (`libs/queue.js`) → limit **1 OpenAI call / sec**.
* Drop requests if queue length > 3 per user.

---

## 8. TODO backlog (not MVP)

* Tier‑based `quality` switch (low/medium/high)  
* In‑painting for per‑frame touch‑ups  
* GIF/WebP hover previews generated server‑side  
* Bulk delete old generations after 30 days to save storage


---

## 4. Directional Breakdown for Walk Motion

When the user selects **Walk**, the generator must output a full 16‑frame, four‑direction set:

| Row | Columns | Facing | Prompt sentence |
|-----|---------|--------|-----------------|
| **0** | 0‑3 | South (down) | “4‑frame south‑walk cycle” |
| **1** | 0‑3 | North (up) | “4‑frame north‑walk cycle” |
| **2** | 0‑3 | West (left) | “4‑frame west‑walk cycle” |
| **3** | 0‑3 | East (right) | “4‑frame east‑walk cycle” |

*Grid layout:* one 1024 × 1024 image, 4 × 4 tiles @ 256 px each.  
*Playback:* 8 fps per direction.

Back‑end loop must generate **one** OpenAI call per direction **or** a single call with explicit row instructions (preferred) to stay within one image credit.
