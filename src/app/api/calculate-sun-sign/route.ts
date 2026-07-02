import { NextRequest, NextResponse } from "next/server";
import { computeSunSignFromDate } from "@/lib/sun-sign";
import { localizeSunSignDisplay } from "@/lib/sun-sign-i18n";

export const maxDuration = 30;

interface SunSignRequest {
  birthDate: string;
  locale?: string;
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as SunSignRequest;
    const { birthDate, locale = "en" } = body;

    if (!birthDate || !/^\d{4}-\d{2}-\d{2}$/.test(birthDate)) {
      return NextResponse.json(
        { success: false, error: "Please enter a valid birth date (YYYY-MM-DD)." },
        { status: 400 }
      );
    }

    const computed = computeSunSignFromDate(birthDate);
    const sun = localizeSunSignDisplay(computed, locale);

    return NextResponse.json({
      success: true,
      data: {
        birthDate,
        sun,
      },
    });
  } catch (e: unknown) {
    const message =
      e && typeof e === "object" && "message" in e && typeof (e as Error).message === "string"
        ? (e as Error).message
        : "Failed to calculate sun sign.";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
