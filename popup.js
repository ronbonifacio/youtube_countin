const bpmInput = document.getElementById('bpm');
const beatsInput = document.getElementById('beats');
const tapBtn = document.getElementById('tap-btn');
const display = document.getElementById('display');
let tapTimes = [];
let tapTimeout;

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

// Load saved bpm and beats on popup open
chrome.storage.local.get(['bpm', 'beats'], (result) => {
  if (result.bpm) bpmInput.value = result.bpm;
  if (result.beats) beatsInput.value = result.beats;
  display.textContent = ''; // clear display on open
});

// Save bpm or beats when input changes
bpmInput.addEventListener('input', () => {
  const bpm = parseInt(bpmInput.value, 10);
  if (!isNaN(bpm) && bpm >= 40 && bpm <= 300) {
    chrome.storage.local.set({ bpm });
  }
});

beatsInput.addEventListener('input', () => {
  const beats = parseInt(beatsInput.value, 10);
  if (!isNaN(beats) && beats >= 1 && beats <= 16) {
    chrome.storage.local.set({ beats });
  }
});

// Tap Tempo logic
tapBtn.addEventListener('click', () => {
  const now = performance.now();
  tapTimes.push(now);

  if (tapTimes.length > 8) tapTimes.shift();

  clearTimeout(tapTimeout);
  tapTimeout = setTimeout(() => {
    finalizeBPM();
  }, 2000);

  updateBPMFromTaps();
});

function updateBPMFromTaps() {
  if (tapTimes.length >= 2) {
    let intervals = [];
    for (let i = 1; i < tapTimes.length; i++) {
      intervals.push(tapTimes[i] - tapTimes[i - 1]);
    }
    const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
    const bpm = Math.round(60000 / avgInterval);
    if (bpm >= 40 && bpm <= 300) {
      bpmInput.value = bpm;
      display.textContent = `Tap Tempo BPM: ${bpm}`;
      chrome.storage.local.set({ bpm });  // Save bpm from tap tempo
    }
  }
}

function finalizeBPM() {
  if (tapTimes.length >= 2) {
    updateBPMFromTaps();
    display.textContent = `Final BPM: ${bpmInput.value}`;
  }
  tapTimes = [];
}

// Reusable async function for count-in and video play
async function runCountIn() {
  const bpm = parseInt(bpmInput.value, 10);
  const beats = parseInt(beatsInput.value, 10);
  const interval = 60000 / bpm;

  for (let i = 1; i <= beats; i++) {
    display.textContent = `Count-In: ${i}`;
    playClickSound();
    await new Promise(r => setTimeout(r, interval));
  }

    display.textContent = "Go!";

  const tabs = await chrome.tabs.query({ url: "*://*.youtube.com/*" });
  if (tabs.length === 0) {
    display.textContent = "No YouTube tab found.";
    return;
  }

  const tabId = tabs[0].id;

  await chrome.scripting.executeScript({
    target: { tabId },
    func: () => {
      const video = document.querySelector('video');
      if (video) {
        if (video.paused) video.play();
      }
    }
  });

  display.textContent = "Playing YouTube video!";
}



// Start button triggers count-in + play
document.getElementById('start').addEventListener('click', runCountIn);

// Rewind button rewinds video, then restarts count-in + play
document.getElementById('rewind-video').addEventListener('click', async () => {
  const tabs = await chrome.tabs.query({ url: "*://*.youtube.com/*" });
  if (tabs.length === 0) {
    display.textContent = "No YouTube tab found to rewind.";
    return;
  }
  const tabId = tabs[0].id;

  // Pause and rewind video first
  await chrome.scripting.executeScript({
    target: { tabId },
    func: () => {
      const video = document.querySelector('video');
      if (video) {
        video.pause();
        video.currentTime = 0;
      }
    }
  });

  display.textContent = "Video paused and rewound. Starting count-in...";

  // Run the countdown, then play video
  await runCountIn();

  // After countdown, play the video
  await chrome.scripting.executeScript({
    target: { tabId },
    func: () => {
      const video = document.querySelector('video');
      if (video) video.play();
    }
  });

  display.textContent = "Playing video!";
});
