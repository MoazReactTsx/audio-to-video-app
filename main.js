/* ═══════════════════════════════════════════
   TRANSLATIONS
═══════════════════════════════════════════ */
const T = {
  en: {
    upload_sub: 'Upload an image and audio file to create an audio-reactive video you can export.',
    bg_image: 'Background Image',
    audio_track: 'Audio Track',
    click_upload: 'Click or drag to upload',
    open_editor: '▶ Open Editor',
    mode_bars: 'Bars',
    mode_wave: 'Wave',
    mode_circular: 'Circular',
    mode_particles: 'Particles',
    mode_ripple: 'Ripple',
    reset: '↺ Reset',
    export_video: '⬇ Export Video',
    panel_canvas: '📐 Canvas Size',
    apply: 'Apply',
    panel_image: '🖼 Image Editor',
    brightness: 'Brightness',
    contrast: 'Contrast',
    saturation: 'Saturation',
    blur_label: 'Blur',
    sepia: 'Sepia',
    panel_volume: '🔊 Volume',
    volume: 'Volume',
    panel_eq: '🎛 Equalizer',
    bass: 'Bass',
    mid: 'Mid',
    treble: 'Treble',
    panel_reverb: '🌊 Reverb',
    wet: 'Wet',
    panel_delay: '🔁 Delay / Echo',
    time: 'Time',
    feedback: 'Feedback',
    panel_visual: '🎨 Visual',
    hue: 'Hue',
    intensity: 'Intensity',
    overlay: 'Overlay',
    panel_comp: '⚡ Compressor',
    threshold: 'Threshold',
    ratio: 'Ratio',
    panel_elements: '✨ Add Elements',
    elem_text: 'Text',
    elem_rect: 'Rect',
    elem_circle: 'Circle',
    elem_image: 'Image',
    shortcuts: '[Space] Play · [S] Stop · [←/→] Seek 5s',
    exporting: 'Exporting Video…',
    preparing: 'Preparing…',
    cancel: 'Cancel',
    elem_text_content: 'Text Content',
    elem_font_size: 'Font Size',
    elem_font: 'Font',
    elem_bold: 'Bold',
    elem_width: 'Width (px)',
    elem_height: 'Height (px)',
    elem_filled: 'Filled',
    elem_image_file: 'Image File',
    elem_img_width: 'Width (px)',
    elem_color: 'Color',
    elem_opacity: 'Opacity',
    add: 'Add',
  },
  ar: {
    upload_sub: 'ارفع صورة وملف صوتي لإنشاء فيديو يتفاعل مع الصوت يمكنك تصديره.',
    bg_image: 'صورة الخلفية',
    audio_track: 'المسار الصوتي',
    click_upload: 'انقر أو اسحب للرفع',
    open_editor: '▶ فتح المحرر',
    mode_bars: 'أعمدة',
    mode_wave: 'موجة',
    mode_circular: 'دائري',
    mode_particles: 'جسيمات',
    mode_ripple: 'تموجات',
    reset: '↺ إعادة ضبط',
    export_video: '⬇ تصدير الفيديو',
    panel_canvas: '📐 حجم اللوحة',
    apply: 'تطبيق',
    panel_image: '🖼 محرر الصورة',
    brightness: 'السطوع',
    contrast: 'التباين',
    saturation: 'التشبع',
    blur_label: 'الضبابية',
    sepia: 'سيبيا',
    panel_volume: '🔊 مستوى الصوت',
    volume: 'الصوت',
    panel_eq: '🎛 المعادل الصوتي',
    bass: 'الجهير',
    mid: 'الوسط',
    treble: 'الحدة',
    panel_reverb: '🌊 الصدى',
    wet: 'رطب',
    panel_delay: '🔁 تأخير / صدى',
    time: 'الوقت',
    feedback: 'التغذية الراجعة',
    panel_visual: '🎨 المرئيات',
    hue: 'تدرج اللون',
    intensity: 'الشدة',
    overlay: 'التراكب',
    panel_comp: '⚡ الضاغط',
    threshold: 'العتبة',
    ratio: 'النسبة',
    panel_elements: '✨ إضافة عناصر',
    elem_text: 'نص',
    elem_rect: 'مستطيل',
    elem_circle: 'دائرة',
    elem_image: 'صورة',
    shortcuts: '[مسافة] تشغيل · [S] إيقاف · [←/→] تقديم 5 ثواني',
    exporting: 'جارٍ التصدير…',
    preparing: 'جارٍ التحضير…',
    cancel: 'إلغاء',
    elem_text_content: 'محتوى النص',
    elem_font_size: 'حجم الخط',
    elem_font: 'الخط',
    elem_bold: 'عريض',
    elem_width: 'العرض (بكسل)',
    elem_height: 'الارتفاع (بكسل)',
    elem_filled: 'ممتلئ',
    elem_image_file: 'ملف الصورة',
    elem_img_width: 'العرض (بكسل)',
    elem_color: 'اللون',
    elem_opacity: 'الشفافية',
    add: 'إضافة',
  }
};

/* ═══════════════════════════════════════════
   STATE
═══════════════════════════════════════════ */
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
  // canvas
  aspectRatio: '16:9',
  canvasW: 1280,
  canvasH: 720,
  // image filters
  imgFilters: {
    brightness: 100,
    contrast: 100,
    saturation: 100,
    blur: 0,
    sepia: 0,
  },
  // elements overlay
  elements: [],
  nextElemId: 1,
  selectedElemId: null,
  // undo / redo
  history: [],
  historyIndex: -1,
  _applyingSnapshot: false, // guard: blocks pushHistory re-entrancy during undo/redo
  // language
  lang: 'en',
};

// Debounce timer for pushHistory (avoids flooding history on rapid slider drag)
let _histDebounce = null;
function pushHistoryDebounced() {
  clearTimeout(_histDebounce);
  _histDebounce = setTimeout(pushHistory, 350);
}

/* ═══════════════════════════════════════════
   AUDIO NODES
═══════════════════════════════════════════ */
let actx, analyser, freqData, timeData, src;
let volGain, bassF, midF, trebF;
let convolver, rvbSend, rvbDry;
let dlyNode, fbGain, dlySend;
let masterGain, compNode, mediaDest;

/* ═══════════════════════════════════════════
   CANVAS
═══════════════════════════════════════════ */
let cvs, c, tlCvs, tl;
let waveform = null;

/* ═══════════════════════════════════════════
   UPLOAD
═══════════════════════════════════════════ */
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
  document.getElementById('audioStatus').textContent = '⏳ ' + (S.lang === 'ar' ? 'جارٍ الترميز…' : 'Decoding…');

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
  } catch (err) {
    document.getElementById('audioStatus').textContent = '❌ ' + err.message;
  }
});

// Drag-and-drop
['imgCard', 'audioCard'].forEach(id => {
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

/* ═══════════════════════════════════════════
   OPEN EDITOR
═══════════════════════════════════════════ */
function openEditor() {
  document.getElementById('uploadPage').classList.add('exit');
  setTimeout(() => {
    document.getElementById('uploadPage').style.display = 'none';
    const ed = document.getElementById('editor');
    ed.classList.add('active');

    cvs = document.getElementById('mainCanvas');
    c = cvs.getContext('2d');
    tlCvs = document.getElementById('tlCanvas');
    tl = tlCvs.getContext('2d');

    sizeCanvas();
    window.addEventListener('resize', sizeCanvas);
    setupTimelineEvents();
    setupKeyboard();
    setupCanvasMouse();
    requestAnimationFrame(loop);

    // Take initial history snapshot
    pushHistory();
  }, 400);
}

/* ═══════════════════════════════════════════
   AUDIO GRAPH
═══════════════════════════════════════════ */
function buildAudioGraph() {
  analyser = actx.createAnalyser();
  analyser.fftSize = 1024;
  analyser.smoothingTimeConstant = 0.82;
  freqData = new Uint8Array(analyser.frequencyBinCount);
  timeData = new Uint8Array(analyser.frequencyBinCount * 2);

  volGain = actx.createGain(); volGain.gain.value = 1;

  bassF = actx.createBiquadFilter(); bassF.type = 'lowshelf'; bassF.frequency.value = 150;
  midF = actx.createBiquadFilter(); midF.type = 'peaking'; midF.frequency.value = 800; midF.Q.value = 1;
  trebF = actx.createBiquadFilter(); trebF.type = 'highshelf'; trebF.frequency.value = 4000;

  convolver = actx.createConvolver();
  convolver.buffer = buildReverb();
  rvbSend = actx.createGain(); rvbSend.gain.value = 0;
  rvbDry = actx.createGain(); rvbDry.gain.value = 1;

  dlyNode = actx.createDelay(3); dlyNode.delayTime.value = 0.35;
  fbGain = actx.createGain(); fbGain.gain.value = 0.3;
  dlySend = actx.createGain(); dlySend.gain.value = 0;

  masterGain = actx.createGain();
  compNode = actx.createDynamicsCompressor();
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
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2);
  }
  return buf;
}

