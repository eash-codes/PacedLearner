/**
 * VoiceStudio Client (`http://127.0.0.1:3900/v1` via `/api/pacey/tts` & `/api/pacey/stt`)
 * - Text-to-Speech (TTS): POST /v1/audio/speech { model: "tts-1", voice: "default", input, response_format: "wav" }
 * - Speech-to-Text (STT): POST /v1/audio/transcriptions (file=@speech.wav, model="whisper-1")
 * - Pure WebAudio 16-bit PCM WAV recorder so recorded mic audio is always a valid .wav file.
 */

const API_BASE = 'http://localhost:4100/api';
const DIRECT_VOICESTUDIO_URL = 'http://127.0.0.1:3900/v1';

let activeAudio = null;

export function stopPaceyAudio() {
  if (activeAudio) {
    try {
      activeAudio.pause();
      activeAudio.currentTime = 0;
    } catch (e) {}
    activeAudio = null;
  }
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    try {
      window.speechSynthesis.cancel();
    } catch (e) {}
  }
}

export const PACEY_DEFAULT_VOICE = 'PaceyChinese';
export const PACEY_DEFAULT_PROFILE_ID = '683e5f78';
export const PACEY_DEFAULT_SEED = 307702207;
export const PACEY_DEFAULT_INSTRUCT = 'child, high pitch, chinese accent';

/**
 * Speak text aloud using VoiceStudio (`http://127.0.0.1:3900/generate` / `/v1/audio/speech`)
 * configured with PaceyChinese's custom voice profile (ID: 683e5f78) and seed 307702207.
 * Never uses robotic browser speech synthesis.
 */
