import './style.css';
import { supabase } from './lib/supabase.js';

class TextDecrypter {
  constructor(element) {
    this.element = element;
    this.targetText = element.innerText;
    this.chars = '!<>-_\\/[]{}—=+*^?#________';
    this.iteration = 0;
    this.frameId = null;
    this.startTime = null;
    this.duration = 0;
    this.elapsedAtPause = 0;
    this.isPaused = false;

    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.pause();
      } else {
        this.resume();
      }
    });
  }

  pause() {
    if (this.frameId && !this.isPaused) {
      this.isPaused = true;
      this.elapsedAtPause += performance.now() - this.startTime;
      cancelAnimationFrame(this.frameId);
    }
  }

  resume() {
    if (this.isPaused) {
      this.isPaused = false;
      this.startTime = performance.now();
      this.animate();
    }
  }

  decrypt(duration = 2000) {
    this.iteration = 0;
    this.startTime = performance.now();
    this.duration = duration;
    this.animate();
  }

  animate() {
    if (this.isPaused) return;

    const currentElapsed = performance.now() - this.startTime;
    const totalElapsed = this.elapsedAtPause + currentElapsed;
    const progress = Math.min(1, totalElapsed / this.duration);
    
    this.iteration = progress * this.targetText.length;

    this.element.innerText = this.targetText
      .split('')
      .map((char, index) => {
        if (index < this.iteration) {
          return this.targetText[index];
        }
        return this.chars[Math.floor(Math.random() * this.chars.length)];
      })
      .join('');

    if (progress >= 1) {
      this.element.innerText = this.targetText;
      this.onComplete();
      return;
    }

    this.frameId = requestAnimationFrame(() => this.animate());
  }

  onComplete() {
    const buttonContainer = document.querySelector('#button-container');
    if (buttonContainer) {
      setTimeout(() => {
        buttonContainer.classList.add('visible');
      }, 300);
    }
  }
}

