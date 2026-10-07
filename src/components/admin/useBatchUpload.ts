import { useCallback, useState } from 'react';
import { mediaService } from '@/services/mediaService';
import type { MediaItem, UploadBatchResult } from '@/services/mediaService';

export interface UploadProgress {
  done: number;
  total: number;
}

export function progressLabel(progress: UploadProgress | null, idle: string): string {
  return progress ? `Đang tải ${progress.done}/${progress.total}` : idle;
}

export function useBatchUpload() {
  const [progress, setProgress] = useState<UploadProgress | null>(null);
  const [result, setResult] = useState<UploadBatchResult | null>(null);

  const upload = useCallback(async (files: File[], category: MediaItem['category']) => {
    setResult(null);
    setProgress({ done: 0, total: files.length });
    try {
      const batch = await mediaService.uploadFiles(files, category, (done, total) =>
        setProgress({ done, total }),
      );
      setResult(batch);
      return batch;
    } finally {
      setProgress(null);
    }
  }, []);

  const clearResult = useCallback(() => setResult(null), []);

  return { progress, isUploading: progress !== null, result, upload, clearResult };
}
