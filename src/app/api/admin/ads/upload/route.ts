import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ success: false, message: "No file provided" }, { status: 400 });
    }

    const extensions: Record<string, string> = {
      "image/jpeg": ".jpg",
      "image/png": ".png",
      "image/webp": ".webp",
      "image/gif": ".gif",
    };
    const ext = extensions[file.type];
    if (!ext) {
      return NextResponse.json({ success: false, message: "Choose a JPG, PNG, WebP, or GIF image." }, { status: 400 });
    }
    if (file.size <= 0 || file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ success: false, message: "Image must be larger than 0 bytes and no more than 5 MB." }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Ensure uploads directory exists
    const uploadDir = path.join(process.cwd(), "public", "uploads", "ads");
    await mkdir(uploadDir, { recursive: true });

    // Sanitize extension and create unique filename
    const baseName = path.basename(file.name, path.extname(file.name)).replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 30);
    const uniqueFileName = `banner_${Date.now()}_${baseName}${ext}`;
    const filePath = path.join(uploadDir, uniqueFileName);

    await writeFile(filePath, buffer);

    const publicUrl = `/uploads/ads/${uniqueFileName}`;
    return NextResponse.json({
      success: true,
      url: publicUrl,
      fileName: uniqueFileName,
    });
  } catch (error: any) {
    console.error("Ad image upload error:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Failed to upload ad image" },
      { status: 500 }
    );
  }
}
