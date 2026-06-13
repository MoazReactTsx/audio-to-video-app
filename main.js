const S = {
  imgEl: null,
  audioBuf: null,
  playing: false,
  startedAt: 0,
  pausedAt: 0,
  trimA: 0,
  trimB: 0,
  mode: 'bars',
  hue: 220,
  intensity: 0.8,
  overlay: 0.45,
  particles: [],
  ripples: [],
  lastBeat: 0,
  recording: false,
  recCanceled: false,
};

let actx, analyser, freqData, timeData, src;
let volGain, bassF, midF, trebF;
let convolver, rvbSend, rvbDry;
let dlyNode, fbGain, dlySend;
let masterGain, compNode, mediaDest;

let cvs, c, tlCvs, tl;
let waveform = null;

document.getElementById('imgInput').addEventListener('change', e => {
  const f = e.target.files[0]; if (!f) return;
  const r = new FileReader();
  r.onload = ev => {
    const img = new Image();
    img.onload = () => {
      S.imgEl = img;
      document.getElementById('imgCard').classList.add('done');
      document.getElementById('imgStatus').textContent = '✓ ' + f.name;
      checkReady();
    };
    img.src = ev.target.result;
  };
  r.readAsDataURL(f);
});

document.getElementById('audioInput').addEventListener('change', async e => {
  const f = e.target.files[0]; if (!f) return;
  document.getElementById('audioStatus').textContent = '⏳ Decoding…';

  if (!actx) {
    actx = new (window.AudioContext || window.webkitAudioContext)();
    buildAudioGraph();
  }

  try {
    const ab = await f.arrayBuffer();
    const buf = await actx.decodeAudioData(ab);
    S.audioBuf = buf;
    S.trimA = 0;
    S.trimB = buf.duration;
    S.pausedAt = 0;
    extractWaveform(buf);
    document.getElementById('audioCard').classList.add('done');
    document.getElementById('audioStatus').textContent = '✓ ' + f.name;
    checkReady();
  } catch(err) {
    document.getElementById('audioStatus').textContent = '❌ ' + err.message;
  }
});

['imgCard','audioCard'].forEach(id => {
  const el = document.getElementById(id);
  el.addEventListener('dragover', e => { e.preventDefault(); el.classList.add('drag-over'); });
  el.addEventListener('dragleave', () => el.classList.remove('drag-over'));
  el.addEventListener('drop', e => {
    e.preventDefault(); el.classList.remove('drag-over');
    const inp = document.getElementById(id === 'imgCard' ? 'imgInput' : 'audioInput');
    const dt = new DataTransfer(); dt.items.add(e.dataTransfer.files[0]);
    inp.files = dt.files; inp.dispatchEvent(new Event('change'));
  });
});

function checkReady() {
  if (S.imgEl && S.audioBuf)
    document.getElementById('startBtn').classList.add('ready');
}

function openEditor() {
  document.getElementById('uploadPage').classList.add('exit');
  setTimeout(() => {
    document.getElementById('uploadPage').style.display = 'none';
    const ed = document.getElementById('editor');
    ed.classList.add('active');

    cvs = document.getElementById('mainCanvas');
    c   = cvs.getContext('2d');
    tlCvs = document.getElementById('tlCanvas');
    tl    = tlCvs.getContext('2d');

    sizeCanvas();
    window.addEventListener('resize', sizeCanvas);
    setupTimelineEvents();
    setupKeyboard();
    requestAnimationFrame(loop);
  }, 400);
}

