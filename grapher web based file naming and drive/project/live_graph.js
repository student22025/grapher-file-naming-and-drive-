// Live Graph Tab - Processing Grapher Web
import { setStatusBar, showModal } from './ui.js';
import { fileNamingSystem } from './file_naming.js';
import { driveIntegration } from './drive_integration.js';

export class LiveGraph {
  constructor(state) {
    this.state = state;
    this.graphType = 'line'; // line, dot, bar
    this.data = [];
    this.channelNames = ['Signal-1', 'Signal-2', 'Signal-3', 'Signal-4', 'Signal-5', 'Signal-6', 'Signal-7', 'Signal-8', 'Signal-9', 'Signal-10', 'Signal-11', 'Signal-12', 'Signal-13'];
    this.channelColors = ['#67d8ef', '#d02662', '#61afef', '#e05c7e', '#98c379', '#e5c07b', '#c678dd', '#56b6c2', '#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4', '#feca57'];
    this.channelVisible = new Array(13).fill(true);
    this.maxSamples = 1000;
    this.recording = false;
    this.paused = false;
    this.baud = 9600;
    this.port = null;
    this.reader = null;
    this.connected = false;
    this.autoScale = true;
    this.yMin = -10;
    this.yMax = 10;
    this.dataRate = 24.0;
    this.lastDataTime = Date.now();
    this.dataCount = 0;
    this.rawBuffer = '';
    this.expandOnly = true;
    this.splitChannels = [1, 2, 3, 4];
    this.currentValues = new Array(13).fill(0);
    this.smoothingBuffer = [];
    this.smoothingFactor = 0.8;
    this.animationFrame = null;
    this.splitMode = false; // false = single graph, true = split graphs
    this.canvases = [];
    this.contexts = [];
    this.driveLink = null; // Store the drive link for current recording
    this.init();
  }

  init() {
    const tab = document.getElementById('tab-live');
    tab.innerHTML = `
      <div id="live-graph-container">
        <div id="single-graph-view">
          <canvas id="live-graph" width="900" height="600"></canvas>
        </div>
        <div id="split-graph-view" style="display: none;">
          <div class="graph-grid">
            <div class="graph-panel">
              <div class="graph-title">Graph 1</div>
              <canvas id="graph-1" width="450" height="280"></canvas>
            </div>
            <div class="graph-panel">
              <div class="graph-title">Graph 2</div>
              <canvas id="graph-2" width="450" height="280"></canvas>
            </div>
            <div class="graph-panel">
              <div class="graph-title">Graph 3</div>
              <canvas id="graph-3" width="450" height="280"></canvas>
            </div>
            <div class="graph-panel">
              <div class="graph-title">Graph 4</div>
              <canvas id="graph-4" width="450" height="280"></canvas>
            </div>
          </div>
        </div>
      </div>
    `;
    
    // Initialize single graph canvas
    this.canvas = document.getElementById('live-graph');
    this.ctx = this.canvas.getContext('2d');
    
    // Initialize split graph canvases
    for (let i = 1; i <= 4; i++) {
      const canvas = document.getElementById(`graph-${i}`);
      this.canvases[i-1] = canvas;
      this.contexts[i-1] = canvas.getContext('2d');
    }
    
    this.draw();
    
    // Update data rate every second
    setInterval(() => this.updateDataRate(), 1000);
    
    // Start smooth animation loop
    this.startAnimationLoop();
    
    // Simulate data for demo
    this.simulateData();
  }

  startAnimationLoop() {
    const animate = () => {
      this.draw();
      this.animationFrame = requestAnimationFrame(animate);
    };
    animate();
  }

