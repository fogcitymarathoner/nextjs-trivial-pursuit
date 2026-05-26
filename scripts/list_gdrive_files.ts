import { drive_v3 } from "googleapis";

// To run -- npx tsx .\scripts\list_gdrive_files.ts
import {
  drive} from "@/lib/google_api_helpers";

interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  parents?: string[];
}


async function listAllFiles(): Promise<DriveFile[]> {
  const files: DriveFile[] = [];
  let pageToken: string | undefined = undefined;

  while (true) {
    const res = await drive.files.list({
      q: "trashed=false",
      fields: "nextPageToken, files(id, name, mimeType, parents)",
      pageToken,
      pageSize: 1000,
    });
    const data: drive_v3.Schema$FileList = res.data;

    files.push(...(data.files as DriveFile[] ?? []));
    pageToken = data.nextPageToken ?? undefined;

    if (!pageToken) break;
  }

  return files;
}

(async () => {
  const files = await listAllFiles();
  console.log(files);
})();
