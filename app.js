/**
 * Cut Ratio Sequencer Application
 * Main application controller
 */

class CutRatioApp {
    constructor() {
        this.parser = new ExcelParser();
        this.sequencer = new RatioSequencer();
        this.exporter = new ExcelExporter();

        this.csbdData = null;
        this.markerData = null;
        this.shapeshifterData = null;
        this.sequencingResults = null;

        this.sizes = ["50", "56", "62", "68", "74", "80", "86", "92", "98", "104"];

        this.init();
    }

    init() {
        this.bindEvents();
        this.setupDragAndDrop();
    }

    bindEvents() {
        // File upload
        const fileInput = document.getElementById('csbd-file');
        const uploadArea = document.getElementById('csbd-upload');

        uploadArea.addEventListener('click', () => fileInput.click());

        fileInput.addEventListener('change', (e) => {
            if (e.target.files.length > 0) {
                this.handleFileUpload(e.target.files[0]);
            }
        });

        // Tabs
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.switchTab(e.target.dataset.tab));
        });

        document.querySelectorAll('.result-tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.switchResultTab(e.target.dataset.result));
        });

        // Run sequencing
        document.getElementById('run-sequencing').addEventListener('click', () => this.runSequencing());

        // Export
        document.getElementById('export-excel').addEventListener('click', () => this.exportResults());
        document.getElementById('export-cad').addEventListener('click', () => this.exportCAD());
    }

    setupDragAndDrop() {
        const uploadArea = document.getElementById('csbd-upload');

        uploadArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            uploadArea.classList.add('dragover');
        });

        uploadArea.addEventListener('dragleave', () => {
            uploadArea.classList.remove('dragover');
        });

        uploadArea.addEventListener('drop', (e) => {
            e.preventDefault();
            uploadArea.classList.remove('dragover');

            const files = e.dataTransfer.files;
            if (files.length > 0) {
                const file = files[0];
                if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
                    this.handleFileUpload(file);
                } else {
                    this.showStatus('error', 'Please upload an Excel file (.xlsx or .xls)');
                }
            }
        });
    }

    async handleFileUpload(file) {
        const statusEl = document.getElementById('csbd-status');
        this.showStatus('info', 'Reading file...', statusEl);

        try {
            await this.parser.readFile(file);

            // Parse all sheets
            this.csbdData = this.parser.parseCSBD();
            this.markerData = this.parser.parseMarkerInfo();
            this.shapeshifterData = this.parser.parseShapeShifterInput();

            // Populate form fields
            this.populateFormFields();

            // Show review section
            this.showSection('config-section');
            this.showSection('review-section');

            // Render tables
            this.renderCSBDTable();
            this.renderMarkersTable();
            this.renderShapeShifterTable();

            this.showStatus('success', `Successfully loaded: ${this.csbdData.shipments.length} shipments, ${Object.values(this.markerData).flat().length} markers`, statusEl);

        } catch (error) {
            console.error('Error parsing file:', error);
            this.showStatus('error', 'Error reading file: ' + error.message, statusEl);
        }
    }

    populateFormFields() {
        if (this.csbdData) {
            document.getElementById('order-no').value = this.csbdData.orderNo || '';
            document.getElementById('style-name').value = this.csbdData.styleName || '';
            document.getElementById('buyer').value = this.csbdData.buyer || '';
            document.getElementById('season').value = this.csbdData.season || '';
        }

        if (this.shapeshifterData) {
            document.getElementById('color').value = this.shapeshifterData.color || '';
        }
    }

    showSection(sectionId) {
        const section = document.getElementById(sectionId);
        if (section) {
            section.classList.remove('hidden');
        }
    }

    showStatus(type, message, element = null) {
        const statusEl = element || document.getElementById('sequencing-status');
        statusEl.className = `status show ${type}`;
        statusEl.textContent = message;
    }

    switchTab(tabName) {
        document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));

        document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
        document.getElementById(`${tabName}-tab`).classList.add('active');
    }

    switchResultTab(resultName) {
        document.querySelectorAll('.result-tab-btn').forEach(btn => btn.classList.remove('active'));
        document.querySelectorAll('.result-content').forEach(content => content.classList.remove('active'));

        document.querySelector(`[data-result="${resultName}"]`).classList.add('active');
        document.getElementById(`${resultName}-results`).classList.add('active');
    }

    renderCSBDTable() {
        const table = document.getElementById('csbd-table');
        const thead = table.querySelector('thead');
        const tbody = table.querySelector('tbody');

        // Header
        thead.innerHTML = `
            <tr>
                <th>Country</th>
                <th>Group</th>
                <th>Ship Date</th>
                <th>Pack Type</th>
                ${this.sizes.map(s => `<th>Size ${s}</th>`).join('')}
                <th>Total</th>
            </tr>
        `;

        // Body
        tbody.innerHTML = this.csbdData.shipments.map(shipment => {
            const total = this.sizes.reduce((sum, size) => sum + (shipment.sizes[size] || 0), 0);
            return `
                <tr>
                    <td><strong>${shipment.country}</strong></td>
                    <td><span class="group-badge ${shipment.group.toLowerCase()}">${shipment.group}</span></td>
                    <td>${shipment.shipDate}</td>
                    <td>${shipment.packType}</td>
                    ${this.sizes.map(size => `<td>${shipment.sizes[size] || 0}</td>`).join('')}
                    <td><strong>${total}</strong></td>
                </tr>
            `;
        }).join('');
    }

    renderMarkersTable() {
        const table = document.getElementById('markers-table');
        const thead = table.querySelector('thead');
        const tbody = table.querySelector('tbody');

        // Header
        thead.innerHTML = `
            <tr>
                <th>Group</th>
                <th>Marker ID</th>
                <th>Ply</th>
                <th>Can Be Used</th>
                ${this.sizes.map(s => `<th>${s}</th>`).join('')}
            </tr>
        `;

        // Body
        let rows = '';
        Object.entries(this.markerData).forEach(([group, markers]) => {
            markers.forEach(marker => {
                rows += `
                    <tr>
                        <td><span class="group-badge ${group.toLowerCase()}">${group}</span></td>
                        <td><strong>${marker.id}</strong></td>
                        <td>${marker.ply}</td>
                        <td>${marker.canBeUsed}</td>
                        ${this.sizes.map(size => `<td>${marker.ratio[size] || 0}</td>`).join('')}
                    </tr>
                `;
            });
        });
        tbody.innerHTML = rows;
    }

    renderShapeShifterTable() {
        const table = document.getElementById('shapeshifter-table');
        const thead = table.querySelector('thead');
        const tbody = table.querySelector('tbody');

        if (!this.shapeshifterData) {
            tbody.innerHTML = '<tr><td colspan="20">No ShapeShifter data found</td></tr>';
            return;
        }

        // Header
        thead.innerHTML = `
            <tr>
                <th>Style</th>
                <th>PO</th>
                <th>Buyer</th>
                <th>Color</th>
                <th>Fabric</th>
                <th>GSM</th>
                <th>Width</th>
                <th>Max Length</th>
                <th>Max Lay Qty</th>
                ${this.sizes.map(s => `<th>${s}</th>`).join('')}
            </tr>
        `;

        // Body
        const data = this.shapeshifterData;
        tbody.innerHTML = `
            <tr>
                <td>${data.style || ''}</td>
                <td>${data.po || ''}</td>
                <td>${data.buyer || ''}</td>
                <td>${data.color || ''}</td>
                <td>${data.fabricDescription || ''}</td>
                <td>${data.gsm || ''}</td>
                <td>${data.fabricWidth || ''}</td>
                <td>${data.maxLength || ''}</td>
                <td>${data.maxLayQty || ''}</td>
                ${this.sizes.map(size => `<td>${data.sizes[size] || 0}</td>`).join('')}
            </tr>
        `;
    }

    runSequencing() {
        const statusEl = document.getElementById('sequencing-status');
        this.showStatus('info', 'Running sequencing algorithm...', statusEl);

        try {
            const extraPercent = parseFloat(document.getElementById('extra-percent').value) || 2;

            // Run sequencing
            this.sequencingResults = this.sequencer.runSequencing(
                this.csbdData,
                this.markerData,
                extraPercent
            );

            // Show results section
            this.showSection('results-section');

            // Render results
            this.renderSequencingResults();
            this.renderSummary();

            this.showStatus('success', 'Sequencing completed successfully!', statusEl);

        } catch (error) {
            console.error('Sequencing error:', error);
            this.showStatus('error', 'Error running sequencing: ' + error.message, statusEl);
        }
    }

    renderSequencingResults() {
        // Render each group
        Object.entries(this.sequencingResults).forEach(([groupName, result]) => {
            if (!result) return;

            const tableId = `${groupName.toLowerCase()}-sequence-table`;
            const table = document.getElementById(tableId);
            if (!table) return;

            const thead = table.querySelector('thead');
            const tbody = table.querySelector('tbody');

            // Header
            thead.innerHTML = `
                <tr>
                    <th>Cut #</th>
                    <th>Marker</th>
                    <th>Ply</th>
                    ${this.sizes.map(s => `<th>${s}</th>`).join('')}
                    <th>Total</th>
                    <th>Coverage %</th>
                </tr>
            `;

            // Body
            let html = '';

            // Order quantity row
            const orderTotal = this.sizes.reduce((sum, size) => sum + (result.originalQty[size] || 0), 0);
            html += `
                <tr class="cut-row">
                    <td colspan="3"><strong>ORDER QTY</strong></td>
                    ${this.sizes.map(size => `<td><strong>${result.originalQty[size] || 0}</strong></td>`).join('')}
                    <td><strong>${orderTotal}</strong></td>
                    <td></td>
                </tr>
            `;

            // Target quantity row
            const targetTotal = this.sizes.reduce((sum, size) => sum + (result.targetQty[size] || 0), 0);
            html += `
                <tr class="cut-row">
                    <td colspan="3"><strong>TARGET QTY (+${document.getElementById('extra-percent').value}%)</strong></td>
                    ${this.sizes.map(size => `<td><strong>${result.targetQty[size] || 0}</strong></td>`).join('')}
                    <td><strong>${targetTotal}</strong></td>
                    <td></td>
                </tr>
            `;

            // Cuts
            let currentBalance = { ...result.targetQty };

            result.cuts.forEach((cut, index) => {
                const cutTotal = this.sizes.reduce((sum, size) => sum + (cut.cutQty[size] || 0), 0);

                // Cut row
                html += `
                    <tr>
                        <td><strong>${cut.cutNumber}</strong></td>
                        <td>${cut.markerId}</td>
                        <td>${cut.ply}</td>
                        ${this.sizes.map(size => `<td>${cut.cutQty[size] || 0}</td>`).join('')}
                        <td><strong>${cutTotal}</strong></td>
                        <td>${(cut.averageCoverage * 100).toFixed(2)}%</td>
                    </tr>
                `;

                // Update balance
                this.sizes.forEach(size => {
                    currentBalance[size] = Math.max(0, (currentBalance[size] || 0) - (cut.cutQty[size] || 0));
                });

                // Balance row
                const balanceTotal = this.sizes.reduce((sum, size) => sum + (currentBalance[size] || 0), 0);
                const hasNegative = Object.values(currentBalance).some(v => v < 0);

                html += `
                    <tr class="balance-row">
                        <td></td>
                        <td colspan="2"><em>Balance after Cut ${cut.cutNumber}</em></td>
                        ${this.sizes.map(size => {
                            const val = currentBalance[size] || 0;
                            const className = val < 0 ? 'negative' : (val === 0 ? 'positive' : '');
                            return `<td class="${className}">${val}</td>`;
                        }).join('')}
                        <td><em>${balanceTotal}</em></td>
                        <td></td>
                    </tr>
                `;
            });

            // Final summary
            const finalCutTotal = this.sizes.reduce((sum, size) => sum + (result.totalCut[size] || 0), 0);
            const finalOvercutTotal = this.sizes.reduce((sum, size) => sum + (result.totalOvercut[size] || 0), 0);
            const finalBalanceTotal = this.sizes.reduce((sum, size) => sum + (result.finalRemaining[size] || 0), 0);

            html += `
                <tr class="cut-row">
                    <td colspan="3"><strong>TOTAL CUT</strong></td>
                    ${this.sizes.map(size => `<td><strong>${result.totalCut[size] || 0}</strong></td>`).join('')}
                    <td><strong>${finalCutTotal}</strong></td>
                    <td></td>
                </tr>
                <tr style="background: var(--danger-light);">
                    <td colspan="3"><strong>OVERCUT</strong></td>
                    ${this.sizes.map(size => `<td class="negative"><strong>${result.totalOvercut[size] || 0}</strong></td>`).join('')}
                    <td class="negative"><strong>${finalOvercutTotal}</strong></td>
                    <td></td>
                </tr>
                <tr class="balance-row">
                    <td colspan="3"><strong>FINAL BALANCE</strong></td>
                    ${this.sizes.map(size => `<td>${result.finalRemaining[size] || 0}</td>`).join('')}
                    <td><strong>${finalBalanceTotal}</strong></td>
                    <td></td>
                </tr>
            `;

            tbody.innerHTML = html;
        });
    }

    renderSummary() {
        const summary = this.sequencer.calculateSummary(this.sequencingResults);

        document.getElementById('total-order').textContent = summary.totalOrder.toLocaleString();
        document.getElementById('total-cut').textContent = summary.totalCut.toLocaleString();
        document.getElementById('total-overcut').textContent = summary.totalOvercut.toLocaleString();
        document.getElementById('extra-cutting-pct').textContent = summary.extraCuttingPct + '%';

        // Render chart
        this.renderBalanceChart();
    }

    renderBalanceChart() {
        const canvas = document.getElementById('balance-chart');
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        canvas.width = canvas.offsetWidth || 800;
        canvas.height = 400;

        // Clear canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Prepare data
        const groups = ['General', 'China', 'US'];
        const colors = ['#2563eb', '#be185d', '#059669'];
        const barWidth = 60;
        const groupWidth = barWidth * 3 + 20;
        const startX = 80;
        const startY = canvas.height - 60;
        const maxHeight = canvas.height - 100;

        // Find max value
        let maxValue = 0;
        groups.forEach(group => {
            const result = this.sequencingResults[group];
            if (result) {
                this.sizes.forEach(size => {
                    maxValue = Math.max(maxValue, result.originalQty[size] || 0);
                    maxValue = Math.max(maxValue, result.totalCut[size] || 0);
                });
            }
        });

        // Draw axes
        ctx.strokeStyle = '#e2e8f0';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(startX, startY);
        ctx.lineTo(canvas.width - 40, startY);
        ctx.stroke();

        // Draw bars
        this.sizes.forEach((size, sizeIndex) => {
            const x = startX + sizeIndex * groupWidth;

            // Size label
            ctx.fillStyle = '#64748b';
            ctx.font = '12px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(size, x + groupWidth / 2, startY + 30);

            groups.forEach((group, groupIndex) => {
                const result = this.sequencingResults[group];
                if (!result) return;

                const orderQty = result.originalQty[size] || 0;
                const cutQty = result.totalCut[size] || 0;

                const orderHeight = (orderQty / maxValue) * maxHeight;
                const cutHeight = (cutQty / maxValue) * maxHeight;

                const barX = x + groupIndex * (barWidth + 5);

                // Order bar (lighter)
                ctx.fillStyle = colors[groupIndex] + '40';
                ctx.fillRect(barX, startY - orderHeight, barWidth, orderHeight);

                // Cut bar (darker)
                ctx.fillStyle = colors[groupIndex];
                ctx.fillRect(barX, startY - cutHeight, barWidth, cutHeight);

                // Value labels
                if (cutHeight > 20) {
                    ctx.fillStyle = 'white';
                    ctx.font = '10px sans-serif';
                    ctx.fillText(cutQty, barX + barWidth / 2, startY - cutHeight + 15);
                }
            });
        });

        // Legend
        const legendY = 30;
        groups.forEach((group, index) => {
            const legendX = canvas.width - 200 + index * 70;
            ctx.fillStyle = colors[index];
            ctx.fillRect(legendX, legendY, 15, 15);
            ctx.fillStyle = '#1e293b';
            ctx.font = '12px sans-serif';
            ctx.textAlign = 'left';
            ctx.fillText(group, legendX + 20, legendY + 12);
        });
    }

    exportResults() {
        if (!this.sequencingResults) {
            alert('Please run sequencing first');
            return;
        }

        const config = {
            orderNo: document.getElementById('order-no').value,
            styleName: document.getElementById('style-name').value,
            buyer: document.getElementById('buyer').value,
            season: document.getElementById('season').value,
            color: document.getElementById('color').value,
            extraPercent: parseFloat(document.getElementById('extra-percent').value) || 2
        };

        const wb = this.exporter.exportResults(this.sequencingResults, this.csbdData, config);
        const filename = `Cut_Ratio_Sequencing_${config.orderNo || 'Result'}_${new Date().toISOString().split('T')[0]}.xlsx`;

        this.exporter.downloadWorkbook(wb, filename);
    }

    exportCAD() {
        if (!this.sequencingResults) {
            alert('Please run sequencing first');
            return;
        }

        const wb = XLSX.utils.book_new();

        Object.entries(this.sequencingResults).forEach(([groupName, result]) => {
            if (!result) return;

            const sheet = this.exporter.createCADSheet(result, groupName);
            XLSX.utils.book_append_sheet(wb, sheet, `CAD ${groupName}`);
        });

        const config = {
            orderNo: document.getElementById('order-no').value
        };

        const filename = `CAD_CutPlan_${config.orderNo || 'Result'}_${new Date().toISOString().split('T')[0]}.xlsx`;
        XLSX.writeFile(wb, filename);
    }
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.app = new CutRatioApp();
});
