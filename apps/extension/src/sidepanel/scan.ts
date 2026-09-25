import type { ProductCandidate } from '@tryon/shared';

export async function scanActivePage(): Promise<{ products: ProductCandidate[] }> {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) throw new Error('Open a shopping page before scanning.');
  if (tab.url && !/^https?:\/\//i.test(tab.url)) {
    throw new Error('Open a shopping website to scan. Browser settings and new-tab pages cannot be scanned.');
  }
  try {
    return await chrome.tabs.sendMessage(tab.id, { type: 'SCAN_PRODUCTS' });
  } catch (error) {
    if (!/Receiving end does not exist|Could not establish connection/i.test(String(error))) throw error;
    // Reloading an extension invalidates its listeners on already-open tabs.
    try {
      await chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ['assets/content.js'] });
      return await chrome.tabs.sendMessage(tab.id, { type: 'SCAN_PRODUCTS' });
    } catch {
      throw new Error('Could not scan this page. Refresh the shopping tab, then click Scan again.');
    }
  }
}
