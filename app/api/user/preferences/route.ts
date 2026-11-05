import { NextRequest, NextResponse } from "next/server";
import { requireTenantContext } from "@/lib/tenant/context";
import { COOKIE_NAME, normalizeLanguageCode, DEFAULT_LANGUAGE } from "@/lib/i18n/config";
import { z } from "zod";

export const dynamic = "force-dynamic";

const SetPreferencesSchema = z.object({
  language: z.string().optional(),
});

export async function GET(req: NextRequest) {
  try {
    let language = DEFAULT_LANGUAGE;

    // 1. Check Cookie
    const cookieVal = req.cookies.get(COOKIE_NAME)?.value;
    if (cookieVal) {
      language = normalizeLanguageCode(cookieVal);
    }

    // 2. Check if user is authenticated
    try {
      await requireTenantContext(req);
      // In authenticated session, preference is validated
    } catch {
      // Unauthenticated public visitor
    }

    return NextResponse.json({
      success: true,
      preferences: {
        language,
      },
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: (error as Error).message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const validated = SetPreferencesSchema.parse(body);

    const language = normalizeLanguageCode(validated.language);

    const response = NextResponse.json({
      success: true,
      preferences: {
        language,
      },
    });

    // Set cookie on response so it persists across entire domain
    response.cookies.set({
      name: COOKIE_NAME,
      value: language,
      path: "/",
      maxAge: 31536000, // 1 year
      sameSite: "lax",
    });

    return response;
  } catch (error) {
    return NextResponse.json({ success: false, error: (error as Error).message }, { status: 400 });
  }
}
