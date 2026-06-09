import { access, copyFile, mkdir, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import iconGen from "icon-gen";
import sharp from "sharp";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");
const publicDir = resolve(root, "public");
const inputPath = process.argv.slice(2).find((argument) => argument !== "--");
const source = inputPath
  ? resolve(inputPath)
  : resolve(publicDir, "icon-source.png");

const pngSizes = [16, 24, 32, 48, 64, 128, 180, 192, 256, 512, 1024];
const devDockIconSize = 1024;
const devDockIconContentSize = 832;

await access(source);
await mkdir(publicDir, { recursive: true });

const tempDir = await mkdtemp(join(tmpdir(), "azurauto-icons-"));
const pngDir = join(tempDir, "png");
const generatedDir = join(tempDir, "generated");

try {
  await mkdir(pngDir, { recursive: true });
  await mkdir(generatedDir, { recursive: true });

  const icon = await sharp(source)
    .rotate()
    .resize(1024, 1024, { fit: "cover", kernel: sharp.kernel.lanczos3 })
    .png()
    .toBuffer();

  if (source !== resolve(publicDir, "icon-source.png")) {
    await copyFile(source, resolve(publicDir, "icon-source.png"));
  }

  await sharp(icon).png().toFile(resolve(publicDir, "icon.png"));
  await copyPadded(
    icon,
    resolve(publicDir, "icon-dev.png"),
    devDockIconSize,
    devDockIconContentSize,
  );

  for (const size of pngSizes) {
    await sharp(icon)
      .resize(size, size, { fit: "cover", kernel: sharp.kernel.lanczos3 })
      .png()
      .toFile(resolve(pngDir, `${size}.png`));
  }

  await iconGen(pngDir, generatedDir, {
    report: true,
    ico: {
      name: "icon",
      sizes: [16, 24, 32, 48, 64, 128, 256],
    },
    icns: {
      name: "icon",
      sizes: [16, 32, 64, 128, 256, 512, 1024],
    },
    favicon: {
      name: "favicon-",
      pngSizes: [32, 64, 192, 512],
      icoSizes: [16, 24, 32, 48, 64],
    },
  });

  await copyFile(
    resolve(generatedDir, "icon.icns"),
    resolve(publicDir, "icon.icns"),
  );
  await copyFile(
    resolve(generatedDir, "icon.ico"),
    resolve(publicDir, "icon.ico"),
  );
  await copyFile(
    resolve(generatedDir, "favicon.ico"),
    resolve(publicDir, "favicon.ico"),
  );
  await copyResized(icon, resolve(publicDir, "favicon.png"), 64);
  await copyResized(icon, resolve(publicDir, "apple-touch-icon.png"), 180);
  await copyResized(icon, resolve(publicDir, "logo192.png"), 192);
  await copyResized(icon, resolve(publicDir, "logo512.png"), 512);

  console.log(`Generated public app icons from ${source}`);
} finally {
  await rm(tempDir, { force: true, recursive: true });
}

async function copyResized(input, output, size) {
  await sharp(input)
    .resize(size, size, { fit: "cover", kernel: sharp.kernel.lanczos3 })
    .png()
    .toFile(output);
}

async function copyPadded(input, output, size, contentSize) {
  const inset = Math.round((size - contentSize) / 2);
  const content = await sharp(input)
    .resize(contentSize, contentSize, {
      fit: "contain",
      kernel: sharp.kernel.lanczos3,
    })
    .png()
    .toBuffer();

  await sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite([{ input: content, left: inset, top: inset }])
    .png()
    .toFile(output);
}
