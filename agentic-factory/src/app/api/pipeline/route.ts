import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import {
  ContentFactoryRequest,
  runContentFactory,
} from "@/lib/pipeline";

const requestSchema = z.object({
  prompt: z.string().min(5),
  aspectRatio: z.enum(["9:16", "16:9", "1:1"]).default("9:16"),
  durationSeconds: z.coerce.number().min(3).max(120).default(15),
  negativePrompt: z.string().optional(),
  stylePreset: z.string().optional(),
  audioPrompt: z.string().optional(),
  title: z.string().min(3),
  description: z.string().min(10),
  tags: z.array(z.string().min(1)).optional(),
  publishAt: z.string().optional(),
  visibility: z.enum(["public", "private", "unlisted"]).optional(),
  uploadToYoutube: z.boolean().optional(),
  keepLocalFile: z.boolean().optional(),
});

export async function POST(request: NextRequest) {
  let payload: unknown;

  try {
    payload = await request.json();
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: "Invalid JSON payload.",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 400 },
    );
  }

  const parsed = requestSchema.safeParse(payload);

  if (!parsed.success) {
    return NextResponse.json(
      {
        ok: false,
        error: "Validation failed.",
        details: parsed.error.flatten(),
      },
      { status: 422 },
    );
  }

  const input = parsed.data as ContentFactoryRequest;

  try {
    const result = await runContentFactory(input);

    return NextResponse.json(
      {
        ok: true,
        result,
      },
      { status: 200 },
    );
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}
