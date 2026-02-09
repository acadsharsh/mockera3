export default function GlobalLoading() {
  return (
    <div className="grid min-h-screen place-items-center bg-[#0f0f10] text-white">
      <div className="flex flex-col items-center gap-4">
        <div className="h-12 w-12 animate-spin rounded-full border-2 border-white/20 border-t-white" />
        <p className="text-sm text-white/60">Loading...</p>
      </div>
    </div>
  );
}
