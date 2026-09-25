import './sidepanel/styles.css';
const allow = document.getElementById('allow') as HTMLButtonElement;
allow.className = 'primary';
allow.onclick = async () => {
  allow.disabled = true;
  const status = document.getElementById('status')!;
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
    stream.getTracks().forEach(track => track.stop());
    status.textContent = 'Camera access granted. Return to your shopping tab and click Retry camera in WearWise. You may close this tab.';
  } catch {
    status.textContent = 'Access was not granted. Check the camera permission for this extension in your browser and the Windows camera privacy settings, then try again.';
  } finally { allow.disabled = false; }
};
