import { db } from "@/lib/db";
import { files } from "@/lib/db/schema";
import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    //parse request body
    const body = await request.json();
    const { imagekit, userId: bodyUserId } = body;

    if (bodyUserId !== userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!imagekit || !imagekit.url) {
      return NextResponse.json(
        { error: "Invalid request body" },
        { status: 400 }
      );
    }

    const fileData = {
      name: imagekit.name || "Untitled",
      path: imagekit.filepath || `/droply/${userId}/${imagekit.name}`,
      size: imagekit.size || 0,
      type: imagekit.filetype || "image",
      fileUrl: imagekit.url,
      thumbnailUrl: imagekit.thumbnailUrl || null,
      userId: userId,
      parentId: null,
      isFolder: false,
      isStarred: false,
      isTrashed: false,
    };

    const [newFile] = await db.insert(files).values(fileData).returning();
    return NextResponse.json(newFile, { status: 201 });
  } catch (error: any) {
    return NextResponse.json(
      {
        error: error.message || "Failed to save file to the database",
      },
      { status: 500 }
    );
  }
}
