# Base Calldata Decoder

A lightweight, 100% client-side Web3 developer utility specifically tailored for the Base Blockchain network. It decodes raw EVM transaction hex data (Calldata) into human-readable parameters without analytical overhead.

## Core Features

- **Strict Client-Side Parsing:** No backend servers, no node.js environment dependencies, and no databases. All data processing is executed entirely inside the user's browser via vanilla JavaScript.
- **Enhanced Privacy (Offline Support):** Auditable codebase. Users can load this static single-page app, completely disconnect from the Internet (Offline Mode), and parse highly confidential transaction hex arrays locally to prevent data harvesting or IP logging.
- **Automated Signature Resolution:** Features integration with decentralized signature databases to instantly resolve function selectors (e.g., `transfer(address,uint256)`) and accurately segment the remaining 32-byte arguments chunk by chunk.
- **Real-Time Network State:** Direct connection to official Base network JSON-RPC nodes (`mainnet.base.org`) to fetch current transaction fee metrics directly on page load.

## Quick Start

1. Access the live deployment directly at https://impkit.github.io/base-calldata-decoder/ (or open `index.html` locally for full offline execution).
2. Paste raw EVM transaction hex payload (including or excluding the `0x` prefix) into the input area.
3. Click **Decode Payload** to tokenize arguments and fetch function signatures.

## Technical Stack & Architecture

- Frontend Architecture: Modular Single Page Application (Separated into `index.html`, `styles.css`, `app.js`)
- Styling Framework: Zero external dependencies, pure CSS driven by strict semantic tokenization variables
- Network Integration: Async Vanilla JS Stream Fetch API connected to decentralized Sourcify Aggregator
- Target Network: Base Blockchain (EVM compatible)

