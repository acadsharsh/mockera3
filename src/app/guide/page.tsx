"use client";

export default function GuidePage() {
  return (
    <div className="min-h-screen bg-[#0f0f10] text-white font-neue">
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-6 py-16">
        <header className="space-y-2">
          <p className="text-xs uppercase tracking-[0.4em] text-white/50">Guide</p>
          <h1 className="text-3xl font-semibold">PDF to CBT — Quick Guide</h1>
          <p className="text-sm text-white/60">
            Create tests from PDFs, run CBTs, and review analysis in minutes.
          </p>
        </header>

        <section className="grid gap-4">
          <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
            <p className="text-xs uppercase text-white/60">1) Sign In / Create Account</p>
            <ul className="mt-3 space-y-2 text-sm text-white/80">
              <li>Open Login and sign in with email/password or Google.</li>
              <li>Forgot password? Use the reset flow from the login page.</li>
            </ul>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
            <p className="text-xs uppercase text-white/60">2) Create a Mock Test</p>
            <ul className="mt-3 space-y-2 text-sm text-white/80">
              <li>Go to Studio and upload your PDF.</li>
              <li>Crop each question and options.</li>
              <li>Set the correct option and marking for every question.</li>
              <li>Click Save to finish.</li>
            </ul>
          </div>


          <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
            <p className="text-xs uppercase text-white/60">3) Use PYQ Bank</p>
            <ul className="mt-3 space-y-2 text-sm text-white/80">
              <li>Open PYQ Bank to filter by exam, year, shift, chapter, and difficulty.</li>
              <li>Preview questions and create a custom mock instantly.</li>
              <li>Year-wise papers are available when uploaded by admin.</li>
            </ul>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
            <p className="text-xs uppercase text-white/60">4) Start a CBT</p>
            <ul className="mt-3 space-y-2 text-sm text-white/80">
              <li>Open CBT and choose a test.</li>
              <li>Attempt the test and submit when done.</li>
            </ul>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
            <p className="text-xs uppercase text-white/60">5) View Analysis</p>
            <ul className="mt-3 space-y-2 text-sm text-white/80">
              <li>After submission, you’re redirected to Test Analysis.</li>
              <li>Review score summary, accuracy by subject, and time per question.</li>
            </ul>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
            <p className="text-xs uppercase text-white/60">6) Library & Sharing</p>
            <ul className="mt-3 space-y-2 text-sm text-white/80">
              <li>Library shows tests you created.</li>
              <li>Share a test using the link from Test Created.</li>
            </ul>
          </div>
        </section>

        <footer className="rounded-2xl border border-white/10 bg-white/5 p-4 text-xs text-white/60">
          Disclaimer: We do not own any tests. All tests are created by users.
        </footer>
      </div>
    </div>
  );
}
