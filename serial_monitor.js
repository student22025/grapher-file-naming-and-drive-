@@ .. @@
+  showBaudRateMenu() {
+    const baudRates = [300, 1200, 2400, 4800, 9600, 19200, 38400, 57600, 74880, 115200, 230400, 250000];
+    
+    showModal(`
+      <div class="baud-rate-modal">
+        <div class="baud-rate-header">
+          <h3>Select Baud Rate</h3>
+        </div>
+        <div class="baud-rate-container">
+          ${baudRates.map(rate => `
+            <div class="baud-rate-item ${rate === this.baud ? 'selected' : ''}" data-baud="${rate}">
+              ${rate.toLocaleString()}
+            </div>
+          `).join('')}
+          <div class="baud-rate-item more-options" id="more-options-btn">
+            More Options
+          </div>
+        </div>
+        <div class="baud-rate-footer">
+          <button id="cancel-baud" class="baud-cancel-btn">Cancel</button>
+        </div>
+      </div>
+    `);
+    
+    // Set up event listeners after modal is created
+    setTimeout(() => {
+      document.querySelectorAll('.baud-rate-item[data-baud]').forEach(item => {
+        item.onclick = () => {
+          this.baud = parseInt(item.dataset.baud);
+          this.renderSidebar();
+          document.getElementById('modal').classList.add('hidden');
+          document.getElementById('modal').innerHTML = '';
+        };
+      });
+      
+      const moreOptionsBtn = document.getElementById('more-options-btn');
+      if (moreOptionsBtn) {
+        moreOptionsBtn.onclick = () => {
+          const customRate = prompt('Enter custom baud rate:', this.baud);
+          if (customRate && !isNaN(customRate)) {
+            this.baud = parseInt(customRate);
+            this.renderSidebar();
+          }
+          document.getElementById('modal').classList.add('hidden');
+          document.getElementById('modal').innerHTML = '';
+        };
+      }
+      
+      const cancelBtn = document.getElementById('cancel-baud');
+      if (cancelBtn) {
+        cancelBtn.onclick = () => {
+          document.getElementById('modal').classList.add('hidden');
+          document.getElementById('modal').innerHTML = '';
+        };
+      }
+    }, 10);
+  }
+
   renderSidebar() {
     const sb = document.getElementById('sidebar');
     const isAdmin = (window.loginInfo && window.loginInfo.role === "admin");
     
     sb.innerHTML = `
       <div class="sidebar-section">
         <h3>Serial Port</h3>
         <button id="serial-connect-btn" class="sidebtn connect-btn">${this.connected ? 'Disconnect' : 'Connect'}</button>
         <label>Port: COM4</label>
-        <label>Baud: <input id="serial-baud" type="number" value="${this.baud}" min="300" max="250000"></label>
+        <button id="baud-rate-btn" class="sidebtn baud-btn">Baud: ${this.baud.toLocaleString()}</button>
         <div class="keyboard-hint">Ctrl+Shift+C to connect</div>
       </div>
@@ .. @@
     
     document.getElementById('serial-connect-btn').onclick = () => this.toggleSerial();
-    document.getElementById('serial-baud').onchange = e => { this.baud = Number(e.target.value); };
+    document.getElementById('baud-rate-btn').onclick = () => this.showBaudRateMenu();
     document.getElementById('serial-record-btn').onclick = () => this.toggleRecording();