/* ═══════════════════════════════════════════
   TRANSPORT
═══════════════════════════════════════════ */
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
      // WebM: recorder.stop() triggers onstop which finalises the download
      setTimeout(() => {
        if (recorder && recorder.state !== 'inactive') recorder.stop();
      }, 300);
    }
  };
}

function pause() {
  if (!S.playing) return;
  S.pausedAt = getNow();
  try { src.stop(); } catch (e) { }
  src = null; S.playing = false;
  document.getElementById('playBtn').textContent = '▶';
}

function stopAll() {
  if (S.playing) { try { src.stop(); } catch (e) { } src = null; S.playing = false; }
  S.pausedAt = S.trimA;
  document.getElementById('playBtn').textContent = '▶';
}

function togglePlay() { S.playing ? pause() : play(); }
function seekStart() { const wp = S.playing; if (wp) pause(); S.pausedAt = S.trimA; if (wp) play(); }
function seekEnd() { const wp = S.playing; if (wp) pause(); S.pausedAt = S.trimB - 0.05; if (wp) play(); }

function seekTo(t) {
  const wp = S.playing;
  if (wp) { try { src.stop(); } catch (e) { } src = null; S.playing = false; }
  S.pausedAt = clamp(t, S.trimA, S.trimB);
  if (wp) play();
}

function getNow() {
  return S.playing ? actx.currentTime - S.startedAt : S.pausedAt;
}

function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }

/* ═══════════════════════════════════════════
   WAVEFORM EXTRACTION
═══════════════════════════════════════════ */
function extractWaveform(buf) {
  const ch = buf.getChannelData(0);
  const N = 1200, bs = Math.floor(ch.length / N);
  waveform = new Float32Array(N);
  for (let i = 0; i < N; i++) {
    let mx = 0;
    for (let j = 0; j < bs; j++) mx = Math.max(mx, Math.abs(ch[i * bs + j]));
    waveform[i] = mx;
  }
}

/* ═══════════════════════════════════════════
   CANVAS SIZE
═══════════════════════════════════════════ */
const ASPECT_MAP = {
  '16:9': [16, 9],
  '9:16': [9, 16],
  '1:1': [1, 1],
  '4:3': [4, 3],
};

function setAspect(btn, ratio) {
  S.aspectRatio = ratio;
  document.querySelectorAll('.asp-btn').forEach(b => b.classList.remove('on'));
  btn.classList.add('on');

  const [rw, rh] = ASPECT_MAP[ratio];
  // Set a reasonable base resolution
  const baseW = 1280;
  S.canvasW = baseW;
  // H.264/WebCodecs requires even dimensions
  S.canvasH = Math.floor(Math.round(baseW * rh / rw) / 2) * 2;
  // Update custom inputs
  document.getElementById('customW').value = S.canvasW;
  document.getElementById('customH').value = S.canvasH;
  sizeCanvas();
  pushHistory();
}

function applyCustomSize() {
  const w = parseInt(document.getElementById('customW').value) || 1280;
  const h = parseInt(document.getElementById('customH').value) || 720;
  // H.264/WebCodecs requires even dimensions
  S.canvasW = Math.floor(clamp(w, 64, 3840) / 2) * 2;
  S.canvasH = Math.floor(clamp(h, 64, 3840) / 2) * 2;
  document.getElementById('customW').value = S.canvasW;
  document.getElementById('customH').value = S.canvasH;
  // Deselect preset buttons
  document.querySelectorAll('.asp-btn').forEach(b => b.classList.remove('on'));
  S.aspectRatio = 'custom';
  sizeCanvas();
  pushHistory();
}

function sizeCanvas() {
  if (!cvs) return;
  const wrap = cvs.parentElement;
  const maxW = wrap.clientWidth;
  const maxH = wrap.clientHeight;
  const ratio = S.canvasW / S.canvasH;

  let cw = maxW, ch = maxW / ratio;
  if (ch > maxH) { ch = maxH; cw = maxH * ratio; }
  cw = Math.floor(cw); ch = Math.floor(ch);

  cvs.width = S.canvasW;
  cvs.height = S.canvasH;
  cvs.style.width = cw + 'px';
  cvs.style.height = ch + 'px';

  const info = document.getElementById('canvasSizeInfo');
  if (info) info.textContent = `${S.canvasW} × ${S.canvasH}`;
}

/* ═══════════════════════════════════════════
   IMAGE FILTERS
═══════════════════════════════════════════ */
function buildFilterString() {
  const f = S.imgFilters;
  return `brightness(${f.brightness}%) contrast(${f.contrast}%) saturate(${f.saturation}%) blur(${f.blur}px) sepia(${f.sepia}%)`;
}

const imgFx = {
  brightness(el) {
    S.imgFilters.brightness = +el.value;
    document.getElementById('brightLbl').textContent = el.value + '%';
    pushHistoryDebounced();
  },
  contrast(el) {
    S.imgFilters.contrast = +el.value;
    document.getElementById('contrastLbl').textContent = el.value + '%';
    pushHistoryDebounced();
  },
  saturation(el) {
    S.imgFilters.saturation = +el.value;
    document.getElementById('satLbl').textContent = el.value + '%';
    pushHistoryDebounced();
  },
  blur(el) {
    S.imgFilters.blur = +el.value;
    document.getElementById('blurLbl').textContent = el.value + 'px';
    pushHistoryDebounced();
  },
  sepia(el) {
    S.imgFilters.sepia = +el.value;
    document.getElementById('sepiaLbl').textContent = el.value + '%';
    pushHistoryDebounced();
  },
};

/* ═══════════════════════════════════════════
   RENDER LOOP
═══════════════════════════════════════════ */
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

  // In offline render (MP4 export) freqData/timeData are pre-supplied — don't overwrite them
  if (!S._offlineRender && analyser) {
    analyser.getByteFrequencyData(freqData);
    analyser.getByteTimeDomainData(timeData);
  }

  const energy = getEnergy();
  const beat = detectBeat(energy);

  // Draw image with filters
  if (S.imgEl) {
    const scale = 1 + energy * 0.04 * S.intensity;
    c.save();
    c.translate(W / 2, H / 2);
    c.scale(scale, scale);
    c.filter = buildFilterString();
    c.drawImage(S.imgEl, -W / 2, -H / 2, W, H);
    c.filter = 'none';
    c.restore();
  } else {
    c.fillStyle = '#06060e';
    c.fillRect(0, 0, W, H);
  }

  // Dark overlay
  c.fillStyle = `rgba(0,0,0,${S.overlay})`;
  c.fillRect(0, 0, W, H);

  // Color tint
  c.fillStyle = `hsla(${S.hue},80%,50%,${energy * 0.18 * S.intensity})`;
  c.fillRect(0, 0, W, H);

  // Visualizer
  switch (S.mode) {
    case 'bars': drawBars(W, H); break;
    case 'wave': drawWave(W, H); break;
    case 'circular': drawCircular(W, H); break;
    case 'particles': drawParticles(W, H, energy, beat); break;
    case 'ripple': drawRipple(W, H, energy, beat); break;
  }

  // Render overlay elements
  renderElements(W, H);
}

/* ── ENERGY & BEAT ── */
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

/* ── BARS ── */
function drawBars(W, H) {
  const bins = Math.floor(freqData.length * 0.65);
  const bw = W / bins;
  for (let i = 0; i < bins; i++) {
    const v = freqData[i] / 255;
    const bh = v * H * 0.72 * S.intensity;
    const hue = (S.hue + i * 0.6) % 360;
    const gr = c.createLinearGradient(0, H, 0, H - bh);
    gr.addColorStop(0, `hsla(${hue},90%,50%,.9)`);
    gr.addColorStop(1, `hsla(${(hue + 50) % 360},90%,80%,.7)`);
    c.fillStyle = gr;
    c.shadowBlur = 10; c.shadowColor = `hsla(${hue},90%,60%,.8)`;
    c.fillRect(i * bw, H - bh, bw - 1, bh);
  }
  c.shadowBlur = 0;
}

