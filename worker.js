
// Web Worker for NGL Wave background timing
let timer = null;

self.onmessage = function(e) {
  const { type, delay } = e.data;

  if (type === 'START') {
    if (timer) clearInterval(timer);
    
    // Initial trigger
    self.postMessage({ type: 'TICK' });
    
    timer = setInterval(() => {
      self.postMessage({ type: 'TICK' });
    }, delay);
  }

  if (type === 'STOP') {
    if (timer) clearInterval(timer);
    timer = null;
  }
};
