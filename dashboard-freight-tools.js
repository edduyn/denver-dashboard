let allPartsData = [];
// flatRateData already declared above (Phase 1 flat rate chart)
let currentPartsFilter = 'all';

async function loadPartsWeightDb() {
    try {
        // Fetch parts (flat rate chart already loaded by loadFlatRateChart)
        const partsRes = await cachedFetch(`${SUPABASE_URL}/rest/v1/parts_weight_db?order=category,part_number`, {
            headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` }
        });

        allPartsData = await partsRes.json();

        // Update badge
        document.getElementById('partsDbBadge').textContent = `${allPartsData.length} parts`;

        // Render table
        renderPartsTable(allPartsData);

        console.log(`loadPartsWeightDb: Complete - ${allPartsData.length} parts, ${flatRateData.length} rate tiers`);
    } catch (error) {
        console.error('Error loading parts weight db:', error);
    }
}

function renderPartsTable(parts) {
    const tbody = document.getElementById('partsDbTableBody');
    if (!parts || parts.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" style="padding: 16px; text-align: center; color: #64748b;">No parts found</td></tr>';
        return;
    }

    const catColors = {
        'LRU': '#818cf8', 'Battery': '#fbbf24', 'Safety Equipment': '#34d399',
        'Control Unit': '#f472b6', 'Landing Gear': '#fb923c', 'Component': '#94a3b8',
        'Antenna': '#22d3ee', 'Instrument': '#c084fc', 'WiFi/Connectivity': '#2dd4bf'
    };

    tbody.innerHTML = parts.map(p => {
        const catColor = catColors[p.category] || '#94a3b8';
        return `<tr style="border-bottom: 1px solid #1e293b;">
            <td style="padding: 6px; color: #7dd3fc; font-weight: bold; font-family: monospace;">${p.part_number || '—'}</td>
            <td style="padding: 6px; color: #e2e8f0;">${p.description || '—'}</td>
            <td style="padding: 6px;"><span style="background: ${catColor}22; color: ${catColor}; padding: 2px 8px; border-radius: 10px; font-size: 10px; border: 1px solid ${catColor}44;">${p.category || '—'}</span></td>
            <td style="padding: 6px; color: #94a3b8; font-size: 11px;">${p.manufacturer || '—'}</td>
            <td style="padding: 6px; color: #e2e8f0; font-weight: bold;">${p.weight_lbs ? p.weight_lbs + ' lb' : '—'}</td>
            <td style="padding: 6px; color: #10b981; font-weight: bold;">${p.total_ship_weight_lbs ? p.total_ship_weight_lbs + ' lb' : '—'}</td>
            <td style="padding: 6px; color: #94a3b8; font-size: 11px;">${p.aircraft_type || '—'}</td>
        </tr>`;
    }).join('');
}

function filterPartsDb(category) {
    currentPartsFilter = category;
    // Update filter button styles
    document.querySelectorAll('.parts-filter').forEach(btn => {
        btn.style.background = 'transparent';
        btn.style.color = '#94a3b8';
    });
    const activeBtn = category === 'all' ? document.getElementById('pfAll') :
        document.querySelector(`.parts-filter[onclick="filterPartsDb('${category}')"]`);
    if (activeBtn) {
        activeBtn.style.background = '#0ea5e9';
        activeBtn.style.color = '#fff';
    }

    if (category === 'all') {
        renderPartsTable(allPartsData);
    } else {
        renderPartsTable(allPartsData.filter(p => p.category === category));
    }
}

function toggleAddPartForm() {
    const form = document.getElementById('addPartForm');
    form.style.display = form.style.display === 'none' ? 'block' : 'none';
}

async function saveNewPart() {
    const partNumber = document.getElementById('newPartNumber').value.trim().toUpperCase();
    const weight = parseFloat(document.getElementById('newPartWeight').value);
    if (!partNumber || isNaN(weight)) {
        alert('Part number and weight are required');
        return;
    }

    const pkgWeight = parseFloat(document.getElementById('newPartPkg').value) || 1;
    const newPart = {
        part_number: partNumber,
        description: document.getElementById('newPartDesc').value.trim() || null,
        manufacturer: document.getElementById('newPartMfr').value.trim() || null,
        weight_lbs: weight,
        packaging_weight_lbs: pkgWeight,
        total_ship_weight_lbs: weight + pkgWeight,
        category: document.getElementById('newPartCategory').value,
        aircraft_type: document.getElementById('newPartAircraft').value.trim() || null,
        source: 'manual'
    };

    try {
        const res = await cachedFetch(`${SUPABASE_URL}/rest/v1/parts_weight_db`, {
            method: 'POST',
            headers: {
                'apikey': SUPABASE_KEY,
                'Authorization': `Bearer ${SUPABASE_KEY}`,
                'Content-Type': 'application/json',
                'Prefer': 'return=representation'
            },
            body: JSON.stringify(newPart)
        });
        if (res.ok) {
            toggleAddPartForm();
            // Clear form
            document.getElementById('newPartNumber').value = '';
            document.getElementById('newPartDesc').value = '';
            document.getElementById('newPartMfr').value = '';
            document.getElementById('newPartWeight').value = '';
            document.getElementById('newPartPkg').value = '1';
            document.getElementById('newPartAircraft').value = '';
            await loadPartsWeightDb();
        } else {
            const err = await res.json();
            alert('Error saving part: ' + (err.message || 'Unknown error'));
        }
    } catch (error) {
        console.error('Error saving new part:', error);
    }
}

// Freight Cost Calculator — auto-lookup from flat_rate_chart
function calculateFreightCost() {
    const weight = parseInt(document.getElementById('calcWeight').value);
    const service = document.getElementById('calcService').value;
    const resultDiv = document.getElementById('calcResult');

    if (!weight || !service || weight < 1) {
        resultDiv.style.display = 'none';
        return;
    }

    // Find the matching rate tier (round up to next available weight)
    const matchingTier = flatRateData.find(r => r.weight_lb >= weight) || flatRateData[flatRateData.length - 1];

    if (!matchingTier) {
        resultDiv.style.display = 'none';
        return;
    }

    const flatRate = matchingTier[service];
    if (!flatRate && flatRate !== 0) {
        document.getElementById('calcTotal').textContent = 'N/A';
        document.getElementById('calcBreakdown').textContent = 'Service not available at this weight';
        resultDiv.style.display = 'block';
        return;
    }

    const markup = flatRate * 0.20;
    const total = flatRate + markup;

    document.getElementById('calcTotal').textContent = `$${total.toFixed(2)}`;
    document.getElementById('calcBreakdown').textContent = `Flat: $${flatRate.toFixed(2)} + Markup: $${markup.toFixed(2)} (${matchingTier.weight_lb}lb tier)`;
    resultDiv.style.display = 'block';
}

// Part search for calculator — auto-fill weight
function searchPartsForCalc(query) {
    const resultsDiv = document.getElementById('calcPartResults');
    if (!query || query.length < 2) {
        resultsDiv.style.display = 'none';
        return;
    }

    const q = query.toLowerCase();
    const matches = allPartsData.filter(p =>
        (p.part_number && p.part_number.toLowerCase().includes(q)) ||
        (p.description && p.description.toLowerCase().includes(q)) ||
        (p.category && p.category.toLowerCase().includes(q))
    ).slice(0, 8);

    if (matches.length === 0) {
        resultsDiv.style.display = 'none';
        return;
    }

    resultsDiv.innerHTML = matches.map(p => `
        <div onclick="selectPartForCalc('${p.part_number}', ${p.total_ship_weight_lbs || p.weight_lbs})"
            style="padding: 6px 10px; cursor: pointer; border-bottom: 1px solid #1e293b; font-size: 11px; color: #e2e8f0;"
            onmouseover="this.style.background='#334155'" onmouseout="this.style.background='transparent'">
            <span style="color: #7dd3fc; font-weight: bold;">${p.part_number}</span>
            <span style="color: #94a3b8; margin-left: 6px;">${p.description || ''}</span>
            <span style="color: #10b981; float: right;">${p.total_ship_weight_lbs || p.weight_lbs} lb</span>
        </div>
    `).join('');
    resultsDiv.style.display = 'block';
}

function selectPartForCalc(partNumber, weight) {
    document.getElementById('calcPartSearch').value = partNumber;
    document.getElementById('calcWeight').value = Math.ceil(weight);
    document.getElementById('calcPartResults').style.display = 'none';
    calculateFreightCost();
}

// Close dropdown when clicking outside
document.addEventListener('click', function(e) {
    if (!e.target.closest('#calcPartSearch') && !e.target.closest('#calcPartResults')) {
        document.getElementById('calcPartResults').style.display = 'none';
    }
});

// ===== Phase 5: AI Freight PDF Analyzer =====
let selectedPdfFile = null;
let currentAnalysisType = 'wo_invoice';
let lastAnalysisResults = null;

function selectAnalysisType(type) {
    currentAnalysisType = type;
    document.querySelectorAll('.analysis-type-btn, [id^="type"]').forEach(btn => {
        if (btn.id === 'type' + type.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join('')) {
            btn.style.border = '1px solid #e94560';
            btn.style.background = 'rgba(233,69,96,0.2)';
            btn.style.color = '#e94560';
        } else if (btn.id && btn.id.startsWith('type')) {
            btn.style.border = '1px solid #475569';
            btn.style.background = 'transparent';
            btn.style.color = '#94a3b8';
        }
    });
}

async function runSmartMatch() {
    const resultsDiv = document.getElementById('smartMatchResults');
    const textDiv = document.getElementById('smartMatchText');
    resultsDiv.style.display = 'block';
    textDiv.innerHTML = '⏳ Running smart match...';

    try {
        // Get unmatched freight invoices (no wo_number)
        const invRes = await cachedFetch(`${SUPABASE_URL}/rest/v1/freight_invoices?wo_number=is.null&select=id,tracking_number`, {
            headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` }
        });
        const unmatchedInvoices = await invRes.json();

        if (!unmatchedInvoices.length) {
            textDiv.innerHTML = '✅ All invoices are already matched to WOs!';
            return;
        }

        // Get freight tracking records with tracking numbers and WOs
        const trackRes = await cachedFetch(`${SUPABASE_URL}/rest/v1/freight_tracking?tracking_number=not.is.null&wo_number=not.is.null&select=tracking_number,wo_number`, {
            headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` }
        });
        const trackingRecords = await trackRes.json();

        // Build lookup map
        const trackMap = {};
        trackingRecords.forEach(t => { trackMap[t.tracking_number] = t.wo_number; });

        // Find matches
        let matched = 0;
        for (const inv of unmatchedInvoices) {
            if (inv.tracking_number && trackMap[inv.tracking_number]) {
                const updateRes = await cachedFetch(`${SUPABASE_URL}/rest/v1/freight_invoices?id=eq.${inv.id}`, {
                    method: 'PATCH',
                    headers: {
                        'apikey': SUPABASE_KEY,
                        'Authorization': `Bearer ${SUPABASE_KEY}`,
                        'Content-Type': 'application/json',
                        'Prefer': 'return=minimal'
                    },
                    body: JSON.stringify({ wo_number: trackMap[inv.tracking_number] })
                });
                if (updateRes.ok) matched++;
            }
        }

        const remaining = unmatchedInvoices.length - matched;
        textDiv.innerHTML = matched > 0
            ? `✅ Matched <strong>${matched}</strong> invoice${matched > 1 ? 's' : ''} to WOs! <span style="color:#94a3b8;">(${remaining} still unmatched)</span>`
            : `⚠️ No new matches found. ${unmatchedInvoices.length} invoices still unmatched.`;

        // Reload invoice data to reflect changes
        if (matched > 0) await loadFreightInvoices();

    } catch (err) {
        textDiv.innerHTML = `❌ Error: ${err.message}`;
    }
}

function handlePdfDrop(event) {
    event.preventDefault();
    const dropZone = document.getElementById('pdfDropZone');
    dropZone.style.borderColor = '#475569';
    dropZone.style.background = 'rgba(0,0,0,0.2)';

    const file = event.dataTransfer.files[0];
    if (file && file.type === 'application/pdf') {
        setPdfFile(file);
    } else {
        alert('Please drop a PDF file.');
    }
}

function handlePdfSelect(event) {
    const file = event.target.files[0];
    if (file) setPdfFile(file);
}

function setPdfFile(file) {
    selectedPdfFile = file;
    document.getElementById('selectedFileName').textContent = file.name;
    document.getElementById('selectedFileSize').textContent = (file.size / 1024).toFixed(1) + ' KB';
    document.getElementById('selectedFileInfo').style.display = 'block';
    document.getElementById('pdfAnalysisResults').style.display = 'none';
    document.getElementById('pdfAnalyzerBadge').textContent = 'File Ready';
    document.getElementById('pdfAnalyzerBadge').style.background = '#f59e0b';
}

async function analyzePdfFile() {
    if (!selectedPdfFile) return;

    const progressDiv = document.getElementById('pdfAnalysisProgress');
    const progressBar = document.getElementById('pdfProgressBar');
    const progressText = document.getElementById('pdfProgressText');
    const badge = document.getElementById('pdfAnalyzerBadge');

    progressDiv.style.display = 'block';
    progressBar.style.width = '10%';
    progressText.textContent = 'Reading PDF file...';
    badge.textContent = 'Analyzing...';
    badge.style.background = '#e94560';

    try {
        // Convert file to base64
        const base64 = await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result.split(',')[1]);
            reader.onerror = reject;
            reader.readAsDataURL(selectedPdfFile);
        });

        progressBar.style.width = '30%';
        progressText.textContent = 'Sending to AI for analysis...';

        // Call Edge Function
        const response = await cachedFetch(`${SUPABASE_URL}/functions/v1/analyze-freight-pdf`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${SUPABASE_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                pdf_base64: base64,
                analysis_type: currentAnalysisType
            })
        });

        progressBar.style.width = '80%';
        progressText.textContent = 'Processing results...';

        if (!response.ok) {
            const errText = await response.text();
            throw new Error(`Edge Function error (${response.status}): ${errText}`);
        }

        const data = await response.json();
        progressBar.style.width = '100%';
        progressText.textContent = 'Analysis complete!';

        lastAnalysisResults = data;
        displayAnalysisResults(data);

        badge.textContent = 'Complete';
        badge.style.background = '#10b981';

        setTimeout(() => { progressDiv.style.display = 'none'; }, 1500);

    } catch (err) {
        progressDiv.style.display = 'none';
        badge.textContent = 'Error';
        badge.style.background = '#ef4444';
        alert('PDF Analysis Error: ' + err.message);
        console.error('PDF analysis error:', err);
    }
}

function displayAnalysisResults(data) {
    const resultsDiv = document.getElementById('pdfAnalysisResults');
    const contentDiv = document.getElementById('analysisResultsContent');
    resultsDiv.style.display = 'block';

    if (data.error) {
        contentDiv.innerHTML = `<div style="color: #ef4444;">❌ ${data.error}</div>`;
        return;
    }

    const extracted = data.extracted_data || data;

    // Build summary based on analysis type
    let html = '';

    if (currentAnalysisType === 'wo_invoice') {
        const items = extracted.freight_line_items || extracted.line_items || [];
        html += `<div style="margin-bottom: 10px;">
            <span style="color: #a5b4fc;">WO:</span> <strong>${extracted.wo_number || '--'}</strong>
            <span style="color: #a5b4fc; margin-left: 12px;">Customer:</span> ${extracted.customer || '--'}
            <span style="color: #a5b4fc; margin-left: 12px;">Total:</span> <strong style="color: #10b981;">$${(extracted.total_amount || 0).toFixed(2)}</strong>
        </div>`;
        if (items.length) {
            html += `<div style="font-size: 11px; color: #fbbf24; margin-bottom: 6px;">📦 ${items.length} freight line item${items.length > 1 ? 's' : ''} found:</div>`;
            html += `<table style="width:100%;border-collapse:collapse;font-size:11px;"><thead><tr style="border-bottom:1px solid #334155;color:#94a3b8;">
                <th style="padding:4px 6px;text-align:left;">Description</th>
                <th style="padding:4px 6px;text-align:right;">Amount</th>
                <th style="padding:4px 6px;text-align:left;">Tracking #</th></tr></thead><tbody>`;
            items.forEach(item => {
                html += `<tr style="border-bottom:1px solid #1e293b;">
                    <td style="padding:4px 6px;color:#e2e8f0;">${item.description || '--'}</td>
                    <td style="padding:4px 6px;text-align:right;color:#10b981;">$${(item.amount || 0).toFixed(2)}</td>
                    <td style="padding:4px 6px;color:#7dd3fc;">${item.tracking_number || '--'}</td></tr>`;
            });
            html += '</tbody></table>';
        }
    } else if (currentAnalysisType === 'tfm_invoice') {
        const shipments = extracted.shipments || [];
        html += `<div style="margin-bottom: 10px;">
            <span style="color: #a5b4fc;">Invoice #:</span> <strong>${extracted.invoice_number || '--'}</strong>
            <span style="color: #a5b4fc; margin-left: 12px;">Date:</span> ${extracted.invoice_date || '--'}
            <span style="color: #a5b4fc; margin-left: 12px;">Total:</span> <strong style="color: #f43f5e;">$${(extracted.total_charges || 0).toFixed(2)}</strong>
        </div>`;
        if (shipments.length) {
            html += `<div style="font-size: 11px; color: #fbbf24; margin-bottom: 6px;">🚛 ${shipments.length} shipment${shipments.length > 1 ? 's' : ''} found:</div>`;
            html += `<table style="width:100%;border-collapse:collapse;font-size:11px;"><thead><tr style="border-bottom:1px solid #334155;color:#94a3b8;">
                <th style="padding:4px 6px;text-align:left;">Tracking #</th>
                <th style="padding:4px 6px;text-align:left;">Carrier</th>
                <th style="padding:4px 6px;text-align:right;">Weight</th>
                <th style="padding:4px 6px;text-align:right;">Charges</th></tr></thead><tbody>`;
            shipments.forEach(s => {
                html += `<tr style="border-bottom:1px solid #1e293b;">
                    <td style="padding:4px 6px;color:#7dd3fc;">${s.tracking_number || '--'}</td>
                    <td style="padding:4px 6px;color:#e2e8f0;">${s.carrier || '--'}</td>
                    <td style="padding:4px 6px;text-align:right;color:#fbbf24;">${s.weight || '--'} lb</td>
                    <td style="padding:4px 6px;text-align:right;color:#f43f5e;">$${(s.charges || 0).toFixed(2)}</td></tr>`;
            });
            html += '</tbody></table>';
        }
    } else {
        // wo_package
        const parts = extracted.parts || [];
        html += `<div style="margin-bottom: 10px;">
            <span style="color: #a5b4fc;">WO:</span> <strong>${extracted.wo_number || '--'}</strong>
            <span style="color: #a5b4fc; margin-left: 12px;">Parts:</span> ${parts.length}
        </div>`;
        if (parts.length) {
            html += `<table style="width:100%;border-collapse:collapse;font-size:11px;"><thead><tr style="border-bottom:1px solid #334155;color:#94a3b8;">
                <th style="padding:4px 6px;text-align:left;">Part #</th>
                <th style="padding:4px 6px;text-align:left;">Description</th>
                <th style="padding:4px 6px;text-align:right;">Weight</th>
                <th style="padding:4px 6px;text-align:left;">Tracking #</th></tr></thead><tbody>`;
            parts.forEach(p => {
                html += `<tr style="border-bottom:1px solid #1e293b;">
                    <td style="padding:4px 6px;color:#7dd3fc;">${p.part_number || '--'}</td>
                    <td style="padding:4px 6px;color:#e2e8f0;">${p.description || '--'}</td>
                    <td style="padding:4px 6px;text-align:right;color:#fbbf24;">${p.weight || '--'} lb</td>
                    <td style="padding:4px 6px;color:#94a3b8;">${p.tracking_number || '--'}</td></tr>`;
            });
            html += '</tbody></table>';
        }
    }

    contentDiv.innerHTML = html || '<div style="color: #94a3b8;">No extractable freight data found in this PDF.</div>';
}

