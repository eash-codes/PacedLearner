import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import BloubAvatar from './BloubAvatar.jsx';
import { EXPRESSIONS, EXPRESSION_BY_ID } from '../bot/expressions.js';
import { STATES, STATE_BY_ID } from '../bot/states.js';
import {
  speakWithVoiceStudio,
  stopPaceyAudio,
  startWavMicRecorder,
  transcribeWithVoiceStudio
} from '../bot/voiceStudioClient.js';

const MascotContext = createContext(null);
const API_BASE = 'http://localhost:4100/api';
const DEFAULT_MODEL_ID = 'HauhauCS/Qwen3.5-4B-Uncensored-HauhauCS-Aggressive:Q4_K_M';

export function useMascot() {
  return useContext(MascotContext);
}

const POKE_REACTIONS = [
  { state: 'exclaim', expr: 'colere', msg: "DON'T FUCKING POKE ME, DO YOUR WORK!" },
  { state: 'swirl', expr: 'mefiant', msg: "WHAT THE HELL ARE YOU POKING AT, DUMBASS?" },
  { state: 'burst', expr: 'hilare', msg: "LOOK AT THIS SLACKER WASTING TIME POKING A BALL!" },
  { state: 'orbit', expr: 'fier', msg: "I AM CUTE BUT I WILL TEAR YOUR CODE TO SHREDS." },
  { state: 'wide', expr: 'colere', msg: "ARE YOU BRAIN-DEAD? LOCK THE FUCK IN!" },
  { state: 'alert', expr: 'effraye', msg: "QUIT SLACKING OFF, YOU LAZY PIECE OF SHIT!" },
  { state: 'wink', expr: 'heureux', msg: "AWW YOU THINK I'M CUTE? FUCK YOU, BACK TO WORK." },
  { state: 'comet', expr: 'excite', msg: "GET OFF YOUR LAZY ASS AND GRIND ALREADY!" },
  { state: 'idle', expr: 'mefiant', msg: "WHAT, NEED YOUR DAMN HAND HELD AGAIN, BABY?" },
  { state: 'swirl', expr: 'hilare', msg: "YOU CODE LIKE A DRUNK TODDLER WITH A KEYBOARD." }
];

const QUICK_PROMPTS = [
  { label: 'ROAST ME', prompt: 'Roast my pathetic work ethic and laziness like the savage rude teacher you are.' },
  { label: 'YELL AT ME', prompt: 'Yell at me with no filter to get off my ass and stop procrastinating.' },
  { label: 'WHY AM I DUMB?', prompt: 'Tell me why I am acting like a brain-dead idiot today.' },
  { label: 'HINT (DON’T BE A DICK)', prompt: 'Give me a quick punchy hint for this problem without being a total asshole.' }
];

function formatShortModelName(modelId = '') {
  if (!modelId) return 'QWEN3.5-4B [MSI PC]';
  if (modelId.includes('Qwen3.5-4B') || modelId.includes('forwo')) return 'QWEN3.5-4B [MSI PC // TAILSCALE]';
  return modelId.toUpperCase();
}