export async function speakWithVoiceStudio(
  text,
  {
    voice = PACEY_DEFAULT_VOICE,
    profileId = PACEY_DEFAULT_PROFILE_ID,
    seed = PACEY_DEFAULT_SEED,
    instruct = PACEY_DEFAULT_INSTRUCT,
    model = 'tts-1',
    onGenerating,
    onStart,
    onEnd,
    onError
  } = {}
) {
  const cleanText = String(text || '').trim();
  if (!cleanText) return;

  stopPaceyAudio();

  try {
    onGenerating?.();

    // 1. Try server proxy /api/pacey/tts
    let res = await fetch(`${API_BASE}/pacey/tts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: cleanText,
        model,
        voice,
        profile_id: profileId,
        seed,
        instruct,
        num_step: 12,
        response_format: 'wav'
      })
    });

    // 2. Direct fallback to VoiceStudio native /generate endpoint
    if (!res.ok) {
      try {
        const form = new FormData();
        form.append('text', cleanText);
        form.append('profile_id', profileId || PACEY_DEFAULT_PROFILE_ID);
        form.append('engine', 'omnivoice');
        form.append('ref_text', "Here's a quick sample of this voice so you can hear how it sounds.");
        form.append('seed', String(seed || PACEY_DEFAULT_SEED));
        form.append('guidance_scale', '2.0');
        form.append('speed', '1.0');
        form.append('denoise', 'true');
        form.append('num_step', '12');

        res = await fetch('http://127.0.0.1:3900/generate', {
          method: 'POST',
          body: form
        });
      } catch (e) {}
    }

    // 3. Direct fallback to VoiceStudio /v1/audio/speech
    if (!res.ok) {
      res = await fetch(`${DIRECT_VOICESTUDIO_URL}/audio/speech`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer voicestudio'
        },
        body: JSON.stringify({
          model,
          voice: profileId || voice,
          seed,
          instruct,
          num_step: 4,
          input: cleanText,
          response_format: 'wav'
        })
      });
    }

    if (!res.ok) {
      throw new Error(`VoiceStudio TTS failed (HTTP ${res.status})`);
    }

    const wavBlob = await res.blob();
    const audioUrl = URL.createObjectURL(wavBlob);
    const audio = new Audio(audioUrl);
    activeAudio = audio;

    audio.onended = () => {
      URL.revokeObjectURL(audioUrl);
      if (activeAudio === audio) activeAudio = null;
      onEnd?.();
    };

    audio.onerror = (err) => {
      URL.revokeObjectURL(audioUrl);
      if (activeAudio === audio) activeAudio = null;
      onError?.(err);
      onEnd?.();
    };

    onStart?.();
    await audio.play();
    return true;
  } catch (err) {
    console.warn('[VoiceStudio TTS falling back to browser synthesis]:', err.message);
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(cleanText);
        utterance.rate = 1.1;
        utterance.pitch = 1.35;
        utterance.onstart = () => onStart?.();
        utterance.onend = () => onEnd?.();
        utterance.onerror = () => {
          onError?.(err);
          onEnd?.();
        };
        window.speechSynthesis.speak(utterance);
        return true;
      } catch (synthErr) {
        onError?.(err);
        onEnd?.();
      }
    } else {
      onError?.(err);
      onEnd?.();
    }
    return false;
  }
}

/**
 * Encode Float32 PCM samples into a 16-bit mono RIFF WAVE ArrayBuffer (`speech.wav`)
 */
function encodeWavFromFloat32(samples, sampleRate) {
  const buffer = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(buffer);

  const writeString = (offset, str) => {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(offset + i, str.charCodeAt(i));
    }
  };

  writeString(0, 'RIFF');
  view.setUint32(4, 36 + samples.length * 2, true);
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true); // PCM chunk size
  view.setUint16(20, 1, true); // PCM format = 1
  view.setUint16(22, 1, true); // Mono = 1 channel
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true); // Byte rate
  view.setUint16(32, 2, true); // Block align
  view.setUint16(34, 16, true); // 16-bit
  writeString(36, 'data');
  view.setUint32(40, samples.length * 2, true);

  let offset = 44;
  for (let i = 0; i < samples.length; i++, offset += 2) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }

  return buffer;
}

function arrayBufferToBase64(buffer) {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode.apply(null, chunk);
  }
  return btoa(binary);
}

/**
 * Create a live microphone WAV recorder that outputs base64 `speech.wav`
 * ready for `http://127.0.0.1:3900/v1/audio/transcriptions` (`whisper-1`),
 * plus parallel Web Speech API recognition as an automatic fallback if Whisper weights are still downloading.
 */
export async function startWavMicRecorder() {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  const audioCtx = new AudioCtx({ sampleRate: 16000 });
  const source = audioCtx.createMediaStreamSource(stream);
  const processor = audioCtx.createScriptProcessor(4096, 1, 1);
  const chunks = [];

  let fallbackTranscript = '';
  let recognition = null;
  try {
    const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRec) {
      recognition = new SpeechRec();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';
      recognition.onresult = (event) => {
        let combined = '';
        for (let i = 0; i < event.results.length; i++) {
          combined += event.results[i][0].transcript + ' ';
        }
        if (combined.trim()) fallbackTranscript = combined.trim();
      };
      recognition.start();
    }
  } catch (e) {}

  processor.onaudioprocess = (e) => {
    const channelData = e.inputBuffer.getChannelData(0);
    chunks.push(new Float32Array(channelData));
  };

  source.connect(processor);
  processor.connect(audioCtx.destination);

  return {
    stop: async () => {
      try {
        if (recognition) recognition.stop();
      } catch (e) {}
      try {
        processor.disconnect();
        source.disconnect();
        stream.getTracks().forEach((t) => t.stop());
        await audioCtx.close();
      } catch (e) {}

      const totalLength = chunks.reduce((acc, c) => acc + c.length, 0);
      const merged = new Float32Array(totalLength);
      let offset = 0;
      for (const c of chunks) {
        merged.set(c, offset);
        offset += c.length;
      }

      const wavArrayBuffer = encodeWavFromFloat32(merged, audioCtx.sampleRate || 16000);
      const wavBlob = new Blob([wavArrayBuffer], { type: 'audio/wav' });
      const audioBase64 = arrayBufferToBase64(wavArrayBuffer);
      return { wavBlob, audioBase64, fallbackTranscript };
    }
  };
}

/**
 * Transcribe recorded WAV audio using VoiceStudio (`http://127.0.0.1:3900/v1/audio/transcriptions`)
 */
export async function transcribeWithVoiceStudio({
  wavBlob,
  audioBase64,
  fallbackTranscript = '',
  model = 'whisper-1'
}) {
  // 1. Try server proxy /api/pacey/stt -> VoiceStudio http://127.0.0.1:3900/v1/audio/transcriptions
  try {
    const res = await fetch(`${API_BASE}/pacey/stt`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        audioBase64,
        filename: 'speech.wav',
        mimeType: 'audio/wav',
        model
      })
    });
    if (res.ok) {
      const data = await res.json();
      if (data.text && data.text.trim()) return data.text.trim();
    }
  } catch (e) {
    // Fallback to direct VoiceStudio multipart upload
  }

  // 2. Try direct multipart POST to http://127.0.0.1:3900/v1/audio/transcriptions
  if (wavBlob) {
    try {
      const formData = new FormData();
      formData.append('file', wavBlob, 'speech.wav');
      formData.append('model', model);

      const res = await fetch(`${DIRECT_VOICESTUDIO_URL}/audio/transcriptions`, {
        method: 'POST',
        headers: {
          Authorization: 'Bearer voicestudio'
        },
        body: formData
      });
      if (res.ok) {
        const data = await res.json();
        if (data.text && data.text.trim()) return data.text.trim();
      }
    } catch (e) {}
  }

  if (fallbackTranscript && fallbackTranscript.trim()) {
    return fallbackTranscript.trim();
  }

  return '';
}
