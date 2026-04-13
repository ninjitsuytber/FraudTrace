import './style.css';
import { supabase, initSupabase } from './lib/supabase.js';

let databaseSummary = "No active database link established.";

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
  const downloadReportBtn = document.querySelector('#download-report-btn');
  const dbStatus = document.querySelector('#db-connection-status');
  const statOverallHealth = document.querySelector('#stat-overall-health');
  const statLastTrace = document.querySelector('#stat-last-trace');

  const supabaseAuthView = document.querySelector('#supabase-auth-view');
  const supabaseUrlInput = document.querySelector('#supabase-url-input');
  const supabaseKeyInput = document.querySelector('#supabase-key-input');
  const supabaseAuthButton = document.querySelector('#supabase-auth-button');
  const supabaseAuthStatus = document.querySelector('#supabase-auth-status');
  const connectDbButton = document.querySelector('#connect-db-button');
  const disconnectDbButton = document.querySelector('#disconnect-db-button');
  const disconnectAiButton = document.querySelector('#disconnect-ai-button');
  const backToDbBtn = document.querySelector('#back-to-db-btn');
  const analysisPortal = document.querySelector('#analysis-portal');

  function showSupabaseStatus(msg, type) {
    if (!supabaseAuthStatus) return;
    supabaseAuthStatus.textContent = msg;
    supabaseAuthStatus.className = `status-msg ${type}`;
    if (type === 'error') {
      setTimeout(() => {
        if (supabaseAuthStatus.textContent === msg) supabaseAuthStatus.textContent = '';
      }, 6000);
    }
  }

  function showStatus(msg, type) {
    if (!authStatus) return;
    authStatus.textContent = msg;
    authStatus.className = `status-msg ${type}`;
    if (type === 'error') {
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
    const currentView = !heroView.classList.contains('hidden') ? heroView :
      (!systemView.classList.contains('hidden') ? systemView : supabaseAuthView);

    currentView.classList.add('fade-out');

    setTimeout(() => {
      currentView.classList.add('hidden');
      currentView.classList.remove('fade-out');
      currentView.classList.remove('visible');

      databaseView.classList.remove('hidden');
      requestAnimationFrame(() => {
        databaseView.classList.add('visible');
        fetchDatabaseInfo();
      });
    }, 800);
  }

  function navigateToSupabaseAuth() {
    databaseView.classList.add('fade-out');
    setTimeout(() => {
      databaseView.classList.add('hidden');
      databaseView.classList.remove('fade-out');
      databaseView.classList.remove('visible');

      supabaseAuthView.classList.remove('hidden');
      requestAnimationFrame(() => {
        supabaseAuthView.classList.add('visible');
        const savedUrl = localStorage.getItem('fraudtrace_supabase_url');
        const savedKey = localStorage.getItem('fraudtrace_supabase_key');
        if (savedUrl) supabaseUrlInput.value = savedUrl;
        if (savedKey) supabaseKeyInput.value = savedKey;
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

    const fullPrompt = `DATABASE CONTEXT:\n${databaseSummary}\n\nUSER QUERY:\n${query}`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 180000); // 180 second timeout

    try {
      const sb_url = localStorage.getItem('fraudtrace_supabase_url');
      const sb_key = localStorage.getItem('fraudtrace_supabase_key');
      
      const response = await fetch('http://127.0.0.1:8000/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          message: fullPrompt,
          supabaseUrl: sb_url,
          supabaseKey: sb_key
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);
      const data = await response.json();

      if (data.error) {
        if (data.error === 'API_EXHAUSTED') {
          localStorage.removeItem('fraudtrace_gemini_api_key');
          apiKeyInput.value = '';
          returnToSystemView('API link expired. Please re-authenticate.');
        } else {
          showAnalysisError(data.error);
        }
      } else {
        analysisInput.placeholder = originalPlaceholder;
        
        // Ensure we actually have a response before showing the modal
        if (!data.response || data.response.trim() === '') {
          aiOutputText.textContent = "[NEURAL_LINK_FAILURE] The investigator returned an empty report. Please check your system terminal for 'Context Received' logs or verify your API key.";
        } else {
          aiOutputText.textContent = data.response;
        }

        const downloadBtn = document.getElementById('download-report-btn');
        if (downloadBtn) downloadBtn.classList.remove('hidden');
        aiOutputModal.classList.remove('hidden');
        setTimeout(() => aiOutputModal.classList.add('visible'), 10);
      }
    } catch (error) {
      clearTimeout(timeoutId);
      const errorMsg = error.name === 'AbortError' 
        ? "Neural Link Timeout: The AI is taking too long to respond. Please try again or use a simpler query."
        : "Neural Link Failure: " + error.message;
      showAnalysisError(errorMsg);
    } finally {
      clearInterval(statusInterval);
      starBorderContainer.classList.remove('analyzing');
      analysisInput.classList.remove('hidden');
      analyzeButton.classList.remove('hidden');
      neuralOverlay.classList.add('hidden');
      analysisInput.disabled = false;
      analyzeButton.disabled = false;

      if (!analysisInput.placeholder.includes('Failed') && !analysisInput.placeholder.includes('Error') && !analysisInput.placeholder.includes('Timeout')) {
        analysisInput.placeholder = originalPlaceholder;
      }
    }
  }

  function showAnalysisError(msg) {
    aiOutputText.textContent = `SYSTEM ERROR DETECTED:\n\n${msg}\n\n[REASON: Gemini API under high demand or context limit exceeded. Please try again after a brief cooldown.]`;
    const downloadBtn = document.getElementById('download-report-btn');
    if (downloadBtn) downloadBtn.classList.add('hidden');
    aiOutputModal.classList.remove('hidden');
    setTimeout(() => aiOutputModal.classList.add('visible'), 10);
    analysisInput.placeholder = "Analysis Interrupted.";
  }

  async function discoverTables(url, key) {
    const cleanUrl = url.endsWith('/') ? url : `${url}/`;
    const commonHeaders = {
      'apikey': key,
      'Authorization': `Bearer ${key}`,
      'Content-Type': 'application/json'
    };

    let tablesFound = [];
    let authenticated = false;

    try {
      const gqlResponse = await fetch(`${cleanUrl}graphql/v1`, {
        method: 'POST',
        headers: commonHeaders,
        body: JSON.stringify({ query: '{ __schema { types { name kind fields { name } } } }' })
      });

      if (gqlResponse.ok) {
        authenticated = true;
        const data = await gqlResponse.json();
        const types = data.data?.__schema?.types;
        if (types) {
          types.forEach(type => {
            if (type.kind === 'OBJECT' &&
              !type.name.startsWith('__') &&
              !['Query', 'Mutation', 'PageInfo'].includes(type.name) &&
              !/Connection$|Response$|Edge$|Filter$|Input$|OrderBy$/.test(type.name)) {
              tablesFound.push({
                name: type.name,
                columns: type.fields ? type.fields.map(f => f.name) : []
              });
            }
          });
          if (tablesFound.length > 0) return tablesFound.sort((a, b) => a.name.localeCompare(b.name));
        }
      } else if (gqlResponse.status === 401 || gqlResponse.status === 403) {
      }
    } catch (e) {
      console.warn("GraphQL Check Failed:", e);
    }

    try {
      const restResponse = await fetch(`${cleanUrl}rest/v1/`, { headers: { 'apikey': key, 'Authorization': `Bearer ${key}` } });
      if (restResponse.ok) {
        authenticated = true;
        const data = await restResponse.json();

        if (data.definitions) {
          Object.keys(data.definitions).forEach(name => {
            const def = data.definitions[name];
            if (def.type === 'object') {
              tablesFound.push({ name, columns: Object.keys(def.properties || {}) });
            }
          });
        }
        else if (data.components && data.components.schemas) {
          Object.keys(data.components.schemas).forEach(name => {
            const def = data.components.schemas[name];
            if (def.type === 'object') {
              tablesFound.push({ name, columns: Object.keys(def.properties || {}) });
            }
          });
        }

        if (tablesFound.length > 0) return tablesFound.sort((a, b) => a.name.localeCompare(b.name));

        return [];
      } else if (restResponse.status === 401 || restResponse.status === 403) {
        return null;
      }
    } catch (e) {
      console.error("OpenAPI Check Failed:", e);
    }

    return authenticated ? [] : null;
  }

  async function fetchDatabaseInfo() {
    const databaseExplorer = document.getElementById('database-explorer');
    const noDbState = document.getElementById('no-db-state');
    const sidebarList = document.getElementById('sidebar-list');
    const dbStatus = document.querySelector('#db-connection-status');
    const dbStatsBar = document.getElementById('db-stats-bar');
    const statTablesCount = document.getElementById('stat-tables-count');

    const savedUrl = localStorage.getItem('fraudtrace_supabase_url');
    const savedKey = localStorage.getItem('fraudtrace_supabase_key');

    if (!savedUrl || !savedKey) {
      if (dbStatus) {
        dbStatus.textContent = 'System Offline';
        dbStatus.className = 'status-msg error';
      }
      if (dbStatsBar) dbStatsBar.classList.add('hidden');
      if (databaseExplorer) databaseExplorer.classList.add('hidden');
      if (noDbState) noDbState.classList.remove('hidden');

      if (connectDbButton) connectDbButton.classList.remove('hidden');
      if (disconnectDbButton) disconnectDbButton.classList.add('hidden');
      if (analysisPortal) analysisPortal.classList.add('hidden');
      return;
    }

    initSupabase(savedUrl, savedKey);

    try {
      if (dbStatus) {
        dbStatus.textContent = 'Tracing Schemas...';
        dbStatus.className = 'status-msg info';
      }

      if (databaseExplorer) databaseExplorer.classList.remove('hidden');
      if (noDbState) noDbState.classList.add('hidden');
      if (sidebarList) sidebarList.innerHTML = '<div class="sidebar-item" style="opacity: 0.5;">Loading schemas...</div>';
      const discoveredTables = await discoverTables(savedUrl, savedKey);

      let tablesToProbe = [];
      if (discoveredTables !== null) {
        tablesToProbe = discoveredTables;
      } else {
        tablesToProbe = [
          { name: 'transactions', columns: [] },
          { name: 'users', columns: [] },
          { name: 'logs', columns: [] }
        ];
      }

      if (sidebarList) {
        sidebarList.innerHTML = '';
        if (tablesToProbe.length === 0) {
          sidebarList.innerHTML = '<div class="sidebar-item" style="opacity: 0.5; font-size: 0.8em; line-height: 1.4;">Schema Access Restricted<br><span style="font-size: 0.7em;">(Use Neural Search to query)</span></div>';
        } else {
          tablesToProbe.forEach(table => {
            const div = document.createElement('div');
            div.className = 'sidebar-item';
            div.textContent = table.name;
            div.onclick = () => loadTableData(table.name, div, table.columns);
            sidebarList.appendChild(div);
          });
        }
      }

      if (dbStatus) {
        dbStatus.textContent = 'Neural Trace Active';
        dbStatus.className = 'status-msg success';
      }

      if (dbStatsBar) dbStatsBar.classList.remove('hidden');
      if (statTablesCount) statTablesCount.textContent = tablesToProbe.length;

      const detailedTables = tablesToProbe.slice(0, 10);
      const remainingTables = tablesToProbe.slice(10);

      let summary = `DATABASE CONTEXT: Connected to Supabase (${tablesToProbe.length} tables found).\n\n`;
      summary += "--- DETAILED SCHEMAS (TOP 10) ---\n";
      summary += detailedTables.map(t => `- ${t.name}: [${t.columns.join(', ') || 'no columns discovered'}]`).join('\n');

      if (remainingTables.length > 0) {
        summary += "\n\n--- OTHER DISCOVERED TABLES (NAME ONLY) ---\n";
        summary += remainingTables.map(t => t.name).join(', ');
        summary += "\n\n(Note: If you need details on these tables, please ask.)";
      }

      databaseSummary = summary;

      if (connectDbButton) connectDbButton.classList.add('hidden');
      if (disconnectDbButton) disconnectDbButton.classList.remove('hidden');
      if (analysisPortal) analysisPortal.classList.remove('hidden');

    } catch (err) {
      if (dbStatus) {
        dbStatus.textContent = 'Trace Failed';
        dbStatus.className = 'status-msg error';
      }
      if (databaseExplorer) databaseExplorer.classList.add('hidden');
      if (noDbState) noDbState.classList.remove('hidden');
    }
  }

  async function loadTableData(tableName, sidebarElement, tableColumns = []) {
    const dataThead = document.getElementById('data-thead');
    const dataTbody = document.getElementById('data-tbody');
    const panelTitle = document.getElementById('panel-title');

    document.querySelectorAll('.sidebar-item').forEach(el => el.classList.remove('active'));
    if (sidebarElement) sidebarElement.classList.add('active');

    if (panelTitle) panelTitle.textContent = `LOADING ${tableName}...`;
    if (dataThead) dataThead.innerHTML = '';
    if (dataTbody) dataTbody.innerHTML = '<tr><td style="padding: 2rem; opacity: 0.5; text-align: center;">Fetching data stream...</td></tr>';

    try {
      const { data, error } = await supabase.from(tableName).select('*').limit(50);

      if (error) {
        if (panelTitle) panelTitle.textContent = `ERROR: ${tableName}`;
        if (dataTbody) dataTbody.innerHTML = `<tr><td style="color: #ff4a4a; padding: 1rem;">Error fetching ${tableName}: ${error.message}<br><br>If this is PGRST205, the table might not exist or isn't exposed in the API.</td></tr>`;
        return;
      }

      if (panelTitle) panelTitle.textContent = `TABLE: ${tableName} (Maximum 50 Recent Entries)`;

      let columns = [];
      if (data && data.length > 0) {
        columns = Object.keys(data[0]);
      } else if (tableColumns && tableColumns.length > 0) {
        columns = tableColumns;
      }

      if (dataThead) {
        if (columns.length > 0) {
          dataThead.innerHTML = `<tr>${columns.map(col => `<th>${col}</th>`).join('')}</tr>`;
        } else {
          dataThead.innerHTML = `<tr><th>Notice</th></tr>`;
        }
      }

      if (!data || data.length === 0) {
        if (dataTbody) {
          const colspan = columns.length > 0 ? columns.length : 1;
          dataTbody.innerHTML = `<tr><td colspan="${colspan}" style="padding: 2rem; opacity: 0.7; text-align: center; color: #ffdb58;">0 Rows Returned.<br><br><span style="font-size: 0.8em; opacity: 0.7;">The table is either empty, or Supabase Row-Level Security (RLS) is blocking access.</span></td></tr>`;
        }
        return;
      }

      if (dataTbody) {
        dataTbody.innerHTML = data.map(row => {
          return `<tr>${columns.map(col => {
            let val = row[col];
            if (typeof val === 'object' && val !== null) val = JSON.stringify(val);
            return `<td>${val !== null && val !== undefined ? val : '<em>null</em>'}</td>`;
          }).join('')}</tr>`;
        }).join('');
      }

    } catch (err) {
      console.error(err);
      if (dataTbody) dataTbody.innerHTML = `<tr><td style="color: #ff4a4a; padding: 1rem;">Unexpected Error: ${err.message}</td></tr>`;
    }
  }



  function returnToSystemView(message, type = 'error') {
    databaseView.classList.remove('visible');
    setTimeout(() => {
      databaseView.classList.add('hidden');
      systemView.classList.remove('hidden');
      systemView.classList.remove('fade-out');
      requestAnimationFrame(() => {
        systemView.classList.add('visible');
        if (message) showStatus(message, type);
      });
    }, 800);
  }
  const heroElement = document.querySelector('#hero-text');
  if (heroElement) {
    const decrypter = new TextDecrypter(heroElement);
    heroElement.classList.add('reveal-fade');
    decrypter.decrypt();
  }
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
      localStorage.removeItem('fraudtrace_supabase_url');
      localStorage.removeItem('fraudtrace_supabase_key');
      location.reload();
    });
  }
  if (connectDbButton) {
    connectDbButton.addEventListener('click', navigateToSupabaseAuth);
  }

  if (disconnectDbButton) {
    disconnectDbButton.addEventListener('click', () => {
      localStorage.removeItem('fraudtrace_supabase_url');
      localStorage.removeItem('fraudtrace_supabase_key');
      fetchDatabaseInfo();
    });
  }

  if (disconnectAiButton) {
    disconnectAiButton.addEventListener('click', () => {
      localStorage.removeItem('fraudtrace_gemini_api_key');
      if (apiKeyInput) apiKeyInput.value = '';
      returnToSystemView('Neural link disconnected.', 'info');
    });
  }

  if (backToDbBtn) {
    backToDbBtn.addEventListener('click', () => {
      supabaseAuthView.classList.remove('visible');
      setTimeout(() => {
        supabaseAuthView.classList.add('hidden');
        databaseView.classList.remove('hidden');
        requestAnimationFrame(() => {
          databaseView.classList.add('visible');
          fetchDatabaseInfo();
        });
      }, 800);
    });
  }

  if (supabaseAuthButton) {
    supabaseAuthButton.addEventListener('click', async () => {
      const url = supabaseUrlInput.value.trim();
      const key = supabaseKeyInput.value.trim();

      if (!url || !key) {
        showSupabaseStatus('Provide both URL and Key.', 'error');
        return;
      }

      showSupabaseStatus('Testing Connection...', 'info');
      supabaseAuthButton.disabled = true;

      const testClient = initSupabase(url, key);
      try {
        const tables = await discoverTables(url, key);

        if (tables === null) {
          throw new Error("Authentication Failed. Please check your credentials.");
        }

        localStorage.setItem('fraudtrace_supabase_url', url);
        localStorage.setItem('fraudtrace_supabase_key', key);
        showSupabaseStatus('Connection Verified.', 'success');

        setTimeout(() => {
          navigateToDatabase();
          supabaseAuthButton.disabled = false;
        }, 1200);
      } catch (err) {
        showSupabaseStatus('Connection Failed: ' + err.message, 'error');
        supabaseAuthButton.disabled = false;
      }
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

  if (downloadReportBtn) {
    downloadReportBtn.addEventListener('click', async () => {
      const text = aiOutputText.textContent;
      if (!text) return;

      try {
        downloadReportBtn.disabled = true;
        const originalText = downloadReportBtn.textContent;
        downloadReportBtn.textContent = 'GENERATING...';

        const response = await fetch('http://127.0.0.1:8000/api/download-report', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text })
        });

        if (!response.ok) throw new Error('Export failed');

        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'Analysis_Report.pdf';
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);

        downloadReportBtn.textContent = originalText;
        downloadReportBtn.disabled = false;
      } catch (error) {
        console.error('Download error:', error);
        alert('Failed to generate report locally.');
        downloadReportBtn.disabled = false;
      }
    });
  }
});
