/**
 * PacedLearner LeetCode Network & Monaco Observer (MAIN World)
 * Captures:
 * - Full Submissions (/submit/)
 * - Sample Test Runs (/interpret_solution/)
 * - Evaluation Poll Results (/submissions/detail/.../check/)
 * - Live Monaco Editor code, cursor line, and inline syntax/lint markers
 */

(() => {
  if (window.__pacedLearnerInterceptorInjected) return;
  window.__pacedLearnerInterceptorInjected = true;

  let lastSubmittedCode = '';
  let lastSubmittedLang = '';
  let lastQuestionId = '';
  let lastActionType = 'submit'; // 'run' | 'submit'

  function snapshotMonacoCode() {
    try {
      const model = window.monaco?.editor?.getModels?.()?.[0];
      if (model) {
        const val = model.getValue();
        if (val) lastSubmittedCode = val;
        const lang = model.getLanguageId?.();
        if (lang) lastSubmittedLang = lang;
      }
    } catch (e) {}
  }

  function handleCheckPayload(url, data) {
    if (!data) return;
    const isRunUrl = url.includes('runcode_') || lastActionType === 'run';

    if (data.state === 'PENDING' || data.state === 'STARTED') {
      window.postMessage({
        type: 'PACED_EVALUATION_POLLING',
        mode: isRunUrl ? 'run' : 'submit',
        state: data.state
      }, '*');
      return;
    }

    if (data.state === 'SUCCESS') {
      snapshotMonacoCode();
      const enriched = {
        ...data,
        mode: isRunUrl ? 'run' : 'submit',
        submittedCode: lastSubmittedCode || data.code || '',
        submittedLang: lastSubmittedLang || data.lang || 'python3'
      };

      if (isRunUrl) {
        window.postMessage({
          type: 'PACED_RUN_CHECK_RESULT',
          result: enriched
        }, '*');
      } else {
        window.postMessage({
          type: 'PACED_SUBMISSION_CHECK_RESULT',
          result: enriched
        }, '*');
      }
    }
  }

  // Intercept window.fetch
  const originalFetch = window.fetch;
  window.fetch = async function (...args) {
    const url = typeof args[0] === 'string' ? args[0] : (args[0]?.url || '');

    // 1. Sample Testcase Run (/interpret_solution/)
    if (url.includes('/interpret_solution/')) {
      lastActionType = 'run';
      try {
        const body = args[1]?.body;
        if (body) {
          const parsed = typeof body === 'string' ? JSON.parse(body) : body;
          if (parsed.typed_code) {
            lastSubmittedCode = parsed.typed_code;
            lastSubmittedLang = parsed.lang || 'python3';
          }
        } else {
          snapshotMonacoCode();
        }
      } catch (e) {}

      window.postMessage({
        type: 'PACED_CODE_RUN_STARTED',
        code: lastSubmittedCode,
        lang: lastSubmittedLang
      }, '*');
    }

    // 2. Full Submission (/submit/)
    if (url.includes('/submit/') && !url.includes('/submissions/')) {
      lastActionType = 'submit';
      try {
        const body = args[1]?.body;
        if (body) {
          const parsed = typeof body === 'string' ? JSON.parse(body) : body;
          if (parsed.typed_code) {
            lastSubmittedCode = parsed.typed_code;
            lastSubmittedLang = parsed.lang || 'python3';
            lastQuestionId = parsed.question_id || '';
          }
        } else {
          snapshotMonacoCode();
        }
      } catch (e) {}

      window.postMessage({
        type: 'PACED_CODE_SUBMITTED',
        code: lastSubmittedCode,
        lang: lastSubmittedLang,
        questionId: lastQuestionId
      }, '*');
    }

    const response = await originalFetch.apply(this, args);

    // 3. Evaluation result poll (/submissions/detail/.../check/)
    if (url.includes('/submissions/detail/') && url.includes('/check/')) {
      try {
        const clone = response.clone();
        clone.json().then((data) => handleCheckPayload(url, data)).catch(() => {});
      } catch (e) {}
    }

    return response;
  };

  // Intercept XMLHttpRequest as fallback
  const originalOpen = XMLHttpRequest.prototype.open;
  const originalSend = XMLHttpRequest.prototype.send;

  XMLHttpRequest.prototype.open = function (method, url, ...rest) {
    this._plUrl = String(url || '');
    this._plMethod = method;
    return originalOpen.call(this, method, url, ...rest);
  };

  XMLHttpRequest.prototype.send = function (body) {
    if (this._plUrl.includes('/interpret_solution/')) {
      lastActionType = 'run';
      try {
        const parsed = typeof body === 'string' ? JSON.parse(body) : body;
        if (parsed?.typed_code) {
          lastSubmittedCode = parsed.typed_code;
          lastSubmittedLang = parsed.lang || 'python3';
        }
      } catch (e) {}
      window.postMessage({
        type: 'PACED_CODE_RUN_STARTED',
        code: lastSubmittedCode,
        lang: lastSubmittedLang
      }, '*');
    } else if (this._plUrl.includes('/submit/') && !this._plUrl.includes('/submissions/')) {
      lastActionType = 'submit';
      try {
        const parsed = typeof body === 'string' ? JSON.parse(body) : body;
        if (parsed?.typed_code) {
          lastSubmittedCode = parsed.typed_code;
          lastSubmittedLang = parsed.lang || 'python3';
        }
      } catch (e) {}
      window.postMessage({
        type: 'PACED_CODE_SUBMITTED',
        code: lastSubmittedCode,
        lang: lastSubmittedLang
      }, '*');
    }

    this.addEventListener('load', function () {
      if (this._plUrl.includes('/submissions/detail/') && this._plUrl.includes('/check/')) {
        try {
          const data = JSON.parse(this.responseText);
          handleCheckPayload(this._plUrl, data);
        } catch (e) {}
      }
    });

    return originalSend.call(this, body);
  };

  // Poll Monaco markers & cursor position periodically when user is editing
  let lastMarkerSignature = '';
  setInterval(() => {
    try {
      const monaco = window.monaco;
      if (!monaco?.editor) return;
      const models = monaco.editor.getModels?.();
      if (models && models.length > 0) {
        const val = models[0].getValue?.();
        if (val) lastSubmittedCode = val;
      }
      const markers = monaco.editor.getModelMarkers?.({}) || [];
      const errors = markers.filter((m) => m.severity >= 8); // Error severity in Monaco
      const sig = errors.map((e) => `${e.startLineNumber}:${e.message}`).join('|');
      if (sig !== lastMarkerSignature) {
        lastMarkerSignature = sig;
        if (errors.length > 0) {
          window.postMessage({
            type: 'PACED_EDITOR_DIAGNOSTIC',
            line: errors[0].startLineNumber,
            message: errors[0].message,
            count: errors.length
          }, '*');
        }
      }
    } catch (e) {}
  }, 2200);

  // Direct on-demand code hook
  window.addEventListener('message', (event) => {
    if (event.data?.type === 'PACED_GET_MONACO_CODE') {
      snapshotMonacoCode();
      window.postMessage({
        type: 'PACED_MONACO_CODE_RESPONSE',
        code: lastSubmittedCode || '',
        lang: lastSubmittedLang || 'python3'
      }, '*');
    }
  });
})();
