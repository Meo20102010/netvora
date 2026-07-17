import { chromium } from 'playwright';
import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();

async function extractVideoUrl(page) {
  return await page.evaluate(() => {
    // Look for m3u8 URLs in script tags
    const scripts = document.querySelectorAll('script');
    for (const s of scripts) {
      const text = s.textContent || '';
      const match = text.match(/https?:\/\/kanaldvod\.duhnet\.tv[^\s"']+\.m3u8/);
      if (match) return match[0];
    }
    // Also check for DailyMotion video IDs
    const iframes = document.querySelectorAll('iframe');
    for (const f of iframes) {
      const src = f.src || '';
      if (src.includes('dailymotion.com') && src.includes('video=')) {
        const m = src.match(/video=([^&]+)/);
        if (m) return 'https://www.dailymotion.com/embed/video/' + m[1];
      }
    }
    return null;
  });
}

async function scrapeEpisodeVideos(baseUrl, slug) {
  console.log(`\n=== Scraping: ${slug} ===`);
  console.log('Episode listing:', baseUrl + '/bolumler');
  
  const browser = await chromium.launch({ headless: true, timeout: 30000 });
  const page = await browser.newPage();
  
  try {
    // Go to episode listing page
    await page.goto(baseUrl + '/bolumler', { waitUntil: 'domcontentloaded', timeout: 60000 });
    
    // Get all episode links
    const episodes = await page.evaluate((s) => {
      const links = [];
      document.querySelectorAll('a[href*="bolum"]').forEach(a => {
        const href = a.getAttribute('href');
        if (!href || links.find(l => l.url === href)) return;
        // Clean up title
        let title = a.textContent?.trim().replace(/\s+/g, ' ') || '';
        if (!title && a.querySelector('img')) {
          title = a.querySelector('img').getAttribute('alt') || '';
        }
        links.push({ url: href.startsWith('http') ? href : 'https://www.kanald.com.tr' + href, title });
      });
      return links;
    }, slug);
    
    console.log(`Found ${episodes.length} episode links`);
    
    // Visit each episode page to get video URL
    const results = [];
    for (let i = 0; i < Math.min(episodes.length, 10); i++) { // limit for now
      const ep = episodes[i];
      console.log(`  [${i+1}/${episodes.length}] ${ep.title || ep.url}`);
      try {
        await page.goto(ep.url, { waitUntil: 'domcontentloaded', timeout: 60000 });
        const videoUrl = await extractVideoUrl(page);
        if (videoUrl) {
          console.log(`    -> Video: ${videoUrl.substring(0, 80)}...`);
          results.push({ ...ep, videoUrl });
        } else {
          console.log(`    -> No video URL found`);
        }
      } catch (e) {
        console.log(`    -> Error: ${e.message}`);
      }
    }
    
    return results;
  } finally {
    await browser.close();
  }
}

// Test with Daha 17
const results = await scrapeEpisodeVideos('https://www.kanald.com.tr/daha-17', 'daha-17');
console.log('\n\nResults:', JSON.stringify(results, null, 2));
await prisma.$disconnect();
