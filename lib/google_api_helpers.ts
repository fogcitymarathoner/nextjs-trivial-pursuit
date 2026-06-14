import * as path from "path";
import { google } from "googleapis";
import { drive_v3 } from "googleapis";

import {
  CLIENT_SECRET_FILE,
} from "@/config/env.server";

const SCOPES = ["https://www.googleapis.com/auth/drive"];
const auth = new google.auth.GoogleAuth({
  keyFilename: path.resolve(CLIENT_SECRET_FILE!),
  scopes: SCOPES,
});

export const drive = google.drive({ version: "v3", auth });

export interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  parents?: string[];
}

export const listAllFiles = async (): Promise<DriveFile[]> => {
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
};

export const fileExists = async (fileId: string): Promise<boolean> => {
  try {
    await drive.files.get({ fileId, fields: "id" });
    return true;
  } catch (e: any) {
    if (e?.response?.status === 404) return false;
    throw e;
  }
};