/* ── WAVE ── */
function drawWave(W, H) {
  if (!timeData) return;
  const len = timeData.length;
  const sw = W / len;

  for (let pass = 0; pass < 2; pass++) {
    c.beginPath();
    for (let i = 0; i < len; i++) {
      const v = timeData[i] / 128;
      const y = pass === 0 ? v * H / 2 : H - v * H / 2;
      i === 0 ? c.moveTo(0, y) : c.lineTo(i * sw, y);
    }
    c.strokeStyle = pass === 0
      ? `hsla(${S.hue},90%,65%,.9)`
      : `hsla(${(S.hue + 60) % 360},90%,65%,.55)`;
    c.lineWidth = (3 - pass) * S.intensity;
    c.shadowBlur = 18; c.shadowColor = `hsla(${S.hue},90%,60%,.5)`;
    c.stroke();
  }
  c.shadowBlur = 0;
}

/* ── CIRCULAR ── */
function drawCircular(W, H) {
  const cx = W / 2, cy = H / 2;
  const baseR = Math.min(W, H) * 0.27;
  const bins = Math.floor(freqData.length * 0.5);

  c.save(); c.translate(cx, cy);

  for (let half = 0; half < 2; half++) {
    for (let i = 0; i < bins; i++) {
      const angle = (i / bins) * Math.PI - Math.PI / 2 + (half ? Math.PI : 0);
      const v = freqData[i] / 255;
      const len = v * Math.min(W, H) * 0.28 * S.intensity;
      const hue = (S.hue + i * (360 / bins)) % 360;

      c.beginPath();
      c.moveTo(Math.cos(angle) * baseR, Math.sin(angle) * baseR);
      c.lineTo(Math.cos(angle) * (baseR + len), Math.sin(angle) * (baseR + len));
      c.strokeStyle = `hsla(${hue},90%,65%,.9)`;
      c.lineWidth = 2;
      c.shadowBlur = 8; c.shadowColor = `hsla(${hue},90%,65%,.7)`;
      c.stroke();
    }
  }

  c.beginPath(); c.arc(0, 0, baseR, 0, Math.PI * 2);
  c.strokeStyle = `hsla(${S.hue},70%,60%,.25)`;
  c.lineWidth = 1; c.shadowBlur = 0; c.stroke();

  c.restore();
}

/* ── PARTICLES ── */
function drawParticles(W, H, energy, beat) {
  if (beat || energy > 0.25) {
    const n = Math.floor(energy * 18 * S.intensity);
    for (let i = 0; i < n; i++) {
      S.particles.push({
        x: W * .1 + Math.random() * W * .8,
        y: H - 5,
        vx: (Math.random() - .5) * 4 * energy * S.intensity,
        vy: -(Math.random() * 5 + 2) * energy * S.intensity,
        life: 1,
        decay: .008 + Math.random() * .018,
        r: 2 + Math.random() * 5 * energy * S.intensity,
        hue: (S.hue + Math.random() * 70 - 35 + 360) % 360,
      });
    }
  }

  S.particles = S.particles.filter(p => p.life > 0);
  for (const p of S.particles) {
    p.x += p.vx; p.y += p.vy; p.vy -= 0.06; p.life -= p.decay;
    c.globalAlpha = p.life * .85;
    c.shadowBlur = 12; c.shadowColor = `hsla(${p.hue},90%,70%,.9)`;
    c.fillStyle = `hsla(${p.hue},90%,72%,1)`;
    c.beginPath(); c.arc(p.x, p.y, p.r * p.life, 0, Math.PI * 2); c.fill();
  }
  c.globalAlpha = 1; c.shadowBlur = 0;

  const bins = Math.floor(freqData.length * 0.5);
  const bw = W / bins;
  for (let i = 0; i < bins; i++) {
    const v = freqData[i] / 255;
    c.fillStyle = `hsla(${(S.hue + i) % 360},80%,60%,.35)`;
    c.fillRect(i * bw, H - v * H * 0.12 * S.intensity, bw - 1, v * H * 0.12 * S.intensity);
  }
}

/* ── RIPPLE ── */
function drawRipple(W, H, energy, beat) {
  const cx = W / 2, cy = H / 2;
  const maxR = Math.sqrt(W * W + H * H) * 0.55;

  if (beat) {
    S.ripples.push({ r: 10, max: maxR, life: 1, hue: (S.hue + Math.random() * 60) % 360 });
  }
  if (energy > 0.15) {
    S.ripples.push({ r: energy * 40 * S.intensity, max: maxR * energy * S.intensity * .8, life: .4, hue: S.hue });
  }

  S.ripples = S.ripples.filter(r => r.life > 0 && r.r < r.max);
  for (const r of S.ripples) {
    r.r += 4 + energy * 6; r.life -= 0.018;
    c.beginPath(); c.arc(cx, cy, r.r, 0, Math.PI * 2);
    c.strokeStyle = `hsla(${r.hue},90%,70%,${r.life * .65})`;
    c.lineWidth = 2 * r.life * S.intensity;
    c.shadowBlur = 16; c.shadowColor = `hsla(${r.hue},90%,70%,${r.life * .4})`;
    c.stroke();
  }

  const pr = 35 + energy * Math.min(W, H) * 0.35 * S.intensity;
  c.beginPath(); c.arc(cx, cy, pr, 0, Math.PI * 2);
  c.strokeStyle = `hsla(${S.hue},90%,65%,${energy * .6})`;
  c.lineWidth = 3; c.shadowBlur = 24;
  c.shadowColor = `hsla(${S.hue},90%,65%,.5)`; c.stroke();
  c.shadowBlur = 0;
}

/* ═══════════════════════════════════════════
   ELEMENTS OVERLAY
═══════════════════════════════════════════ */
function renderElements(W, H) {
  for (const el of S.elements) {
    if (el.hidden) continue;
    c.save();
    c.globalAlpha = el.opacity / 100;

    if (el.type === 'text') {
      const weight = el.bold ? 'bold ' : '';
      c.font = `${weight}${el.fontSize}px "${el.font}", sans-serif`;
      c.fillStyle = el.color;
      c.shadowBlur = 8;
      c.shadowColor = 'rgba(0,0,0,0.7)';
      c.fillText(el.text, el.x, el.y);

    } else if (el.type === 'rect') {
      c.strokeStyle = el.color;
      c.fillStyle = el.color;
      c.lineWidth = 2;
      if (el.filled) {
        c.fillRect(el.x, el.y, el.w, el.h);
      } else {
        c.strokeRect(el.x, el.y, el.w, el.h);
      }

    } else if (el.type === 'circle') {
      const rx = el.w / 2, ry = el.h / 2;
      c.strokeStyle = el.color;
      c.fillStyle = el.color;
      c.lineWidth = 2;
      c.beginPath();
      c.ellipse(el.x + rx, el.y + ry, rx, ry, 0, 0, Math.PI * 2);
      if (el.filled) c.fill(); else c.stroke();

    } else if (el.type === 'image' && el.imgEl) {
      const aspect = el.imgEl.naturalHeight / el.imgEl.naturalWidth;
      const drawH = el.w * aspect;
      c.drawImage(el.imgEl, el.x, el.y, el.w, drawH);
    }

    // Selection handle
    if (el.id === S.selectedElemId) {
      c.globalAlpha = 1;
      c.strokeStyle = '#7c5cfc';
      c.lineWidth = 2;
      c.setLineDash([5, 4]);
      const bounds = getElemBounds(el);
      c.strokeRect(bounds.x - 4, bounds.y - 4, bounds.w + 8, bounds.h + 8);
      c.setLineDash([]);
    }

    c.restore();
  }
}

function getElemBounds(el) {
  if (el.type === 'text') {
    const w = el.fontSize * el.text.length * 0.6;
    return { x: el.x, y: el.y - el.fontSize, w, h: el.fontSize };
  }
  return { x: el.x, y: el.y, w: el.w || 0, h: el.h || 0 };
}

/* ── Canvas mouse for element drag ── */
let _elDrag = null;
let _elDragOffX = 0, _elDragOffY = 0;

