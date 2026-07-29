import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { google } from "googleapis";
import { z } from "zod";

const DownloadQuerySchema = z.object({
  fileId: z.string().min(1),
  mimeType: z.string().min(1),
  filename: z.string().optional(),
});

export async function GET(request: Request) {
  const session = await auth();

  if (!session || !session.accessToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const parseResult = DownloadQuerySchema.safeParse({
    fileId: searchParams.get("fileId"),
    mimeType: searchParams.get("mimeType"),
    filename: searchParams.get("filename") ?? undefined,
  });

  if (!parseResult.success) {
    return NextResponse.json({ error: "유효하지 않은 요청 파라미터입니다." }, { status: 400 });
  }

  const { fileId, mimeType, filename } = parseResult.data;

  try {
    const oauth2Client = new google.auth.OAuth2();
    oauth2Client.setCredentials({ access_token: session.accessToken });
    const drive = google.drive({ version: "v3", auth: oauth2Client });

    let stream;
    let exportMimeType = mimeType;

    // Google Workspace files need to be exported to Office formats
    if (mimeType === "application/vnd.google-apps.spreadsheet") {
      exportMimeType = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
      const response = await drive.files.export(
        { fileId, mimeType: exportMimeType },
        { responseType: "stream" }
      );
      stream = response.data;
    } else if (mimeType === "application/vnd.google-apps.document") {
      exportMimeType = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
      const response = await drive.files.export(
        { fileId, mimeType: exportMimeType },
        { responseType: "stream" }
      );
      stream = response.data;
    } else if (mimeType === "application/vnd.google-apps.presentation") {
      exportMimeType = "application/vnd.openxmlformats-officedocument.presentationml.presentation";
      const response = await drive.files.export(
        { fileId, mimeType: exportMimeType },
        { responseType: "stream" }
      );
      stream = response.data;
    } else {
      // Regular files are downloaded
      const response = await drive.files.get(
        { fileId, alt: "media" },
        { responseType: "stream" }
      );
      stream = response.data;
    }

    const headers = new Headers();
    headers.set('Content-Type', exportMimeType);
    if (filename) {
      headers.set('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`);
    }

    const webStream = new ReadableStream({
      start(controller) {
        stream.on('data', (chunk: Buffer) => controller.enqueue(chunk));
        stream.on('end', () => controller.close());
        stream.on('error', (err: Error) => controller.error(err));
      }
    });

    return new Response(webStream, { headers });

  } catch (error: any) {
    console.error("Error downloading file:", error);
    return NextResponse.json(
      { error: "요청을 처리할 수 없습니다." },
      { status: 500 }
    );
  }
}
