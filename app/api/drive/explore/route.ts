import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { google } from "googleapis";

export async function GET(request: Request) {
  const session = await auth();

  if (!session || !session.accessToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const folderId = searchParams.get("folderId") || "root";

  try {
    const oauth2Client = new google.auth.OAuth2();
    oauth2Client.setCredentials({ access_token: session.accessToken });

    const drive = google.drive({ version: "v3", auth: oauth2Client });

    // Fetch both folders and files in the specified folder
    const response = await drive.files.list({
      q: `'${folderId}' in parents and trashed=false`,
      fields: "files(id, name, mimeType, size)",
      orderBy: "folder, name", // Folders first, then alphabetically
      pageSize: 1000,
    });

    const items = response.data.files || [];
    
    // Separate folders and files for easier frontend handling
    const folders = items.filter(item => item.mimeType === 'application/vnd.google-apps.folder');
    const files = items.filter(item => item.mimeType !== 'application/vnd.google-apps.folder');

    return NextResponse.json({ folders, files });
  } catch (error: any) {
    console.error("Error fetching drive explore:", error);
    return NextResponse.json(
      { error: "Failed to explore folder" },
      { status: 500 }
    );
  }
}
