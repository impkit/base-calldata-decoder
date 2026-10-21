# Base Calldata Decoder

A lightweight, 100% client-side Web3 developer utility specifically tailored for the Base Blockchain network. It decodes raw EVM transaction hex data (Calldata) into human-readable parameters without analytical overhead.

## Core Features

- **Strict Client-Side Parsing:** No backend servers, no node.js environment dependencies, and no databases. All data processing is executed entirely inside the user's browser via vanilla JavaScript.
- **Enhanced Privacy (Offline Support):** Auditable codebase. Users can load this static single-page app, completely disconnect from the Internet (Offline Mode), and parse highly confidential transaction hex arrays locally to prevent data harvesting or IP logging.
- **Automated Signature Resolution:** Features integration with decentralized signature databases to instantly resolve function selectors (e.g., `transfer(address,uint256)`) and accurately segment the remaining 32-byte arguments chunk by chunk.
- **Real-Time Network State:** Direct connection to official Base network JSON-RPC nodes (`mainnet.base.org`) to fetch current transaction fee metrics directly on page load.

## Technical Stack

- Frontend Architecture: Standalone Single Page Application (`index.html`)
- Styling Framework: Zero external dependencies, modular embedded pure CSS
- Network Integration: Async Vanilla JS Stream Fetch API
- Target Network: Base Blockchain (EVM compatible)