export function MascotProvider({
  children,
  theme = 'light',
  onToggleTheme,
  appContext = {}
}) {
  const [expression, setExpression] = useState('attentif');
  const [botState, setBotState] = useState('idle');
  const [message, setMessage] = useState('PACEY READY // QWEN3.5-4B [MSI PC // TAILSCALE] & VOICESTUDIO (:3900)');

  // Brain & VoiceStudio Status
  const [brainOnline, setBrainOnline] = useState(false);
  const [voiceStudioOnline, setVoiceStudioOnline] = useState(false);
  const [availableModels, setAvailableModels] = useState([DEFAULT_MODEL_ID]);
  const [selectedModel, setSelectedModel] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('pacey_active_model_v2') || DEFAULT_MODEL_ID;
    }
    return DEFAULT_MODEL_ID;
  });

  // Saved VoiceStudio Voices (loaded dynamically from VoiceStudio API)
  const [availableVoices, setAvailableVoices] = useState([
    { id: '683e5f78', name: 'PaceyChinese', instruct: 'child, high pitch, chinese accent', seed: 307702207 },
    { id: '05ae4ce0', name: 'PaceyJapanese', instruct: 'child, high pitch, japanese accent', seed: 307702207 },
    { id: '21856e86', name: 'PaceyTTS', instruct: 'child, high pitch, british accent', seed: 307702207 },
    { id: '5ddecbf2', name: 'Pacey 2', instruct: 'child, high pitch', seed: 307702224 },
    { id: '9770f201', name: 'Pacey', instruct: 'child, high pitch, american accent', seed: 307702207 }
  ]);
  const [selectedVoiceId, setSelectedVoiceId] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('pacey_active_voice_id') || '683e5f78';
    }
    return '683e5f78';
  });

  const handleSelectVoice = useCallback((voiceId) => {
    setSelectedVoiceId(voiceId);
    try {
      localStorage.setItem('pacey_active_voice_id', voiceId);
    } catch {}
  }, []);

  const [chatHistory, setChatHistory] = useState([
    {
      role: 'assistant',
      content:
        'WHAT THE HELL ARE YOU STARING AT? Stop slacking off like a lazy ass! Ask me something or click [🔊 SPEAK] if you dare hear me roast you.',
      speechText:
        'What the hell are you staring at? Stop slacking off like a lazy ass and do some work!',
      expression: 'colere',
      state: 'exclaim',
      model: DEFAULT_MODEL_ID
    }
  ]);

  const [isThinkingChat, setIsThinkingChat] = useState(false);
  const [isRecordingMic, setIsRecordingMic] = useState(false);
  const [isTranscribingMic, setIsTranscribingMic] = useState(false);
  const [isGeneratingVoice, setIsGeneratingVoice] = useState(false);
  const [isSpeakingOut, setIsSpeakingOut] = useState(false);

  // "Speak Out" option (auto-speak Pacey's replies via VoiceStudio 127.0.0.1:3900)
  const [voiceEnabled, setVoiceEnabled] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('pacey_speak_out_enabled');
      return saved === null ? true : saved === 'true';
    }
    return true;
  });

  const inverted = theme === 'dark';

  const stateTimerRef = useRef(null);
  const exprTimerRef = useRef(null);
  const idleSleepTimerRef = useRef(null);
  const pokeIndexRef = useRef(0);
  const micRecorderRef = useRef(null);
  const baseExpressionRef = useRef('attentif');
  const baseMessageRef = useRef('PACEY READY // QWEN3.5-4B (:9931) & VOICESTUDIO (:3900)');

  const clearTimers = useCallback(() => {
    if (stateTimerRef.current) clearTimeout(stateTimerRef.current);
    if (exprTimerRef.current) clearTimeout(exprTimerRef.current);
  }, []);

  const resetIdleSleepTimer = useCallback(() => {
    if (idleSleepTimerRef.current) clearTimeout(idleSleepTimerRef.current);
    idleSleepTimerRef.current = setTimeout(() => {
      setBotState('idle');
      setExpression('somnolent');
      setMessage('PACEY STANDBY // AWAITING VOICE OR TEXT INPUT');
    }, 55000);
  }, []);

  const setEmotion = useCallback((exprId, customMsg, durationMs = 0) => {
    if (!EXPRESSION_BY_ID.has(exprId)) return;
    if (exprTimerRef.current) clearTimeout(exprTimerRef.current);
    setBotState('idle');
    setExpression(exprId);
    if (customMsg) setMessage(customMsg);

    if (durationMs > 0) {
      exprTimerRef.current = setTimeout(() => {
        setExpression(baseExpressionRef.current);
        setMessage(baseMessageRef.current);
      }, durationMs);
    } else {
      baseExpressionRef.current = exprId;
      if (customMsg) baseMessageRef.current = customMsg;
    }
  }, []);

  const triggerState = useCallback((stateId, afterExpr = 'attentif', customMsg = '', durationMs = null) => {
    if (!STATE_BY_ID.has(stateId)) return;
    clearTimers();
    const def = STATE_BY_ID.get(stateId);
    const holdMs = durationMs ?? Math.round((def?.duration || 2.0) * 1000);

    setBotState(stateId);
    if (afterExpr && EXPRESSION_BY_ID.has(afterExpr)) {
      setExpression(afterExpr);
    }
    if (customMsg) setMessage(customMsg);

    if (stateId !== 'idle') {
      stateTimerRef.current = setTimeout(() => {
        setBotState('idle');
        if (afterExpr && EXPRESSION_BY_ID.has(afterExpr)) {
          setExpression(afterExpr);
          baseExpressionRef.current = afterExpr;
        }
      }, holdMs);
    }
  }, [clearTimers]);

  /**
   * Speak any text out loud using VoiceStudio (http://127.0.0.1:3900/v1/audio/speech)
   */
  const speakTextOut = useCallback(async (textToSpeak, meta = {}) => {
    const clean = String(textToSpeak || '').trim();
    if (!clean) return;

    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('pacey:speak', {
          detail: {
            text: clean,
            ...meta,
            timestamp: Date.now()
          }
        })
      );
    }

    const activeVoice =
      availableVoices.find((v) => v.id === selectedVoiceId) || availableVoices[0];

    await speakWithVoiceStudio(clean, {
      voice: activeVoice?.name || 'PaceyChinese',
      profileId: activeVoice?.id || '683e5f78',
      seed: activeVoice?.seed || 307702207,
      instruct: activeVoice?.instruct || 'child, high pitch, chinese accent',
      model: 'tts-1',
      onGenerating: () => {
        setIsGeneratingVoice(true);
        setBotState('thinking');
        setMessage(
          `VOICESTUDIO // SYNTHESIZING ${(activeVoice?.name || 'PACEY').toUpperCase()} AUDIO...`
        );
      },
      onStart: () => {
        setIsGeneratingVoice(false);
        setIsSpeakingOut(true);
        setBotState('orbit');
        if (meta.expression && EXPRESSION_BY_ID.has(meta.expression)) {
          setExpression(meta.expression);
        }
      },
      onEnd: () => {
        setIsGeneratingVoice(false);
        setIsSpeakingOut(false);
        setBotState('idle');
      },
      onError: () => {
        setIsGeneratingVoice(false);
        setIsSpeakingOut(false);
        setBotState('idle');
      }
    });
  }, [availableVoices, selectedVoiceId]);

  const stopSpeakingOut = useCallback(() => {
    stopPaceyAudio();
    setIsGeneratingVoice(false);
    setIsSpeakingOut(false);
    setBotState('idle');
  }, []);

  // Expose global window.PaceyVoice bridge
  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.PaceyVoice = {
      ...(window.PaceyVoice || {}),
      speak: (text, meta = {}) => speakTextOut(text, meta),
      stop: () => stopSpeakingOut()
    };
  }, [speakTextOut, stopSpeakingOut]);

  // Discover running llama-server (:9931), Ollama (:11434), and VoiceStudio (:3900)
  const refreshBrainAndVoiceStatus = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/pacey/models`);
      if (res.ok) {
        const data = await res.json();
        setBrainOnline(Boolean(data.online));
        setVoiceStudioOnline(Boolean(data.voiceStudioOnline));
        const modelsList = (data.models || []).map((m) => m.name);
        if (modelsList.length > 0) {
          setAvailableModels(modelsList);
          setSelectedModel((prev) => {
            if (modelsList.includes(prev)) return prev;
            const next = data.activeModel || modelsList[0];
            localStorage.setItem('pacey_active_model_v2', next);
            return next;
          });
        }
        if (Array.isArray(data.voices) && data.voices.length > 0) {
          setAvailableVoices(data.voices);
          setSelectedVoiceId((prev) => {
            if (data.voices.some((v) => v.id === prev)) return prev;
            const saved = localStorage.getItem('pacey_active_voice_id');
            if (saved && data.voices.some((v) => v.id === saved)) return saved;
            return data.voices[0].id;
          });
        }
      }
    } catch {
      setBrainOnline(false);
    }
  }, []);

  useEffect(() => {
    refreshBrainAndVoiceStatus();
  }, [refreshBrainAndVoiceStatus]);

  useEffect(() => {
    resetIdleSleepTimer();
    const handleActivity = () => {
      resetIdleSleepTimer();
    };
    window.addEventListener('keydown', handleActivity, { passive: true });
    window.addEventListener('pointerdown', handleActivity, { passive: true });
    return () => {
      clearTimers();
      if (idleSleepTimerRef.current) clearTimeout(idleSleepTimerRef.current);
      window.removeEventListener('keydown', handleActivity);
      window.removeEventListener('pointerdown', handleActivity);
    };
  }, [clearTimers, resetIdleSleepTimer]);

  /**
   * Send a text or transcribed voice prompt to Pacey's running model (:9931 / :11434)
   */
  const askPacey = useCallback(async (userText, customContext = {}) => {
    const trimmed = String(userText || '').trim();
    if (!trimmed || isThinkingChat) return null;

    resetIdleSleepTimer();
    clearTimers();

    const userMsg = { role: 'user', content: trimmed };
    const updatedHistory = [...chatHistory, userMsg];
    setChatHistory(updatedHistory);
    setIsThinkingChat(true);

    setBotState('thinking');
    setExpression('attentif');
    setMessage(`${formatShortModelName(selectedModel)} // THINKING...`);

    try {
      const res = await fetch(`${API_BASE}/pacey/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: trimmed,
          history: updatedHistory.slice(-8),
          model: selectedModel,
          context: {
            source: 'PacedLearner Web Hub',
            ...appContext,
            ...customContext
          }
        })
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || `HTTP ${res.status}`);
      }

      const replyExpr = EXPRESSION_BY_ID.has(data.expression) ? data.expression : 'heureux';
      const replyState = STATE_BY_ID.has(data.state) ? data.state : 'wink';
      const shortBanner =
        data.reply.length > 72 ? `${data.reply.slice(0, 72).toUpperCase()}...` : data.reply.toUpperCase();

      const assistantMsg = {
        role: 'assistant',
        content: data.reply,
        speechText: data.speechText || data.reply,
        expression: replyExpr,
        state: replyState,
        model: data.model || selectedModel,
        provider: data.provider || 'llama-server:9931',
        latencyMs: data.latencyMs
      };

      setChatHistory((prev) => [...prev, assistantMsg]);

      if (replyState !== 'idle') {
        triggerState(replyState, replyExpr, shortBanner);
      } else {
        setEmotion(replyExpr, shortBanner, 6500);
      }
      baseMessageRef.current = shortBanner;

      if (voiceEnabled) {
        speakTextOut(assistantMsg.speechText, {
          expression: replyExpr,
          state: replyState,
          model: assistantMsg.model
        });
      } else if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent('pacey:speak', {
            detail: {
              text: assistantMsg.speechText,
              expression: replyExpr,
              state: replyState,
              model: assistantMsg.model,
              muted: true,
              timestamp: Date.now()
            }
          })
        );
      }

      return assistantMsg;
    } catch (err) {
      const errBanner = `MODEL LINK ERROR // ${err.message.toUpperCase()}`;
      triggerState('alert', 'effraye', errBanner, 2500);
      setChatHistory((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: `Could not reach model (${selectedModel}): ${err.message}`,
          expression: 'effraye',
          state: 'alert',
          model: selectedModel
        }
      ]);
      return null;
    } finally {
      setIsThinkingChat(false);
    }
  }, [appContext, chatHistory, clearTimers, isThinkingChat, resetIdleSleepTimer, selectedModel, setEmotion, speakTextOut, triggerState, voiceEnabled]);

  /**
   * Toggle Microphone Recording -> VoiceStudio Whisper Transcription -> Ask Pacey
   */
  const toggleMicRecording = useCallback(async (onTranscribedText) => {
    if (isTranscribingMic) return;

    // Stop recording & transcribe via VoiceStudio http://127.0.0.1:3900/v1/audio/transcriptions
    if (isRecordingMic && micRecorderRef.current) {
      setIsRecordingMic(false);
      setIsTranscribingMic(true);
      setBotState('thinking');
      setExpression('curieux');
      setMessage('VOICESTUDIO WHISPER (:3900) // TRANSCRIBING SPEECH...');

      try {
        const { wavBlob, audioBase64, fallbackTranscript } = await micRecorderRef.current.stop();
        micRecorderRef.current = null;

        const text = await transcribeWithVoiceStudio({
          wavBlob,
          audioBase64,
          fallbackTranscript,
          model: 'whisper-1'
        });

        setIsTranscribingMic(false);

        if (text && text.trim()) {
          onTranscribedText?.(text.trim());
          await askPacey(text.trim());
        } else {
          triggerState('wide', 'confus', 'NO SPEECH DETECTED // TRY SPEAKING CLOSER TO MIC', 2400);
        }
      } catch (err) {
        setIsTranscribingMic(false);
        micRecorderRef.current = null;
        triggerState('alert', 'effraye', `VOICE TRANSCRIPTION ERROR // ${err.message.toUpperCase()}`, 3000);
      }
      return;
    }

    // Start recording microphone into 16-bit PCM WAV
    try {
      stopSpeakingOut();
      const recorder = await startWavMicRecorder();
      micRecorderRef.current = recorder;
      setIsRecordingMic(true);
      setBotState('wide');
      setExpression('attentif');
      setMessage('🎙 LISTENING // SPEAK NOW & CLICK [■ SEND VOICE] WHEN DONE');
    } catch (err) {
      setIsRecordingMic(false);
      triggerState('alert', 'effraye', 'MIC ACCESS DENIED // ALLOW MICROPHONE PERMISSION', 3000);
    }
  }, [askPacey, isRecordingMic, isTranscribingMic, stopSpeakingOut, triggerState]);

  const handleSelectModel = useCallback((nextModel) => {
    setSelectedModel(nextModel);
    if (typeof window !== 'undefined') {
      localStorage.setItem('pacey_active_model_v2', nextModel);
    }
    triggerState('wink', 'fier', `MODEL LOCKED // ${formatShortModelName(nextModel)}`, 1600);
  }, [triggerState]);

  const handleToggleVoice = useCallback(() => {
    setVoiceEnabled((prev) => {
      const next = !prev;
      if (typeof window !== 'undefined') {
        localStorage.setItem('pacey_speak_out_enabled', String(next));
      }
      if (!next) {
        stopSpeakingOut();
      }
      triggerState(
        'wink',
        next ? 'excite' : 'attentif',
        next ? 'VOICESTUDIO SPEAK OUT // ENABLED' : 'VOICESTUDIO SPEAK OUT // MUTED',
        1400
      );
      return next;
    });
  }, [stopSpeakingOut, triggerState]);

  const handlePoke = useCallback(() => {
    const item = POKE_REACTIONS[pokeIndexRef.current % POKE_REACTIONS.length];
    pokeIndexRef.current += 1;
    if (item.state !== 'idle') {
      triggerState(item.state, item.expr, item.msg);
    } else {
      setEmotion(item.expr, item.msg, 4500);
    }
    if (voiceEnabled) {
      speakTextOut(item.msg, { expression: item.expr, state: item.state });
    }
  }, [triggerState, setEmotion, voiceEnabled, speakTextOut]);

  const handleDoubleClick = useCallback(() => {
    triggerState('orbit', 'excite', 'ORBITAL OVERDRIVE // FULL SPECTRUM SCAN');
  }, [triggerState]);

  const handleRapidShake = useCallback(() => {
    triggerState('swirl', 'effraye', 'CURSOR TURBULENCE // GYROSCOPE RE-CENTERING', 1400);
  }, [triggerState]);

  const react = useCallback((event, payload = {}) => {
    resetIdleSleepTimer();
    switch (event) {
      case 'hover-grade-1':
        setBotState('idle');
        setExpression('effraye');
        setMessage('AGAIN [1] // STABILITY RESETS TO S=1.0d');
        break;
      case 'hover-grade-2':
        setBotState('idle');
        setExpression('confus');
        setMessage('HARD [2] // HIGH COGNITIVE FRICTION');
        break;
      case 'hover-grade-3':
        setBotState('idle');
        setExpression('heureux');
        setMessage('GOOD [3] // TARGET 90% RETENTION LOCKED');
        break;
      case 'hover-grade-4':
        setBotState('idle');
        setExpression('fier');
        setMessage('EASY [4] // MAXIMUM STABILITY EXPANSION');
        break;
      case 'hover-grade-leave':
        setBotState('idle');
        setExpression(baseExpressionRef.current);
        setMessage(baseMessageRef.current);
        break;
      case 'grade-1':
        triggerState('alert', 'triste', 'LAPSE LOGGED // RE-SCHEDULING FOR TOMORROW', 2200);
        baseMessageRef.current = 'LAPSE RECORDED // REINFORCE THIS PATTERN';
        break;
      case 'grade-2':
        triggerState('wide', 'mefiant', 'GRADED HARD // SHORTENED FSRS INTERVAL', 1800);
        baseMessageRef.current = 'HARD PASS // KEEP WATCHING EDGE CASES';
        break;
      case 'grade-3':
        triggerState('wink', 'heureux', 'SOLID RECALL // STABILITY INCREMENTED', 1600);
        baseMessageRef.current = 'GOOD RECALL // NEXT CARD READY';
        break;
      case 'grade-4':
        triggerState('orbit', 'fier', 'EFFORTLESS MASTERY // INTERVAL BOOSTED', 2800);
        baseMessageRef.current = 'MASTERY CONFIRMED // OPTIMAL TRAJECTORY';
        break;
      case 'hint-loading':
        clearTimers();
        setBotState('thinking');
        setMessage('PACEY THINKING // GENERATING SOCRATIC HINT...');
        break;
      case 'hint-received':
        triggerState('exclaim', 'curieux', `SOCRATIC HINT L${payload.level || 1}/3 // DEDUCE THE INVARIANT`, 1600);
        baseMessageRef.current = `HINT L${payload.level || 1} ACTIVE // FORMULATE APPROACH`;
        break;
      case 'reveal-stage-2':
        triggerState('swirl', 'attentif', 'APPROACH UNLOCKED // VERIFY TIME & SPACE BOUNDS', 1300);
        baseMessageRef.current = 'STAGE 2 // CHECK INVARIANT & COMPLEXITY';
        break;
      case 'reveal-stage-3':
        setEmotion('surpris', 'IMPLEMENTATION REVEALED // AUDIT PITFALLS & GRADE', 0);
        break;
      case 'copy-code':
      case 'code-copied':
        triggerState('wink', 'heureux', 'CODE COPIED // READY FOR DRY RUN', 1500);
        break;
      case 'queue-clear':
        triggerState('burst', 'hilare', 'QUEUE CLEARED // ALL RETENTION TARGETS MET', 2600);
        baseMessageRef.current = 'ALL REVIEWS COMPLETE // 90%+ RETENTION';
        break;
      case 'tab-change': {
        const tab = payload.tab;
        if (tab === 'reviews') {
          triggerState('swirl', 'attentif', 'REVIEW QUEUE // STATE INVARIANTS BEFORE REVEAL', 1300);
          baseMessageRef.current = 'ACTIVE RECALL // FOLLOW THE PROMPT';
        } else if (tab === 'notebook') {
          triggerState('wink', 'curieux', 'PROBLEM LOG // BROWSE & FILTER ARCHIVED SOLVES', 1400);
          baseMessageRef.current = 'PROBLEM LOG // CLICK ANY ROW TO INSPECT';
        } else if (tab === 'analytics') {
          triggerState('swirl', 'fier', 'FSRS TELEMETRY // RETENTION & MASTERY DIAGNOSTICS', 1300);
          baseMessageRef.current = 'TELEMETRY // MONITORING FORGETTING CURVES';
        }
        break;
      }
      case 'search-problems':
        setEmotion('curieux', payload.query ? `FILTERING VAULT: "${payload.query.toUpperCase()}"` : 'VAULT FILTER RESET', 2500);
        break;
      case 'problem-added':
        triggerState('orbit', 'excite', `LOGGED "${(payload.title || 'PROBLEM').toUpperCase()}" TO FSRS`, 2800);
        baseMessageRef.current = 'NEW PROBLEM LOGGED // SCHEDULE UPDATED';
        break;
      case 'github-sync':
      case 'github-sync-done':
        triggerState('comet', 'fier', 'GITHUB VAULT // SOLUTIONS COMMITTED', 2400);
        break;
      case 'github-sync-start':
        clearTimers();
        setBotState('thinking');
        setMessage('SYNCING TO GITHUB VAULT...');
        break;
      case 'problem-inspect':
        setEmotion('attentif', `INSPECTING: ${(payload.title || 'PROBLEM').toUpperCase()}`, 4000);
        break;
      case 'theme-toggle':
        triggerState(
          'swirl',
          payload.dark ? 'fier' : 'heureux',
          payload.dark ? 'DARK MODE ENGAGED // POLARITY INVERTED' : 'LIGHT MODE ENGAGED // DAYLIGHT POLARITY',
          1500
        );
        break;
      case 'drag-start':
        setBotState('idle');
        setExpression('surpris');
        setMessage('RELOCATING PACEY // DROP ANYWHERE');
        break;
      case 'drag-end':
        triggerState('wink', 'heureux', 'POSITION LOCKED // PACEY READY', 1400);
        break;
      default:
        break;
    }
  }, [clearTimers, resetIdleSleepTimer, setEmotion, triggerState]);

  const currentExprObj = EXPRESSION_BY_ID.get(expression) || EXPRESSIONS[0];
  const currentStateObj = STATE_BY_ID.get(botState) || STATES[0];
  const activeVoice =
    availableVoices.find((v) => v.id === selectedVoiceId) || availableVoices[0];

  const value = {
    expression,
    expressionLabel: currentExprObj.label,
    botState,
    stateLabel: currentStateObj.label,
    message,
    inverted,
    onToggleTheme,
    brainOnline,
    voiceStudioOnline,
    availableModels,
    selectedModel,
    handleSelectModel,
    chatHistory,
    isThinkingChat,
    isRecordingMic,
    isTranscribingMic,
    isGeneratingVoice,
    availableVoices,
    selectedVoiceId,
    handleSelectVoice,
    activeVoice,
    isSpeakingOut,
    askPacey,
    toggleMicRecording,
    speakTextOut,
    stopSpeakingOut,
    voiceEnabled,
    handleToggleVoice,
    appContext,
    setEmotion,
    triggerState,
    handlePoke,
    handleDoubleClick,
    handleRapidShake,
    react
  };

  return (
    <MascotContext.Provider value={value}>
      {children}
    </MascotContext.Provider>
  );
}

