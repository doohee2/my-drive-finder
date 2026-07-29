import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { google } from "googleapis";
import { z } from "zod";

const FilesQuerySchema = z.object({
  folderId: z.string().min(1),
});

export async function GET(request: Request) {
  const session = await auth();

  if (!session || !session.accessToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const parseResult = FilesQuerySchema.safeParse({
    folderId: searchParams.get("folderId"),
  });

  if (!parseResult.success) {
    return NextResponse.json({ error: "유효하지 않은 요청 파라미터입니다." }, { status: 400 });
  }

  const { folderId } = parseResult.data;

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
      { error: "요청을 처리할 수 없습니다." },
      { status: 500 }
    );
  }
}
