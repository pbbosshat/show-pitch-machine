import { google } from 'googleapis';
import { Readable } from 'node:stream';
import fs from 'node:fs';

function getDriveAuth() {
  const key = process.env.GOOGLE_SERVICE_ACCOUNT_JSON
    ? JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON)
    : JSON.parse(fs.readFileSync(
        process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH ||
        'C:/Users/pb/.claude/google/service_account.json',
        'utf-8'
      ));

  return new google.auth.JWT({
    email: key.client_email,
    key: key.private_key,
    scopes: ['https://www.googleapis.com/auth/drive'],
    // DWD into myentprod.com admin — Drive quota and folder ownership live here
    subject: 'admin@myentprod.com',
  });
}

// Resolve the target folder ID. Preference order:
//   1. DRIVE_SIZZLE_FOLDER_ID env var (fastest path — no API call)
//   2. Search for an existing "Sizzle Reels" folder in Drive root
//   3. Create the folder and log its ID so the operator can set the env var
async function resolveSizzleFolderId(drive: ReturnType<typeof google.drive>): Promise<string> {
  if (process.env.DRIVE_SIZZLE_FOLDER_ID) {
    return process.env.DRIVE_SIZZLE_FOLDER_ID;
  }

  const searchRes = await drive.files.list({
    q: "name = 'Sizzle Reels' and mimeType = 'application/vnd.google-apps.folder' and trashed = false and 'root' in parents",
    fields: 'files(id, name)',
    spaces: 'drive',
  });

  const existing = searchRes.data.files?.[0];
  if (existing?.id) {
    console.log(`[google-drive-video] Found existing Sizzle Reels folder: ${existing.id}. Set DRIVE_SIZZLE_FOLDER_ID=${existing.id} to skip this search on future uploads.`);
    return existing.id;
  }

  const createRes = await drive.files.create({
    requestBody: {
      name: 'Sizzle Reels',
      mimeType: 'application/vnd.google-apps.folder',
    },
    fields: 'id',
  });

  const folderId = createRes.data.id!;
  console.log(`[google-drive-video] Created Sizzle Reels folder: ${folderId}. Set DRIVE_SIZZLE_FOLDER_ID=${folderId} to skip folder creation on future uploads.`);
  return folderId;
}

// Upload a video buffer to the "Sizzle Reels" Drive folder in myentprod.com.
// Sets anyone-with-link read permission immediately after upload.
// Returns fileId and the standard shareable view URL.
export async function uploadVideoToDrive(
  buffer: Buffer,
  filename: string,
  mimeType: string
): Promise<{ fileId: string; shareableUrl: string }> {
  const auth = getDriveAuth();
  const drive = google.drive({ version: 'v3', auth });

  const folderId = await resolveSizzleFolderId(drive);

  const uploadRes = await drive.files.create({
    requestBody: {
      name: filename,
      parents: [folderId],
    },
    media: {
      mimeType,
      body: Readable.from(buffer),
    },
    fields: 'id',
  });

  const fileId = uploadRes.data.id!;

  // Make the file viewable by anyone with the link — required for buyer-facing pages
  await drive.permissions.create({
    fileId,
    requestBody: { type: 'anyone', role: 'reader' },
  });

  return {
    fileId,
    shareableUrl: `https://drive.google.com/file/d/${fileId}/view`,
  };
}

// Fetch the auto-generated thumbnail for a Drive video.
// Returns null when Drive hasn't finished processing the video (typically 1-5 min post-upload).
export async function getDriveThumbnail(fileId: string): Promise<string | null> {
  const auth = getDriveAuth();
  const drive = google.drive({ version: 'v3', auth });

  const res = await drive.files.get({
    fileId,
    fields: 'thumbnailLink',
  });

  return res.data.thumbnailLink ?? null;
}

// Check current Drive storage quota for the myentprod.com workspace.
// Useful for ops dashboards and pre-upload guards on large files.
export async function checkDriveStorageQuota(): Promise<{
  used: number;
  limit: number;
  percentUsed: number;
}> {
  const auth = getDriveAuth();
  const drive = google.drive({ version: 'v3', auth });

  const res = await drive.about.get({ fields: 'storageQuota' });
  const quota = res.data.storageQuota!;

  const used = parseInt(quota.usage ?? '0', 10);
  const limit = parseInt(quota.limit ?? '0', 10);
  // limit of 0 means unlimited — return 0% rather than divide-by-zero
  const percentUsed = limit > 0 ? Math.round((used / limit) * 100) : 0;

  return { used, limit, percentUsed };
}
