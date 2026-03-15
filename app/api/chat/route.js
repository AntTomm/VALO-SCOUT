import { NextResponse } from "next/server";
import { buildScoutReport, getFilters } from "@/app/lib/scout";

export async function POST(req) {
  try {
    const body = await req.json();
    const report = buildScoutReport(body ?? {});

    return NextResponse.json({
      ok: true,
      ...report,
      availableFilters: getFilters(),
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: "Unable to build scout report.",
        detail: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
