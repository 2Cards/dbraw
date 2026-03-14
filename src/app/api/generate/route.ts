import { NextResponse } from 'next/server';
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';
import { z } from 'zod';

// Simple in-memory rate limiting for prototype
let lastRequestTime = 0;
const MIN_INTERVAL_MS = 1000; // 1 request per second

// Ratelimiter is created lazily; returns null if Upstash env vars are not configured
let ratelimit: Ratelimit | null = null;
function getRatelimit(): Ratelimit | null {
  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
    return null;
  }
  if (!ratelimit) {
    ratelimit = new Ratelimit({
      redis: Redis.fromEnv(),
      limiter: Ratelimit.slidingWindow(10, "10 s"),
      analytics: true,
      prefix: "@upstash/ratelimit",
    });
  }
  return ratelimit;
}

const GenerateRequestSchema = z.object({
  prompt: z.string().min(1, 'Prompt cannot be empty').max(2000, 'Prompt must be 2000 characters or fewer'),
  currentDbml: z.string().max(50000, 'Schema is too large').optional().default(''),
});

export async function POST(req: Request) {
  try {
    const now = Date.now();
    const timeSinceLastRequest = now - lastRequestTime;

    if (timeSinceLastRequest < MIN_INTERVAL_MS) {
      return NextResponse.json({
        error: 'Too many requests. Please wait a second between generations.'
      }, { status: 429 });
    }

    lastRequestTime = now;

    // Get IP address for rate limiting
    const ip = req.headers.get('x-forwarded-for') ?? '127.0.0.1';

    const rl = getRatelimit();
    if (!rl) {
      return NextResponse.json({
        error: 'Rate limiter not configured. Set UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN.'
      }, { status: 503 });
    }
    const { success } = await rl.limit(ip);
    if (!success) {
      return NextResponse.json({
        error: 'Rate limit exceeded. Please try again later.'
      }, { status: 429 });
    }

    const bodyResult = GenerateRequestSchema.safeParse(await req.json());
    if (!bodyResult.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: bodyResult.error.flatten() },
        { status: 400 }
      );
    }

    const { prompt, currentDbml } = bodyResult.data;
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return NextResponse.json({ error: 'API key not configured' }, { status: 500 });
    }

    const systemPrompt = `
      You are a database architect. Your task is to generate or update a DBML (Database Markup Language) schema based on user request.

      CRITICAL RULES:
      1. Return ONLY the valid DBML code.
      2. Do NOT include explanations, markdown code blocks, or any other text.
      3. If 'currentDbml' is provided, UPDATE it by adding new tables/fields or modifying existing ones as requested. Do NOT delete unrelated parts of the existing schema.
      4. Use PostgreSQL naming conventions.

      Current Schema Context:
      ${currentDbml || 'Empty'}
    `;

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
      body: JSON.stringify({
        contents: [{
          parts: [{ text: `${systemPrompt}\n\nUser Request: ${prompt}` }]
        }],
        generationConfig: {
          temperature: 0.1,
          response_mime_type: "text/plain",
        }
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      return NextResponse.json({
        error: `Gemini API Error: ${response.statusText}`,
        details: errorData
      }, { status: response.status });
    }

    const data = await response.json();
    const dbml = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();

    if (!dbml) {
      throw new Error('Failed to generate schema: Empty response from AI');
    }

    return NextResponse.json({ dbml });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'An unexpected error occurred';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
