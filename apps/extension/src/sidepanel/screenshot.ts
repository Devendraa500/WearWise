export async function captureShoppingPage(): Promise<string> {
  // Must be invoked directly by a click, before awaiting any other API, so
  // Chrome can show the optional permission prompt with a user gesture.
  const granted = await chrome.permissions.request({ origins: ['<all_urls>'] });
  if (!granted) throw new Error('Screenshot access was not granted. Click Select image again and allow access to capture clothing.');
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id || !tab.url || !/^https?:\/\//i.test(tab.url)) {
    throw new Error('Switch to your shopping website, then click Select image.');
  }
  try {
    return await chrome.tabs.captureVisibleTab(tab.windowId, { format: 'png' });
  } catch (error) {
    throw new Error(`Screenshot could not be captured: ${error instanceof Error ? error.message : String(error)}`);
  }
}
