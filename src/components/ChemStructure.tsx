"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import SmilesDrawer from "smiles-drawer";

type ChemStructureProps = {
  name: string;
  className?: string;
};

type FetchState = {
  smiles: string | null;
  error: string | null;
};

const normalizeName = (value: string) => value.trim();

export default function ChemStructure({ name, className }: ChemStructureProps) {
  const [state, setState] = useState<FetchState>({ smiles: null, error: null });
  const svgRef = useRef<SVGSVGElement | null>(null);
  const safeName = useMemo(() => normalizeName(name), [name]);

  useEffect(() => {
    let active = true;
    if (!safeName) {
      setState({ smiles: null, error: "Missing name" });
      return;
    }
    setState({ smiles: null, error: null });
    const url = `https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/name/${encodeURIComponent(
      safeName
    )}/property/IsomericSMILES/JSON`;
    fetch(url)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!active) return;
        const smiles =
          data?.PropertyTable?.Properties?.[0]?.IsomericSMILES ??
          data?.PropertyTable?.Properties?.[0]?.CanonicalSMILES ??
          null;
        if (!smiles) {
          setState({ smiles: null, error: "No structure found" });
          return;
        }
        setState({ smiles, error: null });
      })
      .catch(() => {
        if (active) setState({ smiles: null, error: "Lookup failed" });
      });
    return () => {
      active = false;
    };
  }, [safeName]);

  useEffect(() => {
    if (!state.smiles || !svgRef.current) return;
    const drawer = new SmilesDrawer.SvgDrawer({
      width: 260,
      height: 180,
      padding: 12,
      compactDrawing: true,
    });
    SmilesDrawer.parse(state.smiles, (tree) => {
      if (!svgRef.current) return;
      while (svgRef.current.firstChild) {
        svgRef.current.removeChild(svgRef.current.firstChild);
      }
      drawer.draw(tree, svgRef.current, "light", false);
    });
  }, [state.smiles]);

  return (
    <div className={className}>
      <div className="text-[11px] uppercase tracking-[0.2em] text-white/50">Structure</div>
      <div className="mt-2 rounded-md border border-white/10 bg-white/5 px-3 py-3">
        <div className="text-xs font-semibold text-white">{safeName || "Unknown"}</div>
        {state.error ? (
          <div className="mt-2 text-xs text-white/50">{state.error}</div>
        ) : state.smiles ? (
          <svg ref={svgRef} className="mt-2 h-40 w-full" />
        ) : (
          <div className="mt-2 text-xs text-white/50">Loading…</div>
        )}
      </div>
    </div>
  );
}