function buildAudioGraph() {
  analyser = actx.createAnalyser();
  analyser.fftSize = 1024;
  analyser.smoothingTimeConstant = 0.82;
  freqData = new Uint8Array(analyser.frequencyBinCount);
  timeData = new Uint8Array(analyser.frequencyBinCount * 2);

  volGain = actx.createGain(); volGain.gain.value = 1;

  bassF = actx.createBiquadFilter(); bassF.type = 'lowshelf'; bassF.frequency.value = 150;
  midF  = actx.createBiquadFilter(); midF.type  = 'peaking';  midF.frequency.value  = 800; midF.Q.value = 1;
  trebF = actx.createBiquadFilter(); trebF.type = 'highshelf'; trebF.frequency.value = 4000;

  convolver = actx.createConvolver();
  convolver.buffer = buildReverb();
  rvbSend = actx.createGain(); rvbSend.gain.value = 0;
  rvbDry  = actx.createGain(); rvbDry.gain.value  = 1;

  dlyNode = actx.createDelay(3); dlyNode.delayTime.value = 0.35;
  fbGain  = actx.createGain(); fbGain.gain.value  = 0.3;
  dlySend = actx.createGain(); dlySend.gain.value = 0;

  masterGain = actx.createGain();
  compNode   = actx.createDynamicsCompressor();
  compNode.threshold.value = -24; compNode.knee.value = 30;
  compNode.ratio.value = 4; compNode.attack.value = 0.003; compNode.release.value = 0.25;

  analyser.connect(volGain);
  volGain.connect(bassF); bassF.connect(midF); midF.connect(trebF);

  trebF.connect(rvbDry); rvbDry.connect(masterGain);
  trebF.connect(rvbSend); rvbSend.connect(convolver); convolver.connect(masterGain);
  trebF.connect(dlySend); dlySend.connect(dlyNode);
  dlyNode.connect(fbGain); fbGain.connect(dlyNode);
  dlyNode.connect(masterGain);

  masterGain.connect(compNode);
  compNode.connect(actx.destination);

  mediaDest = actx.createMediaStreamDestination();
  compNode.connect(mediaDest);
}

function buildReverb() {
  const sr = actx.sampleRate, len = Math.floor(sr * 2.5);
  const buf = actx.createBuffer(2, len, sr);
  for (let ch = 0; ch < 2; ch++) {
    const d = buf.getChannelData(ch);
    for (let i = 0; i < len; i++) d[i] = (Math.random()*2-1)*Math.pow(1-i/len, 2);
  }
  return buf;
}

function play() {
  if (S.playing || !S.audioBuf) return;
  if (actx.state === 'suspended') actx.resume();

  src = actx.createBufferSource();
  src.buffer = S.audioBuf;
  src.connect(analyser);

  const offset = clamp(S.pausedAt, S.trimA, S.trimB);
  src.start(0, offset, S.trimB - offset);
  S.startedAt = actx.currentTime - offset;
  S.playing = true;
  document.getElementById('playBtn').textContent = '⏸';

  src.onended = () => {
    if (S.playing) {
      S.playing = false;
      S.pausedAt = S.trimA;
      document.getElementById('playBtn').textContent = '▶';
    }
    if (S.recording && !S.recCanceled) {
      setTimeout(() => finalizeExport(), 300);
    }
  };
}

function pause() {
  if (!S.playing) return;
  S.pausedAt = getNow();
  try { src.stop(); } catch(e) {}
  src = null; S.playing = false;
  document.getElementById('playBtn').textContent = '▶';
}

function stopAll() {
  if (S.playing) { try { src.stop(); } catch(e) {} src = null; S.playing = false; }
  S.pausedAt = S.trimA;
  document.getElementById('playBtn').textContent = '▶';
}

function togglePlay() { S.playing ? pause() : play(); }
function seekStart() { const wp = S.playing; if(wp) pause(); S.pausedAt = S.trimA; if(wp) play(); }
function seekEnd()   { const wp = S.playing; if(wp) pause(); S.pausedAt = S.trimB - 0.05; if(wp) play(); }

function seekTo(t) {
  const wp = S.playing;
  if (wp) { try { src.stop(); } catch(e) {} src = null; S.playing = false; }
  S.pausedAt = clamp(t, S.trimA, S.trimB);
  if (wp) play();
}

function getNow() {
  return S.playing ? actx.currentTime - S.startedAt : S.pausedAt;
}

function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }

