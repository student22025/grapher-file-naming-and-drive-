@@ .. @@
   showBaudRateMenu() {
     const baudRates = [300, 1200, 2400, 4800, 9600, 19200, 38400, 57600, 74880, 115200, 230400, 250000];
     
     showModal(`
-      <div class="baud-rate-menu">
-        <h3>Select Baud Rate</h3>
-        <div class="baud-rate-list">
-          ${baudRates.map(rate => `
-            <button class="baud-rate-option ${rate === this.baud ? 'selected' : ''}" data-baud="${rate}">
-              ${rate}
-            </button>
-          `).join('')}
-        </div>
-        <div class="baud-rate-actions">
-          <button id="more-options-btn" class="baud-rate-option">More Options</button>
-          <button id="cancel-baud" class="baud-rate-cancel">Cancel</button>
-        </div>
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
       </div>
     `);
     
     // Set up event listeners after modal is created
     setTimeout(() => {
-      document.querySelectorAll('.baud-rate-option[data-baud]').forEach(btn => {
-        btn.onclick = () => {
-          this.baud = parseInt(btn.dataset.baud);
+      document.querySelectorAll('.baud-rate-item[data-baud]').forEach(item => {
+        item.onclick = () => {
+          this.baud = parseInt(item.dataset.baud);
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