function setupCanvasMouse() {
  cvs.addEventListener('mousedown', e => {
    const { cx, cy } = canvasCoords(e);
    // Find topmost element under cursor
    const hit = [...S.elements].reverse().find(el => {
      if (el.hidden) return false;
      const b = getElemBounds(el);
      return cx >= b.x - 6 && cx <= b.x + b.w + 6
        && cy >= b.y - 6 && cy <= b.y + b.h + 6;
    });
    if (hit) {
      S.selectedElemId = hit.id;
      _elDrag = hit;
      _elDragOffX = cx - hit.x;
      _elDragOffY = cy - hit.y;
      updateSelBadge(hit);
    } else {
      S.selectedElemId = null;
      _elDrag = null;
      updateSelBadge(null);
    }
  });

  cvs.addEventListener('mousemove', e => {
    if (!_elDrag) return;
    const { cx, cy } = canvasCoords(e);
    _elDrag.x = cx - _elDragOffX;
    _elDrag.y = cy - _elDragOffY;
  });

  cvs.addEventListener('mouseup', () => {
    if (_elDrag) { pushHistory(); _elDrag = null; }
  });

  // Touch
  cvs.addEventListener('touchstart', e => {
    e.preventDefault();
    const touch = e.touches[0];
    const { cx, cy } = canvasCoords(touch);
    const hit = [...S.elements].reverse().find(el => {
      if (el.hidden) return false;
      const b = getElemBounds(el);
      return cx >= b.x - 6 && cx <= b.x + b.w + 6
        && cy >= b.y - 6 && cy <= b.y + b.h + 6;
    });
    if (hit) {
      S.selectedElemId = hit.id;
      _elDrag = hit;
      _elDragOffX = cx - hit.x;
      _elDragOffY = cy - hit.y;
    } else {
      S.selectedElemId = null; _elDrag = null;
    }
  }, { passive: false });

  cvs.addEventListener('touchmove', e => {
    if (!_elDrag) return;
    e.preventDefault();
    const { cx, cy } = canvasCoords(e.touches[0]);
    _elDrag.x = cx - _elDragOffX;
    _elDrag.y = cy - _elDragOffY;
  }, { passive: false });

  cvs.addEventListener('touchend', () => {
    if (_elDrag) { pushHistory(); _elDrag = null; }
  });
}

function canvasCoords(e) {
  const rect = cvs.getBoundingClientRect();
  const scaleX = cvs.width / rect.width;
  const scaleY = cvs.height / rect.height;
  return {
    cx: (e.clientX - rect.left) * scaleX,
    cy: (e.clientY - rect.top) * scaleY,
  };
}

function updateSelBadge(el) {
  const badge = document.getElementById('selBadge');
  if (!badge) return;
  if (el) {
    badge.style.display = 'block';
    badge.textContent = el.type === 'text' ? `✎ "${el.text}"` : `${el.type}`;
  } else {
    badge.style.display = 'none';
  }
}

/* ── Add Element Modal ── */
let _pendingElemType = null;

function openElemModal(type) {
  _pendingElemType = type;
  document.getElementById('textFields').style.display = (type === 'text') ? '' : 'none';
  document.getElementById('shapeFields').style.display = (['rect', 'circle'].includes(type)) ? '' : 'none';
  document.getElementById('imageFields').style.display = (type === 'image') ? '' : 'none';

  const titles = { text: 'Add Text', rect: 'Add Rectangle', circle: 'Add Circle', image: 'Add Image' };
  document.getElementById('elemModalTitle').textContent = titles[type] || 'Add Element';
  document.getElementById('elemModal').classList.add('show');
}

function closeElemModal() {
  document.getElementById('elemModal').classList.remove('show');
  _pendingElemType = null;
}

function confirmAddElement() {
  const type = _pendingElemType;
  if (!type) return;

  const color = document.getElementById('elemColor').value;
  const opacity = parseInt(document.getElementById('elemOpacity').value) || 100;
  const W = S.canvasW, H = S.canvasH;

  const base = {
    id: S.nextElemId++,
    type,
    color,
    opacity,
    hidden: false,
    x: Math.floor(W * 0.2),
    y: Math.floor(H * 0.4),
  };

  if (type === 'text') {
    base.text = document.getElementById('elemText').value || 'Text';
    base.fontSize = parseInt(document.getElementById('elemFontSize').value) || 48;
    base.font = document.getElementById('elemFont').value || 'Inter';
    base.bold = document.getElementById('elemBold').checked;
  } else if (type === 'rect' || type === 'circle') {
    base.w = parseInt(document.getElementById('elemShapeW').value) || 200;
    base.h = parseInt(document.getElementById('elemShapeH').value) || 120;
    base.filled = document.getElementById('elemFilled').checked;
  } else if (type === 'image') {
    const file = document.getElementById('elemImageFile').files[0];
    base.w = parseInt(document.getElementById('elemImgW').value) || 200;
    if (file) {
      const reader = new FileReader();
      reader.onload = ev => {
        const img = new Image();
        img.onload = () => { base.imgEl = img; };
        img.src = ev.target.result;
      };
      reader.readAsDataURL(file);
    }
  }

  S.elements.push(base);
  S.selectedElemId = base.id;
  closeElemModal();
  refreshElemList();
  pushHistory();
}

function deleteElement(id) {
  S.elements = S.elements.filter(e => e.id !== id);
  if (S.selectedElemId === id) S.selectedElemId = null;
  refreshElemList();
  pushHistory();
}

function toggleElementVis(id) {
  const el = S.elements.find(e => e.id === id);
  if (el) { el.hidden = !el.hidden; refreshElemList(); }
}

function refreshElemList() {
  const list = document.getElementById('elemList');
  if (!list) return;
  list.innerHTML = '';
  S.elements.forEach(el => {
    const icon = { text: '🔤', rect: '▭', circle: '◯', image: '🖼' }[el.type] || '?';
    const label = el.type === 'text' ? el.text : el.type;
    const item = document.createElement('div');
    item.className = 'elem-item';
    item.innerHTML = `
      <span class="elem-item-icon">${icon}</span>
      <span class="elem-item-name">${label}</span>
      <button class="elem-vis-btn ${el.hidden ? 'hidden-el' : ''}"
        onclick="toggleElementVis(${el.id})" title="Toggle visibility">
        ${el.hidden ? '🙈' : '👁'}
      </button>
      <button class="elem-del-btn" onclick="deleteElement(${el.id})" title="Delete">✕</button>
    `;
    item.addEventListener('click', e => {
      if (e.target.classList.contains('elem-del-btn') ||
        e.target.classList.contains('elem-vis-btn')) return;
      S.selectedElemId = el.id;
      updateSelBadge(el);
    });
    list.appendChild(item);
  });
}

/* ═══════════════════════════════════════════
   TIMELINE
═══════════════════════════════════════════ */
function renderTimeline() {
  if (!waveform || !S.audioBuf) return;

  const W = tlCvs.clientWidth || 800;
  tlCvs.width = W; tlCvs.height = 72;
  const H = 72, mid = H / 2;

  tl.fillStyle = '#0a0a14'; tl.fillRect(0, 0, W, H);

  const dur = S.audioBuf.duration;
  const ax = t => (t / dur) * W;

  tl.fillStyle = 'rgba(0,0,0,.55)';
  tl.fillRect(0, 0, ax(S.trimA), H);
  tl.fillRect(ax(S.trimB), 0, W - ax(S.trimB), H);

  const N = waveform.length;
  for (let i = 0; i < N; i++) {
    const x = (i / N) * W;
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
  tl.fillRect(ax_a, H / 2 - 10, 5, 20);
  tl.fillStyle = '#39d98a';
  tl.font = '10px monospace'; tl.fillText('◀', ax_a, H / 2 + 4);

  const ax_b = ax(S.trimB);
  tl.fillStyle = '#f06292';
  tl.fillRect(ax_b - 5, 0, 5, H);
  tl.fillStyle = '#f06292';
  tl.fillText('▶', ax_b - 5, H / 2 + 4);

  const px = ax(getNow());
  tl.fillStyle = '#fff';
  tl.fillRect(px - 1, 0, 2, H);
  tl.beginPath(); tl.moveTo(px - 6, 0); tl.lineTo(px + 6, 0); tl.lineTo(px, 10);
  tl.closePath(); tl.fill();

  tl.fillStyle = 'rgba(255,255,255,.25)';
  tl.font = '9px monospace';
  for (let i = 0; i <= 10; i++) {
    const x = (i / 10) * W;
    const t = (i / 10) * dur;
    tl.fillRect(x, H - 12, 1, 12);
    tl.fillText(fmt(t), x + 2, H - 2);
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
  }, { passive: false });

  document.addEventListener('touchmove', e => {
    if (!drag) return;
    const r = tlCvs.getBoundingClientRect();
    const x = clamp(e.touches[0].clientX - r.left, 0, tlCvs.clientWidth);
    const t = xToTime(x);
    if (drag === 'a') S.trimA = clamp(t, 0, S.trimB - .1);
    else if (drag === 'b') S.trimB = clamp(t, S.trimA + .1, S.audioBuf.duration);
    else seekTo(t);
  });

  document.addEventListener('touchend', () => { drag = null; });
}

