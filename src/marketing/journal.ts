import fs from "fs";
import path from "path";
import matter from "gray-matter";

/**
 * Published posts live in src/content/journal as MDX with frontmatter.
 * Drafts live in src/content/drafts and are never read by a route.
 * A file inside journal with `status: draft` is also withheld.
 */

const JOURNAL_DIR = path.join(process.cwd(), "src/content/journal");

export type PostMeta = {
  slug: string;
  title: string;
  description: string;
  date: string;
};

export type Post = PostMeta & {
  body: string;
};

type Frontmatter = {
  title?: string;
  description?: string;
  date?: string;
  status?: string;
};

function isSafeSlug(slug: string): boolean {
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug);
}

function readEntry(filename: string): Post | null {
  if (!filename.endsWith(".mdx")) return null;
  const slug = filename.slice(0, -4);
  if (!isSafeSlug(slug)) return null;

  const full = path.join(JOURNAL_DIR, filename);
  const raw = fs.readFileSync(full, "utf8");
  const { data, content } = matter(raw);
  const front = data as Frontmatter;
  if (front.status === "draft") return null;
  if (!front.title || !front.description || !front.date) return null;

  return {
    slug,
    title: front.title,
    description: front.description,
    date: front.date,
    body: content.trim(),
  };
}

export function getPublishedPosts(): PostMeta[] {
  if (!fs.existsSync(JOURNAL_DIR)) return [];
  return fs
    .readdirSync(JOURNAL_DIR)
    .map(readEntry)
    .filter((post): post is Post => post !== null)
    .map(({ slug, title, description, date }) => ({
      slug,
      title,
      description,
      date,
    }))
    .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
}

export function getPublishedPost(slug: string): Post | null {
  if (!isSafeSlug(slug)) return null;
  const filename = `${slug}.mdx`;
  const full = path.join(JOURNAL_DIR, filename);
  if (!fs.existsSync(full)) return null;
  return readEntry(filename);
}
