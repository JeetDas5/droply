import { db } from "@/lib/db";
import ImageKit from "imagekit";
import { v4 as uuidv4 } from "uuid";
import { and, eq } from "drizzle-orm";
import { files } from "@/lib/db/schema";
import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";

const imagekit = new ImageKit({
  publicKey: process.env.NEXT_PUBLIC_IMAGEKIT_PUBLIC_KEY || "",
  privateKey: process.env.IMAGEKIT_PRIVATE_KEY || "",
  urlEndpoint: process.env.NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT || "",
});

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    //Parse form data
    const formData = await request.formData();
    const file = formData.get("file") as File;
    const formUserId = formData.get("userId") as string;
    const parentId = (formData.get("parentId") as string) || null;

    if (formUserId !== userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!file) {
      return NextResponse.json({ error: "File is required" }, { status: 400 });
    }

    if (parentId) {
      const [parentFolder] = await db
        .select()
        .from(files)
        .where(
          and(
            eq(files.id, parentId),
            eq(files.userId, userId),
            eq(files.isFolder, true)
          )
        );
      if (!parentFolder) {
        return NextResponse.json(
          { error: "Parent folder not found" },
          { status: 404 }
        );
      }
    }
    if (!parentId) {
      return NextResponse.json(
        { error: "Parent folder is required" },
        { status: 400 }
      );
    }

    if (
      !file.type.startsWith("image/") &&
      !file.type.startsWith("appication/pdf")
    ) {
      return NextResponse.json(
        { error: "Only image and PDF files are allowed" },
        { status: 400 }
      );
    }

    const buffer = await file.arrayBuffer();
    const fileBuffer = Buffer.from(buffer);

    const folderPath = parentId
      ? `/droply/${userId}/folder/${parentId}`
      : `/droply/${userId}`;

    const originalFileName = file.name;

    const fileExtension = originalFileName.split(".").pop() || "";

    //Check for empty file extension
    if (!fileExtension) {
      return NextResponse.json(
        { error: "File must have a valid extension" },
        { status: 400 }
      );
    }

    // Check for valid file extension
    const validExtensions = ["jpg", "jpeg", "png", "pdf"];

    if (!validExtensions.includes(fileExtension.toLowerCase())) {
      return NextResponse.json(
        {
          error: "Invalid file type. Only JPG, JPEG, PNG, and PDF are allowed.",
        },
        { status: 400 }
      );
    }

    const uniqueFileName = `${uuidv4()}-${fileExtension}`;

    const uploadResponse = await imagekit.upload({
      file: fileBuffer,
      fileName: uniqueFileName,
      folder: folderPath,
      useUniqueFileName: false,
    });

    const fileData = {
      name: originalFileName,
      path: uploadResponse.filePath,
      size: file.size,
      type: file.type,
      fileUrl: uploadResponse.url,
      thumbnailUrl: uploadResponse.thumbnailUrl || null,
      userId,
      parentId,
      isFolder: false,
      isStarred: false,
      isShared: false,
    };

    const [newFile] = await db.insert(files).values(fileData).returning();

    return NextResponse.json(
      {
        message: "File uploaded successfully",
        file: newFile,
      },
      { status: 201 }
    );
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to upload file",
      },
      { status: 401 }
    );
  }
}
