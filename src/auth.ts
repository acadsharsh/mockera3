import { auth as clerkAuth, clerkClient, currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

export type AppSession = {
  user: {
    id: string;
    role: "USER" | "ADMIN";
    name?: string | null;
    email?: string | null;
    image?: string | null;
  };
};

const getAdminEmails = () =>
  (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);

const getPrimaryEmail = (user: Awaited<ReturnType<typeof currentUser>>) => {
  if (!user) return null;
  const primary = user.emailAddresses.find(
    (entry) => entry.id === user.primaryEmailAddressId
  );
  return (primary?.emailAddress ?? user.emailAddresses[0]?.emailAddress ?? null)?.toLowerCase();
};

const getDisplayName = (user: Awaited<ReturnType<typeof currentUser>>) => {
  if (!user) return null;
  const name = [user.firstName, user.lastName].filter(Boolean).join(" ").trim();
  return name || user.username || null;
};

export async function auth(): Promise<AppSession | null> {
  const { userId } = clerkAuth();
  if (!userId) {
    return null;
  }

  const clerkUser = await currentUser();
  if (!clerkUser) {
    return null;
  }

  const email = getPrimaryEmail(clerkUser);
  const name = getDisplayName(clerkUser);
  const image = clerkUser.imageUrl ?? null;
  const adminEmails = getAdminEmails();
  const isAdmin = Boolean(email && adminEmails.includes(email));

  let dbUser = null;
  if (email) {
    dbUser = await prisma.user.findUnique({ where: { email } });
  }

  if (!dbUser) {
    dbUser = await prisma.user.create({
      data: {
        email: email ?? undefined,
        name: name ?? undefined,
        image: image ?? undefined,
        role: isAdmin ? "ADMIN" : "USER",
      },
    });
  } else {
    const nextRole = isAdmin ? "ADMIN" : dbUser.role;
    const shouldUpdate =
      nextRole !== dbUser.role ||
      (!dbUser.name && name) ||
      (!dbUser.image && image) ||
      (!dbUser.email && email);
    if (shouldUpdate) {
      dbUser = await prisma.user.update({
        where: { id: dbUser.id },
        data: {
          role: nextRole,
          name: dbUser.name ?? (name ?? undefined),
          image: dbUser.image ?? (image ?? undefined),
          email: dbUser.email ?? (email ?? undefined),
        },
      });
    }
  }

  return {
    user: {
      id: dbUser.id,
      role: dbUser.role,
      name: dbUser.name,
      email: dbUser.email,
      image: dbUser.image,
    },
  };
}

export async function getClerkSessions(userId: string, limit = 5) {
  const client =
    typeof clerkClient === "function"
      ? await (clerkClient as unknown as () => Promise<typeof clerkClient>)()
      : clerkClient;
  const response = await client.sessions.getSessionList({
    userId,
    limit,
  });
  return response.data ?? [];
}
