"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

// Atualiza a página (dados do servidor) a cada N segundos enquanto a aba está aberta e visível.
export function AutoRefresh({ seconds = 30 }: { seconds?: number }) {
  const router = useRouter();
  useEffect(() => {
    const id = setInterval(() => {
      if (document.visibilityState === "visible") router.refresh();
    }, seconds * 1000);
    return () => clearInterval(id);
  }, [router, seconds]);
  return null;
}
