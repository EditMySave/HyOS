import { readFileSync, writeFileSync, readdirSync, statSync } from "node:fs";
import { join, relative, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DOCS_DIR = join(__dirname, "../content/docs");
const PUBLIC_DIR = join(__dirname, "../public");
const BASE = "https://hyos.io";

interface DocPage {
  title: string;
  description: string;
  url: string;
  content: string;
}

function extractFrontmatter(raw: string): {
  title: string;
  description: string;
  body: string;
} {
  const match = raw.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!match) return { title: "", description: "", body: raw };

  const fm = match[1];
  const body = match[2].trim();

  const titleMatch = fm.match(/^title:\s*"?([^"\n]+)"?/m);
  const descMatch = fm.match(/^description:\s*"?([^"\n]+)"?/m);

  return {
    title: titleMatch?.[1]?.trim() ?? "",
    description: descMatch?.[1]?.trim() ?? "",
    body,
  };
}

function collectMdxFiles(dir: string): string[] {
  const files: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      files.push(...collectMdxFiles(full));
    } else if (entry.endsWith(".mdx")) {
      files.push(full);
    }
  }
  return files;
}

function filePathToUrl(filePath: string): string {
  let rel = relative(DOCS_DIR, filePath)
    .replace(/\.mdx$/, "")
    .replace(/\/index$/, "")
    .replace(/^index$/, "");

  return rel ? `/docs/${rel}` : "/docs";
}

const mdxFiles = collectMdxFiles(DOCS_DIR).sort();
const pages: DocPage[] = [];

for (const file of mdxFiles) {
  const raw = readFileSync(file, "utf-8");
  const { title, description, body } = extractFrontmatter(raw);
  const url = filePathToUrl(file);
  pages.push({ title, description, url, content: body });
}

// Generate llms.txt
const llmsTxt = `# HyOS - Hytale Server Manager
> Open-source Docker-based Hytale dedicated server management ecosystem

## Documentation Pages
${pages.map((p) => `- ${p.title}: ${BASE}${p.url} — ${p.description}`).join("\n")}

## Key Links
- Website: ${BASE}
- Docs: ${BASE}/docs
- GitHub: https://github.com/editmysave/hyOS
- Full docs for LLMs: ${BASE}/llms-full.txt
`;

writeFileSync(join(PUBLIC_DIR, "llms.txt"), llmsTxt);
console.log(`Generated llms.txt (${pages.length} pages)`);

// Generate llms-full.txt
const llmsFullTxt = `# HyOS Documentation

${pages
  .map(
    (p) => `## ${p.title}
URL: ${BASE}${p.url}

${p.content}`,
  )
  .join("\n\n---\n\n")}
`;

writeFileSync(join(PUBLIC_DIR, "llms-full.txt"), llmsFullTxt);
console.log(`Generated llms-full.txt (${pages.length} pages)`);
