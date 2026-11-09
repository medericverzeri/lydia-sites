import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth";
import { db } from "@/db";
import { sql } from "drizzle-orm";
import { getPublishedVersion } from "@/lib/data";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  if (!(await isAdmin())) return NextResponse.json({ error: "Non autorisé." }, { status: 401 });

  let database: "ok" | "error" = "error";
  let version = "initial";
  try {
    await db.execute(sql`select 1`);
    database = "ok";
    version = await getPublishedVersion();
  } catch {
    database = "error";
  }

  return NextResponse.json({
    database,
    publishedVersion: version,
    liveSync: true,
    hosting: process.env.VERCEL ? "Vercel" : "Local / autre hébergement",
    environment: {
      DATABASE_URL: Boolean(process.env.DATABASE_URL),
      ADMIN_PASSWORD: Boolean(process.env.ADMIN_PASSWORD),
      ADMIN_SESSION_SECRET: Boolean(process.env.ADMIN_SESSION_SECRET),
    },
    storage: "PostgreSQL (contenu, photos, PDF et messages)",
    checks: [
      { label: "Base de données connectée", ok: database === "ok" },
      { label: "DATABASE_URL configurée", ok: Boolean(process.env.DATABASE_URL) },
      { label: "Mot de passe admin configuré", ok: Boolean(process.env.ADMIN_PASSWORD) },
      { label: "Clé de session configurée", ok: Boolean(process.env.ADMIN_SESSION_SECRET) },
      { label: "Enregistrement en direct actif", ok: true },
    ],
  }, { headers: { "Cache-Control": "no-store" } });
}
