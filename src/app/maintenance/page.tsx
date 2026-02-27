export default function MaintenancePage() {
  return (
    <div className="min-h-screen bg-[#0d0f14] text-white">
      <main className="mx-auto flex min-h-screen max-w-2xl flex-col items-center justify-center px-6 text-center">
        <div className="space-y-4">
          <p className="text-xs uppercase tracking-[0.4em] text-white/60">Maintenance</p>
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
            We are upgrading the experience
          </h1>
          <p className="text-sm text-white/70 sm:text-base">
            The platform is temporarily unavailable while we deploy improvements. Please check back soon.
          </p>
        </div>
      </main>
    </div>
  );
}
