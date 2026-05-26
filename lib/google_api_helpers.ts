
import * as path from "path";
import { google } from "googleapis";

import {
  CLIENT_SECRET_FILE} from "@/lib/env";

const SCOPES = ["https://www.googleapis.com/auth/drive"];
const auth = new google.auth.GoogleAuth({
  keyFilename: path.resolve(CLIENT_SECRET_FILE!),
  scopes: SCOPES,
});

export const drive = google.drive({ version: "v3", auth });