import { z } from 'zod';

export interface AssetItem {
  path: string;
  size: number;
  ext: string;
  mtime: string;
}

export interface FavoriteItem {
  id: string;
  path: string;
  createdAt: string;
}

export interface FavoritesIndex {
  items: FavoriteItem[];
}

export const decorationAuthSchema = z.object({
  password: z.string().min(1),
});

export const assetUploadSchema = z.object({
  path: z.string().min(1),
});

export const favoriteApplySchema = z.object({
  id: z.string().min(1),
});

export const favoriteDeleteSchema = z.object({
  id: z.string().min(1),
});
