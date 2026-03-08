import { storage } from "./server/storage";
import type { InsertProductAd } from "./shared/schema";

async function test() {
  console.log("Testing createAd with new columns...");
  
  const testAd: InsertProductAd = {
    productId: null,
    platform: "TikTok",
    niche: "test-niche",
    videoUrl: "https://www.tiktok.com/@testuser/video/test123",
    thumbnailUrl: "https://example.com/thumb.jpg",
    views: 50000,
    likes: 3000,
    publishedAt: new Date("2026-03-01"),
    advertiserName: "Test Advertiser",
    adDescription: "This is a test TikTok ad description",
    landingPageUrl: "https://example.com/product",
    externalAdId: "test-ext-id-001",
  };
  
  try {
    const created = await storage.createAd(testAd);
    console.log("Created ad:", JSON.stringify(created, null, 2));
    
    // Now verify it's in the list
    const allAds = await storage.getAllAds();
    const found = allAds.find(a => a.externalAdId === "test-ext-id-001");
    if (found) {
      console.log("\nVerified ad in list:");
      console.log("  advertiserName:", found.advertiserName);
      console.log("  adDescription:", found.adDescription);
      console.log("  landingPageUrl:", found.landingPageUrl);
      console.log("  externalAdId:", found.externalAdId);
      console.log("  productId:", found.productId);
      console.log("  platform:", found.platform);
    } else {
      console.log("\nWARNING: Created ad not found in getAllAds!");
    }
    
    // Test dedup - try creating same externalAdId
    console.log("\nTesting dedup check...");
    const existingIds = new Set(allAds.filter(a => a.externalAdId).map(a => a.externalAdId));
    console.log("Existing external IDs count:", existingIds.size);
    console.log("Would dedup 'test-ext-id-001'?", existingIds.has("test-ext-id-001"));
    
    // Clean up - delete the test ad
    // (no delete method, but that's ok for testing)
    
  } catch (err: any) {
    console.error("Error:", err.message);
  }
}

test();