  simulateData() {
    if (!this.paused && this.connected) {
      // Generate realistic multi-channel data with smooth transitions
      const newData = [];
      const time = Date.now() / 1000;
      
      for (let i = 0; i < 13; i++) {
        let value;
        if (i < 4) {
          // Main signals with more variation and smooth curves
          value = 100 + 50 * Math.sin(time * 0.5 + i) + 20 * Math.sin(time * 2 + i * 0.5) + 
                  10 * Math.sin(time * 5 + i * 0.3) + (Math.random() - 0.5) * 5;
        } else {
          // Additional signals with different patterns
          value = 80 + 30 * Math.cos(time * 0.3 + i) + 15 * Math.sin(time * 1.5 + i) + 
                  8 * Math.cos(time * 3 + i * 0.7) + (Math.random() - 0.5) * 3;
        }
        
        // Apply smoothing
        if (this.smoothingBuffer[i] === undefined) {
          this.smoothingBuffer[i] = value;
        } else {
          this.smoothingBuffer[i] = this.smoothingBuffer[i] * this.smoothingFactor + 
                                   value * (1 - this.smoothingFactor);
        }
        
        newData.push(this.smoothingBuffer[i]);
        this.currentValues[i] = this.smoothingBuffer[i];
      }
      
      this.data.push(newData);
      this.dataCount++;
      
      if (this.data.length > this.maxSamples) {
        this.data.shift();
      }
    }
    
    // Higher frequency for smoother updates
    setTimeout(() => this.simulateData(), 1000 / (this.dataRate * 2));
  }

  showBaudRateMenu() {
    const baudRates = [300, 1200, 2400, 4800, 9600, 19200, 38400, 57600, 74880, 115200, 230400, 250000];
    
    showModal(`
      <div class="baud-rate-menu">
        <h3>Select Baud Rate</h3>
        <div class="baud-rate-list">
          ${baudRates.map(rate => `
            <button class="baud-rate-option ${rate === this.baud ? 'selected' : ''}" data-baud="${rate}">
              ${rate}
            </button>
          `).join('')}
        </div>
        <div class="baud-rate-actions">
          <button id="more-options-btn" class="baud-rate-option">More Options</button>
          <button id="cancel-baud" class="baud-rate-cancel">Cancel</button>
        </div>
      </div>
    `);
    
    // Set up event listeners after modal is created
    setTimeout(() => {
      document.querySelectorAll('.baud-rate-option[data-baud]').forEach(btn => {
        btn.onclick = () => {
          this.baud = parseInt(btn.dataset.baud);
          this.renderSidebar();
          document.getElementById('modal').classList.add('hidden');
          document.getElementById('modal').innerHTML = '';
        };
      });
      
      const moreOptionsBtn = document.getElementById('more-options-btn');
      if (moreOptionsBtn) {
        moreOptionsBtn.onclick = () => {
          const customRate = prompt('Enter custom baud rate:', this.baud);
          if (customRate && !isNaN(customRate)) {
            this.baud = parseInt(customRate);
            this.renderSidebar();
          }
          document.getElementById('modal').classList.add('hidden');
          document.getElementById('modal').innerHTML = '';
        };
      }
      
      const cancelBtn = document.getElementById('cancel-baud');
      if (cancelBtn) {
        cancelBtn.onclick = () => {
          document.getElementById('modal').classList.add('hidden');
          document.getElementById('modal').innerHTML = '';
        };
      }
    }, 10);
  }

  toggleSplitMode() {
    this.splitMode = !this.splitMode;
    const singleView = document.getElementById('single-graph-view');
    const splitView = document.getElementById('split-graph-view');
    
    if (this.splitMode) {
      singleView.style.display = 'none';
      splitView.style.display = 'block';
    } else {
      singleView.style.display = 'block';
      splitView.style.display = 'none';
    }
    
    this.renderSidebar();
  }

