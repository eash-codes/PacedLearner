/**
 * PacedLearner LeetCode Network & Monaco Interceptor
 * Runs in the webpage MAIN world to capture exact submissions, code, test results, and runtime errors.
 */

(() => {
  if (window.__pacedLearnerInterceptorInjected) return;
  window.__pacedLearnerInterceptorInjected = true;

  let lastSubmittedCode = '';
  let lastSubmittedLang = '';
  let lastQuestionId = '';

  // Intercept fetch
  const originalFetch = window.fetch;
  window.fetch = async function (...args) {
    const url = typeof args[0] === 'string' ? args[0] : (args[0]?.url || '');

    // 1. Intercept code submission initiation: /submit/
    if (url.includes('/submit/')) {
      try {
        const body = args[1]?.body;
        if (body) {
          const parsed = typeof body === 'string' ? JSON.parse(body) : body;
          if (parsed.typed_code) {
            lastSubmittedCode = parsed.typed_code;
            lastSubmittedLang = parsed.lang || 'python3';
            lastQuestionId = parsed.question_id || '';

            window.postMessage({
              type: 'PACED_CODE_SUBMITTED',
              code: lastSubmittedCode,
              lang: lastSubmittedLang,
              questionId: lastQuestionId
            }, '*');
          }
        }
      } catch (e) {
        console.warn('[PacedLearner] Failed to parse submit body:', e);
      }
    }

    const response = await originalFetch.apply(this, args);

    // 2. Intercept submission evaluation result: /check/
    if (url.includes('/submissions/detail/') && url.includes('/check/')) {
      try {
        const clone = response.clone();
        clone.json().then(data => {
          if (data && data.state === 'SUCCESS') {
            window.postMessage({
              type: 'PACED_SUBMISSION_CHECK_RESULT',
              result: {
                ...data,
                submittedCode: lastSubmittedCode || data.code || '',
                submittedLang: lastSubmittedLang || data.lang || 'python3'
              }
            }, '*');
          }
        }).catch(() => {});
      } catch (e) {}
    }

    return response;
  };

  // Intercept XMLHttpRequest as fallback
  const originalOpen = XMLHttpRequest.prototype.open;
  const originalSend = XMLHttpRequest.prototype.send;

  XMLHttpRequest.prototype.open = function (method, url, ...rest) {
    this._plUrl = url;
    this._plMethod = method;
    return originalOpen.call(this, method, url, ...rest);
  };

  XMLHttpRequest.prototype.send = function (body) {
    if (this._plUrl && this._plUrl.includes('/submit/') && body) {
      try {
        const parsed = typeof body === 'string' ? JSON.parse(body) : body;
        if (parsed.typed_code) {
          lastSubmittedCode = parsed.typed_code;
          lastSubmittedLang = parsed.lang || 'python3';
          window.postMessage({
            type: 'PACED_CODE_SUBMITTED',
            code: lastSubmittedCode,
            lang: lastSubmittedLang
          }, '*');
        }
      } catch (e) {}
    }

    this.addEventListener('load', function () {
      if (this._plUrl && this._plUrl.includes('/submissions/detail/') && this._plUrl.includes('/check/')) {
        try {
          const data = JSON.parse(this.responseText);
          if (data && data.state === 'SUCCESS') {
            window.postMessage({
              type: 'PACED_SUBMISSION_CHECK_RESULT',
              result: {
                ...data,
                submittedCode: lastSubmittedCode || data.code || '',
                submittedLang: lastSubmittedLang || data.lang || 'python3'
              }
            }, '*');
          }
        } catch (e) {}
      }
    });

    return originalSend.call(this, body);
  };

  // Provide direct hook for reading Monaco editor code on demand
  window.addEventListener('message', (event) => {
    if (event.data?.type === 'PACED_GET_MONACO_CODE') {
      let code = '';
      try {
        const model = window.monaco?.editor?.getModels()?.[0];
        if (model) code = model.getValue();
      } catch (e) {}

      window.postMessage({
        type: 'PACED_MONACO_CODE_RESPONSE',
        code: code || lastSubmittedCode || '',
        lang: lastSubmittedLang || ''
      }, '*');
    }
  });

  console.log('[PacedLearner] Interceptor active in page context');
})();
