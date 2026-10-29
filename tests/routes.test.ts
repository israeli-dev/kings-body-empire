import { existsSync, readdirSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Guards against the build error
 *
 *   You cannot have two parallel pages that resolve to the same path.
 *   Please check /(auth)/page and /(marketing)/page.
 *
 * Next.js route groups — folders in parentheses — do not appear in the URL, so
 * two groups can both define `/` and the error only shows up when you run the
 * dev server or a build. That is late and confusing, so this test checks the
 * file tree first.
 */

const APP_DIR = join(process.cwd(), "src", "app");
const PAGE_FILES = new Set(["page.tsx", "page.ts", "page.jsx", "page.js"]);
const LAYOUT_FILES = new Set(["layout.tsx", "layout.ts", "layout.jsx", "layout.js"]);

/** Every page/layout file in the app directory (skipping dotfiles). */
function walk(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    if (entry.startsWith(".")) continue;
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) out.push(...walk(full));
    else out.push(full);
  }
  return out;
}

/** `src/app/(marketing)/books/[slug]/page.tsx` → `/books/[slug]` */
export function routeForFile(file: string): string {
  const rel = relative(APP_DIR, file).split(sep).slice(0, -1); // drop the file name
  const segments = rel.filter((segment) => !(segment.startsWith("(") && segment.endsWith(")")));
  return `/${segments.join("/")}`.replace(/\/$/, "") || "/";
}

describe("app router structure", () => {
  it("has no two pages resolving to the same URL", () => {
    const pages = walk(APP_DIR).filter((file) => PAGE_FILES.has(file.split(sep).pop()!));

    const byRoute = new Map<string, string[]>();
    for (const page of pages) {
      const route = routeForFile(page);
      byRoute.set(route, [...(byRoute.get(route) ?? []), relative(process.cwd(), page)]);
    }

    const clashes = [...byRoute.entries()].filter(([, files]) => files.length > 1);

    expect(
      clashes.map(([route, files]) => `${route} is defined by ${files.join(" and ")}`),
    ).toEqual([]);
  });

  it("has exactly one root layout", () => {
    // Route-group layouts ((auth), (dashboard), (marketing)) all sit at "/" and
    // that is legal — only a second layout at src/app/layout.tsx would clash.
    const rootLayouts = readdirSync(APP_DIR).filter((f) => LAYOUT_FILES.has(f));
    expect(rootLayouts).toEqual(["layout.tsx"]);
  });

  it("resolves the landing page to /", () => {
    expect(existsSync(join(APP_DIR, "(marketing)", "page.tsx"))).toBe(true);
    expect(routeForFile(join(APP_DIR, "(marketing)", "page.tsx"))).toBe("/");
    // The redesigned landing page is a preview route, not a second "/".
    expect(routeForFile(join(APP_DIR, "(preview)", "landing-preview", "page.tsx"))).toBe(
      "/landing-preview",
    );
  });
});