document.addEventListener('DOMContentLoaded', () => {
  // DOM Elements (Selected inside for safety)
  const heroView = document.querySelector('#hero-view');
  const systemView = document.querySelector('#system-view');
  const databaseView = document.querySelector('#database-view');
  const ctaButton = document.querySelector('#cta-button');
  const authButton = document.querySelector('#auth-button');
  const apiKeyInput = document.querySelector('#api-key-input');
  const authStatus = document.querySelector('#auth-status');
  const tablesGrid = document.querySelector('#tables-grid');
  const statTablesCount = document.querySelector('#stat-tables-count');
  const disconnectButton = document.querySelector('#disconnect-button');
  const analysisInput = document.querySelector('#analysis-input');
  const analyzeButton = document.querySelector('#analyze-button');
  const starBorderContainer = document.querySelector('.star-border-container');
  const neuralOverlay = document.querySelector('#neural-overlay');
  const neuralStatusText = document.querySelector('#neural-status-text');
  const aiOutputModal = document.querySelector('#ai-output-modal');
  const aiOutputText = document.querySelector('#ai-output-text');
  const closeModalBtn = document.querySelector('#close-modal-btn');

  function showStatus(msg, type) {
    if (!authStatus) return;
    authStatus.textContent = msg;
    authStatus.className = `status-msg ${type}`;
    if (type === 'error') {
       // Only clear if another message hasn't overwritten it
       setTimeout(() => {
         if (authStatus.textContent === msg) authStatus.textContent = '';
       }, 6000);
    }
  }

  async function validateApiKey(key) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 12000); 

    try {
      const response = await fetch('http://127.0.0.1:8000/api/save-key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey: key }),
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      const data = await response.json();
      return { ok: response.ok && !data.error, error: data.error };
    } catch (e) {
      clearTimeout(timeoutId);
      return { ok: false, error: e.name === 'AbortError' ? 'Neural Link Timed Out.' : 'Backend Origin Offline.' };
    }
  }

  function navigateToDatabase() {
    const currentView = !heroView.classList.contains('hidden') ? heroView : systemView;
    currentView.classList.add('fade-out');
    
    setTimeout(() => {
      currentView.classList.add('hidden');
      databaseView.classList.remove('hidden');

      requestAnimationFrame(() => {
        databaseView.classList.add('visible');
        fetchDatabaseInfo();
      });
    }, 800);
  }

  async function performAnalysis() {
    const query = analysisInput.value.trim();
    if (!query) return;

    const originalPlaceholder = analysisInput.placeholder;
    analysisInput.disabled = true;
    analyzeButton.disabled = true;
    analysisInput.value = '';
    analysisInput.placeholder = `Neural Trace: Analyzing "${query}"...`;

    starBorderContainer.classList.add('analyzing');
    analysisInput.classList.add('hidden');
    analyzeButton.classList.add('hidden');
    neuralOverlay.classList.remove('hidden');

    const statusMessages = [
      'TRACING PATHS...', 'DECRYPTING HASHES...', 'NEURAL MAPPING...', 'SYNTHESIZING DATA...', 'ESTABLISHING LINK...'
    ];
    let statusIndex = 0;
    const statusInterval = setInterval(() => {
      statusIndex = (statusIndex + 1) % statusMessages.length;
      if (neuralStatusText) neuralStatusText.textContent = statusMessages[statusIndex];
    }, 800);

    try {
      const response = await fetch('http://127.0.0.1:8000/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: query })
      });
      
      const data = await response.json();
      
      if (data.error) {
         if (data.error === 'API_EXHAUSTED') {
             localStorage.removeItem('fraudtrace_gemini_api_key');
             apiKeyInput.value = '';
             returnToSystemView('API link expired. Please re-authenticate.');
         } else {
             analysisInput.placeholder = "Trace Failed: Backend Error";
         }
      } else {
         analysisInput.placeholder = originalPlaceholder;
         aiOutputText.textContent = data.response;
         aiOutputModal.classList.remove('hidden');
         setTimeout(() => aiOutputModal.classList.add('visible'), 10);
      }
    } catch (error) {
      analysisInput.placeholder = "Trace Interrupted: Connection Failed";
    }

    clearInterval(statusInterval);
    starBorderContainer.classList.remove('analyzing');
    analysisInput.classList.remove('hidden');
    analyzeButton.classList.remove('hidden');
    neuralOverlay.classList.add('hidden');
    analysisInput.disabled = false;
    analyzeButton.disabled = false;
  }

  async function fetchDatabaseInfo() {
    if (!tablesGrid) return;
    try {
      const mockTables = [
        { name: 'transactions', rows: 12402, status: 'Synced', last_trace: '2m ago' },
        { name: 'user_profiles', rows: 8521, status: 'Active', last_trace: '15m ago' },
        { name: 'fraud_alerts', rows: 432, status: 'Linked', last_trace: 'Now' },
        { name: 'neural_logs', rows: 98201, status: 'Tracking', last_trace: '1s ago' },
        { name: 'api_security', rows: 321, status: 'Active', last_trace: '1h ago' },
        { name: 'trace_history', rows: 45032, status: 'Archived', last_trace: '1d ago' },
      ];
      setTimeout(() => renderDatabaseView(mockTables), 1500);
    } catch (error) {
      tablesGrid.innerHTML = '<div class="status-msg error">Trace Interrupted.</div>';
    }
  }

  function renderDatabaseView(tables) {
    if (!tablesGrid) return;
    tablesGrid.innerHTML = '';
    statTablesCount.textContent = tables.length;
    tables.forEach(table => {
      const card = document.createElement('div');
      card.className = 'table-card';
      card.innerHTML = `
        <div class="table-name">${table.name}</div>
        <div class="table-meta">
          <div class="meta-row"><span>Rows</span><span>${table.rows.toLocaleString()}</span></div>
          <div class="meta-row"><span>Status</span><span>${table.status}</span></div>
          <div class="meta-row"><span>Last Trace</span><span>${table.last_trace}</span></div>
        </div>
      `;
      tablesGrid.appendChild(card);
    });
  }

  function returnToSystemView(errorMessage) {
    databaseView.classList.remove('visible');
    setTimeout(() => {
      databaseView.classList.add('hidden');
      systemView.classList.remove('hidden');
      systemView.classList.remove('fade-out');
      requestAnimationFrame(() => {
        systemView.classList.add('visible');
        if (errorMessage) showStatus(errorMessage, 'error');
      });
    }, 800);
  }

  // Hero Logic
  const heroElement = document.querySelector('#hero-text');
  if (heroElement) {
    const decrypter = new TextDecrypter(heroElement);
    heroElement.classList.add('reveal-fade');
    decrypter.decrypt();
  }

  // CTA Link Logic with saved key validation
  if (ctaButton) {
    ctaButton.addEventListener('click', async () => {
      const savedKey = localStorage.getItem('fraudtrace_gemini_api_key');
      if (savedKey) {
        ctaButton.innerText = 'CHECKING SYNC...';
        ctaButton.disabled = true;
        const result = await validateApiKey(savedKey);
        if (result.ok) {
          navigateToDatabase();
        } else {
          localStorage.removeItem('fraudtrace_gemini_api_key');
          heroView.classList.add('fade-out');
          setTimeout(() => {
            heroView.classList.add('hidden');
            systemView.classList.remove('hidden');
            requestAnimationFrame(() => systemView.classList.add('visible'));
            showStatus('Stored link invalid. Please re-authenticate.', 'error');
          }, 800);
        }
        ctaButton.innerText = 'ENTER SYSTEM';
        ctaButton.disabled = false;
      } else {
        heroView.classList.add('fade-out');
        setTimeout(() => {
          heroView.classList.add('hidden');
          systemView.classList.remove('hidden');
          requestAnimationFrame(() => systemView.classList.add('visible'));
        }, 800);
      }
    });
  }

  // Auth Button Logic with deep validation
  if (authButton && apiKeyInput) {
    const savedKey = localStorage.getItem('fraudtrace_gemini_api_key');
    if (savedKey) {
      apiKeyInput.value = savedKey;
      showStatus('Neural link cached.', 'info');
    }

    authButton.addEventListener('click', async () => {
      const key = apiKeyInput.value.trim();
      if (!key) {
        showStatus('Provide Neural Key.', 'error');
        return;
      }

      showStatus('Validating Neural Link...', 'info');
      authButton.disabled = true;
      
      const result = await validateApiKey(key);
      
      if (result.ok) {
        localStorage.setItem('fraudtrace_gemini_api_key', key);
        showStatus('Link Active. Access Granted.', 'success');
        setTimeout(() => {
          navigateToDatabase();
          authButton.disabled = false;
        }, 1200);
      } else {
        showStatus(result.error || 'Authentication Failed.', 'error');
        authButton.disabled = false;
      }
    });
  }

  if (disconnectButton) {
    disconnectButton.addEventListener('click', () => {
      localStorage.removeItem('fraudtrace_gemini_api_key');
      location.reload();
    });
  }

  if (analyzeButton && analysisInput) {
    analyzeButton.addEventListener('click', performAnalysis);
    analysisInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') performAnalysis();
    });
  }

  if (closeModalBtn) {
    closeModalBtn.addEventListener('click', () => {
      aiOutputModal.classList.remove('visible');
      setTimeout(() => aiOutputModal.classList.add('hidden'), 500);
    });
  }
});
