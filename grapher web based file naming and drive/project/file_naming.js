// File Naming System - Processing Grapher Web
import { showModal } from './ui.js';

// Mapping dictionaries from the Python code
const experimentCodes = {
  'GE': 'Gesture',
  'GS': 'Grasping', 
  'ET': 'ETS',
  'EV': 'EETN',
  'SU': 'Suture',
  'NE': 'Neuro VR',
  'CR': 'Craniotomy'
};

const modelCodes = {
  '01': 'Nil',
  '02': 'Bone',
  '03': 'Model',
  '04': 'Skin',
  '05': 'Other'
};

const yearCodes = {
  'B1': 'MBBS Y1',
  'B2': 'MBBS Y2',
  'B3': 'MBBS Y3',
  'B4': 'MBBS Y4',
  'B5': 'MBBS Y5',
  'J1': 'JR Y1',
  'J2': 'JR Y2',
  'J3': 'JR Y3',
  'S1': 'SR Y1',
  'S2': 'SR Y2',
  'S3': 'SR Y3',
  'M1': 'Master Y1',
  'M2': 'Master Y2',
  'D1': 'Doctor Y1'
};

const experienceCodes = {
  'E0': 'No experience',
  'E1': 'Attended workshop',
  'E2': 'Advance training',
  'E3': 'JR Fresher',
  'E4': 'JR Experience',
  'E5': 'SR Fresher',
  'E6': 'SR Experience',
  'E7': 'Fellowship / Master',
  'E8': 'Junior Doctor',
  'E9': 'Senior Doctor'
};

export class FileNamingSystem {
  constructor() {
    this.currentSettings = {
      experimentType: 'GE',
      modelType: '01',
      year: 'B1',
      experience: 'E0',
      subjectNo: '1',
      trialNo: '1'
    };
  }

  createSelectOptions(codes) {
    return Object.entries(codes).map(([code, name]) => 
      `<option value="${code}">${code} - ${name}</option>`
    ).join('');
  }

  generateFilename() {
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const subject = parseInt(this.currentSettings.subjectNo);
    const trial = parseInt(this.currentSettings.trialNo);
    
    if (isNaN(subject) || isNaN(trial)) {
      throw new Error('Subject No and Trial No must be numeric');
    }

    // Generate folder name
    const folderName = `${this.currentSettings.experimentType}${this.currentSettings.modelType}${this.currentSettings.year}${this.currentSettings.experience}S${subject.toString().padStart(2, '0')}T${trial}D${dateStr}`;
    
    // Generate file name
    const fileName = `${this.currentSettings.experimentType}${this.currentSettings.modelType}${this.currentSettings.year}${this.currentSettings.experience}S${subject.toString().padStart(2, '0')}T${trial}.txt`;
    
    return {
      folderName,
      fileName,
      fullPath: `Endo_Data/${folderName}/${fileName}`
    };
  }

  updatePreview() {
    try {
      const result = this.generateFilename();
      const previewElement = document.getElementById('filename-preview');
      if (previewElement) {
        previewElement.innerHTML = `
          <div class="filename-preview">
            <div class="preview-section">
              <strong>Folder:</strong> <code>${result.folderName}</code>
            </div>
            <div class="preview-section">
              <strong>File:</strong> <code>${result.fileName}</code>
            </div>
            <div class="preview-section">
              <strong>Full Path:</strong> <code>${result.fullPath}</code>
            </div>
          </div>
        `;
      }
    } catch (error) {
      const previewElement = document.getElementById('filename-preview');
      if (previewElement) {
        previewElement.innerHTML = `<div class="error-message">Error: ${error.message}</div>`;
      }
    }
  }

