let tapTimes = [];
const bpmInput = document.getElementById('bpm');
let stopTapTimer;

document.getElementById('tap-btn').addEventListener('click', () => {
  const now = performance.now();
  tapTimes.push(now);

  // Keep only the last 8 taps
  if (tapTimes.length > 8) tapTimes.shift();

  // Clear previous timer & set a new one for 2 seconds
  clearTimeout(stopTapTimer);
  stopTapTimer = setTimeout(() => {
    finalizeBPM();
  }, 2000);

  // You can optionally update BPM live here if you want
  updateBPMFromTaps();
});

function updateBPMFromTaps() {
  if (tapTimes.length >= 2) {
    const intervals = [];
    for (let i = 1; i < tapTimes.length; i++) {
      intervals.push(tapTimes[i] - tapTimes[i - 1]);
    }
    const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
    const bpm = Math.round(60000 / avgInterval);

    if (bpm >= 40 && bpm <= 300) {
      bpmInput.value = bpm;
    }
  }
}

function finalizeBPM() {
  // Called when user stopped tapping for 2 seconds
  if (tapTimes.length >= 2) {
    updateBPMFromTaps();
    // You can add any extra logic here, like locking the BPM input
    console.log('Final BPM set:', bpmInput.value);
  }
}

document.getElementById('start').addEventListener('click', async () => {
  const bpm = parseInt(document.getElementById('bpm').value, 10);
  const beats = parseInt(document.getElementById('beats').value, 10);
  const beatInterval = 60000 / bpm; // ms per beat
  const display = document.getElementById('display');

  for (let i = 1; i <= beats; i++) {
    display.textContent = i;
    playClickSound();
    await new Promise(res => setTimeout(res, beatInterval));
  }

  display.textContent = "Go!";

  // Find YouTube tab
  const tabs = await chrome.tabs.query({ url: "*://*.youtube.com/*" });

  if (tabs.length > 0) {
    const tabId = tabs[0].id;

    await chrome.scripting.executeScript({
      target: { tabId: tabId },
      func: () => {
        const video = document.querySelector('video');
        if (video && video.paused) {
          video.play();
        }
      }
    });
  } else {
    display.textContent = "YouTube tab not found.";
  }
});

function playClickSound() {
  const ctx = new (window.AudioContext || window.webkitAudioContext)();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'square';
  osc.frequency.value = 1000;
  gain.gain.value = 0.1;

  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start();
  osc.stop(ctx.currentTime + 0.05);
}