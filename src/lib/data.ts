import { randomUUID } from "node:crypto";
import { db } from "@/db";
import { contactMessages, mediaAssets, siteContent } from "@/db/schema";
import { cloneContent, contentVersion, initialContent, type SiteContent } from "@/lib/content";
import { desc, eq, sql } from "drizzle-orm";

export type MediaRecord = {
  id: string;
  name: string;
  mime: string;
  kind: string;
  size: number;
  createdAt: string;
  url: string;
};

export type MessageRecord = {
  id: number;
  name: string;
  email: string;
  phone: string;
  organization: string;
  topic: string;
  message: string;
  isRead: boolean;
  createdAt: string;
};

export type AdminSnapshot = {
  draft: SiteContent;
  published: SiteContent;
  publishedAt: string | null;
  draftUpdatedAt: string | null;
  media: MediaRecord[];
  messages: MessageRecord[];
};

let ready: Promise<void> | null = null;

async function initialize(): Promise<void> {
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS site_content (
      id integer PRIMARY KEY,
      published jsonb NOT NULL,
      draft jsonb NOT NULL,
      published_at timestamptz NOT NULL DEFAULT now(),
      draft_updated_at timestamptz NOT NULL DEFAULT now()
    )
  `);
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS media_assets (
      id uuid PRIMARY KEY,
      name text NOT NULL,
      mime text NOT NULL,
      kind text NOT NULL,
      size integer NOT NULL,
      data text NOT NULL,
      created_at timestamptz NOT NULL DEFAULT now()
    )
  `);
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS contact_messages (
      id serial PRIMARY KEY,
      name text NOT NULL,
      email text NOT NULL,
      phone text NOT NULL DEFAULT '',
      organization text NOT NULL DEFAULT '',
      topic text NOT NULL DEFAULT '',
      message text NOT NULL,
      is_read boolean NOT NULL DEFAULT false,
      created_at timestamptz NOT NULL DEFAULT now()
    )
  `);

  const fresh = cloneContent(initialContent);
  await db
    .insert(siteContent)
    .values({ id: 1, published: fresh, draft: cloneContent(initialContent) })
    .onConflictDoNothing();
}

export async function ensureDatabase(): Promise<void> {
  if (!ready) ready = initialize().catch((error) => {
    ready = null;
    throw error;
  });
  await ready;
}

export async function getPublishedContent(): Promise<SiteContent> {
  await ensureDatabase();
  const rows = await db.select({ published: siteContent.published }).from(siteContent).where(eq(siteContent.id, 1)).limit(1);
  return rows[0]?.published ?? cloneContent(initialContent);
}

export async function getPublishedVersion(): Promise<string> {
  await ensureDatabase();
  const rows = await db
    .select({ published: siteContent.published, publishedAt: siteContent.publishedAt })
    .from(siteContent)
    .where(eq(siteContent.id, 1))
    .limit(1);
  const row = rows[0];
  if (!row) return contentVersion(initialContent);
  return contentVersion(row.published) === "initial"
    ? (row.publishedAt?.toISOString() ?? "initial")
    : contentVersion(row.published);
}

export async function getAdminSnapshot(): Promise<AdminSnapshot> {
  await ensureDatabase();
  const [rows, mediaRows, messageRows] = await Promise.all([
    db.select().from(siteContent).where(eq(siteContent.id, 1)).limit(1),
    db.select({
      id: mediaAssets.id,
      name: mediaAssets.name,
      mime: mediaAssets.mime,
      kind: mediaAssets.kind,
      size: mediaAssets.size,
      createdAt: mediaAssets.createdAt,
    }).from(mediaAssets).orderBy(desc(mediaAssets.createdAt)),
    db.select().from(contactMessages).orderBy(desc(contactMessages.createdAt)).limit(100),
  ]);
  const row = rows[0];
  return {
    draft: row?.draft ?? cloneContent(initialContent),
    published: row?.published ?? cloneContent(initialContent),
    publishedAt: row?.publishedAt?.toISOString() ?? null,
    draftUpdatedAt: row?.draftUpdatedAt?.toISOString() ?? null,
    media: mediaRows.map((item) => ({
      id: item.id,
      name: item.name,
      mime: item.mime,
      kind: item.kind,
      size: item.size,
      createdAt: item.createdAt.toISOString(),
      url: `/api/media/${item.id}`,
    })),
    messages: messageRows.map((item) => ({
      id: item.id,
      name: item.name,
      email: item.email,
      phone: item.phone,
      organization: item.organization,
      topic: item.topic,
      message: item.message,
      isRead: item.isRead,
      createdAt: item.createdAt.toISOString(),
    })),
  };
}

export function validateContent(value: unknown): SiteContent {
  if (!value || typeof value !== "object") throw new Error("Contenu invalide.");
  const candidate = value as Partial<SiteContent>;
  if (!candidate.site || !candidate.home || !candidate.about || !candidate.gallery || !candidate.contact) {
    throw new Error("Le contenu est incomplet.");
  }
  if (!Array.isArray(candidate.site.navigation) || !Array.isArray(candidate.albums) || !Array.isArray(candidate.companies)) {
    throw new Error("La structure du contenu est invalide.");
  }
  if (JSON.stringify(value).length > 2_000_000) throw new Error("Le contenu dépasse la taille autorisée.");
  const normalized = cloneContent(value) as SiteContent;
  normalized.hiddenPages = Array.isArray(normalized.hiddenPages) ? normalized.hiddenPages : [];
  normalized.site.navigation = normalized.site.navigation.map((item) => ({
    ...item,
    visible: item.visible !== false,
    hidden: Boolean(item.hidden),
    slug: item.slug || item.id,
  }));
  return normalized;
}

export async function saveContent(content: SiteContent, publish: boolean): Promise<void> {
  await ensureDatabase();
  const now = new Date();
  if (publish) {
    await db.insert(siteContent).values({
      id: 1,
      published: content,
      draft: content,
      publishedAt: now,
      draftUpdatedAt: now,
    }).onConflictDoUpdate({
      target: siteContent.id,
      set: { published: content, draft: content, publishedAt: now, draftUpdatedAt: now },
    });
  } else {
    await db.insert(siteContent).values({
      id: 1,
      published: content,
      draft: content,
      draftUpdatedAt: now,
    }).onConflictDoUpdate({
      target: siteContent.id,
      set: { draft: content, draftUpdatedAt: now },
    });
  }
}

export async function createMedia(input: {
  name: string;
  mime: string;
  kind: "image" | "pdf";
  size: number;
  buffer: Buffer;
}): Promise<MediaRecord> {
  await ensureDatabase();
  const id = randomUUID();
  await db.insert(mediaAssets).values({
    id,
    name: input.name,
    mime: input.mime,
    kind: input.kind,
    size: input.size,
    data: input.buffer.toString("base64"),
  });
  return {
    id,
    name: input.name,
    mime: input.mime,
    kind: input.kind,
    size: input.size,
    createdAt: new Date().toISOString(),
    url: `/api/media/${id}`,
  };
}

export async function getMedia(id: string) {
  await ensureDatabase();
  const rows = await db.select().from(mediaAssets).where(eq(mediaAssets.id, id)).limit(1);
  return rows[0] ?? null;
}

export async function deleteMedia(id: string): Promise<void> {
  await ensureDatabase();
  await db.delete(mediaAssets).where(eq(mediaAssets.id, id));
}

export async function createMessage(input: {
  name: string;
  email: string;
  phone: string;
  organization: string;
  topic: string;
  message: string;
}): Promise<void> {
  await ensureDatabase();
  await db.insert(contactMessages).values(input);
}

export async function setMessageRead(id: number, isRead: boolean): Promise<void> {
  await ensureDatabase();
  await db.update(contactMessages).set({ isRead }).where(eq(contactMessages.id, id));
}

export async function deleteMessage(id: number): Promise<void> {
  await ensureDatabase();
  await db.delete(contactMessages).where(eq(contactMessages.id, id));
}
