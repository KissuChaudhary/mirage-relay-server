// Mirage Feedback Widget
(function MirageFeedbackWidget() {
  // --- CONFIG ---
  const BUTTON_ID = '__mirage_feedback_btn';
  const OVERLAY_ID = '__mirage_feedback_overlay';
  const BANNER_ID = '__mirage_feedback_banner';
  const MODAL_ID = '__mirage_feedback_modal';
  const STYLE_ID = '__mirage_feedback_style';
  let feedbackMode = false;
  let lastClickTarget = null;

  // --- CSS ---
  const css = `
    #${BUTTON_ID} {
      position: fixed;
      bottom: 24px;
      right: 24px;
      width: 56px;
      height: 56px;
      border-radius: 50%;
      background: #18181b;
      color: #fff;
      box-shadow: 0 2px 12px rgba(0,0,0,0.18);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 2147483646;
      cursor: pointer;
      transition: background 0.2s;
      border: none;
      outline: none;
      font-size: 28px;
    }
    #${BUTTON_ID}:hover {
      background: #27272a;
    }
    #${OVERLAY_ID} {
      position: fixed;
      inset: 0;
      background: rgba(30, 41, 59, 0.25);
      z-index: 2147483645;
      cursor: crosshair;
      transition: background 0.2s;
    }
    #${BANNER_ID} {
      position: fixed;
      top: 0;
      left: 50%;
      transform: translateX(-50%);
      background: #18181b;
      color: #fff;
      padding: 10px 28px;
      border-radius: 0 0 12px 12px;
      font-size: 1rem;
      font-family: inherit;
      z-index: 2147483647;
      box-shadow: 0 2px 8px rgba(0,0,0,0.08);
      pointer-events: none;
      letter-spacing: 0.01em;
    }
    #${MODAL_ID} {
      position: fixed;
      min-width: 260px;
      max-width: 90vw;
      background: #fff;
      color: #18181b;
      border-radius: 12px;
      box-shadow: 0 4px 32px rgba(0,0,0,0.18);
      z-index: 2147483648;
      padding: 18px 16px 12px 16px;
      display: flex;
      flex-direction: column;
      gap: 10px;
      font-family: inherit;
      animation: mirage-fadein 0.18s;
    }
    #${MODAL_ID} textarea {
      width: 100%;
      min-height: 60px;
      max-height: 180px;
      resize: vertical;
      border-radius: 8px;
      border: 1px solid #e5e7eb;
      padding: 8px;
      font-size: 1rem;
      font-family: inherit;
      background: #f9fafb;
      color: #18181b;
      outline: none;
      transition: border 0.2s;
    }
    #${MODAL_ID} textarea:focus {
      border: 1.5px solid #6366f1;
    }
    #${MODAL_ID} button {
      align-self: flex-end;
      background: #6366f1;
      color: #fff;
      border: none;
      border-radius: 6px;
      padding: 7px 18px;
      font-size: 1rem;
      font-family: inherit;
      cursor: pointer;
      transition: background 0.18s;
    }
    #${MODAL_ID} button:hover {
      background: #4f46e5;
    }
    @keyframes mirage-fadein {
      from { opacity: 0; transform: scale(0.98); }
      to { opacity: 1; transform: scale(1); }
    }
    @media (max-width: 600px) {
      #${BUTTON_ID} { bottom: 16px; right: 16px; width: 48px; height: 48px; }
      #${BANNER_ID} { font-size: 0.95rem; padding: 8px 10px; }
      #${MODAL_ID} { min-width: 180px; padding: 12px 8px 8px 8px; }
    }
  `;

  // --- CSS INJECTION ---
  if (!document.getElementById(STYLE_ID)) {
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.innerHTML = css;
    document.head.appendChild(style);
  }

  // --- HTML ELEMENTS ---
  // Floating feedback button
  let button = document.getElementById(BUTTON_ID);
  if (!button) {
    button = document.createElement('button');
    button.id = BUTTON_ID;
    button.type = 'button';
    button.innerHTML = '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>';
    button.setAttribute('aria-label', 'Leave feedback');
    document.body.appendChild(button);
  }

  // Overlay (created on demand)
  let overlay = null;
  // Banner (created on demand)
  let banner = null;
  // Modal (created on demand)
  let modal = null;

  // --- EVENT LISTENERS ---
  button.addEventListener('click', toggleFeedbackMode);

  function toggleFeedbackMode() {
    if (feedbackMode) {
      exitFeedbackMode();
    } else {
      enterFeedbackMode();
    }
  }

  function enterFeedbackMode() {
    feedbackMode = true;
    // Overlay
    overlay = document.createElement('div');
    overlay.id = OVERLAY_ID;
    document.body.appendChild(overlay);
    // Banner
    banner = document.createElement('div');
    banner.id = BANNER_ID;
    banner.textContent = 'Click anywhere to leave a comment.';
    document.body.appendChild(banner);
    // Cursor
    document.body.style.cursor = 'crosshair';
    // Listen for clicks
    document.addEventListener('click', onDocumentClick, true);
  }

  function exitFeedbackMode() {
    feedbackMode = false;
    if (overlay) overlay.remove();
    if (banner) banner.remove();
    if (modal) modal.remove();
    overlay = banner = modal = null;
    document.body.style.cursor = '';
    document.removeEventListener('click', onDocumentClick, true);
    lastClickTarget = null;
  }

  // --- CLICK HANDLER IN FEEDBACK MODE ---
  function onDocumentClick(e) {
    // Only act if overlay is present (feedback mode)
    if (!overlay) return;
    // Prevent default (no link following, etc.)
    e.preventDefault();
    e.stopPropagation();
    // Don't trigger if clicking the button itself
    if (button && (e.target === button || button.contains(e.target))) return;
    // Show modal at click position
    lastClickTarget = e.target;
    showModalAt(e.clientX, e.clientY);
  }

  // --- MODAL CREATION ---
  function showModalAt(x, y) {
    if (modal) modal.remove();
    modal = document.createElement('div');
    modal.id = MODAL_ID;
    modal.innerHTML = `
      <textarea placeholder='Leave your comment...' autofocus></textarea>
      <button type='button'>Send</button>
    `;
    document.body.appendChild(modal);
    // Position modal (avoid overflow)
    const rect = modal.getBoundingClientRect();
    let left = x, top = y;
    if (left + rect.width > window.innerWidth - 12) left = window.innerWidth - rect.width - 12;
    if (top + rect.height > window.innerHeight - 12) top = window.innerHeight - rect.height - 12;
    modal.style.left = left + 'px';
    modal.style.top = top + 'px';
    // Focus textarea
    const textarea = modal.querySelector('textarea');
    if (textarea) textarea.focus();
    // Send button
    const sendBtn = modal.querySelector('button');
    sendBtn.onclick = () => {
      const comment = textarea.value.trim();
      if (!comment) {
        textarea.focus();
        return;
      }
      if (!lastClickTarget) {
        alert('No element selected for feedback.');
        return;
      }
      const selector = getUniqueSelector(lastClickTarget);
      // --- DEBUG LOG ---
      console.log('[Mirage Feedback] Selector:', selector);
      console.log('[Mirage Feedback] Comment:', comment);
      // --- SEND FEEDBACK ---
      sendFeedback(selector, comment);
      // Hide modal and exit feedback mode
      exitFeedbackMode();
    };
    // Escape closes modal
    modal.addEventListener('keydown', (ev) => {
      if (ev.key === 'Escape') {
        modal.remove();
        modal = null;
      }
    });
    // Prevent overlay click from closing modal
    modal.onclick = (ev) => ev.stopPropagation();
  }

  // --- CSS SELECTOR GENERATOR ---
  function getUniqueSelector(el) {
    if (!el) return '';
    if (el.id) return `#${el.id}`;
    let path = [];
    while (el && el.nodeType === 1 && el !== document.body) {
      let selector = el.nodeName.toLowerCase();
      if (el.className && typeof el.className === 'string') {
        const classes = el.className.trim().split(/\s+/).filter(Boolean);
        if (classes.length) selector += '.' + classes.join('.');
      }
      const siblings = Array.from(el.parentNode.children).filter(n => n.nodeName === el.nodeName);
      if (siblings.length > 1) {
        const idx = siblings.indexOf(el) + 1;
        selector += `:nth-of-type(${idx})`;
      }
      path.unshift(selector);
      el = el.parentNode;
    }
    return path.length ? path.join(' > ') : '';
  }

  // --- SEND FEEDBACK ---
  function sendFeedback(selector, comment) {
    if (!window.Mirage || !window.Mirage.socket || window.Mirage.socket.readyState !== 1) {
      alert('Mirage feedback connection not ready.');
      return;
    }
    const payload = {
      type: 'feedback',
      data: {
        selector,
        comment,
        path: window.location.pathname
      }
    };
    window.Mirage.socket.send(JSON.stringify(payload));
  }

  // --- CLEANUP ON PAGE NAVIGATION (OPTIONAL) ---
  window.addEventListener('beforeunload', exitFeedbackMode);
})(); 