/* ═══════════════════════════════════════════
   UI UPDATES
═══════════════════════════════════════════ */
function fmt(t) {
  const m = Math.floor(t / 60), s = Math.floor(t % 60), ms = Math.floor((t % 1) * 10);
  return `${m}:${s.toString().padStart(2, '0')}.${ms}`;
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
    const thresh = (i + 1) / bars.length;
    const active = e >= thresh;
    const h = active ? Math.max(4, e * 20) : 4;
    b.style.height = h + 'px';
    b.style.background = thresh < 0.6 ? 'var(--green)' : thresh < 0.85 ? '#f59e0b' : 'var(--red)';
    b.style.opacity = active ? '1' : '0.25';
  });
}

/* ═══════════════════════════════════════════
   VIZ MODE
═══════════════════════════════════════════ */
function setMode(btn, m) {
  S.mode = m; S.particles = []; S.ripples = [];
  document.querySelectorAll('.m-btn').forEach(b => b.classList.remove('on'));
  btn.classList.add('on');
  pushHistory();
}

/* ═══════════════════════════════════════════
   EFFECTS
═══════════════════════════════════════════ */
const fx = {
  vol(el) { if (volGain) volGain.gain.value = el.value / 100; document.getElementById('volLbl').textContent = el.value + '%'; pushHistoryDebounced(); },
  eq(el, t) {
    const v = parseFloat(el.value);
    if (t === 'bass' && bassF) { bassF.gain.value = v; document.getElementById('bassLbl').textContent = v + ' dB'; }
    if (t === 'mid' && midF) { midF.gain.value = v; document.getElementById('midLbl').textContent = v + ' dB'; }
    if (t === 'treb' && trebF) { trebF.gain.value = v; document.getElementById('trebLbl').textContent = v + ' dB'; }
    pushHistoryDebounced();
  },
  reverb(el) {
    const v = el.value / 100;
    if (rvbSend) rvbSend.gain.value = v;
    if (rvbDry) rvbDry.gain.value = 1 - v * .6;
    document.getElementById('rvbLbl').textContent = el.value + '%';
    pushHistoryDebounced();
  },
  dlyW(el) { if (dlySend) dlySend.gain.value = el.value / 100; document.getElementById('dlyWLbl').textContent = el.value + '%'; pushHistoryDebounced(); },
  dlyT(el) { if (dlyNode) dlyNode.delayTime.value = el.value / 1000; document.getElementById('dlyTLbl').textContent = el.value + 'ms'; pushHistoryDebounced(); },
  fb(el) { if (fbGain) fbGain.gain.value = el.value / 100; document.getElementById('fbLbl').textContent = el.value + '%'; pushHistoryDebounced(); },
  hue(el) { S.hue = parseInt(el.value); document.getElementById('hueLbl').textContent = el.value + '°'; pushHistoryDebounced(); },
  int(el) { S.intensity = el.value / 100; document.getElementById('intLbl').textContent = el.value + '%'; pushHistoryDebounced(); },
  ovr(el) { S.overlay = el.value / 100; document.getElementById('ovrLbl').textContent = el.value + '%'; pushHistoryDebounced(); },
  cmp(el) { if (compNode) compNode.threshold.value = parseFloat(el.value); document.getElementById('cmpLbl').textContent = el.value + ' dB'; pushHistoryDebounced(); },
  rat(el) { if (compNode) compNode.ratio.value = parseInt(el.value); document.getElementById('ratLbl').textContent = el.value + ':1'; pushHistoryDebounced(); },
};

/* ═══════════════════════════════════════════
   RESET ALL
═══════════════════════════════════════════ */
const DEFAULTS = {
  vol: 100,
  bass: 0, mid: 0, treb: 0,
  rvb: 0,
  dlyW: 0, dlyT: 350, fb: 30,
  hue: 220, int: 80, ovr: 45,
  cmp: -24, rat: 4,
  brightness: 100, contrast: 100, saturation: 100, blur: 0, sepia: 0,
};

function setSlider(id, val) {
  const el = document.getElementById(id);
  if (el) { el.value = val; el.dispatchEvent(new Event('input')); }
}

function resetAll() {
  // Audio FX sliders
  setSlider('volR', DEFAULTS.vol);
  setSlider('bassR', DEFAULTS.bass);
  setSlider('midR', DEFAULTS.mid);
  setSlider('trebR', DEFAULTS.treb);
  setSlider('rvbR', DEFAULTS.rvb);
  setSlider('dlyWR', DEFAULTS.dlyW);
  setSlider('dlyTR', DEFAULTS.dlyT);
  setSlider('fbR', DEFAULTS.fb);
  setSlider('hueR', DEFAULTS.hue);
  setSlider('intR', DEFAULTS.int);
  setSlider('ovrR', DEFAULTS.ovr);
  setSlider('cmpR', DEFAULTS.cmp);
  setSlider('ratR', DEFAULTS.rat);
  // Image filters
  setSlider('brightR', DEFAULTS.brightness);
  setSlider('contrastR', DEFAULTS.contrast);
  setSlider('satR', DEFAULTS.saturation);
  setSlider('blurR', DEFAULTS.blur);
  setSlider('sepiaR', DEFAULTS.sepia);
  pushHistory();
}

/* ═══════════════════════════════════════════
   UNDO / REDO
═══════════════════════════════════════════ */
function captureSnapshot() {
  return {
    // sliders
    volR: document.getElementById('volR')?.value,
    bassR: document.getElementById('bassR')?.value,
    midR: document.getElementById('midR')?.value,
    trebR: document.getElementById('trebR')?.value,
    rvbR: document.getElementById('rvbR')?.value,
    dlyWR: document.getElementById('dlyWR')?.value,
    dlyTR: document.getElementById('dlyTR')?.value,
    fbR: document.getElementById('fbR')?.value,
    hueR: document.getElementById('hueR')?.value,
    intR: document.getElementById('intR')?.value,
    ovrR: document.getElementById('ovrR')?.value,
    cmpR: document.getElementById('cmpR')?.value,
    ratR: document.getElementById('ratR')?.value,
    // image filters
    brightR: document.getElementById('brightR')?.value,
    contrastR: document.getElementById('contrastR')?.value,
    satR: document.getElementById('satR')?.value,
    blurR: document.getElementById('blurR')?.value,
    sepiaR: document.getElementById('sepiaR')?.value,
    // canvas
    canvasW: S.canvasW,
    canvasH: S.canvasH,
    aspectRatio: S.aspectRatio,
    mode: S.mode,
    // elements (deep copy without imgEl DOM objects, preserve references)
    elements: S.elements.map(e => ({ ...e })),
  };
}

