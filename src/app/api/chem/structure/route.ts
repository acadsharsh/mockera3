import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const name = (url.searchParams.get("name") ?? "").trim();
  if (!name) {
    return NextResponse.json({ error: "Missing name" }, { status: 400 });
  }
  const target = `https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/name/${encodeURIComponent(
    name
  )}/property/IsomericSMILES,CanonicalSMILES/JSON`;
  const response = await fetch(target, { cache: "no-store" });
  if (!response.ok) {
    return NextResponse.json({ error: "Lookup failed" }, { status: 404 });
  }
  const data = await response.json();
  const smiles =
    data?.PropertyTable?.Properties?.[0]?.IsomericSMILES ??
    data?.PropertyTable?.Properties?.[0]?.CanonicalSMILES ??
    null;
  if (!smiles) {
    return NextResponse.json({ error: "No structure found" }, { status: 404 });
  }
  return NextResponse.json({ smiles });
}
