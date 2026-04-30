import { Suspense } from "react";
import JoinClient from "./JoinClient";

export default function JoinPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-[60vh] flex items-center justify-center p-6">
          <div className="text-center opacity-70">טוען…</div>
        </main>
      }
    >
      <JoinClient />
    </Suspense>
  );
}
