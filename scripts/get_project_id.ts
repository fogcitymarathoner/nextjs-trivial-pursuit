import * as gcpMetadata from 'gcp-metadata';

// To run - npx tsx scripts/get_project_id.ts

async function getProjectId(): Promise<string> {
  const projectId: string = await gcpMetadata.project('project-id');
  console.log(`My project ID is: ${projectId}`);
  return projectId;
}

// Usage
getProjectId().catch(console.error);