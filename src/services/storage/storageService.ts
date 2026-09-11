import { supabase } from '../../lib/supabase';

export interface UploadOptions {
  bucket?: 'avatars' | 'build-log-media' | 'project-assets';
  maxSizeBytes?: number;
  allowedTypes?: string[];
}

const DEFAULT_MAX_SIZE = 25 * 1024 * 1024; // 25 MB
const DEFAULT_ALLOWED_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/svg+xml',
  'video/mp4',
  'video/webm',
];

export const storageService = {
  /**
   * Validates file type and size before uploading
   */
  validateFile(file: File, options?: UploadOptions): { valid: boolean; error?: string } {
    const maxSizeBytes = options?.maxSizeBytes || DEFAULT_MAX_SIZE;
    const allowedTypes = options?.allowedTypes || DEFAULT_ALLOWED_TYPES;

    if (file.size > maxSizeBytes) {
      const maxMb = Math.round(maxSizeBytes / (1024 * 1024));
      return { valid: false, error: `File size (${(file.size / (1024 * 1024)).toFixed(1)} MB) exceeds limit of ${maxMb} MB` };
    }

    if (!allowedTypes.includes(file.type)) {
      return { valid: false, error: `Unsupported file type: ${file.type}. Allowed: images and videos.` };
    }

    return { valid: true };
  },

  /**
   * Uploads a file to Supabase Storage in user's isolated folder
   */
  async uploadFile(
    file: File,
    userId: string,
    options?: UploadOptions
  ): Promise<{ url: string; path: string }> {
    const validation = this.validateFile(file, options);
    if (!validation.valid) {
      throw new Error(validation.error || 'Invalid file');
    }

    const bucket = options?.bucket || 'build-log-media';
    const cleanFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const filePath = `${userId}/${Date.now()}_${cleanFileName}`;

    const { error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: true,
      });

    if (uploadError) {
      throw new Error(`Storage upload error: ${uploadError.message}`);
    }

    const { data: publicData } = supabase.storage
      .from(bucket)
      .getPublicUrl(filePath);

    return {
      url: publicData.publicUrl,
      path: filePath,
    };
  },

  /**
   * Upload user profile avatar to 'avatars' bucket
   */
  async uploadAvatar(file: File, userId: string): Promise<string> {
    const res = await this.uploadFile(file, userId, {
      bucket: 'avatars',
      maxSizeBytes: 5 * 1024 * 1024,
      allowedTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
    });
    return res.url;
  },

  /**
   * Upload project banner / screenshot to 'project-assets' bucket
   */
  async uploadProjectMedia(file: File, userId: string): Promise<string> {
    const res = await this.uploadFile(file, userId, {
      bucket: 'project-assets',
    });
    return res.url;
  },

  /**
   * Upload Build Log media to 'build-log-media' bucket
   */
  async uploadBuildLogMedia(
    file: File,
    userId: string
  ): Promise<{ url: string; type: 'image' | 'video' | 'diagram' }> {
    const res = await this.uploadFile(file, userId, {
      bucket: 'build-log-media',
    });
    const isVideo = file.type.startsWith('video/');
    return {
      url: res.url,
      type: isVideo ? 'video' : 'image',
    };
  },
};
