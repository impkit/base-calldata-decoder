(function () {
    'use strict';

    const inputEl = document.getElementById('calldata-input');
    const decodeBtn = document.getElementById('btn-decode');
    const tableBody = document.getElementById('decoded-table-body');
    const resultsTable = document.getElementById('results-table');
    const emptyState = document.getElementById('table-empty-state');
    const gasGweiEl = document.getElementById('gas-gwei');

    async function fetchGasPrice() {
        try {
            const response = await fetch(window.CONFIG.RPC_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ jsonrpc: '2.0', method: 'eth_gasPrice', params: [], id: 1 })
            });
            const data = await response.json();
            if (data && data.result && gasGweiEl) {
                const gasGwei = Number(BigInt(data.result) / window.CONFIG.GAS_DIVIDER) / window.CONFIG.GAS_SCALE;
                gasGweiEl.textContent = gasGwei > 0 ? gasGwei.toFixed(4) : '0.0050';
            }
        } catch {}
    }

    async function gasTrackerLoop() { 
        await fetchGasPrice(); 
        setTimeout(gasTrackerLoop, window.CONFIG.GAS_INTERVAL); 
    }

    async function fetchFunctionSignature(methodSig) {
        try {
            const response = await fetch(window.CONFIG.SOURCIFY_URL + methodSig);
            if (!response.ok) return null;
            const data = await response.json();
            if (data && data.result && data.result.function && data.result.function[methodSig] && data.result.function[methodSig][0]) {
                return data.result.function[methodSig][0].name;
            }
            return null;
        } catch { return null; }
    }

    async function handleDecode() {
        if (!inputEl || !tableBody || !resultsTable || !emptyState) return;
        let rawData = inputEl.value.trim();
        if (!rawData) return;
        if (!rawData.startsWith('0x')) rawData = '0x' + rawData;
        const clean = rawData.slice(2);
        if (clean.length < window.CONFIG.SELECTOR_LEN) { alert("EVM method selector missing."); return; }

        const methodSig = '0x' + clean.slice(0, window.CONFIG.SELECTOR_LEN);
        const argumentsData = clean.slice(window.CONFIG.SELECTOR_LEN);
        const signatureText = await fetchFunctionSignature(methodSig) || `UnknownMethod_${methodSig}`;

        let paramTypes = [];
        if (signatureText.includes('(')) paramTypes = signatureText.substring(signatureText.indexOf('(') + 1, signatureText.indexOf(')')).split(',');

        const chunks = [];
        for (let i = 0; i < argumentsData.length; i += window.CONFIG.CHUNK_SIZE) {
            const chunkStr = argumentsData.substring(i, i + window.CONFIG.CHUNK_SIZE);
            if (chunkStr.length > 0) chunks.push(window.UTILS.hexToBytes(chunkStr.padEnd(window.CONFIG.CHUNK_SIZE, '0')));
        }

        tableBody.innerHTML = '';
        const sigTr = document.createElement('tr');
        sigTr.className = 'selector-row';
        sigTr.innerHTML = `<td class="selector-label">Selector</td><td class="selector-hex">${methodSig}</td><td class="selector-method">Method: ${signatureText}</td>`;
        tableBody.appendChild(sigTr);

        let isDynamicArray = false;
        let offsetCount = 0;

        for (let i = 0; i < chunks.length; i++) {
            const num = window.UTILS.bytesToNumber(chunks[i]);
            if (num === '32') offsetCount++;
        }

        if (signatureText.startsWith('UnknownMethod_') && chunks.length >= 2) {
            const firstHex = window.UTILS.bytesToHex(chunks[0]).slice(2).replace(/^0+/, '');
            const secondHex = window.UTILS.bytesToHex(chunks[1]).slice(2).replace(/^0+/, '');
            const offsetVal = firstHex === '' ? 0n : BigInt('0x' + firstHex);
            const lengthVal = secondHex === '' ? 0n : BigInt('0x' + secondHex);
            if (offsetVal === 32n && lengthVal === BigInt(chunks.length - 2) && offsetCount === 1) {
                isDynamicArray = true;
            }
        }

        let hasStructuralAnomaly = offsetCount > 1;
        const existingAlert = document.getElementById('integrity-warning-alert');
        if (existingAlert) existingAlert.remove();

        chunks.forEach((bytes, index) => {
            let label = `[${index}]`;
            let forcedType = paramTypes[index] ? paramTypes[index].trim() : 'unknown';
            let { type, value, alt, isAnomaly } = window.UTILS.formatValue(bytes, forcedType);

            if (isAnomaly) hasStructuralAnomaly = true;

            if (isDynamicArray) {
                alt = null;
                if (index === 0) {
                    type = 'uint256';
                    value = '32 (offset) [Dynamic byte array start pointer]';
                    label = '';
                } else if (index === 1) {
                    type = 'uint256';
                    const num = window.UTILS.bytesToNumber(bytes);
                    value = (num !== null ? num : '0') + ' (length) [Total elements inside array]';
                    label = '';
                } else {
                    const cleanHex = window.UTILS.bytesToHex(bytes).slice(2);
                    if (/^0{24}[a-fA-F0-9]{40}$/.test(cleanHex)) {
                        type = 'address';
                        value = '0x' + cleanHex.slice(24).toLowerCase();
                    }
                    label = `[${index - 2}]`;
                }
            }

            const tr = document.createElement('tr');
            tr.className = 'param-tr';
            
            const tdIndex = document.createElement('td');
            tdIndex.className = 'param-idx';
            tdIndex.textContent = label;
            
            const tdChunk = document.createElement('td');
            tdChunk.className = 'param-hex';
            tdChunk.textContent = window.UTILS.bytesToHex(bytes);
            
            const tdDecoded = document.createElement('td');
            tdDecoded.className = 'param-val';
            
            const mainBlock = document.createElement('div');
            mainBlock.className = 'type-variant-block variant-primary';
            
            const typeSpan = document.createElement('span');
            typeSpan.className = 'param-type-span';
            typeSpan.textContent = `(${type}) `;
            
            mainBlock.appendChild(typeSpan);
            mainBlock.appendChild(document.createTextNode(value));
            tdDecoded.appendChild(mainBlock);

            if (alt) {
                const altBlock = document.createElement('div');
                altBlock.className = 'type-variant-block variant-alternative';
                
                const altTypeSpan = document.createElement('span');
                altTypeSpan.className = 'param-type-span alt-type';
                altTypeSpan.textContent = `OR (${alt.type}) `;
                
                const descDiv = document.createElement('div');
                descDiv.className = 'variant-description';
                descDiv.textContent = alt.desc;
                
                altBlock.appendChild(altTypeSpan);
                altBlock.appendChild(document.createTextNode(alt.value));
                altBlock.appendChild(descDiv);
                tdDecoded.appendChild(altBlock);
            }

            tr.appendChild(tdIndex);
            tr.appendChild(tdChunk);
            tr.appendChild(tdDecoded);
            tableBody.appendChild(tr);
        });

        if (hasStructuralAnomaly && signatureText.startsWith('UnknownMethod_')) {
            const alertDiv = document.createElement('div');
            alertDiv.id = 'integrity-warning-alert';
            alertDiv.className = 'integrity-alert';
            alertDiv.innerHTML = `<strong>⚠️ NOTICE: COMPLEX MULTIDIMENSIONAL STRUCTURE DETECTED</strong><br>The input hex stream contains nested component offsets or advanced parameters typical for multi-tier tuples, data batches, or packed Layer-2 payloads. Sequential 32-byte visualization may shift inner parameter scales. Cross-reference raw hex slots if necessary.`;
            resultsTable.parentNode.insertBefore(alertDiv, resultsTable);
        }

        emptyState.classList.add('hidden');
        resultsTable.classList.remove('hidden');
    }

    function init() {
        if (decodeBtn) decodeBtn.addEventListener('click', handleDecode);
        if (inputEl) {
            inputEl.addEventListener('keydown', e => {
                if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleDecode(); }
            });
        }
        gasTrackerLoop();
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();