  renderSidebar() {
    const sb = document.getElementById('sidebar');
    const isAdmin = (window.loginInfo && window.loginInfo.role === "admin");
    
    sb.innerHTML = `
      <div class="sidebar-section">
        <h3>Record Graph Data</h3>
        <button id="live-record-btn" class="sidebtn record-btn">${this.recording ? 'Stop Recording' : 'Start Recording'}</button>
        <button id="set-output-file" class="sidebtn">Set Output File</button>
        <div class="keyboard-hint">Ctrl+R to toggle recording</div>
        
        <div class="drive-status-section">
          <div class="drive-status-header">
            <span class="drive-status-info">
              ${driveIntegration.isConnected() ? 
                `☁️ ${driveIntegration.getProviderName()}` : 
                '☁️ Drive: Not Connected'
              }
            </span>
            <button id="setup-drive" class="drive-setup-btn">Setup</button>
          </div>
          ${driveIntegration.isConnected() ? 
            '<div style="font-size: 0.8em; color: var(--sidebar-heading);">Files will be auto-uploaded</div>' :
            '<div style="font-size: 0.8em; color: #ff6b6b;">Connect drive for cloud backup</div>'
          }
        </div>
      </div>
      
      <div class="sidebar-section">
        <h3>Graph ${this.splitMode ? 'Split' : '1'} - Options</h3>
        <div class="graph-options">
          <button id="line-btn" class="option-btn ${this.graphType === 'line' ? 'active' : ''}">Line</button>
          <button id="dot-btn" class="option-btn ${this.graphType === 'dot' ? 'active' : ''}">Dots</button>
          <button id="bar-btn" class="option-btn ${this.graphType === 'bar' ? 'active' : ''}">Bar</button>
        </div>
        
        <div class="scale-controls">
          <div class="scale-row">
            <span>X:</span>
            <input type="number" id="x-scale" value="15" class="scale-input">
            <span>Y:</span>
            <input type="number" id="y-scale" value="${this.splitMode ? '110' : '200'}" class="scale-input">
          </div>
          <label class="scale-option">
            <input type="checkbox" id="expand-only" ${this.expandOnly ? 'checked' : ''}>
            Scale: Manual
          </label>
        </div>
      </div>
      
      <div class="sidebar-section">
        <h3>Data Format</h3>
        <div class="data-controls">
          <button id="data-play" class="control-btn ${this.paused ? '' : 'play'}">${this.paused ? '▶' : '⏸'}</button>
          <button id="data-pause" class="control-btn pause">⏸</button>
          <button id="data-clear" class="control-btn">Clear</button>
        </div>
        <div class="keyboard-hint">Space to pause/play, C to clear</div>
        
        <div class="split-section">
          <span>Split:</span>
          <div class="split-controls">
            ${this.splitChannels.map(ch => `<span class="split-tag ${ch <= 4 ? 'active' : ''}">${ch}</span>`).join('')}
          </div>
          <button id="toggle-split" class="sidebtn split-toggle">${this.splitMode ? 'Single Graph' : 'Split Graphs'}</button>
        </div>
        
        <div class="frequency-display">
          <span>Auto: ${this.dataRate.toFixed(1)}Hz</span>
        </div>
      </div>
      
      <div class="sidebar-section signals-section">
        <h3>Graph ${this.splitMode ? 'Signals' : '1'}</h3>
        <div class="signals-list">
          ${this.channelNames.slice(0, this.splitMode ? 13 : 13).map((name, i) => `
            <div class="signal-item ${this.channelVisible[i] ? 'visible' : 'hidden'}" data-channel="${i}">
              <div class="signal-indicator" style="background-color: ${this.channelColors[i]}">
                <span class="signal-icon">${this.channelVisible[i] ? '▲' : '▼'}</span>
              </div>
              <span class="signal-name">${name}</span>
              <span class="signal-value">${this.currentValues[i].toFixed(1)}</span>
            </div>
          `).join('')}
        </div>
        
        <div class="signal-controls">
          <button id="toggle-hidden" class="signal-control-btn">Hidden</button>
          <button id="toggle-empty" class="signal-control-btn">Empty</button>
        </div>
        <div class="keyboard-hint">1-9 to toggle channels</div>
      </div>
      
      <div class="sidebar-section">
        <h3>Serial Settings</h3>
        <button id="live-connect-btn" class="sidebtn connect-btn">${this.connected ? 'Disconnect' : 'Connect Serial'}</button>
        <div class="serial-settings">
          <label>Port: COM4</label>
          <button id="baud-rate-btn" class="sidebtn baud-btn">Baud: ${this.baud}</button>
          <label>Max Samples: <input id="max-samples" type="number" value="${this.maxSamples}" min="100" max="10000"></label>
        </div>
        <div class="keyboard-hint">Ctrl+S to save data</div>
      </div>
      
      ${isAdmin ? `
        <div class="sidebar-section">
          <h3>Admin Controls</h3>
          <button class="sidebtn accent" onclick="window.pgLogout()">Logout</button>
        </div>
      ` : `
        <div class="sidebar-section">
          <button class="sidebtn" onclick="window.pgLogout()">Logout</button>
        </div>
      `}
    `;
    
    this.setupEventListeners();
    setStatusBar(`${this.connected ? 'Connected' : 'Disconnected'} | COM4 | ${this.baud} baud | ${this.dataRate.toFixed(1)} Hz | Live Graph`);
  }

