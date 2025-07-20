// Mirage Feedback Widget - Clean, Human-Written Version
(function () {
  'use strict';

  // --- PRE-FLIGHT CHECK: Don't run if already initialized ---
  if (document.getElementById('__mirage_feedback_container')) {
    return;
  }

  // --- STATE ---
  let isInFeedbackMode = false;
  let lastClickedElement = null;

  // --- CSS STYLES ---
  const styles = `
    #__mirage_feedback_container * { box-sizing: border-box; }
    #__mirage_feedback_button { position: fixed; bottom: 20px; right: 20px; width: 50px; height: 50px; background: #2c3e50; color: white; border-radius: 50%; border: none; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 12px rgba(0,0,0,0.2); cursor: pointer; z-index: 999999998; transition: transform 0.2s, background 0.2s; }
    #__mirage_feedback_button:hover { background: #34495e; }
    #__mirage_feedback_button.active { transform: scale(0.9); background: #c0392b; }
        #__mirage_feedback_overlay { 
      position: fixed; 
      inset: 0; 
      background: rgba(100, 116, 139, 0.4); 
      z-index: 999999997; 
      cursor: crosshair;
      pointer-events: none; /* <-- THE MAGIC BULLET */
    }
    #__mirage_feedback_banner { position: fixed; top: 0; left: 50%; transform: translateX(-50%); background: #2c3e50; color: white; padding: 8px 20px; border-radius: 0 0 8px 8px; font-family: sans-serif; font-size: 14px; z-index: 999999999; }
    #__mirage_feedback_modal { display: none; position: fixed; width: 280px; background: white; border-radius: 8px; box-shadow: 0 4px 20px rgba(0,0,0,0.25); z-index: 999999999; padding: 16px; font-family: sans-serif; }
    #__mirage_feedback_modal.visible { display: flex; flex-direction: column; gap: 10px; }
    #__mirage_feedback_modal textarea { border: 1px solid #cbd5e1; border-radius: 6px; padding: 8px; min-height: 70px; resize: vertical; font-size: 14px; }
    #__mirage_feedback_modal textarea:focus { outline: none; border-color: #3b82f6; }
    #__mirage_feedback_modal button { background: #3b82f6; color: white; border: none; border-radius: 6px; padding: 8px 12px; font-size: 14px; cursor: pointer; align-self: flex-end; }
  `;

  // --- HTML STRUCTURE ---
  const container = document.createElement('div');
  container.id = '__mirage_feedback_container';
  container.innerHTML = `
    <style>${styles}</style>
    <button id="__mirage_feedback_button" title="Leave Feedback">
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
    </button>
    <div id="__mirage_feedback_modal">
      <textarea placeholder="Your feedback..."></textarea>
      <button>Send</button>
    </div>
  `;
  document.body.appendChild(container);
  
  // --- ELEMENT REFERENCES ---
  const feedbackButton = document.getElementById('__mirage_feedback_button');
  const modal = document.getElementById('__mirage_feedback_modal');
  const modalTextarea = modal.querySelector('textarea');
  const modalSendButton = modal.querySelector('button');
  let overlay = null;
  let banner = null;

  // --- CORE LOGIC ---
  function enterFeedbackMode() {
    if (isInFeedbackMode) return;
    isInFeedbackMode = true;
    feedbackButton.classList.add('active');

    // Create and show overlay
    overlay = document.createElement('div');
    overlay.id = '__mirage_feedback_overlay';
    document.body.appendChild(overlay);

    // Create and show banner
    banner = document.createElement('div');
    banner.id = '__mirage_feedback_banner';
    banner.textContent = 'Click to select an element';
    document.body.appendChild(banner);

    // Listen for the next click on the document
    document.addEventListener('click', handleDocumentClick, true);
  }

  function exitFeedbackMode() {
    if (!isInFeedbackMode) return;
    isInFeedbackMode = false;
    feedbackButton.classList.remove('active');
    
    // Hide modal and clean up
    modal.classList.remove('visible');
    overlay.remove();
    banner.remove();
    overlay = null;
    banner = null;
    
    document.removeEventListener('click', handleDocumentClick, true);
  }

  function handleDocumentClick(event) {
    // Stop if we click the button or the modal itself
    if (event.target === feedbackButton || modal.contains(event.target)) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();

    lastClickedElement = event.target;
    showModal(event.clientX, event.clientY);
  }

  function showModal(x, y) {
    // Position modal near the click
    modal.style.left = `${Math.min(x, window.innerWidth - 290)}px`;
    modal.style.top = `${Math.min(y, window.innerHeight - 150)}px`;
    modal.classList.add('visible');
    modalTextarea.value = '';
    modalTextarea.focus();
  }

  function sendFeedback() {
    const comment = modalTextarea.value.trim();
    if (!comment || !lastClickedElement) {
      return;
    }

    if (!window.Mirage || !window.Mirage.socket || window.Mirage.socket.readyState !== 1) {
      console.error('Mirage: Feedback connection not available.');
      alert('Could not send feedback. Connection lost.');
      return;
    }

    const selector = getCssSelector(lastClickedElement);
    const payload = {
      type: 'feedback',
      data: {
        selector: selector,
        comment: comment,
        path: window.location.pathname
      }
    };
    
    console.log('[Mirage] Sending feedback:', payload);
    window.Mirage.socket.send(JSON.stringify(payload));
    
    // Clean up after sending
    exitFeedbackMode();
  }

  function getCssSelector(el) {
    if (!(el instanceof Element)) return;
    const path = [];
    while (el.nodeType === Node.ELEMENT_NODE) {
      let selector = el.nodeName.toLowerCase();
      if (el.id) {
        selector += '#' + el.id;
        path.unshift(selector);
        break;
      } else {
        let sib = el, nth = 1;
        while (sib = sib.previousElementSibling) {
          if (sib.nodeName.toLowerCase() == selector) nth++;
        }
        if (nth != 1) selector += ":nth-of-type("+nth+")";
      }
      path.unshift(selector);
      el = el.parentNode;
    }
    return path.join(" > ");
  }

  // --- EVENT BINDING ---
  feedbackButton.addEventListener('click', (e) => {
    e.stopPropagation();
    isInFeedbackMode ? exitFeedbackMode() : enterFeedbackMode();
  });
  
  modalSendButton.addEventListener('click', sendFeedback);

  // --- DEVELOPER REPLY TOAST ---
  if (window.Mirage && window.Mirage.socket) {
    window.Mirage.socket.addEventListener('message', function (event) {
      console.log('[Mirage] Raw message received:', event.data); // DEBUG LOG
      let msg;
      try {
        msg = JSON.parse(event.data);
      } catch (e) {
        return;
      }
      if (msg && msg.type === 'developer-reply' && msg.data && msg.data.message) {
        showDeveloperToast(msg.data.message);
      }
    });
  }

  function showDeveloperToast(message) {
    const toast = document.createElement('div');
    toast.textContent = message;
    toast.style.position = 'fixed';
    toast.style.bottom = '32px';
    toast.style.left = '50%';
    toast.style.transform = 'translateX(-50%)';
    toast.style.background = 'rgba(30, 41, 59, 0.98)';
    toast.style.color = '#fff';
    toast.style.padding = '14px 28px';
    toast.style.borderRadius = '10px';
    toast.style.fontSize = '1rem';
    toast.style.fontFamily = 'inherit';
    toast.style.boxShadow = '0 4px 24px rgba(0,0,0,0.18)';
    toast.style.zIndex = '2147483647';
    toast.style.opacity = '1';
    toast.style.transition = 'opacity 0.5s';
    toast.style.display = 'flex';
    toast.style.alignItems = 'center';
    toast.style.gap = '16px';

    // Add close button
    const closeBtn = document.createElement('button');
    closeBtn.textContent = '×';
    closeBtn.style.background = 'transparent';
    closeBtn.style.border = 'none';
    closeBtn.style.color = '#fff';
    closeBtn.style.fontSize = '1.5rem';
    closeBtn.style.cursor = 'pointer';
    closeBtn.style.marginLeft = '8px';
    closeBtn.setAttribute('aria-label', 'Close');
    closeBtn.onclick = () => {
      toast.style.opacity = '0';
      setTimeout(() => toast.remove(), 600);
    };
    toast.appendChild(closeBtn);

    document.body.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      setTimeout(() => toast.remove(), 600);
    }, 12000); // 12 seconds
  }

})();
