window.UTILS = {
    hexToBytes: hex => {
        const clean = hex.startsWith('0x') ? hex.slice(2) : hex;
        const bytes = [];
        for (let i = 0; i < clean.length; i += 2) {
            bytes.push(parseInt(clean.slice(i, i + 2), 16));
        }
        return bytes;
    },

    bytesToHex: bytes => '0x' + bytes.map(b => b.toString(16).padStart(2, '0')).join(''),

    bytesToAddress: bytes => {
        if (bytes.length < Math.abs(window.CONFIG.ADDR_BYTES)) return null;
        return '0x' + bytes.slice(window.CONFIG.ADDR_BYTES).map(b => b.toString(16).padStart(2, '0')).join('');
    },

    bytesToNumber: bytes => {
        try {
            return BigInt(window.UTILS.bytesToHex(bytes).replace(/^0x0+/, '0x') || '0x0').toString();
        } catch {
            return null;
        }
    },

    bytesToUtf8: bytes => {
        try {
            return new TextDecoder('utf-8', { fatal: true }).decode(new Uint8Array(bytes));
        } catch {
            return bytes.map(b => (b >= 32 && b <= 126) ? String.fromCharCode(b) : '·').join('');
        }
    },

    formatValue: (bytes, forcedType = 'unknown') => {
        if (bytes.every(b => b === 0)) {
            return { type: forcedType !== 'unknown' ? forcedType : 'uint256', value: '0', alt: null, isAnomaly: false };
        }
        if (forcedType === 'address') {
            return { type: 'address', value: window.UTILS.bytesToAddress(bytes), alt: null, isAnomaly: false };
        }
        if (forcedType === 'uint256' || forcedType === 'uint' || forcedType === 'unknown') {
            const numStr = window.UTILS.bytesToNumber(bytes);
            if (numStr !== null) {
                const rawNum = BigInt(numStr);
                let currentType = forcedType === 'unknown' ? 'uint256' : forcedType;
                let currentValue = numStr;
                let altData = null;
                let anomaly = false;

                if (forcedType === 'unknown') {
                    if (rawNum > 1157920892373161954235709850086879078532699846656405640394575840079131296399n) {
                        anomaly = true;
                    }
                    if (rawNum > window.CONFIG.WEI_PRECISION && rawNum < 1000000000000000000000000000000n) {
                        currentType = 'uint256 (Wei)';
                        currentValue = `${Number(rawNum / window.CONFIG.WEI_DIVIDER) / window.CONFIG.WEI_SCALE} tokens (Raw: ${numStr})`;
                    }
                    const hexClean = window.UTILS.bytesToHex(bytes).slice(2);
                    if (/^0{24}[a-fA-F0-9]{40}$/.test(hexClean) && rawNum > 4294967295n) {
                        altData = {
                            type: 'address',
                            value: '0x' + hexClean.slice(24).toLowerCase(),
                            desc: "ALTERNATIVE ADDRESS: Applied if target contract expects wallet, token address, or contract reference. 12 leading padding bytes are empty."
                        };
                    }
                }
                return { type: currentType, value: currentValue, alt: altData, isAnomaly: anomaly };
            }
        }
        if (forcedType === 'string') {
            return { type: 'string', value: window.UTILS.bytesToUtf8(bytes), alt: null, isAnomaly: false };
        }
        return { type: 'bytes32', value: window.UTILS.bytesToHex(bytes), alt: null, isAnomaly: false };
    }
};

