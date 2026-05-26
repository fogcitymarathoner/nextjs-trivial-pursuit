import * as fs from "fs";
import * as path from "path";
import { google } from "googleapis";
import dotenv from "dotenv";

import {
  CLIENT_SECRET_FILE} from "@/lib/env";

const SCOPES = ["https://www.googleapis.com/auth/drive"];
const serviceAccountKey = JSON.parse(fs.readFileSync(CLIENT_SECRET_FILE, "utf-8"));

const auth = new google.auth.GoogleAuth({
  credentials: serviceAccountKey,
  scopes: SCOPES,
});

export const drive = google.drive({ version: "v3", auth });