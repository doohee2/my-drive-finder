import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { google } from "googleapis";

export async function GET(request: Request) {
  const session = await auth();

  if (!session || !session.accessToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const folderId = searchParams.get("folderId");

  if (!folderId) {
    return NextResponse.json({ error: "Missing folderId" }, { status: 400 });
  }

  try {
    const oauth2Client = new google.auth.OAuth2();
    oauth2Client.setCredentials({ access_token: session.accessToken });

    const drive = google.drive({ version: "v3", auth: oauth2Client });

    // Fetch .xls, .xlsx, .csv files in the target folder
    const mimeTypes = [
      "application/vnd.ms-excel", // .xls
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", // .xlsx
      "text/csv", // .csv
      "application/vnd.google-apps.spreadsheet" // Google Sheets (can be exported)
    ];
    
    const mimeQuery = mimeTypes.map(m => `mimeType='${m}'`).join(' or ');
    const q = `'${folderId}' in parents and (${mimeQuery}) and trashed=false`;

    const response = await drive.files.list({
      q,
      fields: "files(id, name, modifiedTime, mimeType, size)",
      orderBy: "name",
      pageSize: 1000,
    });

    const files = response.data.files || [];
    return NextResponse.json({ files });
  } catch (error: any) {
    console.error("Error fetching drive files:", error);
    return NextResponse.json(
      { error: "Failed to fetch files" },
      { status: 500 }
    );
  }
}
