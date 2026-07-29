import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { z } from "zod";

const UploadSchema = z.object({
  folderId: z.string().min(1),
  fileName: z.string().min(1),
  fileSize: z.number().positive(),
});

export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session || !session.accessToken) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const folderId = formData.get('folderId') as string;

    if (!file || !folderId) {
      return NextResponse.json({ error: "유효하지 않은 요청 파라미터입니다." }, { status: 400 });
    }

    const parseResult = UploadSchema.safeParse({
      folderId: typeof folderId === "string" ? folderId : "",
      fileName: file?.name || "",
      fileSize: file?.size || 0,
    });

    if (!parseResult.success) {
      return NextResponse.json({ error: "유효하지 않은 파일 또는 대상 폴더입니다." }, { status: 400 });
    }

    const metadata = {
      name: file.name,
      parents: [folderId]
    };

    const initRes = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session.accessToken}`,
        'Content-Type': 'application/json',
        'X-Upload-Content-Type': file.type || 'application/octet-stream',
        'X-Upload-Content-Length': file.size.toString()
      },
      body: JSON.stringify(metadata)
    });

    if (!initRes.ok) {
      const errorData = await initRes.json();
      throw new Error(errorData.error?.message || "Failed to initialize upload");
    }

    const locationUrl = initRes.headers.get('Location');
    if (!locationUrl) {
      throw new Error("Failed to get upload URL");
    }

    const fileBuffer = await file.arrayBuffer();
    
    const uploadRes = await fetch(locationUrl, {
      method: 'PUT',
      headers: {
        'Content-Length': file.size.toString()
      },
      body: fileBuffer
    });

    if (!uploadRes.ok) {
      const errorData = await uploadRes.json();
      throw new Error(errorData.error?.message || "Failed to upload file");
    }

    const uploadedFileData = await uploadRes.json();

    return NextResponse.json({ success: true, file: uploadedFileData });
  } catch (error: any) {
    console.error("Upload proxy error:", error);
    return NextResponse.json({ error: "요청을 처리할 수 없습니다." }, { status: 500 });
  }
}
