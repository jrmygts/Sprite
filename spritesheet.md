Below is a **Cursor-friendly implementation plan** you can paste into a task file (or turn into PRD tickets).  
It plugs straight into the folders you already have:

```
/app
 └─ /api
     └─ /sprite
         ├─ generate-concept/route.js      <-- NEW  (512-px thumbnail; 1¢)
         ├─ generate-sheet/route.js        <-- NEW  (1024-px full sheet; 4¢)
         └─ cache                          <-- helper for SHA-1 + Supabase lookup
/libs
 ├─ /openai.js            <-- wrap images.generate()
 ├─ /sharp.js             <-- slice & down-scale
 └─ /queue.js             <-- tiny BullMQ wrapper
/components
 └─ SpriteWizard.jsx      <-- UI: Prompt ➜ Concept ➜ Approve ➜ Sheet
/database
 └─ migrations/2025-05-01_generations.sql  <-- table + daily quota view
```

---

## 1  DB: `generations` table + daily quota

```sql
create table generations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id),
  hash text,          -- sha1(prompt|seed)
  kind text,          -- 'concept' | 'sheet'
  url text,
  created_at timestamptz default now()
);

-- quick view for daily limit
create view v_user_daily_credits as
select user_id, count(*) as used
from generations
where created_at >= date_trunc('day', now())
group by user_id;
```

> **Cursor action:** create `migrations/2025-05-01_generations.sql` and run `supabase db push`.

---

## 2  Shared helpers

```js
// libs/openai.js
import OpenAI from "openai";
export const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export const genImage = ({ prompt, seed }) =>
  openai.images.generate({
    model: "dall-e-3",
    prompt,
    size: "1024x1024",
    n: 1,
    seed,
    response_format: "b64_json",
  });
```

```js
// libs/sharp.js
import sharp from "sharp";
export const sliceSheet = async (buffer) => sharp(buffer).tile({
  size: 256,              // 4×4 grid
  layout: "grid",
}).toBuffer("png");       // returns zip of 16 PNGs
export const resize = (buffer, s) => sharp(buffer).resize(s, s).toBuffer();
```

```js
// libs/cache.js (Supabase Storage)
export const getCached = async (hash) => ...
export const putCached = async (hash, blob) => ...
```

> **Cursor action:** `npm i sharp openai crypto bullmq ioredis`.

---

## 3  API route — concept thumbnail

```js
// app/api/sprite/generate-concept/route.js
import { openai, genImage } from "@/libs/openai";
import { getCached, putCached } from "@/libs/cache";
import { createClient } from "@/libs/supabase/server";
import crypto from "crypto";

export async function POST(req) {
  const { prompt } = await req.json();
  const supabase = createClient();
  const { data: { user }} = await supabase.auth.getUser();
  if (!user) return resp(401, "Not logged in");

  // daily quota check
  const { data: quota } = await supabase
    .from("v_user_daily_credits")
    .select("used")
    .eq("user_id", user.id)
    .single();
  if ((quota?.used || 0) >= 20) return resp(402, "Daily free quota exceeded");

  const seed = Math.floor(Math.random()*1e9);
  const hash = crypto.createHash("sha1").update(`${prompt}|${seed}`).digest("hex");

  let url = await getCached(hash);
  if (!url) {
    const { data } = await genImage({ prompt, seed });
    const buffer1024 = Buffer.from(data[0].b64_json, "base64");
    const bufferThumb = await resize(buffer1024, 512);
    url = await putCached(hash, bufferThumb);
  }

  // log generation
  await supabase.from("generations").insert({
    user_id: user.id,
    hash, kind: "concept", url
  });

  return Response.json({ url, seed });   // seed is sent back for the final call
}
```

---

## 4  API route — final sheet

```js
// app/api/sprite/generate-sheet/route.js
import { genImage } from "@/libs/openai";
import { sliceSheet, resize } from "@/libs/sharp";
import { getCached, putCached } from "@/libs/cache";
...
// similar flow: reuse hash; if cached, skip OpenAI; else call, slice to 256 grid,
// optionally concat back to 1024 sheet, store 1024 / 512 / 256 variants.
```

---

## 5  Front-end wizard (`components/SpriteWizard.jsx`)

1. **Prompt form** → POST `/sprite/generate-concept` → show 512-px thumbnail.  
2. **Approve** button → POST `/sprite/generate-sheet` with `{prompt, seed}`.  
3. Show progress bar (stream logs from queue).  
4. On success display `<img srcset="...">` + “Download All”.

Cursor will handle React updates & file splits automatically.

---

## 6  Queue & rate-limit (optional)

Wrap OpenAI calls inside `libs/queue.js`:

```js
import { Queue } from 'bullmq';
export const jobs = new Queue('openai', { connection: { host:'127.0.0.1' }});
```

In each route:

```js
await jobs.add('generate', { prompt, seed });
return Response.json({ jobId });
```

Worker:

```js
jobs.process(async ({ data }) => {
  const { prompt, seed } = data;
  const result = await genImage({ prompt, seed });
  ...
});
```

---

### Credit safety net

Add a `budget_used` column in DB; webhook from OpenAI (or a nightly cron) tallies total generations and pings you if the month-to-date spend exceeds X USD.

---

**Drop these files in Cursor, hit ⌘S, and the AI-autofix should install Sharp & OpenAI, add imports, and wire Supabase env vars.**  
Spin up `stripe listen` + `npm run dev`; you’ll see concept-before-sheet flow working while keeping OpenAI credits to a minimum.