function applySnapshot(snap) {
  // Block any pushHistory calls that fire as side-effects during restoration.
  // This was the root cause of both the dark-screen bug (corrupted history) and
  // the double-audio bug (audio nodes re-triggered by rapid dispatchEvent calls).
  S._applyingSnapshot = true;

  // ── Helper: set slider UI value without dispatching events ──
  const setVal = (id, val) => {
    const el = document.getElementById(id);
    if (el && val != null) el.value = val;
  };

  // ── Volume ──
  if (snap.volR != null) {
    setVal('volR', snap.volR);
    if (volGain) volGain.gain.value = snap.volR / 100;
    document.getElementById('volLbl').textContent = snap.volR + '%';
  }

  // ── EQ ──
  if (snap.bassR != null) {
    setVal('bassR', snap.bassR);
    if (bassF) bassF.gain.value = parseFloat(snap.bassR);
    document.getElementById('bassLbl').textContent = snap.bassR + ' dB';
  }
  if (snap.midR != null) {
    setVal('midR', snap.midR);
    if (midF) midF.gain.value = parseFloat(snap.midR);
    document.getElementById('midLbl').textContent = snap.midR + ' dB';
  }
  if (snap.trebR != null) {
    setVal('trebR', snap.trebR);
    if (trebF) trebF.gain.value = parseFloat(snap.trebR);
    document.getElementById('trebLbl').textContent = snap.trebR + ' dB';
  }

  // ── Reverb ──
  if (snap.rvbR != null) {
    setVal('rvbR', snap.rvbR);
    const rv = snap.rvbR / 100;
    if (rvbSend) rvbSend.gain.value = rv;
    if (rvbDry) rvbDry.gain.value = 1 - rv * 0.6;
    document.getElementById('rvbLbl').textContent = snap.rvbR + '%';
  }

  // ── Delay ──
  if (snap.dlyWR != null) {
    setVal('dlyWR', snap.dlyWR);
    if (dlySend) dlySend.gain.value = snap.dlyWR / 100;
    document.getElementById('dlyWLbl').textContent = snap.dlyWR + '%';
  }
  if (snap.dlyTR != null) {
    setVal('dlyTR', snap.dlyTR);
    if (dlyNode) dlyNode.delayTime.value = snap.dlyTR / 1000;
    document.getElementById('dlyTLbl').textContent = snap.dlyTR + 'ms';
  }
  if (snap.fbR != null) {
    setVal('fbR', snap.fbR);
    if (fbGain) fbGain.gain.value = snap.fbR / 100;
    document.getElementById('fbLbl').textContent = snap.fbR + '%';
  }

  // ── Visual ──
  if (snap.hueR != null) {
    setVal('hueR', snap.hueR);
    S.hue = parseInt(snap.hueR);
    document.getElementById('hueLbl').textContent = snap.hueR + '°';
  }
  if (snap.intR != null) {
    setVal('intR', snap.intR);
    S.intensity = snap.intR / 100;
    document.getElementById('intLbl').textContent = snap.intR + '%';
  }
  if (snap.ovrR != null) {
    setVal('ovrR', snap.ovrR);
    S.overlay = snap.ovrR / 100;
    document.getElementById('ovrLbl').textContent = snap.ovrR + '%';
  }

  // ── Compressor ──
  if (snap.cmpR != null) {
    setVal('cmpR', snap.cmpR);
    if (compNode) compNode.threshold.value = parseFloat(snap.cmpR);
    document.getElementById('cmpLbl').textContent = snap.cmpR + ' dB';
  }
  if (snap.ratR != null) {
    setVal('ratR', snap.ratR);
    if (compNode) compNode.ratio.value = parseInt(snap.ratR);
    document.getElementById('ratLbl').textContent = snap.ratR + ':1';
  }

  // ── Image filters ──
  if (snap.brightR != null) {
    setVal('brightR', snap.brightR);
    S.imgFilters.brightness = +snap.brightR;
    document.getElementById('brightLbl').textContent = snap.brightR + '%';
  }
  if (snap.contrastR != null) {
    setVal('contrastR', snap.contrastR);
    S.imgFilters.contrast = +snap.contrastR;
    document.getElementById('contrastLbl').textContent = snap.contrastR + '%';
  }
  if (snap.satR != null) {
    setVal('satR', snap.satR);
    S.imgFilters.saturation = +snap.satR;
    document.getElementById('satLbl').textContent = snap.satR + '%';
  }
  if (snap.blurR != null) {
    setVal('blurR', snap.blurR);
    S.imgFilters.blur = +snap.blurR;
    document.getElementById('blurLbl').textContent = snap.blurR + 'px';
  }
  if (snap.sepiaR != null) {
    setVal('sepiaR', snap.sepiaR);
    S.imgFilters.sepia = +snap.sepiaR;
    document.getElementById('sepiaLbl').textContent = snap.sepiaR + '%';
  }

  // ── Canvas size ──
  if (snap.canvasW) {
    S.canvasW = snap.canvasW;
    S.canvasH = snap.canvasH;
    document.getElementById('customW').value = snap.canvasW;
    document.getElementById('customH').value = snap.canvasH;
    sizeCanvas();
  }

  // ── Viz mode ──
  if (snap.mode) {
    S.mode = snap.mode;
    S.particles = []; S.ripples = [];
    document.querySelectorAll('.m-btn').forEach(b => {
      b.classList.toggle('on', b.getAttribute('onclick')?.includes(`'${snap.mode}'`));
    });
  }

  // ── Elements ──
  if (snap.elements) {
    // Re-attach any loaded imgEl references that aren't serialisable
    const existingImgs = {};
    S.elements.forEach(e => { if (e.imgEl) existingImgs[e.id] = e.imgEl; });
    S.elements = snap.elements.map(e => {
      const restored = { ...e };
      if (e.type === 'image' && existingImgs[e.id]) restored.imgEl = existingImgs[e.id];
      return restored;
    });
    refreshElemList();
  }

  S._applyingSnapshot = false;
}

function pushHistory() {
  // Guard: never push while we are in the middle of restoring a snapshot
  if (S._applyingSnapshot) return;
  const snap = captureSnapshot();
  // Trim any forward (redo) entries
  if (S.historyIndex < S.history.length - 1) {
    S.history = S.history.slice(0, S.historyIndex + 1);
  }
  S.history.push(snap);
  if (S.history.length > 60) S.history.shift();
  S.historyIndex = S.history.length - 1;
  updateHistoryBtns();
}

function undo() {
  if (S.historyIndex <= 0) return;
  S.historyIndex--;
  applySnapshot(S.history[S.historyIndex]);
  updateHistoryBtns();
}

function redo() {
  if (S.historyIndex >= S.history.length - 1) return;
  S.historyIndex++;
  applySnapshot(S.history[S.historyIndex]);
  updateHistoryBtns();
}

function updateHistoryBtns() {
  const undoBtn = document.getElementById('undoBtn');
  const redoBtn = document.getElementById('redoBtn');
  if (undoBtn) undoBtn.disabled = S.historyIndex <= 0;
  if (redoBtn) redoBtn.disabled = S.historyIndex >= S.history.length - 1;
}

/* ═══════════════════════════════════════════
   LANGUAGE / I18N
═══════════════════════════════════════════ */
function setLang(lang) {
  S.lang = lang;
  const html = document.documentElement;
  html.setAttribute('lang', lang);
  html.setAttribute('dir', lang === 'ar' ? 'rtl' : 'ltr');

  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    const val = T[lang][key];
    if (val !== undefined) el.textContent = val;
  });

  const btn = document.getElementById('langBtn');
  if (btn) {
    btn.textContent = lang === 'ar' ? '🌐 EN' : '🌐 AR';
    btn.classList.toggle('ar', lang === 'ar');
  }
}

function toggleLang() {
  setLang(S.lang === 'en' ? 'ar' : 'en');
}

/* ═══════════════════════════════════════════
   KEYBOARD
═══════════════════════════════════════════ */
function setupKeyboard() {
  document.addEventListener('keydown', e => {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
    switch (e.code) {
      case 'Space': e.preventDefault(); togglePlay(); break;
      case 'KeyS': stopAll(); break;
      case 'ArrowLeft': e.preventDefault(); seekTo(getNow() - 5); break;
      case 'ArrowRight': e.preventDefault(); seekTo(getNow() + 5); break;
      case 'Home': seekStart(); break;
      case 'End': seekEnd(); break;
      case 'KeyZ':
        if (e.ctrlKey || e.metaKey) { e.preventDefault(); e.shiftKey ? redo() : undo(); }
        break;
      case 'KeyY':
        if (e.ctrlKey || e.metaKey) { e.preventDefault(); redo(); }
        break;
      case 'Delete':
      case 'Backspace':
        if (S.selectedElemId != null) { deleteElement(S.selectedElemId); }
        break;
    }
  });
}

/* ═══════════════════════════════════════════
   EXPORT — MULTI-FORMAT
═══════════════════════════════════════════ */
let recorder, chunks, expTimer;
let _expCancel = false;

// ── Open format picker ──
function startExport() {
  if (!S.audioBuf || !S.imgEl || S.recording) return;
  document.getElementById('expOverlay').classList.add('show');
  document.getElementById('expFormatStep').style.display = '';
  document.getElementById('expProgressStep').style.display = 'none';
  document.getElementById('exportBtn').disabled = true;
}

