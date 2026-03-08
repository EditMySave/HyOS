import sharp from "sharp";
import { writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = join(__dirname, "../public");
const LOGO_PATH = join(PUBLIC_DIR, "logo.png");
const BG_COLOR = { r: 9, g: 9, b: 11, alpha: 1 }; // #09090b

async function generateFavicons() {
  const sizes = [16, 32, 48, 96, 192];

  for (const size of sizes) {
    await sharp(LOGO_PATH)
      .resize(size, size, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png()
      .toFile(join(PUBLIC_DIR, `favicon-${size}x${size}.png`));
    console.log(`Generated favicon-${size}x${size}.png`);
  }

  // favicon.ico (32x32 PNG renamed — browsers accept PNG favicons)
  await sharp(LOGO_PATH)
    .resize(32, 32, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toFile(join(PUBLIC_DIR, "favicon.ico"));
  console.log("Generated favicon.ico");
}

async function generateAppleTouchIcons() {
  const sizes = [120, 152, 180];

  for (const size of sizes) {
    const suffix = size === 180 ? "" : `-${size}x${size}`;
    await sharp(LOGO_PATH)
      .resize(size, size, { fit: "contain", background: BG_COLOR })
      .png()
      .toFile(join(PUBLIC_DIR, `apple-touch-icon${suffix}.png`));
    console.log(`Generated apple-touch-icon${suffix}.png`);
  }
}

async function generateAndroidIcons() {
  const sizes = [192, 512];

  for (const size of sizes) {
    await sharp(LOGO_PATH)
      .resize(size, size, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png()
      .toFile(join(PUBLIC_DIR, `android-chrome-${size}x${size}.png`));
    console.log(`Generated android-chrome-${size}x${size}.png`);
  }
}

async function generateOgImage() {
  const tagline = "Open-source Hytale Server Management";

  const svgOverlay = `
    <svg width="1200" height="630" xmlns="http://www.w3.org/2000/svg">
      <text
        x="600" y="480"
        text-anchor="middle"
        font-family="sans-serif"
        font-size="32"
        fill="#a1a1aa"
      >${tagline}</text>
    </svg>
  `;

  // Get logo dimensions to scale proportionally
  const logoMeta = await sharp(LOGO_PATH).metadata();
  const maxLogoWidth = 800;
  const maxLogoHeight = 300;
  const scale = Math.min(
    maxLogoWidth / (logoMeta.width ?? 800),
    maxLogoHeight / (logoMeta.height ?? 300),
  );
  const logoWidth = Math.round((logoMeta.width ?? 800) * scale);
  const logoHeight = Math.round((logoMeta.height ?? 300) * scale);

  const resizedLogo = await sharp(LOGO_PATH)
    .resize(logoWidth, logoHeight, { fit: "inside" })
    .toBuffer();

  await sharp({
    create: {
      width: 1200,
      height: 630,
      channels: 4,
      background: BG_COLOR,
    },
  })
    .composite([
      {
        input: resizedLogo,
        top: Math.round((630 - logoHeight) / 2) - 40,
        left: Math.round((1200 - logoWidth) / 2),
      },
      {
        input: Buffer.from(svgOverlay),
        top: 0,
        left: 0,
      },
    ])
    .png()
    .toFile(join(PUBLIC_DIR, "og-image.png"));
  console.log("Generated og-image.png");
}

function generateWebManifest() {
  const manifest = {
    name: "HyOS",
    short_name: "HyOS",
    icons: [
      {
        src: "/android-chrome-192x192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/android-chrome-512x512.png",
        sizes: "512x512",
        type: "image/png",
      },
    ],
    theme_color: "#09090b",
    background_color: "#09090b",
    display: "standalone",
  };

  writeFileSync(
    join(PUBLIC_DIR, "site.webmanifest"),
    JSON.stringify(manifest, null, 2),
  );
  console.log("Generated site.webmanifest");
}

async function main() {
  await generateFavicons();
  await generateAppleTouchIcons();
  await generateAndroidIcons();
  await generateOgImage();
  generateWebManifest();
  console.log("All image assets generated.");
}

main().catch((err) => {
  console.error("Image generation failed:", err);
  process.exit(1);
});
