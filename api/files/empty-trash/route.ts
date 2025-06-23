import { db } from "@/lib/db";
import ImageKit from "imagekit";
import { and, eq } from "drizzle-orm";
import { files } from "@/lib/db/schema";
import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";

const imagekit = new ImageKit({
  publicKey: process.env.NEXT_PUBLIC_IMAGEKIT_PUBLIC_KEY || "",
  privateKey: process.env.IMAGEKIT_PRIVATE_KEY || "",
  urlEndpoint: process.env.NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT || "",
});

export async function DELETE() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return new Response("Unauthorized", { status: 401 });
    }
    const trashedFiles = await db
      .select()
      .from(files)
      .where(and(eq(files.userId, userId), eq(files.isTrash, true)));

    if (trashedFiles.length === 0) {
      return new NextResponse("No files in trash", { status: 200 });
    }
    const deletePromises = trashedFiles
      .filter((file) => !file.isFolder)
      .map(async (file) => {
        try {
          let imageKitFileId = null;
          if (file.fileUrl) {
            const url = file.fileUrl.split("?")[0];
            imageKitFileId = url.split("/").pop();
          }
          if (!imageKitFileId && file.path) {
            imageKitFileId = file.path.split("/").pop();
          }
          if (imageKitFileId) {
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
          console.error(`Error deleting file ${file.id} from ImageKit:`, error);
        }
      });

    await Promise.allSettled(deletePromises);

    const deletedFile = await db
      .delete(files)
      .where(and(eq(files.userId, userId), eq(files.isTrash, true)))
      .returning();

    if (deletedFile.length === 0) {
      return new NextResponse("No files deleted", { status: 200 });
    }
    return new NextResponse(
      `${deletedFile.length} Files deleted successfully`,
      {
        status: 200,
      }
    );
  } catch (error) {
    console.error("Error emptying trash:", error);
    return new NextResponse("Failed to empty the trash", { status: 500 });
  }
}
