import { createClient } from '@supabase/supabase-js';
import sharp from 'sharp';
import crypto from 'crypto';
import { getMotionConfig, getMotionPrompt } from '@/config/motions';
import { spriteQueue } from '@/libs/queue';

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Process a single motion
async function processMotion(prompt, style, motion, seed) {
  const config = getMotionConfig(motion);
  if (!config) throw new Error(`Invalid motion: ${motion}`);

  // Generate cache key
  const cacheKey = crypto
    .createHash('sha1')
    .update(`${prompt}|${style}|${motion}|${seed}`)
    .digest('hex');

  // Check cache
  const { data: cached } = await supabase
    .storage
    .from('sprites')
    .list(`${cacheKey}`);

  if (cached?.length > 0) {
    return {
      motion,
      url1024: `/sprites/${cacheKey}/${motion}_1024.png`,
      url512: `/sprites/${cacheKey}/${motion}_512.png`,
      url256: `/sprites/${cacheKey}/${motion}_256.png`
    };
  }

  // Generate image with OpenAI
  const response = await fetch('https://api.openai.com/v1/images/generations', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      prompt: `${prompt}, ${getMotionPrompt(motion)}, 4×4 grid of 256-pixel transparent tiles, centered character, pixel-art, no painterly texture, crisp pixels`,
      n: 1,
      size: '1024x1024',
      quality: 'medium',
      response_format: 'png',
      seed: seed
    })
  });

  if (!response.ok) throw new Error('OpenAI API error');

  const { data: [imageData] } = await response.json();
  const imageBuffer = Buffer.from(imageData.b64_json, 'base64');

  // Process image with Sharp
  const frames = [];
  for (let i = 0; i < config.frames; i++) {
    const frame = await sharp(imageBuffer)
      .extract({
        left: (i % 4) * 256,
        top: Math.floor(i / 4) * 256,
        width: 256,
        height: 256
      })
      .toBuffer();
    frames.push(frame);
  }

  // Upload processed frames
  const uploadPromises = frames.map(async (frame, i) => {
    const sizes = [1024, 512, 256];
    return Promise.all(sizes.map(async (size) => {
      const resized = await sharp(frame)
        .resize(size, size)
        .toBuffer();
      
      await supabase.storage
        .from('sprites')
        .upload(`${cacheKey}/${motion}_${size}.png`, resized, {
          contentType: 'image/png'
        });
    }));
  });

  await Promise.all(uploadPromises);

  return {
    motion,
    url1024: `/sprites/${cacheKey}/${motion}_1024.png`,
    url512: `/sprites/${cacheKey}/${motion}_512.png`,
    url256: `/sprites/${cacheKey}/${motion}_256.png`
  };
}

export async function POST(req) {
  try {
    const { prompt, style, motions, seed } = await req.json();

    // Check auth
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return new Response('Unauthorized', { status: 401 });
    }

    // Check quota
    const { data: generations } = await supabase
      .from('generations')
      .select('id')
      .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
      .eq('user_id', user.id);

    if (generations?.length >= 20) {
      return new Response('Daily quota exceeded', { status: 402 });
    }

    // Check user's queue length
    const userJobs = await spriteQueue.getJobs(['active', 'waiting'], 0, -1, true);
    const userQueueLength = userJobs.filter(job => job.data.userId === user.id).length;

    if (userQueueLength >= 3) {
      return new Response('Queue limit exceeded', { status: 429 });
    }

    // Add to queue
    const job = await spriteQueue.add('generate', {
      prompt,
      style,
      motions,
      seed,
      userId: user.id
    });

    // Process motions
    const results = await Promise.all(
      motions.map(motion => processMotion(prompt, style, motion, seed))
    );

    // Build atlas
    const atlasFrames = await Promise.all(
      results.map(async ({ url1024 }) => {
        const { data } = await supabase.storage
          .from('sprites')
          .download(url1024.replace('/sprites/', ''));
        return sharp(data);
      })
    );

    const atlas = await sharp({
      create: {
        width: 1024,
        height: 1024 * atlasFrames.length,
        channels: 4,
        background: { r: 0, g: 0, b: 0, alpha: 0 }
      }
    })
    .composite(atlasFrames.map((frame, i) => ({
      input: await frame.toBuffer(),
      top: i * 1024,
      left: 0
    })))
    .toBuffer();

    // Upload atlas
    const atlasKey = crypto
      .createHash('sha1')
      .update(`${prompt}|${style}|${motions.join(',')}|${seed}`)
      .digest('hex');

    await supabase.storage
      .from('sprites')
      .upload(`${atlasKey}/atlas.png`, atlas, {
        contentType: 'image/png'
      });

    // Build metadata
    const meta = {
      frames: {},
      atlas: `/sprites/${atlasKey}/atlas.png`
    };

    results.forEach(({ motion, url1024, url512, url256 }, i) => {
      const config = getMotionConfig(motion);
      meta.frames[motion] = {
        row: i,
        frames: config.frames,
        fps: config.fps,
        urls: {
          '1024': url1024,
          '512': url512,
          '256': url256
        }
      };
    });

    // Save generation record
    await supabase.from('generations').insert({
      user_id: user.id,
      prompt,
      seed,
      style,
      motions,
      atlas_url: meta.atlas,
      meta_url: `/sprites/${atlasKey}/meta.json`
    });

    // Save metadata
    await supabase.storage
      .from('sprites')
      .upload(`${atlasKey}/meta.json`, JSON.stringify(meta), {
        contentType: 'application/json'
      });

    return new Response(JSON.stringify({
      atlasUrl: meta.atlas,
      metaUrl: `/sprites/${atlasKey}/meta.json`
    }), {
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Sprite generation error:', error);
    return new Response('Internal Server Error', { status: 500 });
  }
} 