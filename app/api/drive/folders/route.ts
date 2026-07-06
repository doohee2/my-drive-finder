import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { google } from "googleapis";

export async function GET() {
  const session = await auth();

  if (!session || !session.accessToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const oauth2Client = new google.auth.OAuth2();
    oauth2Client.setCredentials({ access_token: session.accessToken });

    const drive = google.drive({ version: "v3", auth: oauth2Client });

    // Fetch only folders owned by the user (exclude shared folders)
    const response = await drive.files.list({
      q: "mimeType='application/vnd.google-apps.folder' and trashed=false and 'me' in owners",
      fields: "nextPageToken, files(id, name, parents)",
      orderBy: "name",
      pageSize: 1000,
    });

    const folders = response.data.files || [];
    
    // Build a map for quick lookup
    const folderMap = new Map(folders.map(f => [f.id, f]));

    // Resolve paths
    const foldersWithPaths = folders.map(folder => {
      const pathNames = [folder.name];
      let currentParentId = folder.parents?.[0];

      // Traverse up to 5 levels to prevent infinite loops and excessive depth
      let depth = 0;
      while (currentParentId && depth < 5) {
        const parentFolder = folderMap.get(currentParentId);
        if (parentFolder) {
          pathNames.unshift(parentFolder.name);
          currentParentId = parentFolder.parents?.[0];
        } else {
          // Parent not found in the fetched list, assume it's the root (My Drive)
          pathNames.unshift("내 드라이브");
          break;
        }
        depth++;
      }

      return {
        id: folder.id,
        name: folder.name,
        path: pathNames.join(" / "),
        parentId: folderMap.has(folder.parents?.[0] || "") ? folder.parents![0] : "root",
      };
    });

    // Sort by path alphabetically
    foldersWithPaths.sort((a, b) => a.path.localeCompare(b.path));

    return NextResponse.json({ folders: foldersWithPaths });
  } catch (error: any) {
    console.error("Error fetching drive folders:", error);
    return NextResponse.json(
      { error: "Failed to fetch folders" },
      { status: 500 }
    );
  }
}
