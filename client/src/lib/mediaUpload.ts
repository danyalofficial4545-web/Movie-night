export const CURRENT_DIRECT_VIDEO_LIMIT_BYTES = 50 * 1024 * 1024;

export function canDirectlyUploadLocalVideo(size: number) {
  return Number.isFinite(size) && size > 0 && size <= CURRENT_DIRECT_VIDEO_LIMIT_BYTES;
}
