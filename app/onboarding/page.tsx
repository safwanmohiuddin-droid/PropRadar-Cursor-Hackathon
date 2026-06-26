"use client";

import Walkthrough from "@/components/onboarding/Walkthrough";

export default function OnboardingPage() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center text-center text-sm text-zinc-500">
      Loading walkthrough…
      <Walkthrough force />
    </div>
  );
}
