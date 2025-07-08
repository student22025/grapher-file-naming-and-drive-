// File Graph Tab - Processing Grapher Web
import { setStatusBar, showModal } from './ui.js';
import { fileNamingSystem } from './file_naming.js';
import { driveIntegration } from './drive_integration.js';

export class FileGraph {
  constructor(state) {
    this.state = state;
    this.data = [];
    this.headers = [];
    this.driveLink = null;
    this.init();
  }
  init() {
    const tab = document.getElementById('tab-file');
    tab.innerHTML = `
      <input type="file" id="csv-file-input" accept=".csv">
      <canvas id="file-graph" width="900" height="350"></canvas>
    `;
    document.getElementById('csv-file-input').onchange = e => this.loadCSV(e.target.files[0]);
    this.canvas = document.getElementById('file-graph');
    this.ctx = this.canvas.getContext('2d');
  }
  renderSidebar() {
    const sb = document.getElementById('sidebar');
    const isAdmin = (window.loginInfo && window.loginInfo.role === "admin");
  if (isAdmin) {
    sb.innerHTML += `<h3>Admin Controls</h3>
    <button class="sidebtn accent" onclick="window.pgLogout()">Logout</button>`;
    // You can add more admin controls here!
  } else {
    sb.innerHTML = `
      <h3>File Graph</h3>
      <input type="file" accept=".csv" id="sidebar-csv-upload" />
      <button id="file-clear-btn" class="sidebtn">Clear Graph</button>
      <hr>
      <button id="save-csv" class="sidebtn">Download CSV</button>
      
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
    `;
    document.getElementById('sidebar-csv-upload').onchange = e => this.loadCSV(e.target.files[0]);
    document.getElementById('file-clear-btn').onclick = () => { this.data = []; this.draw(); };
    document.getElementById('save-csv').onclick = () => this.saveCSV();
    document.getElementById('setup-drive').onclick = () => driveIntegration.showDriveSetupDialog();
    
    // Add set output file button for file graph too
    sb.innerHTML += `<button id="set-file-output" class="sidebtn">Set Output File</button>`;
    document.getElementById('set-file-output').onclick = () => this.setOutputFile();
    setStatusBar('File Graph');
  }
}
  
  setOutputFile() {
    fileNamingSystem.showFileNamingDialog((result) => {
      this.outputFileName = result.fileName;
      this.outputFolderName = result.folderName;
      this.outputFullPath = result.fullPath;
      console.log('File Graph output file set to:', result.fullPath);
    });
  }
  
  loadCSV(file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = e => {
      const lines = e.target.result.split('\n').filter(Boolean);
      this.headers = lines[0].split(',');
      this.data = lines.slice(1).map(l => l.split(',').map(Number));
      this.draw();
    };
    reader.readAsText(file);
  }
  draw() {
    const ctx = this.ctx, w = this.canvas.width, h = this.canvas.height;
    ctx.fillStyle = "#282c34";
    ctx.fillRect(0,0,w,h);
    if (!this.data.length) return;
    let max = Math.max(...this.data.flat()), min = Math.min(...this.data.flat());
    for (let s=0; s<this.data[0].length; ++s) {
      ctx.beginPath();
      ctx.strokeStyle = ['#67d8ef','#d02662','#61afef','#e05c7e'][s%4];
      for (let i=0; i<this.data.length; ++i) {
        let x = i * w / this.data.length, y = h - ((this.data[i][s]-min)/(max-min)) * h;
        ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
  }
  async saveCSV() {
    if (this.data.length === 0) {
      alert('No data to save');
      return;
    }
    
    // Create tab-separated format with drive link column
    let txtData = this.headers.join('\t') + '\tdrive_link\n';
    txtData += this.data.map(row => row.join('\t') + '\tdrive_link_placeholder').join('\n');
    
    // Upload to drive if connected
    if (driveIntegration.isConnected()) {
      try {
        this.showUploadProgress('Uploading file graph data...');
        
        const filename = this.outputFileName || 'file_graph.txt';
        const folderPath = this.outputFolderName || 'file_graphs';
        
        const driveLink = await driveIntegration.uploadFile(txtData, filename, folderPath);
        
        // Replace placeholder with actual drive link
        txtData = txtData.replace(/drive_link_placeholder/g, driveLink);
        
        this.hideUploadProgress();
        console.log('File graph uploaded to drive:', driveLink);
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
    
    // Use the configured filename or fallback to default
    const filename = this.outputFileName || 'file_graph.txt';
    a.download = filename;
    
    a.click();
    URL.revokeObjectURL(a.href);
  }
  
  showUploadProgress(message) {
    const progress = document.createElement('div');
    progress.id = 'upload-progress-file';
    progress.className = 'upload-progress';
    progress.innerHTML = `
      <div class="upload-progress-header">
        <span class="upload-progress-icon">📁</span>
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
      progressValue += Math.random() * 25;
      if (progressValue > 90) progressValue = 90;
      
      const fillElement = progress.querySelector('.upload-progress-fill');
      const detailsElement = progress.querySelector('.upload-progress-details');
      
      if (fillElement) {
        fillElement.style.width = progressValue + '%';
      }
      if (detailsElement) {
        detailsElement.textContent = `Uploading... ${Math.round(progressValue)}%`;
      }
    }, 200);
    
    progress.progressInterval = progressInterval;
  }
  hideUploadProgress() {
    const progress = document.getElementById('upload-progress-file');
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
  
  openFileDialog() {
    document.getElementById('sidebar-csv-upload').click();
  }
}