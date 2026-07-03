

// To run -- npx tsx .\scripts\list_gdrive_files.ts
import {
  listAllFiles,
  fileExists} from "@/scripts/lib/google_api_helpers";



(async () => {
  const files = await listAllFiles();
  console.log(files);
})();

const president_content_list_gdrive_id = "1KrNhfjfLUjnQO3uMjgRbw2Awdmr4JQ8Y";


(async () => {
  const files = await fileExists(president_content_list_gdrive_id);
  console.log(files+" exist");
})();