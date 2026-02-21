"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "@/lib/auth-client";
import { safeJson } from "@/lib/safe-json";

const SUBJECT_LINKS = [
  { label: "Physics", href: "/library?subject=Physics" },
  { label: "Chemistry", href: "/library?subject=Chemistry" },
  { label: "Mathematics", href: "/library?subject=Mathematics" },
];

const NAV_ITEMS = [
  { label: "Dashboard", href: "/dashboard" },
  { label: "Library", href: "/library" },
  { label: "Creator Studio", href: "/studio" },
  { label: "Test Analysis", href: "/test-analysis" },
];

type SearchResult = {
  label: string;
  href: string;
  type: "test" | "subject" | "page";
};

type TestItem = { id: string; title: string };

