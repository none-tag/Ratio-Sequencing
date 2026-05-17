/**
 * Excel Export Module
 * Handles exporting sequencing results to Excel format
 */

class ExcelExporter {
    constructor() {
        this.sizes = ["50", "56", "62", "68", "74", "80", "86", "92", "98", "104"];
    }

    /**
     * Export sequencing results to Excel workbook
     */
    exportResults(results, csbdData, config) {
        const wb = XLSX.utils.book_new();

        // Add summary sheet
        const summarySheet = this.createSummarySheet(results, csbdData, config);
        XLSX.utils.book_append_sheet(wb, summarySheet, "Summary");

        // Add group-specific sheets
        Object.entries(results).forEach(([groupName, result]) => {
            if (result) {
                const sheet = this.createGroupSheet(result, groupName);
                XLSX.utils.book_append_sheet(wb, sheet, `Sequencing ${groupName}`);

                const cadSheet = this.createCADSheet(result, groupName);
                XLSX.utils.book_append_sheet(wb, cadSheet, `CAD ${groupName}`);
            }
        });

        // Add order balance sheet
        const balanceSheet = this.createOrderBalanceSheet(results, csbdData);
        XLSX.utils.book_append_sheet(wb, balanceSheet, "Order Balance");

        return wb;
    }

    /**
     * Create summary sheet
     */
    createSummarySheet(results, csbdData, config) {
        const data = [
            ["CUT RATIO SEQUENCING RESULTS"],
            [],
            ["Order Information"],
            ["Order Number", config.orderNo || csbdData.orderNo || ""],
            ["Style Name", config.styleName || csbdData.styleName || ""],
            ["Buyer", config.buyer || csbdData.buyer || ""],
            ["Season", config.season || csbdData.season || ""],
            ["Color", config.color || ""],
            ["Extra Cutting %", config.extraPercent || 2],
            [],
            ["Group Summary"],
            ["Group", "Total Order", "Total Cut", "Total Overcut", "Extra %", "Cuts Made"]
        ];

        let grandTotalOrder = 0;
        let grandTotalCut = 0;
        let grandTotalOvercut = 0;

        Object.entries(results).forEach(([groupName, result]) => {
            if (!result) return;

            let groupOrder = 0;
            let groupCut = 0;
            let groupOvercut = 0;

            this.sizes.forEach(size => {
                groupOrder += result.originalQty[size] || 0;
                groupCut += result.totalCut[size] || 0;
                groupOvercut += result.totalOvercut[size] || 0;
            });

            grandTotalOrder += groupOrder;
            grandTotalCut += groupCut;
            grandTotalOvercut += groupOvercut;

            const extraPct = groupOrder > 0 ? ((groupCut - groupOrder) / groupOrder * 100).toFixed(2) : 0;

            data.push([
                groupName,
                groupOrder,
                groupCut,
                groupOvercut,
                extraPct + "%",
                result.cuts.length
            ]);
        });

        const grandExtraPct = grandTotalOrder > 0 ? ((grandTotalCut - grandTotalOrder) / grandTotalOrder * 100).toFixed(2) : 0;

        data.push([]);
        data.push(["GRAND TOTAL", grandTotalOrder, grandTotalCut, grandTotalOvercut, grandExtraPct + "%", ""]);

        return XLSX.utils.aoa_to_sheet(data);
    }

