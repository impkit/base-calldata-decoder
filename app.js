(function () {
    'use strict';

    const CONFIG = {
        SOURCIFY_URL: "https://api.4byte.sourcify.dev/signature-database/v1/lookup?function=",
        RPC_URL: "https://mainnet.base.org",
        GAS_INTERVAL: 15000,
        WEI_PRECISION: 100000000000000n,
        WEI_DIVIDER: 10000000000000n,
        WEI_SCALE: 10000,
        MAX_NUM_LEN: 20,
        CHUNK_SIZE: 64,
        ADDR_BYTES: -20,
        SELECTOR_LEN: 8,
        GAS_DIVIDER: 100000000n,
        GAS_SCALE: 10
    };

    const inputEl = document.getElementById('calldata-input');
    const decodeBtn = document.getElementById('btn-decode');
    const tableBody = document.getElementById('decoded-table-body');
    const resultsTable = document.getElementById('results-table');
    const emptyState = document.getElementById('table-empty-state');
    const gasGweiEl = document.getElementById('gas-gwei');

    const hexToBytes = hex => {
        const clean = hex.startsWith('0x') ? hex.slice(2) : hex;
        const bytes = [];
        for (let i = 0; i < clean.length; i += 2) bytes.push(parseInt(clean.slice(i, i + 2), 16));
        return bytes;
    };

    const bytesToHex = bytes => '0x' + bytes.map(b => b.toString(16).padStart(2, '0')).join('');
    const bytesToAddress = bytes => bytes.length < Math.abs(CONFIG.ADDR_BYTES) ? null : '0x' + bytes.slice(CONFIG.ADDR_BYTES).map(b => b.toString(16).padStart(2, '0')).join('');
    const bytesToNumber = bytes => { try { return BigInt(bytesToHex(bytes).replace(/^0x0+/, '0x') || '0x0').toString(); } catch { return null; } };

    const bytesToUtf8 = bytes => {
        try { return new TextDecoder('utf-8', { fatal: true }).decode(new Uint8Array(bytes)); } 
        catch { return bytes.map(b => (b >= 32 && b <= 126) ? String.fromCharCode(b) : '·').join(''); }
    };

    const formatValue = (bytes, forcedType = 'unknown') => {
        if (bytes.every(b => b === 0)) return { type: forcedType !== 'unknown' ? forcedType : 'uint256', value: '0' };
        if (forcedType === 'address') return { type: 'address', value: bytesToAddress(bytes) };
        if (forcedType === 'uint256' || forcedType === 'uint' || forcedType === 'unknown') {
            const numStr = bytesToNumber(bytes);
            if (numStr !== null) {
                const rawNum = BigInt(numStr);
                if (forcedType === 'unknown' && rawNum > CONFIG.WEI_PRECISION && rawNum < 1000000000000000000000000000000n) {
                    return { type: 'uint256 (Wei)', value: `${Number(rawNum / CONFIG.WEI_DIVIDER) / CONFIG.WEI_SCALE} tokens (Raw: ${numStr})` };
                }
                if (forcedType === 'unknown' && numStr.length > CONFIG.MAX_NUM_LEN) {
                    return { type: 'bytes32', value: bytesToHex(bytes) };
                }
                return { type: forcedType === 'unknown' ? 'uint256' : forcedType, value: numStr };
            }
        }
        if (forcedType === 'string') return { type: 'string', value: bytesToUtf8(bytes) };
        return { type: 'bytes32', value: bytesToHex(bytes) };
    };

    async function fetchFunctionSignature(methodSig) {
        try {
            const response = await fetch(CONFIG.SOURCIFY_URL + methodSig);
            if (!response.ok) return null;
            const data = await response.json();
            return data?.result?.function?.[methodSig]?.[0]?.name || null;
        } catch { return null; }
    }

    async function fetchGasPrice() {
        try {
            const response = await fetch(CONFIG.RPC_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ jsonrpc: '2.0', method: 'eth_gasPrice', params: [], id: 1 })
            });
            const data = await response.json();
            if (data?.result && gasGweiEl) {
                const gasGwei = Number(BigInt(data.result) / CONFIG.GAS_DIVIDER) / CONFIG.GAS_SCALE;
                gasGweiEl.textContent = gasGwei > 0 ? gasGwei.toFixed(4) : '0.0050';
            }
        } catch {}
    }

    async function gasTrackerLoop() { await fetchGasPrice(); setTimeout(gasTrackerLoop, CONFIG.GAS_INTERVAL); }

    async function handleDecode() {
        if (!inputEl || !tableBody || !resultsTable || !emptyState) return;
        let rawData = inputEl.value.trim();
        if (!rawData) return;
        if (!rawData.startsWith('0x')) rawData = '0x' + rawData;
        const clean = rawData.slice(2);
        if (clean.length < CONFIG.SELECTOR_LEN) { alert("EVM method selector missing."); return; }

        const methodSig = '0x' + clean.slice(0, CONFIG.SELECTOR_LEN);
        const argumentsData = clean.slice(CONFIG.SELECTOR_LEN);
        const signatureText = await fetchFunctionSignature(methodSig) || `UnknownMethod_${methodSig}`;

        let paramTypes = [];
        if (signatureText.includes('(')) paramTypes = signatureText.substring(signatureText.indexOf('(') + 1, signatureText.indexOf(')')).split(',');

        const chunks = [];
        for (let i = 0; i < argumentsData.length; i += CONFIG.CHUNK_SIZE) {
            const chunkStr = argumentsData.substring(i, i + CONFIG.CHUNK_SIZE);
            if (chunkStr.length > 0) chunks.push(hexToBytes(chunkStr.padEnd(CONFIG.CHUNK_SIZE, '0')));
        }

        tableBody.innerHTML = '';
        const sigTr = document.createElement('tr');
        sigTr.className = 'selector-row';
        sigTr.innerHTML = `<td class="selector-label">Selector</td><td class="selector-hex">${methodSig}</td><td class="selector-method">Method: ${signatureText}</td>`;
        tableBody.appendChild(sigTr);

        chunks.forEach((bytes, index) => {
            const forcedType = paramTypes[index] ? paramTypes[index].trim() : 'unknown';
            const { type, value } = formatValue(bytes, forcedType);
            const tr = document.createElement('tr');
            tr.className = 'param-tr';
            
            const tdIndex = document.createElement('td');
            tdIndex.className = 'param-idx';
            tdIndex.textContent = `[${index}]`;
            
            const tdChunk = document.createElement('td');
            tdChunk.className = 'param-hex';
            tdChunk.textContent = bytesToHex(bytes);
            
            const tdDecoded = document.createElement('td');
            tdDecoded.className = 'param-val';
            
            const typeSpan = document.createElement('span');
            typeSpan.className = 'param-type-span';
            typeSpan.textContent = `(${type}) `;
            
            tdDecoded.appendChild(typeSpan);
            tdDecoded.appendChild(document.createTextNode(value));
            tr.appendChild(tdIndex);
            tr.appendChild(tdChunk);
            tr.appendChild(tdDecoded);
            tableBody.appendChild(tr);
        });

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