  showFileNamingDialog(callback) {
    showModal(`
      <div class="file-naming-dialog">
        <h3>🧪 Set Output File Name</h3>
        
        <div class="form-grid">
          <div class="form-group">
            <label for="experiment-type">Experiment Type:</label>
            <select id="experiment-type" class="form-select">
              ${this.createSelectOptions(experimentCodes)}
            </select>
          </div>
          
          <div class="form-group">
            <label for="model-type">Model Type:</label>
            <select id="model-type" class="form-select">
              ${this.createSelectOptions(modelCodes)}
            </select>
          </div>
          
          <div class="form-group">
            <label for="year-type">Year:</label>
            <select id="year-type" class="form-select">
              ${this.createSelectOptions(yearCodes)}
            </select>
          </div>
          
          <div class="form-group">
            <label for="experience-type">Experience:</label>
            <select id="experience-type" class="form-select">
              ${this.createSelectOptions(experienceCodes)}
            </select>
          </div>
          
          <div class="form-group">
            <label for="subject-no">Subject No:</label>
            <input type="number" id="subject-no" class="form-input" value="${this.currentSettings.subjectNo}" min="1" max="99">
          </div>
          
          <div class="form-group">
            <label for="trial-no">Trial No:</label>
            <input type="number" id="trial-no" class="form-input" value="${this.currentSettings.trialNo}" min="1" max="99">
          </div>
        </div>
        
        <div class="preview-container">
          <h4>Preview:</h4>
          <div id="filename-preview"></div>
        </div>
        
        <div class="dialog-actions">
          <button id="save-filename" class="sidebtn accent">Set File Name</button>
          <button id="cancel-filename" class="sidebtn">Cancel</button>
        </div>
      </div>
    `);

    // Set current values
    document.getElementById('experiment-type').value = this.currentSettings.experimentType;
    document.getElementById('model-type').value = this.currentSettings.modelType;
    document.getElementById('year-type').value = this.currentSettings.year;
    document.getElementById('experience-type').value = this.currentSettings.experience;
    document.getElementById('subject-no').value = this.currentSettings.subjectNo;
    document.getElementById('trial-no').value = this.currentSettings.trialNo;

    // Update preview initially
    this.updatePreview();

    // Add event listeners for real-time preview updates
    const inputs = ['experiment-type', 'model-type', 'year-type', 'experience-type', 'subject-no', 'trial-no'];
    inputs.forEach(id => {
      const element = document.getElementById(id);
      if (element) {
        element.addEventListener('change', () => {
          this.currentSettings.experimentType = document.getElementById('experiment-type').value;
          this.currentSettings.modelType = document.getElementById('model-type').value;
          this.currentSettings.year = document.getElementById('year-type').value;
          this.currentSettings.experience = document.getElementById('experience-type').value;
          this.currentSettings.subjectNo = document.getElementById('subject-no').value;
          this.currentSettings.trialNo = document.getElementById('trial-no').value;
          this.updatePreview();
        });
      }
    });

    // Handle save button
    document.getElementById('save-filename').onclick = () => {
      try {
        // Update settings
        this.currentSettings.experimentType = document.getElementById('experiment-type').value;
        this.currentSettings.modelType = document.getElementById('model-type').value;
        this.currentSettings.year = document.getElementById('year-type').value;
        this.currentSettings.experience = document.getElementById('experience-type').value;
        this.currentSettings.subjectNo = document.getElementById('subject-no').value;
        this.currentSettings.trialNo = document.getElementById('trial-no').value;

        const result = this.generateFilename();
        
        // Close modal
        document.getElementById('modal').classList.add('hidden');
        document.getElementById('modal').innerHTML = '';
        
        // Call callback with the generated filename
        if (callback) {
          callback(result);
        }
        
        // Show success message
        this.showSuccessMessage(result.fileName);
        
      } catch (error) {
        alert('Error: ' + error.message);
      }
    };

    // Handle cancel button
    document.getElementById('cancel-filename').onclick = () => {
      document.getElementById('modal').classList.add('hidden');
      document.getElementById('modal').innerHTML = '';
    };
  }

  showSuccessMessage(fileName) {
    // Create a temporary success notification
    const notification = document.createElement('div');
    notification.className = 'success-notification';
    notification.innerHTML = `
      <div class="notification-content">
        <span class="notification-icon">✅</span>
        <span class="notification-text">Output file set to: <strong>${fileName}</strong></span>
      </div>
    `;
    
    document.body.appendChild(notification);
    
    // Remove notification after 3 seconds
    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
    }, 3000);
  }

  getFormattedFilename() {
    try {
      return this.generateFilename();
    } catch (error) {
      return {
        folderName: 'Invalid_Settings',
        fileName: 'data.csv',
        fullPath: 'data.csv'
      };
    }
  }
}

// Create a global instance
export const fileNamingSystem = new FileNamingSystem();