function extractWaveform(buf) {
  const ch = buf.getChannelData(0);
  const N = 1200, bs = Math.floor(ch.length / N);
  waveform = new Float32Array(N);
  for (let i = 0; i < N; i++) {
    let mx = 0;
    for (let j = 0; j < bs; j++) mx = Math.max(mx, Math.abs(ch[i*bs+j]));
    waveform[i] = mx;
  }
}

function sizeCanvas() {
  const wrap = cvs.parentElement;
  const W = wrap.clientWidth, H = wrap.clientHeight;
  let cw = W, ch = Math.floor(W * 9 / 16);
  if (ch > H) { ch = H; cw = Math.floor(H * 16 / 9); }
  cvs.width = cw; cvs.height = ch;
}

function loop() {
  renderMain();
  renderTimeline();
  updateTimeLbl();
  updateLevelMeter();
  requestAnimationFrame(loop);
}

function renderMain() {
  const W = cvs.width, H = cvs.height;
  c.clearRect(0, 0, W, H);

  if (analyser) {
    analyser.getByteFrequencyData(freqData);
    analyser.getByteTimeDomainData(timeData);
  }

  const energy = getEnergy();
  const beat   = detectBeat(energy);

  if (S.imgEl) {
    const scale = 1 + energy * 0.04 * S.intensity;
    c.save();
    c.translate(W/2, H/2);
    c.scale(scale, scale);
    c.drawImage(S.imgEl, -W/2, -H/2, W, H);
    c.restore();
  } else {
    c.fillStyle = '#06060e';
    c.fillRect(0, 0, W, H);
  }

  c.fillStyle = `rgba(0,0,0,${S.overlay})`;
  c.fillRect(0, 0, W, H);

  c.fillStyle = `hsla(${S.hue},80%,50%,${energy * 0.18 * S.intensity})`;
  c.fillRect(0, 0, W, H);

  switch(S.mode) {
    case 'bars':     drawBars(W, H);          break;
    case 'wave':     drawWave(W, H);          break;
    case 'circular': drawCircular(W, H);      break;
    case 'particles':drawParticles(W,H,energy,beat); break;
    case 'ripple':   drawRipple(W,H,energy,beat);    break;
  }
}

function getEnergy() {
  if (!freqData) return 0;
  let s = 0;
  for (let i = 0; i < 16; i++) s += freqData[i];
  return s / (16 * 255);
}

function detectBeat(e) {
  const now = Date.now();
  if (e > 0.55 && now - S.lastBeat > 220) { S.lastBeat = now; return true; }
  return false;
}

function drawBars(W, H) {
  const bins = Math.floor(freqData.length * 0.65);
  const bw = W / bins;
  for (let i = 0; i < bins; i++) {
    const v   = freqData[i] / 255;
    const bh  = v * H * 0.72 * S.intensity;
    const hue = (S.hue + i * 0.6) % 360;
    const gr  = c.createLinearGradient(0, H, 0, H - bh);
    gr.addColorStop(0, `hsla(${hue},90%,50%,.9)`);
    gr.addColorStop(1, `hsla(${(hue+50)%360},90%,80%,.7)`);
    c.fillStyle = gr;
    c.shadowBlur = 10; c.shadowColor = `hsla(${hue},90%,60%,.8)`;
    c.fillRect(i * bw, H - bh, bw - 1, bh);
  }
  c.shadowBlur = 0;
}

function drawWave(W, H) {
  if (!timeData) return;
  const len = timeData.length;
  const sw  = W / len;

  for (let pass = 0; pass < 2; pass++) {
    c.beginPath();
    for (let i = 0; i < len; i++) {
      const v = timeData[i] / 128;
      const y = pass === 0 ? v * H / 2 : H - v * H / 2;
      i === 0 ? c.moveTo(0, y) : c.lineTo(i * sw, y);
    }
    c.strokeStyle = pass === 0
      ? `hsla(${S.hue},90%,65%,.9)`
      : `hsla(${(S.hue+60)%360},90%,65%,.55)`;
    c.lineWidth = (3 - pass) * S.intensity;
    c.shadowBlur = 18; c.shadowColor = `hsla(${S.hue},90%,60%,.5)`;
    c.stroke();
  }
  c.shadowBlur = 0;
}

