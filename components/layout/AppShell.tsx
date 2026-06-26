"use client";

import { useEffect, useState } from "react";
import { Toaster } from "sonner";
import { useStore } from "@/lib/store";
import type { ServerData } from "@/lib/types";
import Sidebar from "./Sidebar";
import TopBar from "./TopBar";
import Walkthrough from "@/components/onboarding/Walkthrough";

export default function AppShell({
  serverData,
  children,
}: {
  serverData: ServerData;
  children: React.ReactNode;
}) {
  const hydrateServer = useStore((s) => s.hydrateServer);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // Manual rehydrate (persist is configured with skipHydration) then inject server data.
    useStore.persist.rehydrate();
    hydrateServer(serverData);
    setReady(true);
  }, [hydrateServer, serverData]);

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <div className="md:pl-60">
        <TopBar />
        <main className="mx-auto max-w-7xl px-4 pb-24 pt-6 md:px-8">
          {ready ? children : <BootSkeleton />}
        </main>
      </div>
      <Walkthrough />
      <Toaster
        theme="dark"
        position="bottom-right"
        toastOptions={{
          style: {
            background: "#18181b",
            border: "1px solid #27272a",
            color: "#fafafa",
          },
        }}
      />
    </div>
  );
}

function BootSkeleton() {
  return (
    <div className="space-y-4">
      <div className="skeleton h-8 w-64" />
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="skeleton h-24" />
        ))}
      </div>
      <div className="skeleton h-64" />
    </div>
  );
}
