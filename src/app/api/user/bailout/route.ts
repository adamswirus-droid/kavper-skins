import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// Darmowe "odrodzenie +500 zł" zostało usunięte — jedyną drogą powrotu po
// bankructwie jest darmowa Skrzynka Ratunkowa (co 3 minuty, gdy saldo < 5 zł).
export async function POST() {
  return NextResponse.json(
    { error: "Odrodzenie wyłączone. Użyj darmowej Skrzynki Ratunkowej." },
    { status: 410 }
  );
}
