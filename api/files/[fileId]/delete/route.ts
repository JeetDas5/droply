import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import ImageKit from "imagekit";
import { db } from "@/lib/db";
import { files } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";

const imagekit = new ImageKit({
  publicKey: process.env.NEXT_PUBLIC_IMAGEKIT_PUBLIC_KEY || "",
  privateKey: process.env.IMAGEKIT_PRIVATE_KEY || "",
  urlEndpoint: process.env.NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT || "",
});

export async function DELETE(
  request: NextRequest,
  props: { params: Promise<{ fileId: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { fileId } = await props.params;

    if (!fileId) {
      return NextResponse.json(
        { error: "File ID is required" },
        { status: 400 }
      );
    }

    //Get the file
    const [file] = await db
      .select()
      .from(files)
      .where(and(eq(files.id, fileId), eq(files.userId, userId)));

    if (!file) {
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }

    //Delete the file from ImageKit
    if (!file.isFolder) {
      try {
        let imageKitFileId = null;
        if (file.fileUrl) {
          const url = file.fileUrl.split("?")[0];
          imageKitFileId = url.split("/").pop();
        }
        if (!imageKitFileId) {
          return NextResponse.json(
            { error: "File URL is not valid" },
            { status: 400 }
          );
        } else {
          try {
            const searchResult = await imagekit.listFiles({
              name: imageKitFileId,
              limit: 1,
            });
            if (searchResult && searchResult.length > 0) {
              await imagekit.deleteFile(searchResult[0].fileId);
            } else {
              await imagekit.deleteFile(imageKitFileId);
            }
          } catch (searchError) {
            console.log("Error searching for file in ImageKit:", searchError);
            await imagekit.deleteFile(imageKitFileId);
          }
        }
      } catch (error) {
        console.error(`Error deleting file ${fileId} from ImageKit:`, error);
        return NextResponse.json(
          { error: "Failed to delete file from ImageKit" },
          { status: 500 }
        );
      }
    }
    const [deletedFile] = await db
      .delete(files)
      .where(and(eq(files.id, fileId), eq(files.userId, userId)))
      .returning();
    if (!deletedFile) {
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }
    return NextResponse.json(
      { success: true, file: deletedFile },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error deleting file:", error);
    return NextResponse.json(
      { error: "Failed to delete file" },
      { status: 500 }
    );
  }
}
