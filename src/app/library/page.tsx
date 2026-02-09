import { headers } from "next/headers";
import LibraryClient from "./LibraryClient";

type Crop = {
  id: string;
  subject: "Physics" | "Chemistry" | "Maths";
  correctOption: "A" | "B" | "C" | "D";
  marks: "+4/-1";
  difficulty: "Easy" | "Moderate" | "Tough";
  imageDataUrl: string;
};

type Test = {
  id: string;
  title: string;
  visibility: "Public" | "Private";
  accessCode?: string;
  durationMinutes?: number;
  markingCorrect?: number;
  markingIncorrect?: number;
  crops?: Crop[];
  createdAt?: string;
};

type Attempt = {
  id: string;
  testId: string;
  createdAt: string;
  answers: Record<string, "A" | "B" | "C" | "D" | "">;
  timeSpent: Record<string, number>;
  userId?: string;
  userName?: string;
  userImage?: string | null;
};

const getBaseUrl = async () => {
  const incoming = await headers();
  const host = incoming.get("host");
  const proto = incoming.get("x-forwarded-proto") ?? "http";
  if (host) {
    return `${proto}://${host}`;
  }
  return process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
};

export default async function TestLibraryPage() {
  const baseUrl = await getBaseUrl();
  const incoming = await headers();
  const cookie = incoming.get("cookie") ?? "";

  const [testsResponse, attemptsResponse] = await Promise.all([
    fetch(`${baseUrl}/api/tests`, {
      headers: { cookie },
      next: { revalidate: 30 },
    }),
    fetch(`${baseUrl}/api/attempts`, {
      headers: { cookie },
      next: { revalidate: 30 },
    }),
  ]);

  const initialAuthError = testsResponse.status === 401 || attemptsResponse.status === 401;
  const [initialTests, initialAttempts] = await Promise.all([
    testsResponse.ok ? testsResponse.json() : Promise.resolve([]),
    attemptsResponse.ok ? attemptsResponse.json() : Promise.resolve([]),
  ]);

  return (
    <LibraryClient
      initialTests={Array.isArray(initialTests) ? (initialTests as Test[]) : []}
      initialAttempts={Array.isArray(initialAttempts) ? (initialAttempts as Attempt[]) : []}
      initialAuthError={initialAuthError}
    />
  );
}