function drawCircular(W, H) {
  const cx = W/2, cy = H/2;
  const baseR = Math.min(W,H) * 0.27;
  const bins  = Math.floor(freqData.length * 0.5);

  c.save(); c.translate(cx, cy);

  for (let half = 0; half < 2; half++) {
    for (let i = 0; i < bins; i++) {
      const angle = (i / bins) * Math.PI - Math.PI/2 + (half ? Math.PI : 0);
      const v    = freqData[i] / 255;
      const len  = v * Math.min(W,H) * 0.28 * S.intensity;
      const hue  = (S.hue + i * (360/bins)) % 360;

      c.beginPath();
      c.moveTo(Math.cos(angle)*baseR, Math.sin(angle)*baseR);
      c.lineTo(Math.cos(angle)*(baseR+len), Math.sin(angle)*(baseR+len));
      c.strokeStyle = `hsla(${hue},90%,65%,.9)`;
      c.lineWidth = 2;
      c.shadowBlur = 8; c.shadowColor = `hsla(${hue},90%,65%,.7)`;
      c.stroke();
    }
  }

  c.beginPath(); c.arc(0,0,baseR,0,Math.PI*2);
  c.strokeStyle = `hsla(${S.hue},70%,60%,.25)`;
  c.lineWidth = 1; c.shadowBlur = 0; c.stroke();

  c.restore();
}

function drawParticles(W, H, energy, beat) {
  if (beat || energy > 0.25) {
    const n = Math.floor(energy * 18 * S.intensity);
    for (let i = 0; i < n; i++) {
      S.particles.push({
        x: W*.1 + Math.random()*W*.8,
        y: H - 5,
        vx: (Math.random()-.5) * 4 * energy * S.intensity,
        vy: -(Math.random()*5+2) * energy * S.intensity,
        life: 1,
        decay: .008 + Math.random()*.018,
        r: 2 + Math.random()*5 * energy * S.intensity,
        hue: (S.hue + Math.random()*70-35 + 360) % 360,
      });
    }
  }

  S.particles = S.particles.filter(p => p.life > 0);
  for (const p of S.particles) {
    p.x += p.vx; p.y += p.vy; p.vy -= 0.06; p.life -= p.decay;
    c.globalAlpha = p.life * .85;
    c.shadowBlur = 12; c.shadowColor = `hsla(${p.hue},90%,70%,.9)`;
    c.fillStyle = `hsla(${p.hue},90%,72%,1)`;
    c.beginPath(); c.arc(p.x, p.y, p.r*p.life, 0, Math.PI*2); c.fill();
  }
  c.globalAlpha = 1; c.shadowBlur = 0;

  const bins = Math.floor(freqData.length * 0.5);
  const bw   = W / bins;
  for (let i = 0; i < bins; i++) {
    const v = freqData[i]/255;
    c.fillStyle = `hsla(${(S.hue+i)%360},80%,60%,.35)`;
    c.fillRect(i*bw, H - v*H*0.12*S.intensity, bw-1, v*H*0.12*S.intensity);
  }
}

function drawRipple(W, H, energy, beat) {
  const cx = W/2, cy = H/2;
  const maxR = Math.sqrt(W*W+H*H)*0.55;

  if (beat) {
    S.ripples.push({ r:10, max:maxR, life:1, hue:(S.hue+Math.random()*60)%360 });
  }
  if (energy > 0.15) {
    S.ripples.push({ r:energy*40*S.intensity, max:maxR*energy*S.intensity*.8, life:.4, hue:S.hue });
  }

  S.ripples = S.ripples.filter(r => r.life > 0 && r.r < r.max);
  for (const r of S.ripples) {
    r.r += 4 + energy * 6; r.life -= 0.018;
    c.beginPath(); c.arc(cx, cy, r.r, 0, Math.PI*2);
    c.strokeStyle = `hsla(${r.hue},90%,70%,${r.life*.65})`;
    c.lineWidth = 2*r.life*S.intensity;
    c.shadowBlur = 16; c.shadowColor = `hsla(${r.hue},90%,70%,${r.life*.4})`;
    c.stroke();
  }

  const pr = 35 + energy * Math.min(W,H) * 0.35 * S.intensity;
  c.beginPath(); c.arc(cx, cy, pr, 0, Math.PI*2);
  c.strokeStyle = `hsla(${S.hue},90%,65%,${energy*.6})`;
  c.lineWidth = 3; c.shadowBlur = 24;
  c.shadowColor = `hsla(${S.hue},90%,65%,.5)`; c.stroke();
  c.shadowBlur = 0;
}