async function importAnalysisResults() {
    if (!lastAnalysisResults) return;
    const extracted = lastAnalysisResults.extracted_data || lastAnalysisResults;

    try {
        let imported = 0;

        if (currentAnalysisType === 'wo_invoice') {
            const items = extracted.freight_line_items || extracted.line_items || [];
            for (const item of items) {
                const record = {
                    wo_number: extracted.wo_number,
                    part_number: item.part_number || null,
                    tracking_number: item.tracking_number || null,
                    carrier: item.carrier || 'Unknown',
                    service_level: item.service || 'Standard',
                    actual_cost: item.amount || 0,
                    billed_amount: (item.amount || 0) * 1.20,
                    status: 'pending',
                    direction: item.direction || 'inbound',
                    source: 'ai_pdf_analysis'
                };
                const res = await cachedFetch(`${SUPABASE_URL}/rest/v1/freight_tracking`, {
                    method: 'POST',
                    headers: {
                        'apikey': SUPABASE_KEY,
                        'Authorization': `Bearer ${SUPABASE_KEY}`,
                        'Content-Type': 'application/json',
                        'Prefer': 'return=minimal'
                    },
                    body: JSON.stringify(record)
                });
                if (res.ok) imported++;
            }
        } else if (currentAnalysisType === 'tfm_invoice') {
            const shipments = extracted.shipments || [];
            for (const s of shipments) {
                const record = {
                    tracking_number: s.tracking_number || null,
                    carrier: s.carrier || 'TFM',
                    service_level: s.service_level || 'Standard',
                    actual_cost: s.charges || 0,
                    weight_lbs: s.weight || null,
                    source: 'tfm_invoice_ai',
                    status: 'pending'
                };
                // Insert into freight_invoices
                const res = await cachedFetch(`${SUPABASE_URL}/rest/v1/freight_invoices`, {
                    method: 'POST',
                    headers: {
                        'apikey': SUPABASE_KEY,
                        'Authorization': `Bearer ${SUPABASE_KEY}`,
                        'Content-Type': 'application/json',
                        'Prefer': 'return=minimal'
                    },
                    body: JSON.stringify(record)
                });
                if (res.ok) imported++;
            }
        }

        alert(`✅ Imported ${imported} record${imported !== 1 ? 's' : ''} to freight tracking!`);
        await loadFreightTracking();
        await loadFreightInvoices();

    } catch (err) {
        alert('Import error: ' + err.message);
        console.error('Import error:', err);
    }
}