// ── User picked a format ──
async function beginExport(format) {
  if (!S.audioBuf || !S.imgEl) return;
  S.recording = true;
  _expCancel = false;

  document.getElementById('expFormatStep').style.display = 'none';
  document.getElementById('expProgressStep').style.display = '';
  document.getElementById('expBar').style.width = '0%';

  try {
    if (format === 'wav') await exportWAV();
    else if (format === 'webm') await exportWebM();
    else if (format === 'mp4') await exportMP4();
  } catch (err) {
    console.error('Export error:', err);
    document.getElementById('expStatus').textContent = '❌ ' + err.message;
    await new Promise(r => setTimeout(r, 3000));
  }

  if (!_expCancel) resetExport();
}

// ── Shared helpers ──
function downloadBlob(blob, name) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = name;
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}

function expProgress(pct, msg) {
  if (_expCancel) return;
  document.getElementById('expBar').style.width = pct + '%';
  document.getElementById('expStatus').textContent = msg;
}

// ─────────────────────────────────────────
//  WAV EXPORT  (audio-only, OfflineAudioContext)
// ─────────────────────────────────────────
async function exportWAV() {
  document.getElementById('expTitle').textContent = '🎵 Exporting WAV…';
  expProgress(5, 'Rendering audio with effects…');

  const dur = S.trimB - S.trimA;
  const sr = actx.sampleRate;
  const offCtx = new OfflineAudioContext(2, Math.ceil(dur * sr), sr);

  // Re-create the effects chain in the offline context
  const oGain = offCtx.createGain();
  oGain.gain.value = volGain?.gain.value ?? 1;

  const oBass = offCtx.createBiquadFilter();
  oBass.type = 'lowshelf'; oBass.frequency.value = 150;
  oBass.gain.value = bassF?.gain.value ?? 0;

  const oMid = offCtx.createBiquadFilter();
  oMid.type = 'peaking'; oMid.frequency.value = 800; oMid.Q.value = 1;
  oMid.gain.value = midF?.gain.value ?? 0;

  const oTreb = offCtx.createBiquadFilter();
  oTreb.type = 'highshelf'; oTreb.frequency.value = 4000;
  oTreb.gain.value = trebF?.gain.value ?? 0;

  const oComp = offCtx.createDynamicsCompressor();
  if (compNode) {
    oComp.threshold.value = compNode.threshold.value;
    oComp.knee.value = compNode.knee.value;
    oComp.ratio.value = compNode.ratio.value;
    oComp.attack.value = compNode.attack.value;
    oComp.release.value = compNode.release.value;
  }

  const oSrc = offCtx.createBufferSource();
  oSrc.buffer = S.audioBuf;
  oSrc.connect(oGain);
  oGain.connect(oBass); oBass.connect(oMid); oMid.connect(oTreb);
  oTreb.connect(oComp); oComp.connect(offCtx.destination);
  oSrc.start(0, S.trimA, dur);

  expProgress(30, 'Offline rendering…');
  const rendered = await offCtx.startRendering();

  expProgress(70, 'Encoding WAV…');
  const wavBlob = encodeWAV(rendered);

  expProgress(100, '✓ WAV exported!');
  downloadBlob(wavBlob, `audioviz_audio_${Date.now()}.wav`);
  await new Promise(r => setTimeout(r, 800));
}

function encodeWAV(buf) {
  const nCh = buf.numberOfChannels;
  const sr = buf.sampleRate;
  const len = buf.length;
  const bps = 16;
  const blockAlign = nCh * (bps / 8);
  const dataSize = len * blockAlign;

  const ab = new ArrayBuffer(44 + dataSize);
  const view = new DataView(ab);
  const ws = (off, str) => { for (let i = 0; i < str.length; i++) view.setUint8(off + i, str.charCodeAt(i)); };

  ws(0, 'RIFF'); view.setUint32(4, 36 + dataSize, true);
  ws(8, 'WAVE'); ws(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);          // PCM
  view.setUint16(22, nCh, true);
  view.setUint32(24, sr, true);
  view.setUint32(28, sr * blockAlign, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bps, true);
  ws(36, 'data'); view.setUint32(40, dataSize, true);

  let off = 44;
  const channels = [];
  for (let c = 0; c < nCh; c++) channels.push(buf.getChannelData(c));

  for (let i = 0; i < len; i++) {
    for (let c = 0; c < nCh; c++) {
      const s = Math.max(-1, Math.min(1, channels[c][i]));
      view.setInt16(off, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
      off += 2;
    }
  }
  return new Blob([ab], { type: 'audio/wav' });
}

// ─────────────────────────────────────────
//  WEBM EXPORT  (real-time MediaRecorder)
// ─────────────────────────────────────────
async function exportWebM() {
  document.getElementById('expTitle').textContent = '🎬 Exporting WebM…';
  expProgress(0, 'Starting capture…');

  if (S.playing) { try { src.stop(); } catch (e) { } src = null; S.playing = false; }
  S.pausedAt = S.trimA;

  const dur = S.trimB - S.trimA;
  const canStream = cvs.captureStream(30);
  const audStream = mediaDest.stream;
  const combined = new MediaStream([...canStream.getVideoTracks(), ...audStream.getAudioTracks()]);

  const mime = ['video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm']
    .find(m => MediaRecorder.isTypeSupported(m)) ?? 'video/webm';

  chunks = [];
  recorder = new MediaRecorder(combined, { mimeType: mime, videoBitsPerSecond: 6_000_000 });
  recorder.ondataavailable = e => { if (e.data.size > 0) chunks.push(e.data); };

  return new Promise(resolve => {
    recorder.onstop = () => {
      if (!_expCancel) {
        downloadBlob(new Blob(chunks, { type: mime }), `audioviz_${Date.now()}.webm`);
        expProgress(100, '✓ WebM exported!');
      }
      setTimeout(resolve, 600);
    };

    recorder.start(80);
    play();

    const t0 = Date.now();
    function tick() {
      if (_expCancel) return;
      const el = (Date.now() - t0) / 1000;
      const pct = Math.min(95, (el / dur) * 100);
      expProgress(pct, `Recording: ${fmt(el)} / ${fmt(dur)}`);
      if (el < dur + 0.5) expTimer = setTimeout(tick, 150);
    }
    tick();

    expTimer = setTimeout(() => {
      clearTimeout(expTimer);
      expProgress(98, 'Finalizing…');
      if (S.playing) pause();
      recorder.stop();
    }, (dur + 0.5) * 1000);
  });
}

// ─────────────────────────────────────────
//  MP4 EXPORT  (FFmpeg.wasm via WebM capture)
// ─────────────────────────────────────────
async function exportMP4() {
  document.getElementById('expTitle').textContent = '🎞️ Exporting MP4…';

  // ── Step 1: Capture as WebM real-time ──
  expProgress(0, 'Capturing video (real-time)…');
  if (S.playing) { try { src.stop(); } catch (e) { } src = null; S.playing = false; }
  S.pausedAt = S.trimA;

  const dur = S.trimB - S.trimA;
  const canStream = cvs.captureStream(30);
  const audStream = mediaDest.stream;
  const combined = new MediaStream([...canStream.getVideoTracks(), ...audStream.getAudioTracks()]);

  const mime = ['video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm']
    .find(m => MediaRecorder.isTypeSupported(m)) ?? 'video/webm';

  chunks = [];
  recorder = new MediaRecorder(combined, { mimeType: mime, videoBitsPerSecond: 6_000_000 });
  recorder.ondataavailable = e => { if (e.data.size > 0) chunks.push(e.data); };

  const webmBlob = await new Promise(resolve => {
    recorder.onstop = () => resolve(new Blob(chunks, { type: mime }));
    recorder.start(80);
    play();

    const t0 = Date.now();
    function tick() {
      if (_expCancel) return resolve(null);
      const el = (Date.now() - t0) / 1000;
      const pct = Math.min(50, (el / dur) * 50); // 0% to 50% for capture
      expProgress(pct, `Capturing: ${fmt(el)} / ${fmt(dur)}`);
      if (el < dur + 0.5) expTimer = setTimeout(tick, 150);
    }
    tick();

    expTimer = setTimeout(() => {
      clearTimeout(expTimer);
      expProgress(50, 'Finalizing capture…');
      if (S.playing) pause();
      recorder.stop();
    }, (dur + 0.5) * 1000);
  });

  if (_expCancel || !webmBlob) return;

  // ── Step 2: Load FFmpeg.wasm ──
  expProgress(52, 'Loading FFmpeg Engine (~25MB)…');
  await loadFFmpegScripts();
  if (_expCancel) return;

  const { FFmpeg } = window.FFmpegWASM;
  const { fetchFile } = window.FFmpegUtil;
  const ffmpeg = new FFmpeg();

  // Handle conversion progress
  ffmpeg.on('progress', ({ progress }) => {
    const pct = 55 + (progress * 40); // 55% to 95% for transcode
    expProgress(pct, `Converting to MP4: ${Math.round(progress * 100)}%`);
  });

  expProgress(53, 'Loading engine components…');
  // Load core locally
  await ffmpeg.load({ 
    coreURL: 'lib/ffmpeg-core.js', 
    wasmURL: 'lib/ffmpeg-core.wasm', 
    workerURL: 'lib/814.ffmpeg.js' 
  });
  if (_expCancel) return;

  // ── Step 3: Transcode to MP4 ──
  expProgress(55, 'Preparing files…');
  await ffmpeg.writeFile('input.webm', await fetchFile(webmBlob));

  expProgress(56, 'Starting MP4 conversion (CPU)…');
  await ffmpeg.exec([
    '-i', 'input.webm',
    '-c:v', 'libx264',
    '-preset', 'ultrafast', // Fast encoding
    '-c:a', 'aac',
    '-b:a', '192k',
    'output.mp4'
  ]);

  if (_expCancel) return;

  expProgress(98, 'Packaging file…');
  const fileData = await ffmpeg.readFile('output.mp4');
  const mp4Blob = new Blob([fileData.buffer], { type: 'video/mp4' });

  downloadBlob(mp4Blob, `audioviz_${Date.now()}.mp4`);
  expProgress(100, '✓ MP4 exported successfully!');
  await new Promise(r => setTimeout(r, 1000));
}

// Lazy-load FFmpeg UMD scripts from local lib folder
function loadFFmpegScripts() {
  if (window.FFmpegWASM) return Promise.resolve();

  const loadScript = (src) => new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = src;
    s.onload = resolve;
    s.onerror = () => reject(new Error('Failed to load local FFmpeg library. Check your lib/ folder.'));
    document.head.appendChild(s);
  });

  return Promise.all([
    loadScript('lib/ffmpeg.js'),
    loadScript('lib/ffmpeg-util.js')
  ]);
}