  setupEventListeners() {
    document.getElementById('live-connect-btn').onclick = () => this.toggleSerial();
    document.getElementById('live-record-btn').onclick = () => this.toggleRecording();
    document.getElementById('set-output-file').onclick = () => this.setOutputFile();
    document.getElementById('setup-drive').onclick = () => driveIntegration.showDriveSetupDialog();
    document.getElementById('baud-rate-btn').onclick = () => this.showBaudRateMenu();
    document.getElementById('max-samples').onchange = e => { this.maxSamples = Number(e.target.value); };
    document.getElementById('line-btn').onclick = () => this.setGraphType('line');
    document.getElementById('dot-btn').onclick = () => this.setGraphType('dot');
    document.getElementById('bar-btn').onclick = () => this.setGraphType('bar');
    document.getElementById('expand-only').onchange = e => { this.expandOnly = e.target.checked; };
    document.getElementById('data-play').onclick = () => this.togglePause();
    document.getElementById('data-pause').onclick = () => this.togglePause();
    document.getElementById('data-clear').onclick = () => this.clearGraph();
    document.getElementById('toggle-hidden').onclick = () => this.toggleHiddenChannels();
    document.getElementById('toggle-empty').onclick = () => this.toggleEmptyChannels();
    document.getElementById('toggle-split').onclick = () => this.toggleSplitMode();
    
    // Signal item click handlers
    document.querySelectorAll('.signal-item').forEach((item, index) => {
      item.onclick = () => this.toggleChannel(index);
    });
  }

  toggleChannel(index) {
    this.channelVisible[index] = !this.channelVisible[index];
    this.renderSidebar();
  }

  toggleHiddenChannels() {
    const hasHidden = this.channelVisible.some(v => !v);
    if (hasHidden) {
      // Show all hidden channels
      this.channelVisible = this.channelVisible.map(() => true);
    } else {
      // Hide some channels
      for (let i = 4; i < 13; i++) {
        this.channelVisible[i] = false;
      }
    }
    this.renderSidebar();
  }

  toggleEmptyChannels() {
    // Toggle channels that have zero or very low values
    for (let i = 0; i < 13; i++) {
      if (Math.abs(this.currentValues[i]) < 1) {
        this.channelVisible[i] = !this.channelVisible[i];
      }
    }
    this.renderSidebar();
  }

  setOutputFile() {
    fileNamingSystem.showFileNamingDialog((result) => {
      this.outputFileName = result.fileName;
      this.outputFolderName = result.folderName;
      this.outputFullPath = result.fullPath;
      console.log('Live Graph output file set to:', result.fullPath);
    });
  }

  clearGraph() {
    this.data = [];
    this.dataCount = 0;
    this.currentValues = new Array(13).fill(0);
    this.smoothingBuffer = [];
    this.renderSidebar();
  }

  togglePause() {
    this.paused = !this.paused;
    this.renderSidebar();
  }

  setGraphType(type) {
    this.graphType = type;
    this.renderSidebar();
  }

