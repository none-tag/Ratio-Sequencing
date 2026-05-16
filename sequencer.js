/**
 * Ratio Sequencer Module
 * Implements the cut sequencing algorithm for garment production planning
 */

class RatioSequencer {
    constructor() {
        this.sizes = ["50", "56", "62", "68", "74", "80", "86", "92", "98", "104"];
    }

    /**
     * Aggregate order quantities by country group
     */
    aggregateByGroup(shipments) {
        const groups = {
            General: {},
            China: {},
            US: {}
        };

        shipments.forEach(shipment => {
            const group = shipment.group || getCountryGroup(shipment.country);

            this.sizes.forEach(size => {
                const qty = shipment.sizes[size] || 0;
                if (!groups[group][size]) groups[group][size] = 0;
                groups[group][size] += qty;
            });
        });

        return groups;
    }

    /**
     * Apply extra percentage to order quantities
     */
    applyExtraPercent(orderQty, extraPercent) {
        const adjusted = {};
        this.sizes.forEach(size => {
            const qty = orderQty[size] || 0;
            adjusted[size] = Math.round(qty * (1 + extraPercent / 100));
        });
        return adjusted;
    }

    /**
     * Calculate pieces covered by each marker
     * Step 1: pieces_covered = ply * ratio for each size
     */
    calculatePiecesCovered(marker) {
        const pieces = {};
        this.sizes.forEach(size => {
            const ratio = marker.ratio[size] || 0;
            pieces[size] = marker.ply * ratio;
        });
        return pieces;
    }

    /**
     * Calculate coverage percentage for each size
     * Step 2: coverage = pieces_covered / remaining_order_qty
     * Cap at 100%, set to 0 if order qty is fulfilled
     */
    calculateCoverage(piecesCovered, remainingQty) {
        const coverage = {};
        this.sizes.forEach(size => {
            const remaining = remainingQty[size] || 0;
            if (remaining <= 0) {
                coverage[size] = 0;
            } else {
                const covered = piecesCovered[size] || 0;
                let pct = covered / remaining;
                if (pct > 1) pct = 1;
                coverage[size] = pct;
            }
        });
        return coverage;
    }

    /**
     * Calculate average coverage percentage for a marker
     * Step 4: Average of size-wise coverage percentages
     */
    calculateAverageCoverage(coverage) {
        let sum = 0;
        let count = 0;
        this.sizes.forEach(size => {
            sum += coverage[size] || 0;
            count++;
        });
        return count > 0 ? sum / count : 0;
    }

    /**
     * Run the sequencing algorithm for a single group
     */
    sequenceGroup(groupName, orderQty, markers, extraPercent = 2) {
        // Apply extra percentage
        const targetQty = this.applyExtraPercent(orderQty, extraPercent);

        // Initialize remaining quantities
        let remainingQty = { ...targetQty };

        // Track marker usage
        const markerUsage = {};
        markers.forEach(m => {
            markerUsage[m.id] = 0;
        });

        // Results
        const cuts = [];
        let cutNumber = 1;

        // Main sequencing loop
        while (true) {
            // Check if all quantities are fulfilled
            const allFulfilled = this.sizes.every(size => (remainingQty[size] || 0) <= 0);
            if (allFulfilled) break;

            // Step 1 & 2: Calculate coverage for each available marker
            const markerScores = markers.map(marker => {
                // Step 3: Check if marker can still be used
                const timesUsed = markerUsage[marker.id] || 0;
                const canBeUsed = marker.canBeUsed || 0;

                if (canBeUsed > 0 && timesUsed >= canBeUsed) {
                    return { marker, averageCoverage: 0, coverage: {}, piecesCovered: {} };
                }

                const piecesCovered = this.calculatePiecesCovered(marker);
                const coverage = this.calculateCoverage(piecesCovered, remainingQty);
                const averageCoverage = this.calculateAverageCoverage(coverage);

                return { marker, averageCoverage, coverage, piecesCovered };
            });

            // Step 5: Find marker with highest average coverage
            markerScores.sort((a, b) => b.averageCoverage - a.averageCoverage);

            const bestMarker = markerScores[0];

            // If no marker has positive coverage, we're done
            if (!bestMarker || bestMarker.averageCoverage <= 0) {
                break;
            }

            // Apply the cut
            const piecesCovered = bestMarker.piecesCovered;
            const newRemaining = { ...remainingQty };

            this.sizes.forEach(size => {
                newRemaining[size] = Math.max(0, (newRemaining[size] || 0) - (piecesCovered[size] || 0));
            });

            // Record the cut
            const cutQty = {};
            this.sizes.forEach(size => {
                cutQty[size] = piecesCovered[size] || 0;
            });

            cuts.push({
                cutNumber: cutNumber,
                markerId: bestMarker.marker.id,
                markerName: bestMarker.marker.name,
                ply: bestMarker.marker.ply,
                ratio: bestMarker.marker.ratio,
                cutQty: cutQty,
                remainingBefore: { ...remainingQty },
                remainingAfter: newRemaining,
                averageCoverage: bestMarker.averageCoverage,
                coverage: bestMarker.coverage
            });

            // Update tracking
            markerUsage[bestMarker.marker.id]++;
            remainingQty = newRemaining;
            cutNumber++;

            // Safety check to prevent infinite loops
            if (cutNumber > 100) {
                console.warn('Maximum cuts reached, stopping');
                break;
            }
        }

        // Calculate final statistics
        const totalCut = {};
        const totalOvercut = {};

        this.sizes.forEach(size => {
            totalCut[size] = 0;
            cuts.forEach(cut => {
                totalCut[size] += cut.cutQty[size] || 0;
            });

            const target = targetQty[size] || 0;
            totalOvercut[size] = Math.max(0, totalCut[size] - target);
        });

        return {
            group: groupName,
            targetQty: targetQty,
            originalQty: orderQty,
            cuts: cuts,
            totalCut: totalCut,
            totalOvercut: totalOvercut,
            finalRemaining: remainingQty,
            markerUsage: markerUsage
        };
    }

    /**
     * Run sequencing for all groups
     */
    runSequencing(csbdData, markerData, extraPercent = 2) {
        const groupOrders = this.aggregateByGroup(csbdData.shipments);

        const results = {
            General: null,
            China: null,
            US: null
        };

        if (groupOrders.General && Object.keys(groupOrders.General).length > 0) {
            results.General = this.sequenceGroup('General', groupOrders.General, markerData.General, extraPercent);
        }

        if (groupOrders.China && Object.keys(groupOrders.China).length > 0) {
            results.China = this.sequenceGroup('China', groupOrders.China, markerData.China, extraPercent);
        }

        if (groupOrders.US && Object.keys(groupOrders.US).length > 0) {
            results.US = this.sequenceGroup('US', groupOrders.US, markerData.US, extraPercent);
        }

        return results;
    }

    /**
     * Calculate summary statistics
     */
    calculateSummary(results) {
        let totalOrder = 0;
        let totalCut = 0;
        let totalOvercut = 0;

        Object.values(results).forEach(result => {
            if (!result) return;

            this.sizes.forEach(size => {
                totalOrder += result.originalQty[size] || 0;
                totalCut += result.totalCut[size] || 0;
                totalOvercut += result.totalOvercut[size] || 0;
            });
        });

        const extraCuttingPct = totalOrder > 0 ? ((totalCut - totalOrder) / totalOrder * 100).toFixed(2) : 0;

        return {
            totalOrder,
            totalCut,
            totalOvercut,
            extraCuttingPct
        };
    }
}

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = RatioSequencer;
}
