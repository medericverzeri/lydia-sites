import type { Metadata } from "next";
import { AdminApp } from "@/components/AdminApp";
import { isAdmin } from "@/lib/auth";
import { getAdminSnapshot } from "@/lib/data";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const metadata: Metadata = {
  title: "Administration sécurisée — Matériosol",
  robots: { index: false, follow: false, nocache: true },
};

export default async function AdminPage() {
  const authenticated = await isAdmin();
  const snapshot = authenticated ? await getAdminSnapshot() : null;
  return <AdminApp authenticated={authenticated} snapshot={snapshot} />;
}
