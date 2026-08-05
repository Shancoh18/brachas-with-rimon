/**
 * Serverless proxy for Claude vision (Vercel-style edge/node function).
 * THE ANTHROPIC_API_KEY LIVES ONLY HERE — never in client code (CLAUDE.md).
 *
 * Claude's ONLY job is identification + mapping to FOOD_DATABASE_KEYS.
 * It never decides a bracha; all halachic logic runs locally in the client
 * from src/data + src/lib.
 */
import { FOOD_DATABASE_KEYS } from '../src/data/foods';

export const config = { runtime: 'edge' };

const SYSTEM_PROMPT = `You are the food-identification engine for a Jewish blessings (bracha) app.
You will receive a photo of a meal. Identify each distinct edible item.
You MUST map every item to exactly one canonical key from the provided
FOOD_DATABASE_KEYS list. Never invent a food name outside this list; if an
item is not in the list, return it under "unmatched" with your best plain
description. Do not guess the blessing yourself — only identify and map.
Return ONLY the structured tool output. Distinguish preparation state where
visible (raw vs cooked, whole vs cut) since it can change the mapping.

FOOD_DATABASE_KEYS: ${FOOD_DATABASE_KEYS.join(', ')}`;

const TOOL = {
  name: 'report_foods',
  description: 'Report every identified food item mapped to a database key.',
  input_schema: {
    type: 'object',
    properties: {
      items: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            db_key: { type: 'string', enum: FOOD_DATABASE_KEYS },
            display_name: { type: 'string' },
            state: { type: 'string', enum: ['raw', 'cooked', 'baked', 'whole', 'cut', 'liquid', 'unknown'] },
            confidence: { type: 'number' },
            count_estimate: { type: 'integer' },
          },
          required: ['db_key', 'display_name', 'confidence'],
        },
      },
      unmatched: { type: 'array', items: { type: 'string' } },
    },
    required: ['items'],
  },
} as const;

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 });

  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return new Response(JSON.stringify({ error: 'no_api_key' }), { status: 503 });

  const { image, media_type } = (await req.json()) as { image: string; media_type: string };
  if (!image) return new Response(JSON.stringify({ error: 'no_image' }), { status: 400 });

  const anthropicRes = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': key,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-5',
      max_tokens: 2048,
      system: SYSTEM_PROMPT,
      tools: [TOOL],
      tool_choice: { type: 'tool', name: 'report_foods' },
      messages: [
        {
          role: 'user',
          content: [
            { type: 'image', source: { type: 'base64', media_type, data: image } },
            { type: 'text', text: 'Identify every edible item in this meal photo and map each to a database key.' },
          ],
        },
      ],
    }),
  });

  if (!anthropicRes.ok) {
    const detail = await anthropicRes.text();
    return new Response(JSON.stringify({ error: 'anthropic_error', detail }), { status: 502 });
  }

  const data = (await anthropicRes.json()) as {
    content: { type: string; name?: string; input?: unknown }[];
  };
  const toolUse = data.content.find((c) => c.type === 'tool_use' && c.name === 'report_foods');
  if (!toolUse?.input) {
    return new Response(JSON.stringify({ error: 'no_tool_output' }), { status: 502 });
  }

  return new Response(JSON.stringify(toolUse.input), {
    headers: { 'content-type': 'application/json' },
  });
}