function renderTimeline() {
  if (!waveform || !S.audioBuf) return;

  const W = tlCvs.clientWidth || 800;
  tlCvs.width = W; tlCvs.height = 72;
  const H = 72, mid = H/2;

  tl.fillStyle = '#0a0a14'; tl.fillRect(0, 0, W, H);

  const dur = S.audioBuf.duration;
  const ax = t => (t / dur) * W;

  tl.fillStyle = 'rgba(0,0,0,.55)';
  tl.fillRect(0, 0, ax(S.trimA), H);
  tl.fillRect(ax(S.trimB), 0, W - ax(S.trimB), H);

  const N = waveform.length;
  for (let i = 0; i < N; i++) {
    const x = (i/N) * W;
    const amp = waveform[i] * mid * 0.88;
    const inTrim = x >= ax(S.trimA) && x <= ax(S.trimB);
    tl.fillStyle = inTrim
      ? `hsla(${S.hue},65%,55%,.85)`
      : `hsla(${S.hue},40%,35%,.4)`;
    tl.fillRect(x, mid - amp, 1, amp * 2);
  }

  const ax_a = ax(S.trimA);
  tl.fillStyle = '#39d98a';
  tl.fillRect(ax_a, 0, 5, H);
  tl.fillStyle = 'rgba(0,0,0,.7)';
  tl.fillRect(ax_a, H/2-10, 5, 20);
  tl.fillStyle = '#39d98a';
  tl.font = '10px monospace'; tl.fillText('◀', ax_a, H/2+4);

  const ax_b = ax(S.trimB);
  tl.fillStyle = '#f06292';
  tl.fillRect(ax_b-5, 0, 5, H);
  tl.fillStyle = '#f06292';
  tl.fillText('▶', ax_b-5, H/2+4);

  const px = ax(getNow());
  tl.fillStyle = '#fff';
  tl.fillRect(px-1, 0, 2, H);
  tl.beginPath(); tl.moveTo(px-6,0); tl.lineTo(px+6,0); tl.lineTo(px,10);
  tl.closePath(); tl.fill();

  tl.fillStyle = 'rgba(255,255,255,.25)';
  tl.font = '9px monospace';
  for (let i = 0; i <= 10; i++) {
    const x = (i/10)*W;
    const t = (i/10)*dur;
    tl.fillRect(x, H-12, 1, 12);
    tl.fillText(fmt(t), x+2, H-2);
  }
}

