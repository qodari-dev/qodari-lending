import {
  createSpacesPresignedGetUrl,
  createSpacesPresignedPutUrl,
} from './spaces-presign';

export async function uploadBufferToSpaces(
  fileKey: string,
  buffer: Buffer,
  contentType = 'application/octet-stream'
): Promise<void> {
  const url = createSpacesPresignedPutUrl(fileKey, 900);
  const response = await fetch(url, {
    method: 'PUT',
    headers: { 'Content-Type': contentType },
    body: new Uint8Array(buffer),
  });

  if (!response.ok) {
    throw new Error(`No fue posible subir archivo a Spaces (${response.status})`);
  }
}


export async function downloadBufferFromSpaces(fileKey: string): Promise<Buffer> {
  const url = createSpacesPresignedGetUrl(fileKey, 900);
  const response = await fetch(url, {
    method: 'GET',
  });

  if (!response.ok) {
    throw new Error(`No fue posible descargar archivo de Spaces (${response.status})`);
  }

  return Buffer.from(await response.arrayBuffer());
}