const STORAGE_KEY = 'pacey_dock_position_v1';

function clampPosition(x, y, width = 284, height = 250) {
  if (typeof window === 'undefined') return { x, y };
  const margin = 8;
  const maxX = Math.max(margin, window.innerWidth - width - margin);
  const maxY = Math.max(margin, window.innerHeight - height - margin);
  return {
    x: Math.min(Math.max(margin, Math.round(x)), maxX),
    y: Math.min(Math.max(margin, Math.round(y)), maxY)
  };
}

/**
 * Persistent & Movable Brutalist Companion Dock (`MascotCompanionDock`)
 * Integrates:
 * - Multimodal Qwen3.5-4B on http://127.0.0.1:9931 + local Ollama models
 * - VoiceStudio TTS (http://127.0.0.1:3900/v1/audio/speech) for Pacey to speak out
 * - VoiceStudio STT (http://127.0.0.1:3900/v1/audio/transcriptions) to speak to Pacey via Mic
 * - Typing input to chat with Pacey via text
 */
export function MascotCompanionDock() {
  const mascot = useMascot();
  const [minimized, setMinimized] = useState(false);
  const [mindOpen, setMindOpen] = useState(false);
  const [inputText, setInputText] = useState('');
  const [isHovered, setIsHovered] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const [pos, setPos] = useState(() => {
    if (typeof window === 'undefined') return null;
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (typeof parsed.x === 'number' && typeof parsed.y === 'number') {
          return clampPosition(parsed.x, parsed.y);
        }
      }
    } catch {
      // ignore storage errors
    }
    return null;
  });

  const dockRef = useRef(null);
  const chatScrollRef = useRef(null);
  const dragSessionRef = useRef(null);
  const suppressNextClickRef = useRef(false);

  useEffect(() => {
    const handleResize = () => {
      setPos((prev) => {
        if (!prev) return null;
        const rect = dockRef.current?.getBoundingClientRect();
        return clampPosition(prev.x, prev.y, rect?.width || 284, rect?.height || 250);
      });
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (mindOpen && chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [mindOpen, mascot?.chatHistory, mascot?.isThinkingChat, mascot?.isTranscribingMic]);

  if (!mascot) return null;

  const {
    expression,
    expressionLabel,
    botState,
    stateLabel,
    message,
    inverted,
    onToggleTheme,
    brainOnline,
    voiceStudioOnline,
    availableModels,
    selectedModel,
    handleSelectModel,
    chatHistory,
    isThinkingChat,
    isRecordingMic,
    isTranscribingMic,
    isGeneratingVoice,
    availableVoices,
    selectedVoiceId,
    handleSelectVoice,
    activeVoice,
    isSpeakingOut,
    askPacey,
    toggleMicRecording,
    speakTextOut,
    stopSpeakingOut,
    voiceEnabled,
    handleToggleVoice,
    appContext,
    handlePoke,
    handleDoubleClick,
    handleRapidShake,
    react
  } = mascot;

  const handlePointerDown = (e) => {
    if (e.button !== undefined && e.button !== 0) return;
    if (e.target.closest('button, input, select, textarea, a, .pacey-mind-scroll')) return;

    const el = dockRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();

    dragSessionRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      originX: rect.left,
      originY: rect.top,
      width: rect.width,
      height: rect.height,
      moved: false
    };

    const handlePointerMove = (moveEvent) => {
      const session = dragSessionRef.current;
      if (!session) return;
      const dx = moveEvent.clientX - session.startX;
      const dy = moveEvent.clientY - session.startY;

      if (!session.moved && Math.hypot(dx, dy) > 5) {
        session.moved = true;
        suppressNextClickRef.current = true;
        setIsDragging(true);
        react('drag-start');
      }

      if (session.moved) {
        const nextPos = clampPosition(
          session.originX + dx,
          session.originY + dy,
          session.width,
          session.height
        );
        setPos(nextPos);
      }
    };

    const handlePointerUp = () => {
      const session = dragSessionRef.current;
      dragSessionRef.current = null;
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      window.removeEventListener('pointercancel', handlePointerUp);

      if (session?.moved) {
        setIsDragging(false);
        setPos((latest) => {
          if (latest) {
            try {
              localStorage.setItem(STORAGE_KEY, JSON.stringify(latest));
            } catch {
              // ignore
            }
          }
          return latest;
        });
        react('drag-end');
        setTimeout(() => {
          suppressNextClickRef.current = false;
        }, 80);
      }
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    window.addEventListener('pointercancel', handlePointerUp);
  };

  const handleStageClick = () => {
    if (suppressNextClickRef.current) return;
    handlePoke();
  };

  const handleStageDoubleClick = () => {
    if (suppressNextClickRef.current) return;
    handleDoubleClick();
  };

  const handleSubmitChat = async (e) => {
    e?.preventDefault();
    const text = inputText.trim();
    if (!text || isThinkingChat) return;
    setInputText('');
    if (!mindOpen) setMindOpen(true);
    await askPacey(text);
  };

  const handleMicButtonClick = async () => {
    if (!mindOpen) setMindOpen(true);
    await toggleMicRecording();
  };

  const positionStyle = pos
    ? { left: `${pos.x}px`, top: `${pos.y}px`, right: 'auto', bottom: 'auto' }
    : { bottom: '24px', right: '24px' };

  const dockWidth = mindOpen ? '352px' : '284px';

  if (minimized) {
    return (
      <aside
        id="pacey-companion-dock"
        ref={dockRef}
        className="mascot-companion-dock"
        aria-label="Pacey Interactive Mascot Companion (Minimized)"
        onPointerDown={handlePointerDown}
        style={{
          position: 'fixed',
          ...positionStyle,
          zIndex: 950,
          display: 'flex',
          alignItems: 'center',
          background: 'var(--bg)',
          border: '3px solid var(--border)',
          cursor: isDragging ? 'grabbing' : 'grab',
          userSelect: 'none',
          touchAction: 'none'
        }}
      >
        <div
          onClick={() => {
            if (!suppressNextClickRef.current) setMinimized(false);
          }}
          title="Click to expand Pacey • Drag to move anywhere"
          style={{
            padding: '6px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          <BloubAvatar
            size={54}
            expression={expression}
            state={botState}
            follow={true}
            inverted={inverted}
          />
        </div>
      </aside>
    );
  }

  return (
    <aside
      id="pacey-companion-dock"
      ref={dockRef}
      className="mascot-companion-dock"
      aria-label="Pacey Interactive Mascot Companion"
      onPointerDown={handlePointerDown}
      style={{
        position: 'fixed',
        ...positionStyle,
        zIndex: 950,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-end',
        gap: '0',
        maxWidth: 'calc(100vw - 16px)',
        cursor: isDragging ? 'grabbing' : 'grab',
        userSelect: 'none',
        touchAction: 'none'
      }}
    >
      {/* Main Dock Frame */}
      <div
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        style={{
          width: dockWidth,
          background: 'var(--bg)',
          color: 'var(--text)',
          border: isRecordingMic
            ? '5px solid var(--error)'
            : isDragging || isHovered
            ? '5px solid var(--border)'
            : '3px solid var(--border)',
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        {/* Top Draggable Header Strip */}
        <div
          title="Drag to move Pacey anywhere on screen"
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '6px 10px',
            borderBottom: '3px solid var(--border)',
            background: 'var(--text)',
            color: 'var(--bg)',
            cursor: isDragging ? 'grabbing' : 'grab'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', overflow: 'hidden' }}>
            <span
              aria-hidden="true"
              style={{
                fontFamily: "'Space Mono', monospace",
                fontSize: '11px',
                lineHeight: 1,
                opacity: 0.75
              }}
            >
              ⠿
            </span>
            <span
              style={{
                fontFamily: "'Archivo Black', sans-serif",
                fontSize: '10px',
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis'
              }}
            >
              PACEY // {isSpeakingOut ? 'SPEAKING' : isRecordingMic ? 'LISTENING' : stateLabel !== 'IDLE' ? stateLabel : expressionLabel}
            </span>
          </div>

          <div style={{ display: 'flex', gap: '4px', flexShrink: 0 }}>
            <button
              id="pacey-header-voice-btn"
              type="button"
              onClick={handleToggleVoice}
              title="Toggle Pacey Speak Out (VoiceStudio 127.0.0.1:3900)"
              style={{
                background: voiceEnabled ? 'var(--bg)' : 'transparent',
                color: voiceEnabled ? 'var(--text)' : 'var(--bg)',
                border: '1px solid var(--bg)',
                padding: '1px 5px',
                fontFamily: "'Space Mono', monospace",
                fontSize: '9px',
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              {voiceEnabled ? '🔊 ON' : '🔇 OFF'}
            </button>
            <button
              id="pacey-mind-toggle-btn"
              type="button"
              onClick={() => setMindOpen((v) => !v)}
              title="Open Pacey's Mind & VoiceStudio Console"
              style={{
                background: mindOpen ? 'var(--bg)' : 'transparent',
                color: mindOpen ? 'var(--text)' : 'var(--bg)',
                border: '1px solid var(--bg)',
                padding: '1px 6px',
                fontFamily: "'Space Mono', monospace",
                fontSize: '9px',
                fontWeight: 700,
                cursor: 'pointer',
                letterSpacing: '0.04em'
              }}
            >
              {mindOpen ? 'HIDE MIND' : 'MIND'}
            </button>
            {onToggleTheme && (
              <button
                type="button"
                onClick={() => {
                  const nextDark = !inverted;
                  onToggleTheme();
                  react('theme-toggle', { dark: nextDark });
                }}
                title="Invert Dark/Light Polarity"
                style={{
                  background: 'transparent',
                  color: 'var(--bg)',
                  border: '1px solid var(--bg)',
                  padding: '1px 5px',
                  fontFamily: "'Space Mono', monospace",
                  fontSize: '9px',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                {inverted ? '◑' : '◐'}
              </button>
            )}
            <button
              type="button"
              onClick={() => setMinimized(true)}
              title="Minimize Pacey"
              style={{
                background: 'transparent',
                color: 'var(--bg)',
                border: '1px solid var(--bg)',
                padding: '1px 6px',
                fontFamily: "'Space Mono', monospace",
                fontSize: '9px',
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              _
            </button>
          </div>
        </div>

        {/* Interactive Circle Mascot Stage */}
        <div
          onClick={handleStageClick}
          onDoubleClick={handleStageDoubleClick}
          title="Click Pacey to switch expression • Double-click for 3D Orbit • Drag to move anywhere"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: mindOpen ? '8px 12px 6px 12px' : '12px 12px 8px 12px',
            cursor: isDragging ? 'grabbing' : 'pointer',
            position: 'relative',
            background: 'var(--bg)',
            color: 'var(--text)'
          }}
        >
          {/* Brutalist Registration Corner Ticks */}
          <span style={{ position: 'absolute', top: '6px', left: '8px', fontFamily: "'Space Mono', monospace", fontSize: '8.5px', fontWeight: 700, opacity: 0.6, pointerEvents: 'none' }}>
            {brainOnline ? 'BRAIN:9931' : '3D'}
          </span>
          <span style={{ position: 'absolute', top: '6px', right: '8px', fontFamily: "'Space Mono', monospace", fontSize: '8.5px', fontWeight: 700, opacity: 0.6, pointerEvents: 'none' }}>
            {voiceStudioOnline ? (activeVoice?.name || 'PACEY CHINESE').toUpperCase() : 'TTS'}
          </span>
          <span style={{ position: 'absolute', bottom: '4px', left: '8px', fontFamily: "'Space Mono', monospace", fontSize: '8.5px', fontWeight: 700, opacity: 0.6, pointerEvents: 'none' }}>
            {isRecordingMic ? '● REC WAV' : isSpeakingOut ? '🔊 SPEAKING' : isGeneratingVoice ? '⏳ VOICESTUDIO...' : 'QWEN3.5-4B'}
          </span>
          <span style={{ position: 'absolute', bottom: '4px', right: '8px', fontFamily: "'Space Mono', monospace", fontSize: '8.5px', fontWeight: 700, opacity: 0.6, pointerEvents: 'none' }}>
            {voiceEnabled ? 'SPEAK:ON' : 'SPEAK:OFF'}
          </span>

          <BloubAvatar
            size={mindOpen ? 88 : 104}
            expression={expression}
            state={botState}
            follow={true}
            inverted={inverted}
            onRapidMouseShake={handleRapidShake}
          />
        </div>

        {/* Live Telemetry Readout Bar */}
        <div
          style={{
            padding: '7px 10px',
            borderTop: '3px solid var(--border)',
            background: 'var(--surface-sunken)',
            color: 'var(--text)',
            fontFamily: "'Space Mono', monospace",
            fontSize: '10px',
            fontWeight: 700,
            lineHeight: 1.35,
            minHeight: '38px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '8px'
          }}
        >
          <span id="mascot-status-text" style={{ flex: 1 }}>&gt; {message}</span>
          {isSpeakingOut && (
            <button
              type="button"
              onClick={stopSpeakingOut}
              style={{
                background: 'var(--error)',
                color: '#FFFFFF',
                border: '1.5px solid var(--border)',
                padding: '2px 6px',
                fontFamily: "'Space Mono', monospace",
                fontSize: '8.5px',
                fontWeight: 700,
                cursor: 'pointer',
                flexShrink: 0
              }}
            >
              ■ STOP VOICE
            </button>
          )}
        </div>

        {/* Expandable Neural Mind & VoiceStudio Console */}
        {mindOpen && (
          <div
            id="pacey-mind-console"
            style={{
              borderTop: '3px solid var(--border)',
              background: 'var(--bg)',
              display: 'flex',
              flexDirection: 'column'
            }}
          >
            {/* Model & VoiceStudio Voice Selector Bar */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '5px',
                padding: '6px 8px',
                borderBottom: '2px solid var(--border)',
                background: 'var(--surface-sunken)',
                fontFamily: "'Space Mono', monospace",
                fontSize: '9px'
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '6px'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', minWidth: 0, flex: 1 }}>
                  <span
                    style={{
                      width: '6px',
                      height: '6px',
                      background: brainOnline ? 'var(--success)' : 'var(--warning)',
                      border: '1px solid var(--border)',
                      display: 'inline-block',
                      flexShrink: 0
                    }}
                  />
                  <span style={{ fontWeight: 700, whiteSpace: 'nowrap' }}>BRAIN:</span>
                  <select
                    id="pacey-model-select"
                    value={selectedModel}
                    onChange={(e) => handleSelectModel(e.target.value)}
                    style={{
                      background: 'var(--bg)',
                      color: 'var(--text)',
                      border: '1.5px solid var(--border)',
                      fontFamily: "'Space Mono', monospace",
                      fontSize: '8.5px',
                      fontWeight: 700,
                      padding: '1px 3px',
                      cursor: 'pointer',
                      width: '100%'
                    }}
                  >
                    {availableModels.map((m) => (
                      <option key={m} value={m}>
                        {formatShortModelName(m)}
                      </option>
                    ))}
                  </select>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', minWidth: 0, flex: 1 }}>
                  <span
                    style={{
                      width: '6px',
                      height: '6px',
                      background: voiceStudioOnline ? 'var(--success)' : 'var(--warning)',
                      border: '1px solid var(--border)',
                      display: 'inline-block',
                      flexShrink: 0
                    }}
                  />
                  <span style={{ fontWeight: 700, whiteSpace: 'nowrap' }}>VOICE:</span>
                  <select
                    id="pacey-voice-select"
                    value={selectedVoiceId}
                    onChange={(e) => handleSelectVoice(e.target.value)}
                    style={{
                      background: 'var(--bg)',
                      color: 'var(--text)',
                      border: '1.5px solid var(--border)',
                      fontFamily: "'Space Mono', monospace",
                      fontSize: '8.5px',
                      fontWeight: 700,
                      padding: '1px 3px',
                      cursor: 'pointer',
                      width: '100%'
                    }}
                  >
                    {availableVoices.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '6px',
                  paddingTop: '3px',
                  borderTop: '1px dashed var(--border)'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', opacity: 0.8, fontSize: '8px' }}>
                  <span>SEED: #{activeVoice?.seed || 307702207}</span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <button
                    id="pacey-test-voice-btn"
                    type="button"
                    disabled={isSpeakingOut || isGeneratingVoice}
                    onClick={() =>
                      speakTextOut(
                        `Stop staring at me and get back to work, you lazy ass! Speaking with ${activeVoice?.name || 'PaceyChinese'}!`
                      )
                    }
                    title={`Test ${activeVoice?.name || 'Pacey'} Voice Studio synthesis`}
                    style={{
                      background: isSpeakingOut || isGeneratingVoice ? 'var(--surface-sunken)' : 'var(--bg)',
                      color: 'var(--text)',
                      border: '1.5px solid var(--border)',
                      padding: '2px 6px',
                      fontFamily: "'Space Mono', monospace",
                      fontSize: '8.5px',
                      fontWeight: 700,
                      cursor: isSpeakingOut || isGeneratingVoice ? 'not-allowed' : 'pointer',
                      textTransform: 'uppercase'
                    }}
                  >
                    {isSpeakingOut ? '🔊 PLAYING...' : isGeneratingVoice ? '⏳ GENERATING...' : '🔊 TEST VOICE'}
                  </button>
                  <button
                    id="pacey-voice-toggle-btn"
                    type="button"
                    onClick={handleToggleVoice}
                    title="Toggle Pacey Speak Out via VoiceStudio (http://127.0.0.1:3900/generate)"
                    style={{
                      background: voiceEnabled ? 'var(--text)' : 'var(--bg)',
                      color: voiceEnabled ? 'var(--bg)' : 'var(--text)',
                      border: '1.5px solid var(--border)',
                      padding: '2px 6px',
                      fontFamily: "'Space Mono', monospace",
                      fontSize: '8.5px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      textTransform: 'uppercase'
                    }}
                  >
                    {voiceEnabled ? '🔊 ON' : '🔇 OFF'}
                  </button>
                </div>
              </div>
            </div>

            {/* Active Problem Context Strip */}
            {appContext?.problem?.title && (
              <div
                style={{
                  padding: '4px 8px',
                  borderBottom: '1px solid var(--border)',
                  fontFamily: "'Space Mono', monospace",
                  fontSize: '8.5px',
                  color: 'var(--text-secondary)',
                  textTransform: 'uppercase',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis'
                }}
              >
                CTX: {appContext.problem.title} [{appContext.problem.difficulty}]
              </div>
            )}

            {/* Quick Socratic Prompts */}
            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: '4px',
                padding: '6px 8px',
                borderBottom: '2px solid var(--border)',
                background: 'var(--bg)'
              }}
            >
              {QUICK_PROMPTS.map((q) => (
                <button
                  key={q.label}
                  type="button"
                  disabled={isThinkingChat || isTranscribingMic}
                  onClick={() => askPacey(q.prompt)}
                  style={{
                    background: 'var(--bg)',
                    color: 'var(--text)',
                    border: '1.5px solid var(--border)',
                    padding: '2px 6px',
                    fontFamily: "'Space Mono', monospace",
                    fontSize: '8.5px',
                    fontWeight: 700,
                    cursor: isThinkingChat ? 'not-allowed' : 'pointer',
                    textTransform: 'uppercase'
                  }}
                >
                  {q.label}
                </button>
              ))}
            </div>

            {/* Scrollable Chat History with Per-Message [🔊 SPEAK] Button */}
            <div
              ref={chatScrollRef}
              className="pacey-mind-scroll"
              style={{
                maxHeight: '195px',
                overflowY: 'auto',
                padding: '8px',
                display: 'flex',
                flexDirection: 'column',
                gap: '6px',
                background: 'var(--bg)',
                userSelect: 'text',
                cursor: 'auto'
              }}
            >
              {chatHistory.map((item, idx) => {
                const isUser = item.role === 'user';
                return (
                  <div
                    key={idx}
                    style={{
                      alignSelf: isUser ? 'flex-end' : 'flex-start',
                      maxWidth: '94%',
                      border: '2px solid var(--border)',
                      background: isUser ? 'var(--text)' : 'var(--surface-sunken)',
                      color: isUser ? 'var(--bg)' : 'var(--text)',
                      padding: '6px 8px',
                      fontFamily: "'Space Mono', monospace",
                      fontSize: '10px',
                      lineHeight: 1.4
                    }}
                  >
                    <div
                      style={{
                        fontSize: '8px',
                        fontWeight: 700,
                        opacity: 0.85,
                        marginBottom: '3px',
                        textTransform: 'uppercase',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        gap: '6px'
                      }}
                    >
                      <span>{isUser ? 'YOU' : `PACEY // ${(item.expression || 'MIND').toUpperCase()}`}</span>
                      {!isUser && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                          {item.latencyMs && (
                            <span>{(item.latencyMs / 1000).toFixed(1)}s</span>
                          )}
                          <button
                            type="button"
                            onClick={() => speakTextOut(item.speechText || item.content, item)}
                            title="Speak this response aloud with VoiceStudio"
                            style={{
                              background: 'var(--bg)',
                              color: 'var(--text)',
                              border: '1px solid var(--border)',
                              padding: '0px 4px',
                              fontFamily: "'Space Mono', monospace",
                              fontSize: '8px',
                              fontWeight: 700,
                              cursor: 'pointer'
                            }}
                          >
                            🔊 SPEAK
                          </button>
                        </div>
                      )}
                    </div>
                    <div style={{ wordBreak: 'break-word' }}>{item.content}</div>
                  </div>
                );
              })}

              {isTranscribingMic && (
                <div
                  style={{
                    alignSelf: 'flex-end',
                    border: '2px solid var(--border)',
                    background: 'var(--surface-sunken)',
                    color: 'var(--text)',
                    padding: '6px 8px',
                    fontFamily: "'Space Mono', monospace",
                    fontSize: '9.5px',
                    fontWeight: 700
                  }}
                >
                  &gt; VOICESTUDIO WHISPER TRANSCRIBING SPEECH.WAV...
                </div>
              )}

              {isThinkingChat && (
                <div
                  style={{
                    alignSelf: 'flex-start',
                    border: '2px solid var(--border)',
                    background: 'var(--surface-sunken)',
                    color: 'var(--text)',
                    padding: '6px 8px',
                    fontFamily: "'Space Mono', monospace",
                    fontSize: '9.5px',
                    fontWeight: 700
                  }}
                >
                  &gt; PACEY THINKING ({formatShortModelName(selectedModel)})...
                </div>
              )}
            </div>
          </div>
        )}

        {/* Always-Accessible Speak (Mic) + Type Input Bar */}
        <form
          onSubmit={handleSubmitChat}
          style={{
            display: 'flex',
            alignItems: 'stretch',
            borderTop: '3px solid var(--border)',
            background: 'var(--bg)'
          }}
        >
          {/* Option 1: Speak to Pacey via VoiceStudio Whisper STT */}
          <button
            id="pacey-mic-btn"
            type="button"
            disabled={isThinkingChat || isTranscribingMic}
            onClick={handleMicButtonClick}
            title={
              isRecordingMic
                ? 'Stop recording and transcribe with VoiceStudio Whisper'
                : 'Speak to Pacey via Microphone (VoiceStudio Whisper STT)'
            }
            style={{
              background: isRecordingMic ? 'var(--error)' : 'var(--surface-sunken)',
              color: isRecordingMic ? '#FFFFFF' : 'var(--text)',
              border: 'none',
              borderRight: '3px solid var(--border)',
              padding: '6px 9px',
              fontFamily: "'Space Mono', monospace",
              fontSize: '9.5px',
              fontWeight: 700,
              textTransform: 'uppercase',
              cursor: isThinkingChat || isTranscribingMic ? 'not-allowed' : 'pointer',
              whiteSpace: 'nowrap'
            }}
          >
            {isRecordingMic ? '■ SEND' : isTranscribingMic ? '...' : '🎙 SPEAK'}
          </button>

          {/* Option 2: Type to Pacey */}
          <input
            id="pacey-chat-input"
            type="text"
            value={inputText}
            disabled={isThinkingChat || isRecordingMic || isTranscribingMic}
            onChange={(e) => setInputText(e.target.value)}
            onFocus={() => {
              if (!mindOpen) setMindOpen(true);
            }}
            placeholder={
              isRecordingMic
                ? 'LISTENING TO MIC...'
                : isTranscribingMic
                ? 'TRANSCRIBING...'
                : isThinkingChat
                ? 'THINKING...'
                : 'TYPE OR CLICK 🎙 SPEAK...'
            }
            style={{
              flex: 1,
              minWidth: 0,
              border: 'none',
              background: 'var(--bg)',
              color: 'var(--text)',
              padding: '7px 8px',
              fontFamily: "'Space Mono', monospace",
              fontSize: '10px',
              fontWeight: 700,
              outline: 'none'
            }}
          />

          <button
            id="pacey-chat-send-btn"
            type="submit"
            disabled={isThinkingChat || isRecordingMic || isTranscribingMic || !inputText.trim()}
            style={{
              background: 'var(--text)',
              color: 'var(--bg)',
              border: 'none',
              borderLeft: '3px solid var(--border)',
              padding: '6px 10px',
              fontFamily: "'Archivo Black', sans-serif",
              fontSize: '9.5px',
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              cursor: isThinkingChat ? 'not-allowed' : 'pointer'
            }}
          >
            ASK
          </button>
        </form>
      </div>
    </aside>
  );
}