  updateDataRate() {
    const now = Date.now();
    const timeDiff = (now - this.lastDataTime) / 1000;
    if (timeDiff > 0 && this.dataCount > 0) {
      this.dataRate = this.dataCount / timeDiff;
    }
    this.lastDataTime = now;
    this.dataCount = 0;
    
    // Update UI elements
    const freqDisplay = document.querySelector('.frequency-display span');
    if (freqDisplay) {
      freqDisplay.textContent = `Auto: ${this.dataRate.toFixed(1)}Hz`;
    }
  }

  async toggleSerial() {
    if (!this.connected) {
      if (!('serial' in navigator)) {
        alert('Web Serial API not supported in your browser.');
        return;
      }
      try {
        this.port = await navigator.serial.requestPort();
        await this.port.open({ baudRate: this.baud });
        this.connected = true;
        this.reader = this.port.readable.getReader();
        this.readLoop();
      } catch (e) { 
        alert('Serial connection failed: ' + e);
      }
    } else {
      if (this.reader) await this.reader.cancel();
      if (this.port) await this.port.close();
      this.connected = false;
      this.port = null;
      this.reader = null;
    }
    this.renderSidebar();
  }

  async readLoop() {
    let lineBuffer = '';
    
    try {
      while (this.connected && this.reader) {
        const { value, done } = await this.reader.read();
        if (done) break;
        
        if (!this.paused) {
          const text = new TextDecoder().decode(value);
          lineBuffer += text;
          
          // Process complete lines
          const lines = lineBuffer.split('\n');
          lineBuffer = lines.pop() || ''; // Keep incomplete line
          
          for (let line of lines) {
            line = line.trim();
            if (line) {
              // Parse comma-separated values
              let vals = line.split(',').map(v => {
                const num = parseFloat(v.trim());
                return isNaN(num) ? 0 : num;
              });
              
              if (vals.length > 0) {
                // Ensure we have exactly 13 channels
                while (vals.length < 13) vals.push(0);
                vals = vals.slice(0, 13);
                
                // Apply smoothing to incoming data
                for (let i = 0; i < 13; i++) {
                  if (this.smoothingBuffer[i] === undefined) {
                    this.smoothingBuffer[i] = vals[i];
                  } else {
                    this.smoothingBuffer[i] = this.smoothingBuffer[i] * this.smoothingFactor + 
                                           vals[i] * (1 - this.smoothingFactor);
                  }
                  vals[i] = this.smoothingBuffer[i];
                }
                
                this.data.push(vals);
                this.dataCount++;
                this.currentValues = [...vals];
                
                if (this.data.length > this.maxSamples) {
                  this.data.shift();
                }
              }
            }
          }
        }
      }
    } catch (e) {
      console.error('Serial read error:', e);
    }
    finally { 
      this.connected = false; 
      this.renderSidebar(); 
    }
  }