function setupTimelineEvents() {
  let drag = null;

  function xToTime(x) {
    const W = tlCvs.clientWidth;
    return (x / W) * (S.audioBuf ? S.audioBuf.duration : 1);
  }

  function handleAt(x) {
    if (!S.audioBuf) return null;
    const W = tlCvs.clientWidth;
    const dur = S.audioBuf.duration;
    const ax_a = (S.trimA / dur) * W;
    const ax_b = (S.trimB / dur) * W;
    if (Math.abs(x - ax_a) < 12) return 'a';
    if (Math.abs(x - ax_b) < 12) return 'b';
    return 'play';
  }

  tlCvs.addEventListener('mousedown', e => {
    const r = tlCvs.getBoundingClientRect();
    const x = e.clientX - r.left;
    drag = handleAt(x);
    if (drag === 'play') seekTo(xToTime(x));
  });

  document.addEventListener('mousemove', e => {
    if (!drag || !S.audioBuf) return;
    const r = tlCvs.getBoundingClientRect();
    const x = clamp(e.clientX - r.left, 0, tlCvs.clientWidth);
    const t = xToTime(x);
    if (drag === 'a') {
      S.trimA = clamp(t, 0, S.trimB - 0.1);
      if (S.pausedAt < S.trimA) S.pausedAt = S.trimA;
    } else if (drag === 'b') {
      S.trimB = clamp(t, S.trimA + 0.1, S.audioBuf.duration);
      if (S.pausedAt > S.trimB) S.pausedAt = S.trimB;
    } else {
      seekTo(t);
    }
  });

  document.addEventListener('mouseup', () => { drag = null; });

  tlCvs.addEventListener('touchstart', e => {
    e.preventDefault();
    const r = tlCvs.getBoundingClientRect();
    const x = e.touches[0].clientX - r.left;
    drag = handleAt(x);
    if (drag === 'play') seekTo(xToTime(x));
  }, { passive:false });

  document.addEventListener('touchmove', e => {
    if (!drag) return;
    const r = tlCvs.getBoundingClientRect();
    const x = clamp(e.touches[0].clientX - r.left, 0, tlCvs.clientWidth);
    const t = xToTime(x);
    if (drag === 'a') S.trimA = clamp(t, 0, S.trimB-.1);
    else if (drag === 'b') S.trimB = clamp(t, S.trimA+.1, S.audioBuf.duration);
    else seekTo(t);
  });

  document.addEventListener('touchend', () => { drag = null; });
}

function fmt(t) {
  const m = Math.floor(t/60), s = Math.floor(t%60), ms = Math.floor((t%1)*10);
  return `${m}:${s.toString().padStart(2,'0')}.${ms}`;
}

function updateTimeLbl() {
  if (!S.audioBuf) return;
  document.getElementById('tlTime').textContent =
    `${fmt(getNow())} / ${fmt(S.audioBuf.duration)}`;
}

function updateLevelMeter() {
  const bars = document.querySelectorAll('.level-bar');
  const e = getEnergy();
  bars.forEach((b, i) => {
    const thresh = (i+1) / bars.length;
    const active = e >= thresh;
    const h = active ? Math.max(4, e * 20) : 4;
    b.style.height = h + 'px';
    b.style.background = thresh < 0.6 ? 'var(--green)' : thresh < 0.85 ? '#f59e0b' : 'var(--red)';
    b.style.opacity = active ? '1' : '0.25';
  });
}

function setMode(btn, m) {
  S.mode = m; S.particles = []; S.ripples = [];
  document.querySelectorAll('.m-btn').forEach(b => b.classList.remove('on'));
  btn.classList.add('on');
}

const fx = {
  vol(el)  { if(volGain) volGain.gain.value = el.value/100; document.getElementById('volLbl').textContent = el.value+'%'; },
  eq(el,t) {
    const v = parseFloat(el.value);
    if(t==='bass'&&bassF) { bassF.gain.value=v; document.getElementById('bassLbl').textContent=v+' dB'; }
    if(t==='mid' &&midF)  { midF.gain.value=v;  document.getElementById('midLbl').textContent=v+' dB'; }
    if(t==='treb'&&trebF) { trebF.gain.value=v;  document.getElementById('trebLbl').textContent=v+' dB'; }
  },
  reverb(el) {
    const v = el.value/100;
    if(rvbSend) rvbSend.gain.value = v;
    if(rvbDry)  rvbDry.gain.value  = 1 - v*.6;
    document.getElementById('rvbLbl').textContent = el.value+'%';
  },
  dlyW(el) { if(dlySend) dlySend.gain.value = el.value/100; document.getElementById('dlyWLbl').textContent = el.value+'%'; },
  dlyT(el) { if(dlyNode) dlyNode.delayTime.value = el.value/1000; document.getElementById('dlyTLbl').textContent = el.value+'ms'; },
  fb(el)   { if(fbGain)  fbGain.gain.value  = el.value/100; document.getElementById('fbLbl').textContent = el.value+'%'; },
  hue(el)  { S.hue = parseInt(el.value); document.getElementById('hueLbl').textContent = el.value+'°'; },
  int(el)  { S.intensity = el.value/100; document.getElementById('intLbl').textContent = el.value+'%'; },
  ovr(el)  { S.overlay = el.value/100;   document.getElementById('ovrLbl').textContent = el.value+'%'; },
  cmp(el)  { if(compNode) compNode.threshold.value = parseFloat(el.value); document.getElementById('cmpLbl').textContent = el.value+' dB'; },
  rat(el)  { if(compNode) compNode.ratio.value = parseInt(el.value); document.getElementById('ratLbl').textContent = el.value+':1'; },
};