    /**
     * Create group sequencing sheet
     */
    createGroupSheet(result, groupName) {
        const data = [
            [`RATIO SEQUENCING - ${groupName.toUpperCase()} GROUP`],
            [],
            ["Cut Sequence & Balance"],
            []
        ];

        // Header row
        const headerRow = ["Cut No.", "Marker", "Ply"];
        this.sizes.forEach(size => headerRow.push(size));
        headerRow.push("Total", "Avg Coverage %");
        data.push(headerRow);

        // Order quantity row
        const orderRow = ["", "ORDER QTY", ""];
        let orderTotal = 0;
        this.sizes.forEach(size => {
            const qty = result.originalQty[size] || 0;
            orderRow.push(qty);
            orderTotal += qty;
        });
        orderRow.push(orderTotal, "");
        data.push(orderRow);

        // Target quantity row (with extra %)
        const targetRow = ["", "TARGET QTY", ""];
        let targetTotal = 0;
        this.sizes.forEach(size => {
            const qty = result.targetQty[size] || 0;
            targetRow.push(qty);
            targetTotal += qty;
        });
        targetRow.push(targetTotal, "");
        data.push(targetRow);

        data.push([]);

        // Cut rows
        let currentBalance = { ...result.targetQty };

        result.cuts.forEach((cut, index) => {
            // Cut row
            const cutRow = [cut.cutNumber, cut.markerId, cut.ply];
            let cutTotal = 0;
            this.sizes.forEach(size => {
                const qty = cut.cutQty[size] || 0;
                cutRow.push(qty);
                cutTotal += qty;
            });
            cutRow.push(cutTotal, (cut.averageCoverage * 100).toFixed(2) + "%");
            data.push(cutRow);

            // Update balance
            this.sizes.forEach(size => {
                currentBalance[size] = Math.max(0, (currentBalance[size] || 0) - (cut.cutQty[size] || 0));
            });

            // Balance row
            const balanceRow = ["", "BALANCE", ""];
            let balanceTotal = 0;
            this.sizes.forEach(size => {
                const qty = currentBalance[size] || 0;
                balanceRow.push(qty);
                balanceTotal += qty;
            });
            balanceRow.push(balanceTotal, "");
            data.push(balanceRow);

            data.push([]);
        });

        // Final summary
        data.push(["FINAL SUMMARY"]);

        const totalCutRow = ["", "TOTAL CUT", ""];
        let totalCutSum = 0;
        this.sizes.forEach(size => {
            const qty = result.totalCut[size] || 0;
            totalCutRow.push(qty);
            totalCutSum += qty;
        });
        totalCutRow.push(totalCutSum, "");
        data.push(totalCutRow);

        const overcutRow = ["", "OVERCUT", ""];
        let overcutSum = 0;
        this.sizes.forEach(size => {
            const qty = result.totalOvercut[size] || 0;
            overcutRow.push(qty);
            overcutSum += qty;
        });
        overcutRow.push(overcutSum, "");
        data.push(overcutRow);

        const finalBalanceRow = ["", "FINAL BALANCE", ""];
        let finalBalanceSum = 0;
        this.sizes.forEach(size => {
            const qty = result.finalRemaining[size] || 0;
            finalBalanceRow.push(qty);
            finalBalanceSum += qty;
        });
        finalBalanceRow.push(finalBalanceSum, "");
        data.push(finalBalanceRow);

        return XLSX.utils.aoa_to_sheet(data);
    }

    /**
     * Create CAD Cut Plan sheet
     */
    createCADSheet(result, groupName) {
        const data = [
            [`CAD CUT PLAN - ${groupName.toUpperCase()} GROUP`],
            [],
            ["Cutting No", "No of Fab Lay/Plies", "No of Pcs", "SIZE", ...this.sizes, "Total Cutting Pcs"]
        ];

        result.cuts.forEach((cut, index) => {
            const totalPcs = this.sizes.reduce((sum, size) => sum + (cut.cutQty[size] || 0), 0);
            const row = [
                `C-${index + 1}`,
                cut.ply,
                this.sizes.reduce((sum, size) => sum + (cut.ratio[size] || 0), 0),
                "RATIO",
                ...this.sizes.map(size => cut.ratio[size] || 0),
                totalPcs
            ];
            data.push(row);
        });

        // Total row
        const totalRow = [
            "Total",
            result.cuts.reduce((sum, c) => sum + c.ply, 0),
            "",
            "",
            ...this.sizes.map(size => result.totalCut[size] || 0),
            this.sizes.reduce((sum, size) => sum + (result.totalCut[size] || 0), 0)
        ];
        data.push(totalRow);

        return XLSX.utils.aoa_to_sheet(data);
    }

    /**
     * Create order balance sheet
     */
    createOrderBalanceSheet(results, csbdData) {
        const data = [
            ["ORDER BALANCE QUANTITY"],
            ["Order No", csbdData.orderNo || ""],
            ["Style Name", csbdData.styleName || ""],
            [],
            ["Country Group", "Country", "Ship Date", ...this.sizes.map(s => `Order ${s}`), ...this.sizes.map(s => `Cut ${s}`), ...this.sizes.map(s => `Balance ${s}`)]
        ];

        // Aggregate by country within each group
        const countryData = {};

        csbdData.shipments.forEach(shipment => {
            const key = `${shipment.group}-${shipment.country}`;
            if (!countryData[key]) {
                countryData[key] = {
                    group: shipment.group,
                    country: shipment.country,
                    shipDate: shipment.shipDate,
                    orderQty: {},
                    cutQty: {}
                };
            }

            this.sizes.forEach(size => {
                if (!countryData[key].orderQty[size]) countryData[key].orderQty[size] = 0;
                countryData[key].orderQty[size] += shipment.sizes[size] || 0;
            });
        });

        // Add cut quantities from results
        Object.entries(results).forEach(([groupName, result]) => {
            if (!result) return;

            Object.entries(countryData).forEach(([key, data]) => {
                if (data.group === groupName) {
                    data.cutQty = result.totalCut;
                }
            });
        });

        Object.values(countryData).forEach(data => {
            const row = [
                data.group,
                data.country,
                data.shipDate,
                ...this.sizes.map(size => data.orderQty[size] || 0),
                ...this.sizes.map(size => data.cutQty[size] || 0),
                ...this.sizes.map(size => (data.orderQty[size] || 0) - (data.cutQty[size] || 0))
            ];
            data.push(row);
        });

        return XLSX.utils.aoa_to_sheet(data);
    }

    /**
     * Download workbook as file
     */
    downloadWorkbook(wb, filename) {
        XLSX.writeFile(wb, filename);
    }
}

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ExcelExporter;
}
