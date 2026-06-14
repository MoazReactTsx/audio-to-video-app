'use strict';

(() => {
  const $ = (id) => document.getElementById(id);
  const ui = {
    imageInput: $('imageInput'),
    audioInput: $('audioInput'),
    imageDrop: $('imageDrop'),
    audioDrop: $('audioDrop'),
    imageStatus: $('imageStatus'),
    audioStatus: $('audioStatus'),
    previewCanvas: $('previewCanvas'),
    timelineCanvas: $('timelineCanvas'),
    previewBtn: $('previewBtn'),
    canvasSizePill: $('canvasSizePill'),
    durationPill: $('durationPill'),
    timelineTimePill: $('timelineTimePill'),
    resolutionSelect: $('resolutionSelect'),
    bitrateRange: $('bitrateRange'),
    bitrateValue: $('bitrateValue'),
    visualizerSelect: $('visualizerSelect'),
    summaryDuration: $('summaryDuration'),
    summaryEstimate: $('summaryEstimate'),
    summaryAudioCodec: $('summaryAudioCodec'),
    summaryRecorderCodec: $('summaryRecorderCodec'),
    layersList: $('layersList'),
    layerPanelLabel: $('layerPanelLabel'),
    layerPanelTitle: $('layerPanelTitle'),
    layerPanelBody: $('layerPanelBody'),
    imageOpacityRange: $('imageOpacityRange'),
    imageOpacityValue: $('imageOpacityValue'),
    imageScaleRange: $('imageScaleRange'),
    imageScaleValue: $('imageScaleValue'),
    audioVolumeRange: $('audioVolumeRange'),
    audioVolumeValue: $('audioVolumeValue'),
    trimStartInput: $('trimStartInput'),
    trimEndInput: $('trimEndInput'),
    fullTrackBtn: $('fullTrackBtn'),
    trimNote: $('trimNote'),
    visualizerIntensityRange: $('visualizerIntensityRange'),
    visualizerIntensityValue: $('visualizerIntensityValue'),
    startBtn: $('startBtn'),
    resetBtn: $('resetBtn'),
    cancelBtn: $('cancelBtn'),
    downloadWebmBtn: $('downloadWebmBtn'),
    downloadMp4Btn: $('downloadMp4Btn'),
    warningBox: $('warningBox'),
    statusTitle: $('statusTitle'),
    statusText: $('statusText'),
    progressBar: $('progressBar'),
  };

  const ctx = ui.previewCanvas.getContext('2d', { alpha: false });
  if (!ctx) throw new Error('Canvas 2D context is not available in this browser.');
  const timelineCtx = ui.timelineCanvas.getContext('2d', { alpha: false });
  if (!timelineCtx) throw new Error('Timeline canvas 2D context is not available in this browser.');

  const state = {
    imageFile: null,
    audioFile: null,
    imageAsset: null,
    imageObjectUrl: null,
    audioObjectUrl: null,
    audioBuffer: null,
    audioDuration: 0,
    waveformPeaks: null,
    trimStart: 0,
    trimEnd: 0,
    imageOpacity: 1,
    imageScale: 1,
    audioVolume: 1,
    visualizerIntensity: 1,
    audioCtx: null,
    audioEl: new Audio(),
    sourceNode: null,
    analyser: null,
    gainNode: null,
    mediaDest: null,
    freqData: null,
    timeData: null,
    recorder: null,
    recorderMime: '',
    webmBlob: null,
    mp4Blob: null,
    ffmpeg: null,
    ffmpegScriptPromise: null,
    mode: 'bars',
    selectedLayerId: 'image',
    layers: [
      { id: 'image', label: 'Background Image', type: 'image', visible: true },
      { id: 'audio', label: 'Audio Track', type: 'audio', visible: true },
      { id: 'visualizer', label: 'Visualizer', type: 'visualizer', visible: true },
    ],
    resolution: { width: 1280, height: 720 },
    videoBitsPerSecond: 1_200_000,
    busy: false,
    recording: false,
    converting: false,
    cancelRequested: false,
    recorderChunks: [],
    backupStopTimer: null,
    renderFrameId: 0,
    timelineInteraction: null,
    lastFfmpegLog: '',
    ffmpegProgress: 0,
    pendingAudioLoadToken: 0,
  };

  state.audioEl.preload = 'auto';
  state.audioEl.crossOrigin = 'anonymous';
  state.audioEl.playsInline = true;

  const RECORDER_MIME_TYPES = [
    'video/webm;codecs=vp9,opus',
    'video/webm;codecs=vp8,opus',
    'video/webm',
  ];

  const FFmpegCoreBase = new URL('./lib/', window.location.href);

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function formatTime(seconds) {
    if (!Number.isFinite(seconds) || seconds < 0) return '--:--.-';
    const minutes = Math.floor(seconds / 60);
    const wholeSeconds = Math.floor(seconds % 60);
    const tenths = Math.floor((seconds % 1) * 10);
    return `${minutes}:${String(wholeSeconds).padStart(2, '0')}.${tenths}`;
  }

  function formatBytes(bytes) {
    if (!Number.isFinite(bytes)) return '--';
    if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  }

  function estimateSizeMB(duration, bitrate) {
    if (!duration) return 0;
    return (duration * bitrate) / 8 / 1024 / 1024;
  }

  function getTrimDuration() {
    if (!state.audioDuration) return 0;
    return clamp(state.trimEnd - state.trimStart, 0.1, state.audioDuration);
  }

  function getCurrentPlayheadTime() {
    if (!state.audioDuration) return 0;
    if (state.recording) return clamp(state.audioEl.currentTime - state.trimStart, 0, getTrimDuration());
    return clamp(state.audioEl.currentTime || 0, 0, state.audioDuration);
  }

  function syncTransportUi() {
    if (ui.previewBtn) {
      ui.previewBtn.textContent = state.audioEl.paused ? 'Play Preview' : 'Pause Preview';
      ui.previewBtn.disabled = !state.audioBuffer || state.busy;
    }

    if (ui.timelineTimePill) {
      const clipDuration = getTrimDuration();
      const current = getCurrentPlayheadTime();
      const relative = state.audioDuration ? clamp(current - state.trimStart, 0, clipDuration) : 0;
      ui.timelineTimePill.textContent = state.audioDuration
        ? `${formatTime(relative)} / ${formatTime(clipDuration)}`
        : '0:00.0 / 0:00.0';
    }
  }

  async function togglePreviewPlayback() {
    if (!state.audioBuffer || state.busy) return;

    if (!state.audioEl.paused) {
      state.audioEl.pause();
      syncTransportUi();
      renderFrame();
      return;
    }

    const current = state.audioEl.currentTime || 0;
    if (current < state.trimStart || current >= state.trimEnd) {
      state.audioEl.currentTime = state.trimStart;
    }

    await ensureAudioContext();
    if (state.audioCtx.state === 'suspended') {
      await state.audioCtx.resume();
    }

    applyAudioGain();
    await state.audioEl.play();
    syncTransportUi();
  }

  function getLayer(id) {
    return state.layers.find((layer) => layer.id === id);
  }

  function setSelectedLayer(id) {
    state.selectedLayerId = id;
    renderLayersList();
    syncLayerPanelState();
  }

  function setLayerVisible(id, visible) {
    const layer = getLayer(id);
    if (!layer) return;
    layer.visible = visible;
    renderLayersList();
    if (id === 'audio') applyAudioGain();
    invalidateExports();
    renderFrame();
  }

  function renderLayersList() {
    if (!ui.layersList) return;
    ui.layersList.innerHTML = '';
    state.layers.forEach((layer) => {
      const row = document.createElement('div');
      row.className = `layer-row${layer.id === state.selectedLayerId ? ' on' : ''}`;
      row.innerHTML = `
        <span class="layer-spot ${layer.visible ? 'on' : 'off'}"></span>
        <span class="layer-name">${layer.label}</span>
        <span class="layer-type">${layer.type}</span>
        <button class="layer-eye" type="button" aria-label="Toggle visibility">${layer.visible ? '👁' : '🙈'}</button>
      `;
      row.addEventListener('click', () => setSelectedLayer(layer.id));
      const eye = row.querySelector('.layer-eye');
      eye.addEventListener('click', (event) => {
        event.stopPropagation();
        setLayerVisible(layer.id, !layer.visible);
      });
      ui.layersList.appendChild(row);
    });
  }

  function updateLayerPanel() {
    const layer = getLayer(state.selectedLayerId) || getLayer('image');
    if (!layer) return;
    ui.layerPanelLabel.textContent = `${layer.type.toUpperCase()} layer`;
    ui.layerPanelTitle.textContent = layer.label;
    ui.layerPanelBody.classList.toggle('is-audio', layer.id === 'audio');
    ui.layerPanelBody.classList.toggle('is-image', layer.id === 'image');
    ui.layerPanelBody.classList.toggle('is-visualizer', layer.id === 'visualizer');
  }

  function setStatus(title, text, progress = null) {
    ui.statusTitle.textContent = title;
    ui.statusText.textContent = text;
    if (progress == null) return;
    ui.progressBar.style.width = `${clamp(progress, 0, 100)}%`;
  }

  function showWarning(message) {
    ui.warningBox.hidden = false;
    ui.warningBox.textContent = message;
  }

  function clearWarning() {
    ui.warningBox.hidden = true;
    ui.warningBox.textContent = '';
  }

  function setCanvasResolution(width, height) {
    state.resolution = { width, height };
    ui.previewCanvas.width = width;
    ui.previewCanvas.height = height;
    ui.canvasSizePill.textContent = `${width} x ${height}`;
    renderFrame();
  }

  function updateSummary() {
    const durationText = state.audioDuration ? formatTime(getTrimDuration()) : '--:--.-';
    ui.summaryDuration.textContent = durationText;
    ui.durationPill.textContent = durationText;
    ui.summaryAudioCodec.textContent = state.audioBuffer ? `${state.audioBuffer.numberOfChannels} ch / ${state.audioBuffer.sampleRate} Hz` : '--';

    const estimated = estimateSizeMB(getTrimDuration(), state.videoBitsPerSecond + 128_000);
    ui.summaryEstimate.textContent = state.audioDuration ? `~${estimated.toFixed(1)} MB` : '--';
    ui.summaryRecorderCodec.textContent = state.recorderMime || '--';
  }

  function syncTrimUi() {
    ui.trimStartInput.min = '0';
    ui.trimEndInput.min = '0';
    ui.trimStartInput.max = state.audioDuration ? state.audioDuration.toFixed(1) : '0';
    ui.trimEndInput.max = state.audioDuration ? state.audioDuration.toFixed(1) : '0';
    ui.trimStartInput.value = state.audioDuration ? state.trimStart.toFixed(1) : '0';
    ui.trimEndInput.value = state.audioDuration ? state.trimEnd.toFixed(1) : '0';
    const clipDuration = getTrimDuration();
    const fullDuration = state.audioDuration || 0;
    ui.trimNote.textContent = fullDuration
      ? `Cut: ${formatTime(state.trimStart)} -> ${formatTime(state.trimEnd)} (${formatTime(clipDuration)} selected)`
      : 'Choose the voice segment you want to export.';
    syncTransportUi();
  }

  function setTrimRange(start, end, invalidate = true) {
    if (!state.audioDuration) {
      state.trimStart = 0;
      state.trimEnd = 0;
      syncTrimUi();
      updateSummary();
      return;
    }

    const safeStart = clamp(start, 0, Math.max(0, state.audioDuration - 0.1));
    const safeEnd = clamp(end, safeStart + 0.1, state.audioDuration);
    state.trimStart = safeStart;
    state.trimEnd = safeEnd;
    syncTrimUi();
    updateSummary();
    if (invalidate) invalidateExports();
    renderFrame();
  }

  function updateBitrateLabel() {
    ui.bitrateValue.textContent = `${Math.round(state.videoBitsPerSecond / 1000)} kbps`;
    updateSummary();
  }

  function updateUiReadyState() {
    const ready = Boolean(state.imageAsset && state.audioBuffer);
    const hasAudio = Boolean(state.audioBuffer);
    ui.startBtn.disabled = !ready || state.busy;
    ui.downloadWebmBtn.disabled = !state.webmBlob;
    ui.downloadMp4Btn.disabled = !state.mp4Blob;
    ui.previewBtn.disabled = !hasAudio || state.busy;
    ui.trimStartInput.disabled = !hasAudio || state.busy;
    ui.trimEndInput.disabled = !hasAudio || state.busy;
    ui.fullTrackBtn.disabled = !hasAudio || state.busy;
    ui.imageOpacityRange.disabled = !Boolean(state.imageAsset) || state.busy;
    ui.imageScaleRange.disabled = !Boolean(state.imageAsset) || state.busy;
    ui.audioVolumeRange.disabled = !hasAudio || state.busy;
    ui.visualizerIntensityRange.disabled = state.busy;
    ui.visualizerSelect.disabled = state.busy;
    syncTransportUi();
  }

  function invalidateExports() {
    state.webmBlob = null;
    state.mp4Blob = null;
    state.recorderMime = '';
    ui.downloadWebmBtn.disabled = true;
    ui.downloadMp4Btn.disabled = true;
    updateSummary();
  }

  function syncImageUi() {
    ui.imageOpacityRange.value = Math.round(state.imageOpacity * 100);
    ui.imageOpacityValue.textContent = `${Math.round(state.imageOpacity * 100)}%`;
    ui.imageScaleRange.value = Math.round(state.imageScale * 100);
    ui.imageScaleValue.textContent = `${Math.round(state.imageScale * 100)}%`;
  }

  function syncAudioUi() {
    ui.audioVolumeRange.value = Math.round(state.audioVolume * 100);
    ui.audioVolumeValue.textContent = `${Math.round(state.audioVolume * 100)}%`;
  }

  function syncVisualizerUi() {
    ui.visualizerIntensityRange.value = Math.round(state.visualizerIntensity * 100);
    ui.visualizerIntensityValue.textContent = `${Math.round(state.visualizerIntensity * 100)}%`;
    ui.visualizerSelect.value = state.mode;
  }

  function syncLayerPanelState() {
    syncImageUi();
    syncAudioUi();
    syncVisualizerUi();
    updateLayerPanel();
  }

  function applyAudioGain() {
    if (!state.gainNode) return;
    const audioLayer = getLayer('audio');
    state.gainNode.gain.value = audioLayer?.visible === false ? 0 : state.audioVolume;
  }

  function setImageOpacity(value) {
    state.imageOpacity = clamp(value, 0, 1);
    syncImageUi();
    invalidateExports();
    renderFrame();
  }

  function setImageScale(value) {
    state.imageScale = clamp(value, 1, 1.4);
    syncImageUi();
    invalidateExports();
    renderFrame();
  }

  function setAudioVolume(value) {
    state.audioVolume = clamp(value, 0, 1);
    syncAudioUi();
    applyAudioGain();
    invalidateExports();
    renderFrame();
  }

  function setVisualizerIntensity(value) {
    state.visualizerIntensity = clamp(value, 0.3, 1.6);
    syncVisualizerUi();
    invalidateExports();
    renderFrame();
  }

  function setDropState(el, ready) {
    el.classList.toggle('ready', !!ready);
  }

  function syncFileStatus() {
    ui.imageStatus.textContent = state.imageFile ? state.imageFile.name : 'Click or drop an image';
    ui.audioStatus.textContent = state.audioFile ? state.audioFile.name : 'Click or drop an audio file';
    setDropState(ui.imageDrop, !!state.imageAsset);
    setDropState(ui.audioDrop, !!state.audioBuffer);
  }

  async function loadImageAsset(file) {
    if ('createImageBitmap' in window) {
      return createImageBitmap(file);
    }

    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        URL.revokeObjectURL(url);
        resolve(img);
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error('Failed to decode the image file.'));
      };
      img.src = url;
    });
  }

  async function ensureAudioContext() {
    if (state.audioCtx) return state.audioCtx;
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) throw new Error('Web Audio API is not supported in this browser.');
    state.audioCtx = new Ctx();
    return state.audioCtx;
  }

  async function loadAudioFile(file) {
    const audioCtx = await ensureAudioContext();
    const token = ++state.pendingAudioLoadToken;

    if (state.audioObjectUrl) {
      URL.revokeObjectURL(state.audioObjectUrl);
      state.audioObjectUrl = null;
    }

    state.audioObjectUrl = URL.createObjectURL(file);
    state.audioEl.src = state.audioObjectUrl;
    state.audioEl.currentTime = 0;
    state.audioEl.load();

    const arrayBuffer = await file.arrayBuffer();
    if (token !== state.pendingAudioLoadToken) return null;

    const decoded = await audioCtx.decodeAudioData(arrayBuffer.slice(0));
    if (token !== state.pendingAudioLoadToken) return null;

    return decoded;
  }

  function computeWaveformPeaks(audioBuffer, bins = 120) {
    const peaks = new Float32Array(bins);
    const channelA = audioBuffer.getChannelData(0);
    const channelB = audioBuffer.numberOfChannels > 1 ? audioBuffer.getChannelData(1) : channelA;
    const blockSize = Math.max(1, Math.floor(audioBuffer.length / bins));

    for (let i = 0; i < bins; i++) {
      const start = i * blockSize;
      const end = Math.min(audioBuffer.length, start + blockSize);
      let max = 0;
      for (let j = start; j < end; j++) {
        const sample = Math.abs((channelA[j] + channelB[j]) * 0.5);
        if (sample > max) max = sample;
      }
      peaks[i] = max;
    }

    return peaks;
  }

  function getImageSize(asset) {
    return {
      width: asset.width || asset.naturalWidth || 0,
      height: asset.height || asset.naturalHeight || 0,
    };
  }

  function drawCoverImage(image, canvasWidth, canvasHeight, scale = 1) {
    const { width: imageWidth, height: imageHeight } = getImageSize(image);
    if (!imageWidth || !imageHeight) return;

    const imageRatio = imageWidth / imageHeight;
    const canvasRatio = canvasWidth / canvasHeight;

    let drawWidth;
    let drawHeight;
    if (imageRatio > canvasRatio) {
      drawHeight = canvasHeight * scale;
      drawWidth = drawHeight * imageRatio;
    } else {
      drawWidth = canvasWidth * scale;
      drawHeight = drawWidth / imageRatio;
    }

    const dx = (canvasWidth - drawWidth) / 2;
    const dy = (canvasHeight - drawHeight) / 2;
    ctx.drawImage(image, dx, dy, drawWidth, drawHeight);
  }

  function sampleArray(values, outputCount) {
    if (!values || values.length === 0) return new Float32Array(outputCount);
    if (values.length === outputCount) return Float32Array.from(values);
    const out = new Float32Array(outputCount);
    const step = (values.length - 1) / Math.max(1, outputCount - 1);
    for (let i = 0; i < outputCount; i++) {
      const pos = i * step;
      const left = Math.floor(pos);
      const right = Math.min(values.length - 1, left + 1);
      const mix = pos - left;
      out[i] = values[left] * (1 - mix) + values[right] * mix;
    }
    return out;
  }

  function syncTimelineCanvasSize() {
    const canvas = ui.timelineCanvas;
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    const width = Math.max(1, Math.round(rect.width * dpr));
    const height = Math.max(1, Math.round(rect.height * dpr));
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
    }
  }

  function roundRectPath(context, x, y, width, height, radius) {
    const r = Math.min(radius, width / 2, height / 2);
    context.beginPath();
    context.moveTo(x + r, y);
    context.arcTo(x + width, y, x + width, y + height, r);
    context.arcTo(x + width, y + height, x, y + height, r);
    context.arcTo(x, y + height, x, y, r);
    context.arcTo(x, y, x + width, y, r);
    context.closePath();
  }

  function getTimelineLayout() {
    const { width: w, height: h } = ui.timelineCanvas;
    const padding = Math.max(16, Math.floor(w * 0.022));
    const labelWidth = Math.min(Math.max(88, Math.floor(w * 0.1)), 132);
    const contentX = padding + labelWidth;
    const contentWidth = Math.max(120, w - contentX - padding);
    const rulerY = padding + 18;
    const trackY = rulerY + 28;
    const trackH = Math.max(86, h - trackY - padding);
    return { w, h, padding, labelWidth, contentX, contentWidth, rulerY, trackY, trackH };
  }

  function getTimelineTimeFromX(x) {
    if (!state.audioDuration) return 0;
    const { contentX, contentWidth } = getTimelineLayout();
    const ratio = clamp((x - contentX) / contentWidth, 0, 1);
    return ratio * state.audioDuration;
  }

  function getTimelineXFromTime(time) {
    if (!state.audioDuration) return getTimelineLayout().contentX;
    const { contentX, contentWidth } = getTimelineLayout();
    return contentX + (clamp(time, 0, state.audioDuration) / state.audioDuration) * contentWidth;
  }

  function updateTimelineTrimFromPointer(clientX, mode) {
    const rect = ui.timelineCanvas.getBoundingClientRect();
    const dpr = ui.timelineCanvas.width / rect.width;
    const x = (clientX - rect.left) * dpr;
    const time = getTimelineTimeFromX(x);
    const minGap = Math.min(0.25, Math.max(0.1, state.audioDuration / 240));

    if (mode === 'start') {
      setTrimRange(Math.min(time, state.trimEnd - minGap), state.trimEnd);
    } else if (mode === 'end') {
      setTrimRange(state.trimStart, Math.max(time, state.trimStart + minGap));
    } else if (mode === 'move') {
      const span = state.timelineInteraction?.span ?? getTrimDuration();
      const offset = state.timelineInteraction?.offset ?? 0;
      const nextStart = clamp(time - offset, 0, Math.max(0, state.audioDuration - span));
      setTrimRange(nextStart, nextStart + span);
    } else {
      if (!state.recording) {
        state.audioEl.currentTime = time;
        syncTransportUi();
        renderFrame();
      }
    }
  }

  function renderTimeline() {
    if (!ui.timelineCanvas) return;
    syncTimelineCanvasSize();
    const { w, h, contentX, contentWidth, padding, rulerY, trackY, trackH, labelWidth } = getTimelineLayout();
    timelineCtx.clearRect(0, 0, w, h);

    const backdrop = timelineCtx.createLinearGradient(0, 0, 0, h);
    backdrop.addColorStop(0, 'rgba(9, 12, 22, 0.98)');
    backdrop.addColorStop(1, 'rgba(4, 6, 12, 1)');
    timelineCtx.fillStyle = backdrop;
    timelineCtx.fillRect(0, 0, w, h);

    const gridColor = 'rgba(255,255,255,0.06)';
    const textColor = 'rgba(237,242,255,0.88)';
    const mutedColor = 'rgba(154,167,204,0.9)';

    const duration = state.audioDuration || 0;
    const playheadTime = state.audioEl.currentTime || 0;
    const trimStartX = getTimelineXFromTime(state.trimStart);
    const trimEndX = getTimelineXFromTime(state.trimEnd);
    const playheadX = getTimelineXFromTime(playheadTime);
    const sampleCount = Math.max(220, Math.floor(contentWidth / 4));
    const peaks = state.waveformPeaks ? sampleArray(state.waveformPeaks, sampleCount) : new Float32Array(sampleCount);

    timelineCtx.save();
    timelineCtx.font = `${Math.max(12, Math.floor(w * 0.014))}px Inter, system-ui, sans-serif`;
    timelineCtx.textBaseline = 'middle';

    if (!duration) {
      roundRectPath(timelineCtx, contentX, trackY, contentWidth, trackH, 16);
      timelineCtx.fillStyle = 'rgba(255,255,255,0.03)';
      timelineCtx.fill();
      timelineCtx.strokeStyle = 'rgba(255,255,255,0.08)';
      timelineCtx.stroke();
      timelineCtx.fillStyle = textColor;
      timelineCtx.textAlign = 'center';
      timelineCtx.fillText('Load audio to edit the voice on the timeline', contentX + contentWidth / 2, h / 2);
      timelineCtx.restore();
      return;
    }
    const rulerTimes = duration <= 10 ? [0, duration / 4, duration / 2, (duration * 3) / 4, duration] : [0, duration / 3, (duration * 2) / 3, duration];
    rulerTimes.forEach((time) => {
      const x = getTimelineXFromTime(time);
      timelineCtx.strokeStyle = gridColor;
      timelineCtx.beginPath();
      timelineCtx.moveTo(x, rulerY);
      timelineCtx.lineTo(x, h - padding);
      timelineCtx.stroke();

      timelineCtx.fillStyle = mutedColor;
      timelineCtx.textAlign = 'center';
      timelineCtx.fillText(formatTime(time), x, rulerY - 8);
    });

    timelineCtx.fillStyle = textColor;
    timelineCtx.textAlign = 'left';
    timelineCtx.fillText('Voice', padding, trackY + trackH / 2 - 30);
    timelineCtx.fillStyle = mutedColor;
    timelineCtx.fillText('Selected cut', padding, trackY + trackH / 2 + 26);

    roundRectPath(timelineCtx, contentX, trackY, contentWidth, trackH, 16);
    timelineCtx.fillStyle = 'rgba(255,255,255,0.035)';
    timelineCtx.fill();
    timelineCtx.strokeStyle = 'rgba(255,255,255,0.08)';
    timelineCtx.stroke();

    const waveY = trackY + trackH / 2;
    const waveMax = trackH * 0.34;
    const selectedStart = Math.min(trimStartX, trimEndX);
    const selectedEnd = Math.max(trimStartX, trimEndX);

    timelineCtx.save();
    timelineCtx.beginPath();
    roundRectPath(timelineCtx, contentX + 6, trackY + 6, contentWidth - 12, trackH - 12, 12);
    timelineCtx.clip();

    timelineCtx.fillStyle = 'rgba(84,209,255,0.04)';
    timelineCtx.fillRect(contentX, trackY, contentWidth, trackH);

    timelineCtx.beginPath();
    for (let i = 0; i < peaks.length; i++) {
      const px = contentX + (i / Math.max(1, peaks.length - 1)) * contentWidth;
      const sample = peaks[i] > 1 ? peaks[i] / 255 : peaks[i];
      const amp = Math.max(0.08, sample) * waveMax * state.visualizerIntensity;
      timelineCtx.moveTo(px, waveY - amp);
      timelineCtx.lineTo(px, waveY + amp);
    }
    timelineCtx.strokeStyle = 'rgba(255,255,255,0.78)';
    timelineCtx.lineWidth = Math.max(1, Math.floor(w * 0.0015));
    timelineCtx.stroke();

    timelineCtx.fillStyle = 'rgba(84,209,255,0.16)';
    timelineCtx.fillRect(selectedStart, trackY, Math.max(2, selectedEnd - selectedStart), trackH);

    timelineCtx.beginPath();
    timelineCtx.moveTo(contentX, waveY);
    timelineCtx.lineTo(contentX + contentWidth, waveY);
    timelineCtx.strokeStyle = 'rgba(255,255,255,0.08)';
    timelineCtx.lineWidth = 1;
    timelineCtx.stroke();

    timelineCtx.restore();

    timelineCtx.fillStyle = 'rgba(84,209,255,0.98)';
    timelineCtx.fillRect(trimStartX - 3, trackY + 6, 6, trackH - 12);
    timelineCtx.fillRect(trimEndX - 3, trackY + 6, 6, trackH - 12);
    timelineCtx.beginPath();
    timelineCtx.arc(trimStartX, waveY, 10, 0, Math.PI * 2);
    timelineCtx.arc(trimEndX, waveY, 10, 0, Math.PI * 2);
    timelineCtx.fill();
    timelineCtx.strokeStyle = 'rgba(0,0,0,0.35)';
    timelineCtx.lineWidth = 2;
    timelineCtx.stroke();

    timelineCtx.fillStyle = 'rgba(255,255,255,0.94)';
    timelineCtx.textAlign = 'center';
    timelineCtx.fillText(formatTime(state.trimStart), trimStartX, trackY + 16);
    timelineCtx.fillText(formatTime(state.trimEnd), trimEndX, trackY + 16);

    const playheadColor = 'rgba(255,255,255,0.92)';
    timelineCtx.strokeStyle = playheadColor;
    timelineCtx.lineWidth = Math.max(1.5, Math.floor(w * 0.0012));
    timelineCtx.beginPath();
    timelineCtx.moveTo(playheadX, rulerY - 2);
    timelineCtx.lineTo(playheadX, h - padding + 8);
    timelineCtx.stroke();
    timelineCtx.fillStyle = playheadColor;
    timelineCtx.beginPath();
    timelineCtx.arc(playheadX, rulerY - 2, 5.5, 0, Math.PI * 2);
    timelineCtx.fill();

    timelineCtx.fillStyle = textColor;
    timelineCtx.textAlign = 'center';
    timelineCtx.fillText(formatTime(playheadTime), playheadX, rulerY - 16);

    timelineCtx.fillStyle = mutedColor;
    timelineCtx.textAlign = 'right';
    timelineCtx.fillText(`Selection ${formatTime(getTrimDuration())}`, w - padding, h - 12);
    timelineCtx.restore();
  }

  function getTimelinePointer(event) {
    const rect = ui.timelineCanvas.getBoundingClientRect();
    const scaleX = ui.timelineCanvas.width / rect.width;
    const scaleY = ui.timelineCanvas.height / rect.height;
    return {
      x: (event.clientX - rect.left) * scaleX,
      y: (event.clientY - rect.top) * scaleY,
    };
  }

  function hitTestTimeline(event) {
    const pointer = getTimelinePointer(event);
    const layout = getTimelineLayout();
    const { contentX, contentWidth, trackY, trackH } = layout;
    const selectedStart = getTimelineXFromTime(state.trimStart);
    const selectedEnd = getTimelineXFromTime(state.trimEnd);
    const handleRadius = 18;
    const isInsideAudio = pointer.x >= contentX && pointer.x <= contentX + contentWidth && pointer.y >= trackY && pointer.y <= trackY + trackH;

    if (!isInsideAudio) return { mode: 'scrub', pointer };
    if (Math.abs(pointer.x - selectedStart) <= handleRadius) return { mode: 'start', pointer };
    if (Math.abs(pointer.x - selectedEnd) <= handleRadius) return { mode: 'end', pointer };
    if (pointer.x > Math.min(selectedStart, selectedEnd) && pointer.x < Math.max(selectedStart, selectedEnd)) {
      return { mode: 'move', pointer, offset: clamp(pointer.x - selectedStart, 0, getTrimDuration()) };
    }
    return { mode: 'scrub', pointer };
  }

  function onTimelinePointerDown(event) {
    if (!state.audioDuration || state.busy) return;
    event.preventDefault();
    ui.timelineCanvas.setPointerCapture(event.pointerId);
    const hit = hitTestTimeline(event);
    state.timelineInteraction = {
      pointerId: event.pointerId,
      mode: hit.mode,
      offset: hit.offset || 0,
      span: getTrimDuration(),
    };
    updateTimelineTrimFromPointer(event.clientX, hit.mode);
  }

  function onTimelinePointerMove(event) {
    if (!state.audioDuration) return;
    const hit = hitTestTimeline(event);
    ui.timelineCanvas.style.cursor = state.busy ? 'not-allowed' : hit.mode === 'start' || hit.mode === 'end' ? 'ew-resize' : hit.mode === 'move' ? 'grab' : 'crosshair';
    if (!state.timelineInteraction || state.timelineInteraction.pointerId !== event.pointerId) {
      return;
    }
    event.preventDefault();
    updateTimelineTrimFromPointer(event.clientX, state.timelineInteraction.mode);
  }

  function onTimelinePointerUp(event) {
    if (!state.timelineInteraction || state.timelineInteraction.pointerId !== event.pointerId) return;
    try {
      ui.timelineCanvas.releasePointerCapture(event.pointerId);
    } catch (_) {}
    state.timelineInteraction = null;
    invalidateExports();
    renderFrame();
  }

  function getPreviewData(progress, live) {
    if (live && state.analyser) {
      state.analyser.getByteFrequencyData(state.freqData);
      state.analyser.getByteTimeDomainData(state.timeData);
      return {
        energy: getEnergy(state.freqData),
        spectrum: state.freqData,
        waveform: state.timeData,
      };
    }

    const peakValues = state.waveformPeaks || new Float32Array(120);
    const waveform = sampleArray(peakValues, 256);
    return {
      energy: average(peakValues) || 0.04,
      spectrum: peakValues,
      waveform,
      progress,
    };
  }

  function average(values) {
    if (!values || !values.length) return 0;
    let total = 0;
    for (let i = 0; i < values.length; i++) total += values[i];
    return total / values.length;
  }

  function getEnergy(freqData) {
    if (!freqData) return 0;
    let total = 0;
    const limit = Math.min(16, freqData.length);
    for (let i = 0; i < limit; i++) total += freqData[i];
    return total / (limit * 255);
  }

  function drawBackdrop(energy, progress, live) {
    const { width: w, height: h } = ui.previewCanvas;

    ctx.fillStyle = '#070a12';
    ctx.fillRect(0, 0, w, h);

    if (state.imageAsset && getLayer('image')?.visible) {
      const zoom = 1 + (live ? energy : 0.03 + Math.sin(progress * Math.PI * 2) * 0.015);
      ctx.save();
      ctx.globalAlpha = state.imageOpacity;
      drawCoverImage(state.imageAsset, w, h, zoom * state.imageScale);
      ctx.restore();
    } else {
      const background = ctx.createLinearGradient(0, 0, w, h);
      background.addColorStop(0, '#101935');
      background.addColorStop(0.5, '#0a1021');
      background.addColorStop(1, '#05070d');
      ctx.fillStyle = background;
      ctx.fillRect(0, 0, w, h);

      ctx.fillStyle = 'rgba(255,255,255,0.88)';
      ctx.font = `700 ${Math.max(20, Math.floor(w * 0.03))}px Inter, system-ui, sans-serif`;
      ctx.textAlign = 'center';
      const hint = state.imageAsset ? 'Image layer hidden' : 'Load an image and audio file';
      ctx.fillText(hint, w / 2, h / 2 - 12);
      ctx.fillStyle = 'rgba(255,255,255,0.55)';
      ctx.font = `${Math.max(14, Math.floor(w * 0.016))}px Inter, system-ui, sans-serif`;
      ctx.fillText('The preview canvas becomes the video output.', w / 2, h / 2 + 20);
    }

    const vignette = ctx.createRadialGradient(w / 2, h / 2, h * 0.2, w / 2, h / 2, h * 0.78);
    vignette.addColorStop(0, 'rgba(0,0,0,0)');
    vignette.addColorStop(1, 'rgba(0,0,0,0.72)');
    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, w, h);

    const wash = ctx.createLinearGradient(0, h, 0, 0);
    wash.addColorStop(0, `rgba(0, 0, 0, ${0.64 - energy * 0.1})`);
    wash.addColorStop(1, `rgba(12, 16, 28, ${0.22 - energy * 0.08})`);
    ctx.fillStyle = wash;
    ctx.fillRect(0, 0, w, h);

    const tint = ctx.createLinearGradient(0, 0, w, h);
    tint.addColorStop(0, `rgba(123, 140, 255, ${0.16 + energy * 0.18})`);
    tint.addColorStop(1, `rgba(84, 209, 255, ${0.10 + energy * 0.10})`);
    ctx.fillStyle = tint;
    ctx.fillRect(0, 0, w, h);
  }

  function drawBars(spectrum, energy) {
    if (!getLayer('visualizer')?.visible) return;
    const { width: w, height: h } = ui.previewCanvas;
    const barCount = 64;
    const sample = sampleArray(spectrum, barCount);
    const gap = Math.max(2, Math.floor(w * 0.004));
    const barWidth = (w - gap * (barCount + 1)) / barCount;
    const baseY = h * 0.82;
    const maxHeight = h * 0.38;

    for (let i = 0; i < barCount; i++) {
      const raw = sample[i];
      const value = clamp(raw > 1 ? raw / 255 : raw, 0.05, 1);
      const height = value * maxHeight * (0.7 + energy * 0.6) * state.visualizerIntensity;
      const x = gap + i * (barWidth + gap);
      const y = baseY - height;

      const gradient = ctx.createLinearGradient(0, y, 0, baseY);
      gradient.addColorStop(0, 'rgba(255,255,255,0.95)');
      gradient.addColorStop(0.35, 'rgba(84,209,255,0.92)');
      gradient.addColorStop(1, 'rgba(123,140,255,0.85)');
      ctx.fillStyle = gradient;
      ctx.shadowBlur = 16;
      ctx.shadowColor = 'rgba(84, 209, 255, 0.35)';
      ctx.fillRect(x, y, barWidth, height);
    }

    ctx.shadowBlur = 0;
  }

  function drawWaveform(waveform, energy) {
    if (!getLayer('visualizer')?.visible) return;
    const { width: w, height: h } = ui.previewCanvas;
    const points = sampleArray(waveform, 220);
    const midY = h * 0.63;
    const amplitude = h * 0.22 * (0.85 + energy * 0.8) * state.visualizerIntensity;

    ctx.save();
    ctx.lineWidth = Math.max(2, Math.floor(w * 0.002));
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';

    const line = ctx.createLinearGradient(0, 0, w, 0);
    line.addColorStop(0, 'rgba(123,140,255,0.65)');
    line.addColorStop(0.5, 'rgba(255,255,255,0.92)');
    line.addColorStop(1, 'rgba(84,209,255,0.72)');

    ctx.beginPath();
    for (let i = 0; i < points.length; i++) {
      const x = (i / (points.length - 1)) * w;
      const normalized = points[i] > 1 ? points[i] / 255 : points[i];
      const y = midY + (0.5 - normalized) * amplitude;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.strokeStyle = line;
    ctx.shadowBlur = 18;
    ctx.shadowColor = 'rgba(84,209,255,0.38)';
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(0, midY);
    ctx.lineTo(w, midY);
    ctx.strokeStyle = 'rgba(255,255,255,0.08)';
    ctx.lineWidth = Math.max(1, Math.floor(w * 0.001));
    ctx.shadowBlur = 0;
    ctx.stroke();

    ctx.restore();
  }

  function drawFooter(energy, progress) {
    const { width: w, height: h } = ui.previewCanvas;
    const footerHeight = Math.max(64, Math.floor(h * 0.14));
    const y = h - footerHeight;

    const panel = ctx.createLinearGradient(0, y, 0, h);
    panel.addColorStop(0, 'rgba(5, 8, 16, 0.14)');
    panel.addColorStop(1, 'rgba(5, 8, 16, 0.74)');
    ctx.fillStyle = panel;
    ctx.fillRect(0, y, w, footerHeight);

    const barW = Math.max(8, Math.floor(w * 0.003));
    const left = Math.floor(w * 0.05);
    const top = y + footerHeight * 0.36;
    const meterHeight = footerHeight * 0.36;
    const bars = 8;
    for (let i = 0; i < bars; i++) {
      const pulse = 0.3 + ((energy * 0.8 + Math.sin(progress * Math.PI * 2 + i * 0.55) * 0.15 + 0.25) % 1);
      const height = meterHeight * clamp(pulse, 0.18, 1);
      const x = left + i * (barW * 1.8);
      ctx.fillStyle = i < 4 ? 'rgba(53,208,140,0.9)' : i < 6 ? 'rgba(84,209,255,0.9)' : 'rgba(255,191,92,0.9)';
      ctx.fillRect(x, top + meterHeight - height, barW, height);
    }

    ctx.fillStyle = 'rgba(255,255,255,0.86)';
    ctx.font = `600 ${Math.max(14, Math.floor(w * 0.016))}px Inter, system-ui, sans-serif`;
    ctx.textAlign = 'right';
    ctx.fillText(getLayer('visualizer')?.visible === false ? 'Visualizer hidden' : (state.mode === 'wave' ? 'Waveform' : 'Bars'), w - 22, y + 26);

    ctx.fillStyle = 'rgba(255,255,255,0.52)';
    ctx.font = `${Math.max(12, Math.floor(w * 0.012))}px Inter, system-ui, sans-serif`;
    const clipDuration = getTrimDuration();
    const audioLayer = getLayer('audio');
    const label = state.recording
      ? `Exporting ${formatTime(clamp(state.audioEl.currentTime - state.trimStart, 0, clipDuration))} / ${formatTime(clipDuration)}`
      : audioLayer?.visible === false || state.audioVolume <= 0
        ? 'Audio muted'
      : state.audioDuration
        ? `Duration ${formatTime(clipDuration)}`
        : 'Ready';
    ctx.fillText(label, w - 22, y + 48);
  }

  function renderFrame() {
    const live = state.recording && state.analyser && state.freqData && state.timeData;
    const clipDuration = getTrimDuration();
    const progress = clipDuration
      ? state.recording
        ? clamp((state.audioEl.currentTime - state.trimStart) / clipDuration, 0, 1)
        : (Math.sin(performance.now() / 1800) + 1) / 2
      : 0;
    const frameData = getPreviewData(progress, live);

    drawBackdrop(frameData.energy, progress, live);
    if (state.mode === 'wave') drawWaveform(frameData.waveform, frameData.energy);
    else drawBars(frameData.spectrum, frameData.energy);
    drawFooter(frameData.energy, progress);
    renderTimeline();

    if (state.recording) {
      const clipDuration = getTrimDuration();
      const current = clamp(state.audioEl.currentTime - state.trimStart, 0, clipDuration);
      const pct = clipDuration ? clamp((current / clipDuration) * 100, 0, 99.5) : 0;
      setStatus(
        'Exporting',
        `Building WebM: ${formatTime(current)} / ${formatTime(clipDuration)}`,
        pct
      );
    }
  }

  function startRenderLoop() {
    const loop = () => {
      renderFrame();
      state.renderFrameId = requestAnimationFrame(loop);
    };
    cancelAnimationFrame(state.renderFrameId);
    state.renderFrameId = requestAnimationFrame(loop);
  }

  async function ensureAudioGraph() {
    const audioCtx = await ensureAudioContext();

    if (state.sourceNode) return audioCtx;

    if (state.audioEl.readyState < 1) {
      await new Promise((resolve) => {
        state.audioEl.addEventListener('loadedmetadata', resolve, { once: true });
      });
    }

    state.sourceNode = audioCtx.createMediaElementSource(state.audioEl);
    state.analyser = audioCtx.createAnalyser();
    state.analyser.fftSize = 1024;
    state.analyser.smoothingTimeConstant = 0.86;
    state.freqData = new Uint8Array(state.analyser.frequencyBinCount);
    state.timeData = new Uint8Array(state.analyser.fftSize);
    state.gainNode = audioCtx.createGain();
    state.gainNode.gain.value = state.audioVolume;
    state.mediaDest = audioCtx.createMediaStreamDestination();

    state.sourceNode.connect(state.analyser);
    state.analyser.connect(state.gainNode);
    state.gainNode.connect(audioCtx.destination);
    state.gainNode.connect(state.mediaDest);
    applyAudioGain();

    return audioCtx;
  }

  function pickRecorderMime() {
    for (const mime of RECORDER_MIME_TYPES) {
      if (window.MediaRecorder && MediaRecorder.isTypeSupported(mime)) {
        return mime;
      }
    }
    throw new Error('No supported WebM recorder codec was found. Chrome should support VP8 or VP9.');
  }

  function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 10_000);
  }

  async function recordWebM() {
    if (!state.imageAsset || !state.audioBuffer) {
      throw new Error('Load both an image and an audio file first.');
    }
    if (!window.MediaRecorder) {
      throw new Error('MediaRecorder is not available in this browser.');
    }
    if (typeof ui.previewCanvas.captureStream !== 'function') {
      throw new Error('canvas.captureStream() is not supported in this browser.');
    }

    await ensureAudioGraph();
    if (state.audioCtx.state === 'suspended') {
      await state.audioCtx.resume();
    }
    applyAudioGain();

    const mimeType = pickRecorderMime();
    state.recorderMime = mimeType;
    updateSummary();

    state.audioEl.currentTime = state.trimStart;
    state.audioEl.playbackRate = 1;

    const canvasStream = ui.previewCanvas.captureStream(25);
    const audioTracks = state.mediaDest.stream.getAudioTracks();
    const combined = new MediaStream([
      ...canvasStream.getVideoTracks(),
      ...audioTracks,
    ]);

    state.recorderChunks = [];
    const recorder = new MediaRecorder(combined, {
      mimeType,
      videoBitsPerSecond: state.videoBitsPerSecond,
      audioBitsPerSecond: 128_000,
    });
    state.recorder = recorder;
    state.recording = true;
    state.cancelRequested = false;
    ui.cancelBtn.disabled = false;
    ui.startBtn.disabled = true;
    ui.downloadWebmBtn.disabled = true;
    ui.downloadMp4Btn.disabled = true;

    renderFrame();

    return new Promise((resolve, reject) => {
      let settled = false;
      let failed = false;
      const clipDuration = getTrimDuration();
      const fail = (message) => {
        if (settled) return;
        failed = true;
        settled = true;
        if (recorder.state !== 'inactive') recorder.stop();
        reject(new Error(message));
      };

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          state.recorderChunks.push(event.data);
        }
      };

      recorder.onerror = () => {
        fail('The browser failed while exporting the canvas stream.');
      };

      const stopRecorder = () => {
        if (state.recorder && state.recorder.state !== 'inactive') {
          setTimeout(() => {
            if (state.recorder && state.recorder.state !== 'inactive') state.recorder.stop();
          }, 160);
        }
      };
      const onTimeUpdate = () => {
        if (state.audioEl.currentTime >= state.trimEnd) {
          state.audioEl.pause();
          stopRecorder();
        }
      };
      state.audioEl.onended = stopRecorder;
      state.audioEl.addEventListener('timeupdate', onTimeUpdate);

      const cleanup = () => {
        state.audioEl.removeEventListener('timeupdate', onTimeUpdate);
        state.audioEl.onended = null;
      };
      recorder.onstop = () => {
        cleanup();
        if (failed) return;
        settled = true;
        const blob = new Blob(state.recorderChunks, { type: mimeType });
        state.webmBlob = blob;
        state.recording = false;
        state.recorder = null;
        state.recorderChunks = [];
        clearTimeout(state.backupStopTimer);
        updateUiReadyState();
        setStatus('WebM ready', `Built ${formatBytes(blob.size)}. Starting MP4 conversion...`, 100);
        resolve(blob);
      };

      recorder.start(100);
      state.audioEl.pause();
      state.audioEl.play().catch((error) => {
        fail(`Audio playback failed: ${error.message}`);
      });

      const stopAt = Math.max(0, clipDuration * 1000 + 1200);
      state.backupStopTimer = setTimeout(() => {
        if (state.recorder && state.recorder.state !== 'inactive') {
          state.recorder.stop();
        }
      }, stopAt);
    });
  }

  async function ensureFFmpeg() {
    if (state.ffmpeg) return state.ffmpeg;

    if (!state.ffmpegScriptPromise) {
      state.ffmpegScriptPromise = new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = 'lib/ffmpeg.js';
        script.async = true;
        script.onload = resolve;
        script.onerror = () => reject(new Error('Failed to load the local ffmpeg.wasm wrapper.'));
        document.head.appendChild(script);
      });
    }

    await state.ffmpegScriptPromise;

    const bundle = window.FFmpegWASM;
    if (!bundle || !bundle.FFmpeg) {
      throw new Error('ffmpeg.wasm did not expose the expected API.');
    }

    state.ffmpeg = new bundle.FFmpeg();
    state.ffmpeg.on('log', ({ message }) => {
      if (typeof message === 'string' && message.trim()) {
        state.lastFfmpegLog = message.trim();
      }
    });

    state.ffmpeg.on('progress', ({ progress }) => {
      if (!state.converting) return;
      const pct = clamp(progress * 100, 0, 100);
      state.ffmpegProgress = pct;
      const log = state.lastFfmpegLog ? ` | ${state.lastFfmpegLog}` : '';
      setStatus('Converting to MP4', `ffmpeg.wasm ${pct.toFixed(0)}%${log}`, pct);
    });

    setStatus('Loading ffmpeg.wasm', 'Loading local ffmpeg core and worker...');
    const coreURL = new URL('ffmpeg-core.js', FFmpegCoreBase).href;
    const wasmURL = new URL('ffmpeg-core.wasm', FFmpegCoreBase).href;
    await state.ffmpeg.load({ coreURL, wasmURL });
    return state.ffmpeg;
  }

  async function convertWebMToMp4(webmBlob) {
    if (!webmBlob) throw new Error('No WebM data is available to convert.');
    await ensureFFmpeg();

    const abortController = new AbortController();
    state.convertAbort = abortController;
    state.converting = true;
    ui.cancelBtn.disabled = false;
    ui.startBtn.disabled = true;

    try {
      setStatus('Converting to MP4', 'Preparing the input WebM file...', 0);
      const webmData = new Uint8Array(await webmBlob.arrayBuffer());
      await state.ffmpeg.writeFile('input.webm', webmData);

      const exitCode = await state.ffmpeg.exec([
        '-i', 'input.webm',
        '-c:v', 'libx264',
        '-preset', 'ultrafast',
        '-crf', '28',
        '-c:a', 'aac',
        'output.mp4',
      ], -1, { signal: abortController.signal });

      if (exitCode !== 0) {
        throw new Error(`ffmpeg exited with code ${exitCode}.`);
      }

      const mp4Data = await state.ffmpeg.readFile('output.mp4');
      const mp4Blob = new Blob([mp4Data], { type: 'video/mp4' });
      state.mp4Blob = mp4Blob;
      updateUiReadyState();
      setStatus('MP4 ready', `Converted file size: ${formatBytes(mp4Blob.size)}`, 100);
      return mp4Blob;
    } finally {
      state.converting = false;
      state.convertAbort = null;
      try { await state.ffmpeg.deleteFile('input.webm'); } catch (_) {}
      try { await state.ffmpeg.deleteFile('output.mp4'); } catch (_) {}
      updateUiReadyState();
    }
  }

  function stopRecordingIfNeeded() {
    clearTimeout(state.backupStopTimer);
    if (state.recorder && state.recorder.state !== 'inactive') {
      state.recorder.stop();
    }
    if (!state.audioEl.paused) {
      state.audioEl.pause();
    }
  }

  async function startExport() {
    if (state.busy) return;
    if (!state.imageAsset || !state.audioBuffer) {
      showWarning('Please load both an image and an audio file before starting.');
      return;
    }

    clearWarning();
    state.busy = true;
    state.cancelRequested = false;
    state.lastFfmpegLog = '';
    state.ffmpegProgress = 0;
    ui.cancelBtn.disabled = false;
    ui.startBtn.disabled = true;
    updateSummary();

    try {
      setStatus('Exporting', 'Capturing canvas frames and audio into WebM...', 0);
      const webmBlob = await recordWebM();
      if (state.cancelRequested) return;

      ui.downloadWebmBtn.disabled = false;
      ui.downloadWebmBtn.textContent = 'Download WebM';

      const mp4Blob = await convertWebMToMp4(webmBlob);
      if (state.cancelRequested) return;

      ui.downloadMp4Btn.disabled = false;
      ui.downloadMp4Btn.textContent = 'Download MP4';
      setStatus('Complete', `WebM and MP4 are ready. MP4 size: ${formatBytes(mp4Blob.size)}`, 100);
    } catch (error) {
      if (state.cancelRequested) {
        setStatus('Cancelled', 'The export was cancelled by the user.', 0);
      } else {
        showWarning(error.message);
        setStatus('Error', error.message, 0);
      }
    } finally {
      state.busy = false;
      state.recording = false;
      state.converting = false;
      ui.cancelBtn.disabled = true;
      updateUiReadyState();
      renderFrame();
    }
  }

  function cancelWork() {
    if (!state.busy) return;
    state.cancelRequested = true;
    state.timelineInteraction = null;
      setStatus('Cancelling', 'Stopping the current export or conversion...', 0);

    if (state.convertAbort) {
      state.convertAbort.abort();
    }
    stopRecordingIfNeeded();
    state.busy = false;
    state.recording = false;
    state.converting = false;
    clearTimeout(state.backupStopTimer);
    ui.cancelBtn.disabled = true;
    updateUiReadyState();
  }

  function resetApp() {
    cancelWork();
    state.cancelRequested = false;
    state.timelineInteraction = null;
    state.imageFile = null;
    state.audioFile = null;
    state.imageAsset = null;
    state.audioBuffer = null;
    state.audioDuration = 0;
    state.waveformPeaks = null;
    state.trimStart = 0;
    state.trimEnd = 0;
    state.imageOpacity = 1;
    state.imageScale = 1;
    state.audioVolume = 1;
    state.visualizerIntensity = 1;
    state.webmBlob = null;
    state.mp4Blob = null;
    state.recorderMime = '';
    state.lastFfmpegLog = '';
    state.ffmpegProgress = 0;
    state.pendingAudioLoadToken++;

    if (state.imageAsset && typeof state.imageAsset.close === 'function') {
      state.imageAsset.close();
    }
    state.imageAsset = null;

    if (state.audioObjectUrl) {
      URL.revokeObjectURL(state.audioObjectUrl);
      state.audioObjectUrl = null;
    }
    state.audioEl.pause();
    state.audioEl.removeAttribute('src');
    state.audioEl.load();

    if (state.imageObjectUrl) {
      URL.revokeObjectURL(state.imageObjectUrl);
      state.imageObjectUrl = null;
    }

    if (state.audioCtx) {
      state.audioCtx.suspend().catch(() => {});
    }

    ui.imageInput.value = '';
    ui.audioInput.value = '';
    ui.resolutionSelect.value = '1280x720';
    ui.bitrateRange.value = '1200000';
    state.mode = 'bars';
    state.videoBitsPerSecond = 1_200_000;
    state.selectedLayerId = 'image';
    state.layers.forEach((layer) => { layer.visible = true; });
    invalidateExports();
    syncTrimUi();
    syncLayerPanelState();

    setCanvasResolution(1280, 720);
    updateBitrateLabel();
    syncFileStatus();
    clearWarning();
    updateSummary();
    setStatus('Idle', 'Load an image and audio file to begin.', 0);
    ui.downloadWebmBtn.disabled = true;
    ui.downloadMp4Btn.disabled = true;
    ui.cancelBtn.disabled = true;
    ui.startBtn.disabled = !Boolean(state.imageAsset && state.audioBuffer);
    renderFrame();
  }

  function handleImageSelection(file) {
    state.imageFile = file;
    invalidateExports();
    syncFileStatus();
    setStatus('Loading image', 'Decoding the selected image...', 8);

    if (state.imageAsset && typeof state.imageAsset.close === 'function') {
      state.imageAsset.close();
    }

    loadImageAsset(file)
      .then((asset) => {
        state.imageAsset = asset;
        syncFileStatus();
        syncLayerPanelState();
        setStatus('Image ready', `${file.name} loaded successfully.`, 18);
        updateUiReadyState();
        renderFrame();
      })
      .catch((error) => {
        state.imageFile = null;
        syncFileStatus();
        showWarning(error.message);
        setStatus('Image error', error.message, 0);
        updateUiReadyState();
      });
  }

  function handleAudioSelection(file) {
    state.audioFile = file;
    invalidateExports();
    syncFileStatus();
    clearWarning();
    setStatus('Loading audio', 'Decoding the selected audio file...', 12);
    state.audioEl.pause();

    if (file.size > 120 * 1024 * 1024) {
      showWarning('This audio file is large. If the browser becomes slow, switch to 480p and lower bitrate before exporting.');
    }

    loadAudioFile(file)
      .then((decoded) => {
        if (!decoded) return;
        state.audioBuffer = decoded;
        state.audioDuration = decoded.duration;
        state.trimStart = 0;
        state.trimEnd = decoded.duration;
        state.timelineInteraction = null;
        state.waveformPeaks = computeWaveformPeaks(decoded);
        syncTrimUi();
        syncLayerPanelState();
        applyAudioGain();
        syncFileStatus();
        updateSummary();
        setStatus('Audio ready', `${file.name} decoded successfully.`, 20);
        updateUiReadyState();
        renderFrame();
      })
      .catch((error) => {
        state.audioFile = null;
        state.audioBuffer = null;
        state.audioDuration = 0;
        state.waveformPeaks = null;
        syncFileStatus();
        showWarning(error.message);
        setStatus('Audio error', error.message, 0);
        updateUiReadyState();
      });
  }

  function handleFileDrop(input, files) {
    if (!files || !files.length) return;
    const file = files[0];
    const transfer = new DataTransfer();
    transfer.items.add(file);
    input.files = transfer.files;
    input.dispatchEvent(new Event('change', { bubbles: true }));
  }

  function setupDropZone(dropZone, input, onFile) {
    dropZone.addEventListener('click', () => input.click());
    dropZone.addEventListener('dragover', (event) => {
      event.preventDefault();
      dropZone.classList.add('dragover');
    });
    dropZone.addEventListener('dragleave', () => dropZone.classList.remove('dragover'));
    dropZone.addEventListener('drop', (event) => {
      event.preventDefault();
      dropZone.classList.remove('dragover');
      handleFileDrop(input, event.dataTransfer.files);
    });
    input.addEventListener('change', (event) => {
      const file = event.target.files && event.target.files[0];
      if (file) onFile(file);
    });
  }

  function bindControls() {
    setupDropZone(ui.imageDrop, ui.imageInput, handleImageSelection);
    setupDropZone(ui.audioDrop, ui.audioInput, handleAudioSelection);
    state.audioEl.addEventListener('timeupdate', () => {
      if (state.recording) return;
      if (!state.audioEl.paused && state.audioDuration && state.audioEl.currentTime >= state.trimEnd) {
        state.audioEl.pause();
      }
      syncTransportUi();
      renderFrame();
    });
    state.audioEl.addEventListener('play', syncTransportUi);
    state.audioEl.addEventListener('pause', syncTransportUi);
    state.audioEl.addEventListener('ended', syncTransportUi);

    renderLayersList();
    syncLayerPanelState();
    setSelectedLayer('image');

    ui.resolutionSelect.addEventListener('change', () => {
      const [width, height] = ui.resolutionSelect.value.split('x').map(Number);
      invalidateExports();
      setCanvasResolution(width, height);
      updateSummary();
    });

    ui.bitrateRange.addEventListener('input', () => {
      state.videoBitsPerSecond = Number(ui.bitrateRange.value);
      invalidateExports();
      updateBitrateLabel();
    });

    ui.visualizerSelect.addEventListener('change', () => {
      state.mode = ui.visualizerSelect.value;
      invalidateExports();
      syncVisualizerUi();
      renderFrame();
    });

    ui.imageOpacityRange.addEventListener('input', () => {
      setImageOpacity(Number(ui.imageOpacityRange.value) / 100);
    });

    ui.imageScaleRange.addEventListener('input', () => {
      setImageScale(Number(ui.imageScaleRange.value) / 100);
    });

    ui.audioVolumeRange.addEventListener('input', () => {
      setAudioVolume(Number(ui.audioVolumeRange.value) / 100);
    });

    ui.trimStartInput.addEventListener('input', () => {
      const start = Number(ui.trimStartInput.value);
      const end = Number(ui.trimEndInput.value);
      setTrimRange(Number.isFinite(start) ? start : 0, Number.isFinite(end) ? end : state.audioDuration);
    });

    ui.trimEndInput.addEventListener('input', () => {
      const start = Number(ui.trimStartInput.value);
      const end = Number(ui.trimEndInput.value);
      setTrimRange(Number.isFinite(start) ? start : 0, Number.isFinite(end) ? end : state.audioDuration);
    });

    ui.fullTrackBtn.addEventListener('click', () => {
      if (!state.audioDuration) return;
      setTrimRange(0, state.audioDuration);
    });

    ui.visualizerIntensityRange.addEventListener('input', () => {
      setVisualizerIntensity(Number(ui.visualizerIntensityRange.value) / 100);
    });

    ui.previewBtn.addEventListener('click', togglePreviewPlayback);
    ui.timelineCanvas.addEventListener('pointerdown', onTimelinePointerDown);
    ui.timelineCanvas.addEventListener('pointermove', onTimelinePointerMove);
    ui.timelineCanvas.addEventListener('pointerup', onTimelinePointerUp);
    ui.timelineCanvas.addEventListener('pointercancel', onTimelinePointerUp);
    ui.timelineCanvas.addEventListener('lostpointercapture', onTimelinePointerUp);

    ui.startBtn.addEventListener('click', startExport);
    ui.resetBtn.addEventListener('click', resetApp);
    ui.cancelBtn.addEventListener('click', cancelWork);
    ui.downloadWebmBtn.addEventListener('click', () => {
      if (state.webmBlob) downloadBlob(state.webmBlob, `audio-to-video-${Date.now()}.webm`);
    });
    ui.downloadMp4Btn.addEventListener('click', () => {
      if (state.mp4Blob) downloadBlob(state.mp4Blob, `audio-to-video-${Date.now()}.mp4`);
    });

    updateBitrateLabel();
    setCanvasResolution(state.resolution.width, state.resolution.height);
    syncFileStatus();
    updateSummary();
    updateUiReadyState();
    syncLayerPanelState();
    setStatus('Idle', 'Load an image and audio file to begin.', 0);
    renderFrame();
  }

  bindControls();
  startRenderLoop();
})();