function setupKeyboard() {
  document.addEventListener('keydown', e => {
    if (e.target.tagName === 'INPUT') return;
    switch(e.code) {
      case 'Space':     e.preventDefault(); togglePlay(); break;
      case 'KeyS':      stopAll(); break;
      case 'ArrowLeft': e.preventDefault(); seekTo(getNow()-5); break;
      case 'ArrowRight':e.preventDefault(); seekTo(getNow()+5); break;
      case 'Home':      seekStart(); break;
      case 'End':       seekEnd(); break;
    }
  });
}

let recorder, chunks, expTimer, expStart;

async function startExport() {
  if (!S.audioBuf || !S.imgEl || S.recording) return;
  S.recording = true; S.recCanceled = false;

  document.getElementById('expOverlay').classList.add('show');
  document.getElementById('expStatus').textContent = 'Preparing…';
  document.getElementById('expBar').style.width = '0%';
  document.getElementById('exportBtn').disabled = true;

  if (S.playing) { try { src.stop(); } catch(e) {} src = null; S.playing = false; }
  S.pausedAt = S.trimA;

  const dur = S.trimB - S.trimA;
  const canStream = cvs.captureStream(30);
  const audStream = mediaDest.stream;

  const combined = new MediaStream([
    ...canStream.getVideoTracks(),
    ...audStream.getAudioTracks()
  ]);

  const mime = ['video/webm;codecs=vp9,opus','video/webm;codecs=vp8,opus','video/webm','video/mp4']
    .find(m => MediaRecorder.isTypeSupported(m)) || 'video/webm';

  chunks = [];
  recorder = new MediaRecorder(combined, { mimeType: mime, videoBitsPerSecond: 6000000 });
  recorder.ondataavailable = e => { if (e.data.size>0) chunks.push(e.data); };
  recorder.onstop = () => {
    if (!S.recCanceled) {
      const blob = new Blob(chunks, { type: mime });
      const url  = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = `audioviz_${Date.now()}.${mime.includes('mp4')?'mp4':'webm'}`;
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
    resetExport();
  };

  recorder.start(80);
  play();

  expStart = Date.now();
  document.getElementById('expStatus').textContent = `Recording ${fmt(dur)}…`;

  function tick() {
    if (S.recCanceled) return;
    const elapsed = (Date.now() - expStart) / 1000;
    const pct = Math.min(100, (elapsed/dur)*100);
    document.getElementById('expBar').style.width = pct + '%';
    document.getElementById('expStatus').textContent =
      `Recording: ${fmt(elapsed)} / ${fmt(dur)}`;
    if (elapsed < dur + 0.5) expTimer = setTimeout(tick, 100);
  }
  tick();

  expTimer = setTimeout(finalizeExport, (dur + 0.5) * 1000);
}

function finalizeExport() {
  clearTimeout(expTimer);
  if (recorder && recorder.state !== 'inactive') {
    document.getElementById('expStatus').textContent = 'Finalizing…';
    document.getElementById('expBar').style.width = '100%';
    if (S.playing) pause();
    recorder.stop();
  }
}

function cancelExport() {
  S.recCanceled = true;
  clearTimeout(expTimer);
  if (recorder && recorder.state !== 'inactive') recorder.stop();
  if (S.playing) pause();
  resetExport();
}

function resetExport() {
  S.recording = false;
  document.getElementById('expOverlay').classList.remove('show');
  document.getElementById('exportBtn').disabled = false;
}
