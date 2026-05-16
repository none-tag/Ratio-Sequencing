/**
 * Excel Parser Module
 * Handles reading and parsing CSBD, Marker Info, and ShapeShifter data from Excel files
 */

class ExcelParser {
    constructor() {
        this.workbook = null;
        this.csbdData = null;
        this.markerData = null;
        this.shapeshifterData = null;
    }

    /**
     * Read Excel file from input element
     */
    async readFile(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();

            reader.onload = (e) => {
                try {
                    const data = new Uint8Array(e.target.result);
                    this.workbook = XLSX.read(data, { type: 'array' });
                    resolve(this.workbook);
                } catch (error) {
                    reject(new Error('Failed to parse Excel file: ' + error.message));
                }
            };

            reader.onerror = () => reject(new Error('Failed to read file'));
            reader.readAsArrayBuffer(file);
        });
    }

    /**
     * Parse CSBD sheet
     */
    parseCSBD() {
        if (!this.workbook) throw new Error('No workbook loaded');

        const sheet = this.workbook.Sheets['CSBD'] || this.workbook.Sheets[Object.keys(this.workbook.Sheets)[0]];
        if (!sheet) throw new Error('CSBD sheet not found');

        const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1 });

        // Find the header row (contains "PACK TYPE", "PACK NAME", etc.)
        let headerRowIndex = -1;
        for (let i = 0; i < jsonData.length; i++) {
            const row = jsonData[i];
            if (row && row.includes('PACK TYPE') && row.includes('PACK NAME')) {
                headerRowIndex = i;
                break;
            }
        }

        if (headerRowIndex === -1) {
            throw new Error('Could not find CSBD header row');
        }

        const headers = jsonData[headerRowIndex];
        const sizeStartIndex = headers.indexOf('50');
        const sizeEndIndex = headers.indexOf('TOTAL');

        const shipments = [];
        let currentPackType = '';
        let currentPackName = '';
        let currentColor = '';
        let currentShipDate = '';

        for (let i = headerRowIndex + 1; i < jsonData.length; i++) {
            const row = jsonData[i];
            if (!row || row.length === 0) continue;

            // Check if this is a pack type row
            if (row[0] && ['BULK', 'SAMPLE'].includes(row[0].toString().trim())) {
                currentPackType = row[0].toString().trim();
                currentPackName = row[1] ? row[1].toString().trim() : '';
                currentColor = row[2] ? row[2].toString().trim() : '';
                continue;
            }

            // Check if this is a subtotal or grand total row
            if (row[0] && (row[0].toString().includes('SUB TOTAL') || row[0].toString().includes('GRAND TOTAL'))) {
                continue;
            }

            // Parse shipment row
            const country = row[6] ? row[6].toString().trim() : '';
            if (!country) continue;

            const shipDate = row[3] ? this.parseExcelDate(row[3]) : currentShipDate;
            currentShipDate = shipDate;

            const sizes = {};
            for (let j = sizeStartIndex; j < sizeEndIndex; j++) {
                const size = headers[j];
                const qty = row[j];
                if (size && qty !== undefined && qty !== '') {
                    sizes[size] = parseInt(qty) || 0;
                }
            }

            // Check if sizes object is not empty
            if (Object.keys(sizes).length > 0) {
                shipments.push({
                    packType: currentPackType,
                    packName: currentPackName,
                    color: currentColor,
                    shipDate: shipDate,
                    weekNo: row[4] ? parseInt(row[4]) : null,
                    shipDay: row[5] ? row[5].toString().trim() : '',
                    country: country,
                    shipmentMode: row[7] ? row[7].toString().trim() : '',
                    sizes: sizes,
                    group: getCountryGroup(country)
                });
            }
        }

        this.csbdData = {
            orderNo: this.extractOrderNo(jsonData),
            styleName: this.extractStyleName(jsonData),
            season: this.extractSeason(jsonData),
            buyer: this.extractBuyer(jsonData),
            packingType: this.extractPackingType(jsonData),
            productCategory: this.extractProductCategory(jsonData),
            company: this.extractCompany(jsonData),
            shipments: shipments
        };

        return this.csbdData;
    }

    /**
     * Parse Marker Information sheet
     */
    parseMarkerInfo() {
        if (!this.workbook) throw new Error('No workbook loaded');

        const sheet = this.workbook.Sheets['Marker Information'] || this.workbook.Sheets['Marker Info'];
        if (!sheet) {
            console.warn('Marker Info sheet not found, using default markers');
            this.markerData = this.getDefaultMarkers();
            return this.markerData;
        }

        const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1 });

        // Find header row
        let headerRowIndex = -1;
        for (let i = 0; i < jsonData.length; i++) {
            const row = jsonData[i];
            if (row && row.includes('Marker') && row.includes('50')) {
                headerRowIndex = i;
                break;
            }
        }

        if (headerRowIndex === -1) {
            console.warn('Could not find Marker Info header, using defaults');
            this.markerData = this.getDefaultMarkers();
            return this.markerData;
        }

        const headers = jsonData[headerRowIndex];
        const sizeStartIndex = headers.indexOf('50');
        const sizeEndIndex = headers.indexOf('Ply');
        const plyIndex = headers.indexOf('Ply');
        const canBeUsedIndex = headers.indexOf('Can Be Used');
        const countryGroupIndex = headers.indexOf('Country Group');

        const markers = {
            General: [],
            China: [],
            US: []
        };

        for (let i = headerRowIndex + 1; i < jsonData.length; i++) {
            const row = jsonData[i];
            if (!row || row.length === 0) continue;
            if (row[0] === 0 || row[0] === '0') continue;

            const markerId = row[0] ? row[0].toString().trim() : '';
            if (!markerId) continue;

            const ratio = {};
            for (let j = sizeStartIndex; j < sizeEndIndex; j++) {
                const size = headers[j];
                const val = row[j];
                if (size !== undefined && size !== '') {
                    ratio[size] = val !== undefined ? parseInt(val) || 0 : 0;
                }
            }

            const ply = plyIndex !== -1 ? (parseInt(row[plyIndex]) || 0) : 0;
            const canBeUsed = canBeUsedIndex !== -1 ? (parseInt(row[canBeUsedIndex]) || 0) : 0;
            const group = countryGroupIndex !== -1 ? 
                (row[countryGroupIndex] ? row[countryGroupIndex].toString().trim() : 'General') : 'General';

            if (Object.keys(ratio).length > 0 && ply > 0) {
                const marker = {
                    id: `${group}${markerId}`,
                    name: markerId,
                    ratio: ratio,
                    ply: ply,
                    canBeUsed: canBeUsed,
                    group: group
                };

                if (group === 'China') {
                    markers.China.push(marker);
                } else if (group === 'US') {
                    markers.US.push(marker);
                } else {
                    markers.General.push(marker);
                }
            }
        }

        this.markerData = markers;
        return this.markerData;
    }

    /**
     * Parse ShapeShifter Input sheet
     */
    parseShapeShifterInput() {
        if (!this.workbook) throw new Error('No workbook loaded');

        const sheet = this.workbook.Sheets['ShapeShifter Input'] || 
                      this.workbook.Sheets['ShapeShifter Input Format'] ||
                      this.workbook.Sheets['SS Input'];

        if (!sheet) {
            console.warn('ShapeShifter Input sheet not found');
            return null;
        }

        const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1 });

        // Find data row (skip header rows)
        let dataRowIndex = -1;
        for (let i = 1; i < jsonData.length; i++) {
            const row = jsonData[i];
            if (row && row[0] && row[0].toString().includes('452957')) {
                dataRowIndex = i;
                break;
            }
        }

        if (dataRowIndex === -1) {
            console.warn('Could not find ShapeShifter data row');
            return null;
        }

        const row = jsonData[dataRowIndex];
        const headers = jsonData[0];

        const sizeStartIndex = headers.indexOf('50');
        const sizes = {};

        for (let i = sizeStartIndex; i < headers.length; i++) {
            const size = headers[i];
            const qty = row[i];
            if (size && qty !== undefined) {
                sizes[size] = parseInt(qty) || 0;
            }
        }

        this.shapeshifterData = {
            style: row[0],
            fabric: row[1],
            item: row[2],
            po: row[3],
            buyer: row[4],
            color: row[5],
            fabricLocation: row[6],
            fabricDescription: row[7],
            gsm: row[8],
            fabricWidth: row[9],
            maxLength: row[10],
            maxLayQty: row[11],
            fabricType: row[12],
            rotation: row[13],
            orderQuantity: row[14],
            sizes: sizes
        };

        return this.shapeshifterData;
    }

    /**
     * Get default markers based on the Excel file
     */
    getDefaultMarkers() {
        return {
            General: [
                { id: 'General1', name: '1', ratio: {"50":1,"56":1,"62":2,"68":3,"74":4,"80":4,"86":5,"92":4,"98":3,"104":1}, ply: 100, canBeUsed: 2, group: 'General' },
                { id: 'General2', name: '2', ratio: {"50":0,"56":2,"62":2,"68":4,"74":4,"80":5,"86":5,"92":4,"98":1,"104":1}, ply: 94, canBeUsed: 1, group: 'General' },
                { id: 'General3', name: '3', ratio: {"50":0,"56":1,"62":4,"68":1,"74":3,"80":7,"86":7,"92":3,"98":0,"104":0}, ply: 95, canBeUsed: 1, group: 'General' },
                { id: 'General4', name: '4', ratio: {"50":2,"56":1,"62":0,"68":2,"74":1,"80":1,"86":0,"92":0,"98":3,"104":0}, ply: 25, canBeUsed: 1, group: 'General' }
            ],
            China: [
                { id: 'China1', name: '1', ratio: {"50":0,"56":1,"62":1,"68":1,"74":3,"80":3,"86":3,"92":1,"98":1,"104":0}, ply: 36, canBeUsed: 1, group: 'China' },
                { id: 'China2', name: '2', ratio: {"50":1,"56":0,"62":0,"68":0,"74":0,"80":4,"86":0,"92":2,"98":1,"104":1}, ply: 22, canBeUsed: 1, group: 'China' },
                { id: 'China3', name: '3', ratio: {"50":0,"56":0,"62":0,"68":1,"74":0,"80":0,"86":1,"92":0,"98":0,"104":1}, ply: 8, canBeUsed: 1, group: 'China' }
            ],
            US: [
                { id: 'US1', name: '1', ratio: {"50":0,"56":1,"62":2,"68":2,"74":2,"80":3,"86":4,"92":2,"98":0,"104":0}, ply: 29, canBeUsed: 1, group: 'US' },
                { id: 'US2', name: '2', ratio: {"50":1,"56":0,"62":0,"68":0,"74":2,"80":0,"86":0,"92":2,"98":3,"104":1}, ply: 10, canBeUsed: 1, group: 'US' },
                { id: 'US3', name: '3', ratio: {"50":1,"56":0,"62":0,"68":0,"74":0,"80":2,"86":1,"92":0,"98":2,"104":2}, ply: 3, canBeUsed: 1, group: 'US' }
            ]
        };
    }

    /**
     * Parse Excel date serial number
     */
    parseExcelDate(excelDate) {
        if (typeof excelDate === 'number') {
            // Excel date serial number
            const epoch = new Date(1899, 11, 30);
            const date = new Date(epoch.getTime() + excelDate * 24 * 60 * 60 * 1000);
            return date.toISOString().split('T')[0];
        }
        return excelDate ? excelDate.toString() : '';
    }

    // Helper methods to extract metadata
    extractOrderNo(data) {
        for (const row of data) {
            if (row && row.includes('ORDER NO')) {
                const idx = row.indexOf('ORDER NO');
                return row[idx + 1] ? row[idx + 1].toString() : '';
            }
        }
        return '';
    }

    extractStyleName(data) {
        for (const row of data) {
            if (row && row.includes('STYLE NAME')) {
                const idx = row.indexOf('STYLE NAME');
                return row[idx + 1] ? row[idx + 1].toString() : '';
            }
        }
        return '';
    }

    extractSeason(data) {
        for (const row of data) {
            if (row && row.includes('SEASON')) {
                const idx = row.indexOf('SEASON');
                return row[idx + 1] ? row[idx + 1].toString() : '';
            }
        }
        return '';
    }

    extractBuyer(data) {
        for (const row of data) {
            if (row && row.includes('BUYER NAME')) {
                const idx = row.indexOf('BUYER NAME');
                return row[idx + 1] ? row[idx + 1].toString() : '';
            }
        }
        return '';
    }

    extractPackingType(data) {
        for (const row of data) {
            if (row && row.includes('PACKING TYPE')) {
                const idx = row.indexOf('PACKING TYPE');
                return row[idx + 1] ? row[idx + 1].toString() : '';
            }
        }
        return '';
    }

    extractProductCategory(data) {
        for (const row of data) {
            if (row && row.includes('PRODUCT CATEGORY')) {
                const idx = row.indexOf('PRODUCT CATEGORY');
                return row[idx + 1] ? row[idx + 1].toString() : '';
            }
        }
        return '';
    }

    extractCompany(data) {
        for (const row of data) {
            if (row && row.includes('COMPANY')) {
                const idx = row.indexOf('COMPANY');
                return row[idx + 1] ? row[idx + 1].toString() : '';
            }
        }
        return '';
    }
}

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ExcelParser;
}
