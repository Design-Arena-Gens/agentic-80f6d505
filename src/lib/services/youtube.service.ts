import { promises as fs } from 'fs';
import path from 'path';
import type { AgentRuntimeContext, ThumbnailAsset, UploadMetadata } from '../types';

interface UploadResult {
  videoId: string;
  watchUrl: string;
}

async function getAccessToken() {
  const clientId = process.env.YOUTUBE_CLIENT_ID;
  const clientSecret = process.env.YOUTUBE_CLIENT_SECRET;
  const refreshToken = process.env.YOUTUBE_REFRESH_TOKEN;

  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error('YouTube OAuth credentials missing.');
  }

  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }).toString(),
  });

  if (!response.ok) {
    throw new Error(`Failed to refresh YouTube token ${response.status}`);
  }

  const payload = (await response.json()) as { access_token: string };
  return payload.access_token;
}

async function initiateResumableUpload(accessToken: string, metadata: UploadMetadata) {
  const response = await fetch(
    'https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json; charset=UTF-8',
        'X-Upload-Content-Type': 'video/mp4',
      },
      body: JSON.stringify({
        snippet: {
          title: metadata.title,
          description: metadata.description,
          tags: metadata.keywords,
          categoryId: '28', // Science & Technology
        },
        status: {
          privacyStatus: 'unlisted',
          publishAt: metadata.scheduledAt,
          selfDeclaredMadeForKids: false,
        },
      }),
    },
  );

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Failed creating upload session: ${text}`);
  }

  const location = response.headers.get('location');
  if (!location) {
    throw new Error('YouTube upload location missing.');
  }

  return location;
}

async function uploadBinaryToLocation(accessToken: string, uploadUrl: string, filePath: string) {
  const buffer = await fs.readFile(filePath);
  const response = await fetch(uploadUrl, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Length': buffer.length.toString(),
      'Content-Type': 'video/mp4',
    },
    body: buffer,
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`YouTube video upload failed: ${text}`);
  }

  const payload = (await response.json()) as { id: string };
  return payload.id;
}

async function uploadThumbnail(accessToken: string, videoId: string, thumbnail: ThumbnailAsset) {
  const buffer = await fs.readFile(thumbnail.path);
  const response = await fetch(
    `https://www.googleapis.com/upload/youtube/v3/thumbnails/set?videoId=${videoId}&uploadType=media`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Length': buffer.length.toString(),
        'Content-Type': 'image/jpeg',
      },
      body: buffer,
    },
  );

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Thumbnail upload failed: ${text}`);
  }
}

export async function uploadShort(
  context: AgentRuntimeContext,
  videoPath: string,
  thumbnail: ThumbnailAsset,
  metadata: UploadMetadata,
): Promise<UploadResult> {
  const { logger } = context;
  const accessToken = await getAccessToken();

  const sessionUrl = await initiateResumableUpload(accessToken, metadata);
  await logger('YouTube session created', { sessionUrl });

  const videoId = await uploadBinaryToLocation(accessToken, sessionUrl, videoPath);
  await logger('Video uploaded', { videoId });

  await uploadThumbnail(accessToken, videoId, thumbnail);
  await logger('Thumbnail uploaded', { videoId });

  return {
    videoId,
    watchUrl: `https://youtube.com/shorts/${videoId}`,
  };
}
