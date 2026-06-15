import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { z } from "zod";

import { prisma } from "@/lib/prisma";

const schema = z.object({
  name: z.string().trim().max(120).optional(),
  email: z.string().email(),
  password: z.string().min(8).max(200),
});

// Optional: lock registration down to a single user or an allowlist.
// Set ALLOW_REGISTRATION="false" to disable, or REGISTRATION_ALLOWLIST to a
// comma-separated list of permitted emails.
function registrationAllowed(email: string): boolean {
  if (process.env.ALLOW_REGISTRATION === "false") return false;
  const allowlist = process.env.REGISTRATION_ALLOWLIST;
  if (allowlist) {
    const allowed = allowlist
      .split(",")
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean);
    return allowed.includes(email.toLowerCase());
  }
  return true;
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input. Password must be at least 8 characters." },
      { status: 400 },
    );
  }

  const email = parsed.data.email.toLowerCase().trim();

  if (!registrationAllowed(email)) {
    return NextResponse.json(
      { error: "Registration is closed." },
      { status: 403 },
    );
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json(
      { error: "An account with this email already exists." },
      { status: 409 },
    );
  }

  const passwordHash = await bcrypt.hash(parsed.data.password, 12);

  await prisma.user.create({
    data: {
      email,
      name: parsed.data.name,
      passwordHash,
      preference: {
        create: {
          targetRoles: [],
          keywords: [],
          fields: [],
        },
      },
    },
  });

  return NextResponse.json({ ok: true });
}