// Offline audio render (same effects chain as WAV export)
async function renderAudioOffline(dur, sr) {
  const offCtx = new OfflineAudioContext(2, Math.ceil(dur * sr), sr);

  const oGain = offCtx.createGain();
  oGain.gain.value = volGain?.gain.value ?? 1;

  const oBass = offCtx.createBiquadFilter();
  oBass.type = 'lowshelf'; oBass.frequency.value = 150;
  oBass.gain.value = bassF?.gain.value ?? 0;

  const oMid = offCtx.createBiquadFilter();
  oMid.type = 'peaking'; oMid.frequency.value = 800; oMid.Q.value = 1;
  oMid.gain.value = midF?.gain.value ?? 0;

  const oTreb = offCtx.createBiquadFilter();
  oTreb.type = 'highshelf'; oTreb.frequency.value = 4000;
  oTreb.gain.value = trebF?.gain.value ?? 0;

  const oComp = offCtx.createDynamicsCompressor();
  if (compNode) {
    oComp.threshold.value = compNode.threshold.value;
    oComp.knee.value = compNode.knee.value;
    oComp.ratio.value = compNode.ratio.value;
    oComp.attack.value = compNode.attack.value;
    oComp.release.value = compNode.release.value;
  }

  const oSrc = offCtx.createBufferSource();
  oSrc.buffer = S.audioBuf;
  oSrc.connect(oGain);
  oGain.connect(oBass); oBass.connect(oMid); oMid.connect(oTreb);
  oTreb.connect(oComp); oComp.connect(offCtx.destination);
  oSrc.start(0, S.trimA, dur);

  return offCtx.startRendering();
}

// ─────────────────────────────────────────
//  AUDIO ANALYSIS PRE-COMPUTATION (FFT)
// ─────────────────────────────────────────
async function preComputeAnalysis(frameCount, fps) {
  const sr = actx.sampleRate;
  const fftSize = 1024;
  const halfN = fftSize >> 1;
  const ch0 = S.audioBuf.getChannelData(0);
  const ch1 = S.audioBuf.numberOfChannels > 1 ? S.audioBuf.getChannelData(1) : ch0;
  const result = new Array(frameCount);

  // Hanning window coefficients (pre-computed)
  const hann = new Float32Array(fftSize);
  for (let i = 0; i < fftSize; i++)
    hann[i] = 0.5 * (1 - Math.cos(2 * Math.PI * i / (fftSize - 1)));

  let prevFreq = new Uint8Array(halfN); // for smoothing

  for (let f = 0; f < frameCount; f++) {
    const t0 = S.trimA + f / fps;
    const cs = Math.floor(t0 * sr);

    const re = new Float32Array(fftSize);
    const im = new Float32Array(fftSize);

    for (let i = 0; i < fftSize; i++) {
      const si = cs + i - halfN;
      const mono = (si >= 0 && si < ch0.length)
        ? (ch0[si] + ch1[si]) * 0.5
        : 0;
      re[i] = mono * hann[i];
    }

    fftInPlace(re, im);

    const freq = new Uint8Array(halfN);
    for (let i = 0; i < halfN; i++) {
      const mag = Math.sqrt(re[i] * re[i] + im[i] * im[i]) / halfN;
      // Convert to dB-ish scale similar to Web Audio AnalyserNode default
      const db = 20 * Math.log10(mag + 1e-9) + 120; // rough 0–120 dB
      const raw = Math.round(Math.max(0, Math.min(255, db * 2.125)));
      // Smoothing (0.82 = analyser default)
      freq[i] = Math.round(prevFreq[i] * 0.82 + raw * 0.18);
    }
    prevFreq = freq;

    // Time-domain: byte-scaled waveform for this window
    const time = new Uint8Array(fftSize);
    for (let i = 0; i < fftSize; i++) {
      const si = cs + i - halfN;
      const mono = (si >= 0 && si < ch0.length)
        ? (ch0[si] + ch1[si]) * 0.5
        : 0;
      time[i] = Math.round(Math.max(0, Math.min(255, (mono + 1) * 128)));
    }

    result[f] = { freq, time };

    if (f % 120 === 0) {
      expProgress(4 + (f / frameCount) * 12, `Analysing frame ${f} / ${frameCount}…`);
      await new Promise(r => setTimeout(r, 0));
    }
  }
  return result;
}

// In-place Cooley–Tukey radix-2 DIT FFT
function fftInPlace(re, im) {
  const N = re.length;
  // Bit-reversal permutation
  for (let i = 1, j = 0; i < N; i++) {
    let bit = N >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) {
      let t; t = re[i]; re[i] = re[j]; re[j] = t;
      t = im[i]; im[i] = im[j]; im[j] = t;
    }
  }
  // Butterfly stages
  for (let len = 2; len <= N; len <<= 1) {
    const half = len >> 1;
    const ang = -2 * Math.PI / len;
    const wRe = Math.cos(ang), wIm = Math.sin(ang);
    for (let i = 0; i < N; i += len) {
      let uRe = 1, uIm = 0;
      for (let j = 0; j < half; j++) {
        const aRe = re[i + j], aIm = im[i + j];
        const bRe = re[i + j + half] * uRe - im[i + j + half] * uIm;
        const bIm = re[i + j + half] * uIm + im[i + j + half] * uRe;
        re[i + j] = aRe + bRe; im[i + j] = aIm + bIm;
        re[i + j + half] = aRe - bRe; im[i + j + half] = aIm - bIm;
        const nRe = uRe * wRe - uIm * wIm;
        uIm = uRe * wIm + uIm * wRe; uRe = nRe;
      }
    }
  }
}

// ─────────────────────────────────────────
//  CANCEL / RESET
// ─────────────────────────────────────────
function cancelExport() {
  _expCancel = true;
  S.recCanceled = true;
  S._offlineRender = false;
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


