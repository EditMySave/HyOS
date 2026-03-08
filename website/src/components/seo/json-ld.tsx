const BASE = "https://hyos.io";

export function OrganizationSchema() {
  const data = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "HyOS",
    url: BASE,
    logo: `${BASE}/logo.png`,
    description:
      "Open-source Docker-based Hytale dedicated server management ecosystem.",
    sameAs: ["https://github.com/editmysave/hyOS"],
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}

export function SoftwareApplicationSchema() {
  const data = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "HyOS",
    url: BASE,
    applicationCategory: "DeveloperApplication",
    operatingSystem: "Linux, macOS, Windows",
    description:
      "Open-source Docker-based Hytale dedicated server management ecosystem with web dashboard, mod support, and automated updates.",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
    },
    author: {
      "@type": "Organization",
      name: "HyOS",
      url: BASE,
    },
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}

export function BreadcrumbSchema({
  slugs,
  title,
}: {
  slugs: string[];
  title: string;
}) {
  const items = [
    { name: "Home", url: BASE },
    { name: "Docs", url: `${BASE}/docs` },
  ];

  // Build intermediate breadcrumbs from slugs (all but last)
  for (let i = 0; i < slugs.length - 1; i++) {
    const path = slugs.slice(0, i + 1).join("/");
    const name = slugs[i].replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
    items.push({ name, url: `${BASE}/docs/${path}` });
  }

  // Final breadcrumb uses the actual page title
  if (slugs.length > 0) {
    items.push({
      name: title,
      url: `${BASE}/docs/${slugs.join("/")}`,
    });
  }

  const data = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}