  drawSingleGraph() {
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;
    
    // Clear canvas with dark background
    ctx.fillStyle = "#1a1a1a";
    ctx.fillRect(0, 0, w, h);
    
    if (!this.data.length) {
      ctx.fillStyle = "#666";
      ctx.font = "16px Arial";
      ctx.textAlign = "center";
      ctx.fillText("No data - Connect serial port to see live graph", w/2, h/2);
      return;
    }
    
    // Calculate scale
    let yMin = this.yMin, yMax = this.yMax;
    if (this.autoScale || this.expandOnly) {
      const visibleData = [];
      for (let i = 0; i < this.data.length; i++) {
        for (let ch = 0; ch < 13; ch++) {
          if (this.channelVisible[ch] && this.data[i][ch] !== undefined) {
            visibleData.push(this.data[i][ch]);
          }
        }
      }
      
      if (visibleData.length > 0) {
        yMin = Math.min(...visibleData);
        yMax = Math.max(...visibleData);
        const range = yMax - yMin;
        if (range === 0) {
          yMin -= 1;
          yMax += 1;
        } else {
          yMin -= range * 0.05;
          yMax += range * 0.05;
        }
      }
    }
    
    // Draw grid
    ctx.strokeStyle = "#2a2a2a";
    ctx.lineWidth = 1;
    
    // Horizontal grid lines
    for (let i = 0; i <= 10; i++) {
      const y = (i / 10) * h;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }
    
    // Vertical grid lines
    for (let i = 0; i <= 20; i++) {
      const x = (i / 20) * w;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
    }
    
    // Draw Y-axis labels
    ctx.fillStyle = "#888";
    ctx.font = "12px Arial";
    ctx.textAlign = "right";
    for (let i = 0; i <= 10; i++) {
      const y = (i / 10) * h;
      const value = yMax - (i / 10) * (yMax - yMin);
      ctx.fillText(value.toFixed(0), w - 5, y + 4);
    }
    
    // Draw X-axis labels (time)
    ctx.textAlign = "center";
    for (let i = 0; i <= 20; i++) {
      const x = (i / 20) * w;
      const timeValue = i;
      ctx.fillText(timeValue.toString(), x, h - 5);
    }
    
    // Draw channels with anti-aliasing
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    
    for (let ch = 0; ch < 13; ch++) {
      if (!this.channelVisible[ch]) continue;
      
      ctx.strokeStyle = this.channelColors[ch];
      ctx.fillStyle = this.channelColors[ch];
      ctx.lineWidth = 1.5;
      
      if (this.graphType === 'line') {
        ctx.beginPath();
        let firstPoint = true;
        for (let i = 0; i < this.data.length; i++) {
          if (this.data[i][ch] !== undefined) {
            const x = (i / Math.max(this.data.length - 1, 1)) * w;
            const value = this.data[i][ch];
            const y = h - ((value - yMin) / (yMax - yMin)) * h;
            
            if (firstPoint) {
              ctx.moveTo(x, y);
              firstPoint = false;
            } else {
              ctx.lineTo(x, y);
            }
          }
        }
        ctx.stroke();
      } else if (this.graphType === 'dot') {
        for (let i = 0; i < this.data.length; i++) {
          if (this.data[i][ch] !== undefined) {
            const x = (i / Math.max(this.data.length - 1, 1)) * w;
            const value = this.data[i][ch];
            const y = h - ((value - yMin) / (yMax - yMin)) * h;
            ctx.beginPath();
            ctx.arc(x, y, 1.5, 0, 2 * Math.PI);
            ctx.fill();
          }
        }
      } else if (this.graphType === 'bar') {
        const barWidth = w / this.data.length;
        for (let i = 0; i < this.data.length; i++) {
          if (this.data[i][ch] !== undefined) {
            const x = i * barWidth;
            const value = this.data[i][ch];
            const y = h - ((value - yMin) / (yMax - yMin)) * h;
            const barHeight = h - y;
            ctx.fillRect(x + ch * (barWidth / 13), y, barWidth / 13 - 1, barHeight);
          }
        }
      }
    }
  }

