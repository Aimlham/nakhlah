import type { ProductAd } from "@shared/schema";

let cachedAds: ProductAd[] | null = null;

export function getMockAds(): ProductAd[] {
  if (cachedAds) return cachedAds;

  const mockAds: Omit<ProductAd, "id" | "createdAt">[] = [
    { productId: "1", platform: "TikTok", niche: "Ambient Lighting", videoUrl: "https://www.tiktok.com/@example/video/1", thumbnailUrl: "https://images.unsplash.com/photo-1611162616475-46b635cb6868?w=300&h=400&fit=crop", views: 2400000, likes: 185000, publishedAt: new Date("2026-03-04") },
    { productId: "1", platform: "TikTok", niche: "Ambient Lighting", videoUrl: "https://www.tiktok.com/@example/video/2", thumbnailUrl: "https://images.unsplash.com/photo-1611162618071-b39a2ec055fb?w=300&h=400&fit=crop", views: 1100000, likes: 92000, publishedAt: new Date("2026-03-03") },
    { productId: "1", platform: "Facebook", niche: "Ambient Lighting", videoUrl: "https://facebook.com/ads/example/1", thumbnailUrl: "https://images.unsplash.com/photo-1611162616305-c69b3fa7fbe0?w=300&h=400&fit=crop", views: 850000, likes: 42000, publishedAt: new Date("2026-03-02") },
    { productId: "2", platform: "TikTok", niche: "Health & Fitness", videoUrl: "https://www.tiktok.com/@example/video/3", thumbnailUrl: "https://images.unsplash.com/photo-1622597467836-f3285f2131b8?w=300&h=400&fit=crop", views: 3200000, likes: 245000, publishedAt: new Date("2026-03-05") },
    { productId: "2", platform: "TikTok", niche: "Health & Fitness", videoUrl: "https://www.tiktok.com/@example/video/4", thumbnailUrl: "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=300&h=400&fit=crop", views: 980000, likes: 67000, publishedAt: new Date("2026-03-01") },
    { productId: "3", platform: "TikTok", niche: "Vanity & Beauty", videoUrl: "https://www.tiktok.com/@example/video/5", thumbnailUrl: "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=300&h=400&fit=crop", views: 1500000, likes: 120000, publishedAt: new Date("2026-03-04") },
    { productId: "3", platform: "Instagram", niche: "Vanity & Beauty", videoUrl: "https://instagram.com/reel/example1", thumbnailUrl: "https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?w=300&h=400&fit=crop", views: 680000, likes: 55000, publishedAt: new Date("2026-03-03") },
    { productId: "4", platform: "TikTok", niche: "Car Accessories", videoUrl: "https://www.tiktok.com/@example/video/6", thumbnailUrl: "https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?w=300&h=400&fit=crop", views: 750000, likes: 48000, publishedAt: new Date("2026-02-28") },
    { productId: "5", platform: "TikTok", niche: "Stationery & Gadgets", videoUrl: "https://www.tiktok.com/@example/video/7", thumbnailUrl: "https://images.unsplash.com/photo-1588681664899-f142ff2dc9b1?w=300&h=400&fit=crop", views: 4100000, likes: 310000, publishedAt: new Date("2026-03-06") },
    { productId: "5", platform: "TikTok", niche: "Stationery & Gadgets", videoUrl: "https://www.tiktok.com/@example/video/8", thumbnailUrl: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=300&h=400&fit=crop", views: 1800000, likes: 145000, publishedAt: new Date("2026-03-05") },
    { productId: "5", platform: "Facebook", niche: "Stationery & Gadgets", videoUrl: "https://facebook.com/ads/example/2", thumbnailUrl: "https://images.unsplash.com/photo-1468495244123-6c6c332eeece?w=300&h=400&fit=crop", views: 620000, likes: 31000, publishedAt: new Date("2026-03-01") },
    { productId: "6", platform: "TikTok", niche: "Ergonomics", videoUrl: "https://www.tiktok.com/@example/video/9", thumbnailUrl: "https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=300&h=400&fit=crop", views: 920000, likes: 73000, publishedAt: new Date("2026-03-03") },
    { productId: "7", platform: "TikTok", niche: "Storage & Organization", videoUrl: "https://www.tiktok.com/@example/video/10", thumbnailUrl: "https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=300&h=400&fit=crop", views: 560000, likes: 38000, publishedAt: new Date("2026-02-27") },
    { productId: "8", platform: "TikTok", niche: "Health & Hydration", videoUrl: "https://www.tiktok.com/@example/video/11", thumbnailUrl: "https://images.unsplash.com/photo-1523362628745-0c100150b504?w=300&h=400&fit=crop", views: 2100000, likes: 167000, publishedAt: new Date("2026-03-04") },
    { productId: "9", platform: "TikTok", niche: "Accessories", videoUrl: "https://www.tiktok.com/@example/video/12", thumbnailUrl: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=300&h=400&fit=crop", views: 1350000, likes: 98000, publishedAt: new Date("2026-03-05") },
    { productId: "10", platform: "TikTok", niche: "Cleaning", videoUrl: "https://www.tiktok.com/@example/video/13", thumbnailUrl: "https://images.unsplash.com/photo-1450778869180-41d0601e046e?w=300&h=400&fit=crop", views: 890000, likes: 62000, publishedAt: new Date("2026-03-02") },
    { productId: "12", platform: "TikTok", niche: "Gaming", videoUrl: "https://www.tiktok.com/@example/video/14", thumbnailUrl: "https://images.unsplash.com/photo-1593642632559-0c6d3fc62b89?w=300&h=400&fit=crop", views: 1700000, likes: 130000, publishedAt: new Date("2026-03-06") },
    { productId: "12", platform: "Instagram", niche: "Gaming", videoUrl: "https://instagram.com/reel/example2", thumbnailUrl: "https://images.unsplash.com/photo-1542751371-adc38448a05e?w=300&h=400&fit=crop", views: 450000, likes: 28000, publishedAt: new Date("2026-03-01") },
  ];

  const adDates = [
    new Date("2026-03-06"), new Date("2026-03-05"), new Date("2026-03-04"),
    new Date("2026-03-06"), new Date("2026-03-03"), new Date("2026-03-05"),
    new Date("2026-03-04"), new Date("2026-03-02"), new Date("2026-03-06"),
    new Date("2026-03-05"), new Date("2026-03-03"), new Date("2026-03-04"),
    new Date("2026-03-01"), new Date("2026-03-05"), new Date("2026-03-06"),
    new Date("2026-03-04"), new Date("2026-03-06"), new Date("2026-03-03"),
  ];

  cachedAds = mockAds.map((ad, i) => ({
    ...ad,
    id: `ad-${i + 1}`,
    createdAt: adDates[i] || new Date(),
  }));

  return cachedAds;
}
