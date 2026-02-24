// src/features/search/components/SearchBar.tsx
"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";

interface SearchBarProps {
  defaultValue?: string;
  placeholder?: string;
}

export function SearchBar({
  defaultValue = "",
  placeholder = "Search skills...",
}: Readonly<SearchBarProps>) {
  const router = useRouter();
  const [query, setQuery] = useState(defaultValue);
  const timerRef = useRef<ReturnType<typeof setTimeout>>(null);

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      if (query.trim()) {
        router.push(`/skills?q=${encodeURIComponent(query.trim())}`);
      }
    }, 300);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [query, router]);

  return (
    <Input
      value={query}
      onChange={(e) => setQuery(e.target.value)}
      placeholder={placeholder}
      className="max-w-sm"
    />
  );
}