function clearAnalysis() {
    selectedPdfFile = null;
    lastAnalysisResults = null;
    document.getElementById('selectedFileInfo').style.display = 'none';
    document.getElementById('pdfAnalysisResults').style.display = 'none';
    document.getElementById('pdfAnalysisProgress').style.display = 'none';
    document.getElementById('pdfFileInput').value = '';
    document.getElementById('pdfAnalyzerBadge').textContent = 'Ready';
    document.getElementById('pdfAnalyzerBadge').style.background = '#e94560';
    const dropZone = document.getElementById('pdfDropZone');
    dropZone.style.borderColor = '#475569';
    dropZone.style.background = 'rgba(0,0,0,0.2)';
}

async function checkImportHealth() {
    const banner = document.getElementById('importStatusBanner');
    if (!banner) return;

    try {
        banner.style.display = 'block';
        banner.style.background = 'linear-gradient(90deg, #94a3b8, #475569)';
        banner.textContent = 'Import status: checking...';

        const now = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Denver' }));
        const todayStr = now.toISOString().slice(0, 10);

        const resp = await cachedFetch(
            `${SUPABASE_URL}/rest/v1/import_runs?select=run_date,status,files_processed,rows_upserted,error_msg,created_at&order=created_at.desc&limit=1`,
            { headers: HEADERS }
        );
        const runs = await resp.json().catch(() => []);

        if (!Array.isArray(runs) || runs.length === 0) {
            banner.style.background = 'linear-gradient(90deg, #f59e0b, #b45309)';
            banner.textContent = `No import runs logged yet (expected row in import_runs after next cron). Today: ${todayStr}`;
            return;
        }

        const last = runs[0];
        const runDay = (last.run_date || '').slice(0, 10);
        const st = (last.status || '').toLowerCase();
        const detail = [last.files_processed != null ? `${last.files_processed} files` : null, last.rows_upserted != null ? `${last.rows_upserted} rows` : null]
            .filter(Boolean).join(' · ');
        const err = last.error_msg ? ` — ${last.error_msg}` : '';

        if (runDay !== todayStr) {
            banner.style.background = 'linear-gradient(90deg, #f59e0b, #b45309)';
            banner.textContent = `No import for today yet. Last run: ${runDay} (${st})${detail ? ' · ' + detail : ''}${err}. Today (Denver): ${todayStr}`;
            return;
        }

        if (st === 'failed') {
            banner.style.background = 'linear-gradient(90deg, #ef4444, #dc2626)';
            banner.textContent = `Import failed (${runDay})${detail ? ' · ' + detail : ''}${err}`;
            return;
        }

        if (st === 'partial') {
            banner.style.background = 'linear-gradient(90deg, #f59e0b, #b45309)';
            banner.textContent = `Import partial (${runDay})${detail ? ' · ' + detail : ''}${err}`;
            return;
        }

        banner.style.background = 'linear-gradient(90deg, #10b981, #059669)';
        banner.textContent = `Import OK (${runDay})${detail ? ' · ' + detail : ''}`;
    } catch (e) {
        banner.style.display = 'none';
        console.error('checkImportHealth failed:', e);
    }
}

// Load all dashboard data — throttled to prevent rapid-fire reloads
// Throttle ONLY applies to setInterval refreshes, NOT to initial page load
const MIN_LOAD_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes minimum between full reloads
let _initialLoadDone = false; // Track whether first load has completed

