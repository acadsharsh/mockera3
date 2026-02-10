import LottieLoader from "@/components/LottieLoader";

export default function GlobalLoading() {
  return (
    <div className="grid min-h-screen place-items-center bg-[#0f0f10] text-white">
      <LottieLoader message="Preparing your workspace..." />
    </div>
  );
}
