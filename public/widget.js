(function initMirageFeedback() {
  if (window.__mirageFeedbackLoaded) return;
  window.__mirageFeedbackLoaded = true;

  // --- CONFIG ---
  const BUTTON_SIZE = 56;
  const BUTTON_ICON = `<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>`;
  const CLOSE_ICON = `<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>`;
  const OVERLAY_ID = '__mirage_feedback_overlay';
  const BUTTON_ID = '__mirage_feedback_btn';
  const BANNER_ID = '__mirage_feedback_banner';
  const MODAL_ID = '__mirage_feedback_modal';
  const STYLE_ID = '__mirage_feedback_style';

  // --- CSS ---
  const css = `
    #${BUTTON_ID} {
      position: fixed;
      bottom: 24px;
      right: 24px;
      width: ${BUTTON_SIZE}px;
      height: ${BUTTON_SIZE}px;
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

  // --- STYLE INJECTION ---
  if (!document.getElementById(STYLE_ID)) {
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.innerHTML = css;
    document.head.appendChild(style);
  }

  // --- BUTTON ---
  let feedbackMode = false;
  let overlay, banner, modal, lastClickTarget;

  function createButton() {
    let btn = document.getElementById(BUTTON_ID);
    if (btn) return btn;
    btn = document.createElement('button');
    btn.id = BUTTON_ID;
    btn.type = 'button';
    btn.innerHTML = BUTTON_ICON;
    btn.setAttribute('aria-label', 'Leave feedback');
    btn.onclick = toggleFeedbackMode;
    document.body.appendChild(btn);
    return btn;
  }

  function toggleFeedbackMode() {
    feedbackMode = !feedbackMode;
    const btn = document.getElementById(BUTTON_ID);
    if (!btn) return;
    if (feedbackMode) {
      btn.innerHTML = CLOSE_ICON;
      btn.setAttribute('aria-label', 'Close feedback');
      enterFeedbackMode();
    } else {
      btn.innerHTML = BUTTON_ICON;
      btn.setAttribute('aria-label', 'Leave feedback');
      exitFeedbackMode();
    }
  }

  // --- FEEDBACK MODE ---
  function enterFeedbackMode() {
    // Overlay
    overlay = document.createElement('div');
    overlay.id = OVERLAY_ID;
    overlay.onclick = onOverlayClick;
    document.body.appendChild(overlay);
    // Banner
    banner = document.createElement('div');
    banner.id = BANNER_ID;
    banner.textContent = 'Click anywhere to leave a comment.';
    document.body.appendChild(banner);
    // Cursor
    document.body.style.cursor = 'crosshair';
    // Trap tab focus
    document.addEventListener('keydown', trapTab, true);
  }

  function exitFeedbackMode() {
    if (overlay) overlay.remove();
    if (banner) banner.remove();
    if (modal) modal.remove();
    overlay = banner = modal = null;
    document.body.style.cursor = '';
    document.removeEventListener('keydown', trapTab, true);
  }

  // --- OVERLAY CLICK ---
  function onOverlayClick(e) {
    if (modal) return; // Only one modal at a time
    // Don't trigger if clicking the button itself
    const btn = document.getElementById(BUTTON_ID);
    if (btn && (e.target === btn || btn.contains(e.target))) return;
    // Find the element under the click (ignoring overlay)
    overlay.style.pointerEvents = 'none';
    const el = document.elementFromPoint(e.clientX, e.clientY);
    overlay.style.pointerEvents = '';
    if (!el || el.id === OVERLAY_ID) return;
    lastClickTarget = el;
    showModalAt(e.clientX, e.clientY);
  }

  // --- MODAL ---
  function showModalAt(x, y) {
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
      const selector = getUniqueSelector(lastClickTarget);
      sendFeedback(selector, comment);
      modal.remove();
      modal = null;
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

  // --- TAB TRAP (keep focus in modal) ---
  function trapTab(e) {
    if (!modal) return;
    if (e.key === 'Tab') {
      const focusables = modal.querySelectorAll('textarea,button');
      if (!focusables.length) return;
      const first = focusables[0], last = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        last.focus();
        e.preventDefault();
      } else if (!e.shiftKey && document.activeElement === last) {
        first.focus();
        e.preventDefault();
      }
    }
    if (e.key === 'Escape') {
      if (modal) { modal.remove(); modal = null; }
    }
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
    // Use the injected Mirage WebSocket connection
    const payload = {
      type: 'feedback',
      data: {
        selector,
        comment,
        path: window.location.pathname
      }
    };
    if (window.Mirage && window.Mirage.socket && window.Mirage.socket.readyState === 1) {
      window.Mirage.socket.send(JSON.stringify(payload));
    } else {
      const msg = 'Mirage feedback connection not ready.';
      if (window.Mirage && window.Mirage.socket) {
        console.error(msg);
      } else {
        alert(msg);
      }
    }
  }

  // --- INIT ---
  createButton();

  // Expose for manual re-init
  window.initMirageFeedback = initMirageFeedback;
})(); 