  drawSplitGraphs() {
    // Define which channels go to which graph
    const graphChannels = [
      [0, 1, 2], // Graph 1: Signal-1, Signal-2, Signal-3
      [3, 4], // Graph 2: Signal-4, Signal-5
      [5, 6, 7, 8], // Graph 3: Signal-6, Signal-7, Signal-8, Signal-9
      [9, 10, 11, 12] // Graph 4: Signal-10, Signal-11, Signal-12, Signal-13
    ];
    
    for (let graphIndex = 0; graphIndex < 4; graphIndex++) {
      const ctx = this.contexts[graphIndex];
      const canvas = this.canvases[graphIndex];
      const w = canvas.width;
      const h = canvas.height;
      const channels = graphChannels[graphIndex];
      
      // Clear canvas
      ctx.fillStyle = "#1a1a1a";
      ctx.fillRect(0, 0, w, h);
      
      if (!this.data.length) continue;
      
      // Calculate scale for this graph's channels
      let yMin = this.yMin, yMax = this.yMax;
      if (this.autoScale || this.expandOnly) {
        const visibleData = [];
        for (let i = 0; i < this.data.length; i++) {
          for (let ch of channels) {
            if (this.channelVisible[ch] && this.data[i][ch] !== undefined) {
              visibleData.push(this.data[i][ch]);
            }
          }
        }
        
        if (visibleData.length > 0) {
          yMin = Math.min(...visibleData);
          yMax = Math.max(...visibleData);
          const range = yMax - yMin;
          if (range === 0) {
            yMin -= 1;
            yMax += 1;
          } else {
            yMin -= range * 0.05;
            yMax += range * 0.05;
          }
        }
      }
      
      // Draw grid
      ctx.strokeStyle = "#2a2a2a";
      ctx.lineWidth = 0.5;
      
      // Horizontal grid lines
      for (let i = 0; i <= 5; i++) {
        const y = (i / 5) * h;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
      }
      
      // Vertical grid lines
      for (let i = 0; i <= 10; i++) {
        const x = (i / 10) * w;
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, h);
        ctx.stroke();
      }
      
      // Draw Y-axis labels
      ctx.fillStyle = "#888";
      ctx.font = "10px Arial";
      ctx.textAlign = "right";
      for (let i = 0; i <= 5; i++) {
        const y = (i / 5) * h;
        const value = yMax - (i / 5) * (yMax - yMin);
        ctx.fillText(value.toFixed(0), w - 3, y + 3);
      }
      
      // Draw X-axis labels
      ctx.textAlign = "center";
      for (let i = 0; i <= 10; i++) {
        const x = (i / 10) * w;
        const timeValue = i * 2;
        ctx.fillText(timeValue.toString(), x, h - 3);
      }
      
      // Draw channels for this graph
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      
      for (let ch of channels) {
        if (!this.channelVisible[ch]) continue;
        
        ctx.strokeStyle = this.channelColors[ch];
        ctx.lineWidth = 1.2;
        
        ctx.beginPath();
        let firstPoint = true;
        for (let i = 0; i < this.data.length; i++) {
          if (this.data[i][ch] !== undefined) {
            const x = (i / Math.max(this.data.length - 1, 1)) * w;
            const value = this.data[i][ch];
            const y = h - ((value - yMin) / (yMax - yMin)) * h;
            
            if (firstPoint) {
              ctx.moveTo(x, y);
              firstPoint = false;
            } else {
              ctx.lineTo(x, y);
            }
          }
        }
        ctx.stroke();
      }
    }
  }

  draw() {
    if (this.splitMode) {
      this.drawSplitGraphs();
    } else {
      this.drawSingleGraph();
    }
  }

  async toggleRecording() {
    this.recording = !this.recording;
    
    if (!this.recording && this.driveLink) {
      // Recording stopped, upload data if drive is connected
      if (driveIntegration.isConnected() && this.data.length > 0) {
        try {
          this.showUploadProgress('Uploading live graph data...');
          
          let csv = this.channelNames.join(',') + '\n';
          csv += this.data.map(row => row.join(',')).join('\n');
          
          const filename = this.outputFileName || `live_graph_${new Date().toISOString().slice(0,19).replace(/:/g,'-')}.csv`;
          const folderPath = this.outputFolderName || 'live_graphs';
          
          this.driveLink = await driveIntegration.uploadFile(csv, filename, folderPath);
          
          this.hideUploadProgress();
          console.log('Live graph data uploaded:', this.driveLink);
        } catch (error) {
          this.hideUploadProgress();
          console.error('Upload failed:', error);
        }
      }
      this.driveLink = null;
    } else if (this.recording) {
      // Recording started
      this.driveLink = 'pending'; // Mark as pending upload
    }
    
    this.renderSidebar();
  }

  async saveCSV() {
    if (this.data.length === 0) {
      alert('No data to save');
      return;
    }
    
    // Create tab-separated format with drive link column
    let txtData = this.channelNames.join('\t') + '\tdrive_link\n';
    txtData += this.data.map(row => row.join('\t') + '\tdrive_link_placeholder').join('\n');
    
    // Upload to drive if connected
    if (driveIntegration.isConnected()) {
      try {
        this.showUploadProgress('Uploading to cloud drive...');
        
        const filename = this.outputFileName || `live_graph_${new Date().toISOString().slice(0,19).replace(/:/g,'-')}.txt`;
        const folderPath = this.outputFolderName || 'live_graphs';
        
        const driveLink = await driveIntegration.uploadFile(txtData, filename, folderPath);
        
        // Replace placeholder with actual drive link
        txtData = txtData.replace(/drive_link_placeholder/g, driveLink);
        
        this.hideUploadProgress();
        console.log('File uploaded to drive:', driveLink);
      } catch (error) {
        this.hideUploadProgress();
        console.error('Upload failed:', error);
        alert('Upload failed: ' + error.message);
      }
    }
    
    // Download local copy
    const blob = new Blob([txtData], { type: 'text/plain' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    
    // Use the configured filename or fallback to timestamp
    const filename = this.outputFileName || `live_graph_${new Date().toISOString().slice(0,19).replace(/:/g,'-')}.txt`;
    a.download = filename;
    
    a.click();
    URL.revokeObjectURL(a.href);
  }

  showUploadProgress(message) {
    const progress = document.createElement('div');
    progress.id = 'upload-progress-live';
    progress.className = 'upload-progress';
    progress.innerHTML = `
      <div class="upload-progress-header">
        <span class="upload-progress-icon">📊</span>
        <span class="upload-progress-text">${message}</span>
      </div>
      <div class="upload-progress-bar">
        <div class="upload-progress-fill" style="width: 0%"></div>
      </div>
      <div class="upload-progress-details">Preparing upload...</div>
    `;
    
    document.body.appendChild(progress);
    
    // Simulate progress
    let progressValue = 0;
    const progressInterval = setInterval(() => {
      progressValue += Math.random() * 15;
      if (progressValue > 90) progressValue = 90;
      
      const fillElement = progress.querySelector('.upload-progress-fill');
      const detailsElement = progress.querySelector('.upload-progress-details');
      
      if (fillElement) {
        fillElement.style.width = progressValue + '%';
      }
      if (detailsElement) {
        detailsElement.textContent = `Uploading... ${Math.round(progressValue)}%`;
      }
    }, 300);
    
    progress.progressInterval = progressInterval;
  }

  hideUploadProgress() {
    const progress = document.getElementById('upload-progress-live');
    if (progress) {
      if (progress.progressInterval) {
        clearInterval(progress.progressInterval);
      }
      
      // Complete the progress bar
      const fillElement = progress.querySelector('.upload-progress-fill');
      const detailsElement = progress.querySelector('.upload-progress-details');
      
      if (fillElement) fillElement.style.width = '100%';
      if (detailsElement) detailsElement.textContent = 'Upload complete!';
      
      setTimeout(() => {
        if (progress.parentNode) {
          progress.parentNode.removeChild(progress);
        }
      }, 1500);
    }
  }

  // Keyboard shortcuts handler
  handleKeyboard(e) {
    if (e.ctrlKey) {
      switch (e.key) {
        case 'r':
          this.toggleRecording();
          e.preventDefault();
          break;
        case 's':
          this.saveCSV();
          e.preventDefault();
          break;
      }
    } else {
      switch (e.key) {
        case ' ':
          this.togglePause();
          e.preventDefault();
          break;
        case 'c':
        case 'C':
          this.clearGraph();
          e.preventDefault();
          break;
        case '1':
        case '2':
        case '3':
        case '4':
        case '5':
        case '6':
        case '7':
        case '8':
        case '9':
          const channelIndex = parseInt(e.key) - 1;
          if (channelIndex < 13) {
            this.toggleChannel(channelIndex);
          }
          e.preventDefault();
          break;
      }
    }
  }
}