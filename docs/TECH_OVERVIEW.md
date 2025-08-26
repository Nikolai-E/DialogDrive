# DialogDrive Technical Overview

This document provides a technical overview of the DialogDrive browser extension, including its architecture and a detailed list of requirements.

## 1. Architecture

The DialogDrive extension is built with a modern web extension stack, focusing on modularity, performance, and cross-browser compatibility.

```mermaid
graph TD
    subgraph "Browser Extension"
        subgraph "UI (Popup)"
            A[React App] -- "Manages state via" --> S[Zustand Store]
            A -- "Renders" --> V[Popup View]
            V -- "User Events (e.g., click, type)" --> A
        end

        subgraph "Service Layer"
            B[Background Script (background.ts)] -- "Manages" --> CS[Browser Storage]
            B -- "Listens for" --> M[Runtime Messages]
            B -- "Handles" --> L[API Calls & Long-running Tasks]
        end

        subgraph "Content Injection"
            C[Content Script (content.ts)] -- "Injects into" --> W[Supported Web Pages]
            C -- "Interacts with" --> D[Page DOM (e.g., textboxes)]
            C -- "Communicates via" --> M
        end
    end

    subgraph "External Services"
    end

    subgraph "Data Storage"
        CS_Local["chrome.storage.local / browser.storage.local"]
        CS_Sync["chrome.storage.sync / browser.storage.sync"]
    end

    A -- "Sends message (e.g., 'pastePrompt')" --> B
    B -- "Sends message (e.g., 'executePaste')" --> C
    C -- "Pastes prompt into" --> D
    B -- "Fetches prompt improvement from" --> O
    B -- "Reads/Writes prompts" --> CS_Local
    B -- "Reads API Key from" --> CS_Sync
```

### Architectural Components:

*   **UI (Popup)**: A React application that serves as the main user interface. It manages its own state using Zustand and communicates with the background script for any operations requiring persistent state or access to browser APIs.
*   **Background Script**: The central hub of the extension. It manages the prompt library stored in `browser.storage` and handles communication between the popup and content scripts. No external API calls are performed.
*   **Content Script**: Injected into supported websites (ChatGPT, Claude, Gemini). Its sole responsibility is to interact with the page's DOM, primarily to paste prompts into text boxes. It is designed to be lightweight to minimize performance impact on the host page.
*   **Browser Storage**:
    *   `storage.local`: Used for storing the user's prompt library. This is the default, local-first approach.
    *   `storage.sync`: Used for lightweight preferences (no API keys).

## 2. Requirements (EARS Format)

This section lists the functional and non-functional requirements for Phase 1 of the project using the Easy Approach to Requirements Syntax (EARS).

### Functional Requirements

| ID  | Requirement                                                                                                                            |
| --- | -------------------------------------------------------------------------------------------------------------------------------------- |
| F1.1| **The user shall be able to** save a new prompt to the prompt library.                                                                   |
| F1.2| **The user shall be able to** edit an existing prompt in the prompt library.                                                             |
| F1.3| **The user shall be able to** delete a prompt from the prompt library.                                                                   |
| F2.1| **While** on a supported site (e.g., chat.openai.com), **the user shall be able to** click a button to paste a selected prompt into the active textbox. |
| F2.2| **If** the active site is not a supported site, **the system shall** provide a fallback mechanism to copy the prompt to the clipboard.     |
| F3.1| (Removed) AI prompt improvement via external APIs is out of scope for this release. |
| F4.1| **The user shall be able to** enable or disable a "timestamp" transformation for each prompt via a UI toggle.                            |
| F4.2| **The user shall be able to** enable or disable a "voice tag" transformation for each prompt via a UI toggle.                            |

### Non-Functional Requirements

| ID  | Requirement                                                                                                                            |
| --- | -------------------------------------------------------------------------------------------------------------------------------------- |
| R1.1| **The system shall** use `chrome.storage.local` or `browser.storage.local` as the default storage for the prompt library.                |
| R2.1| **The system shall** ensure that all popup interactions complete in under 100ms.                                                         |
| R2.2| **The system shall** implement the content script in a way that minimizes its performance impact on the host web page.                   |
| R3.1| **The system's UI shall be** fully keyboard-navigable.                                                                                   |
| R3.2| **The system shall** provide appropriate ARIA labels for all non-textual interactive elements to ensure accessibility.                   |
| R4.1| **The system shall** define and enforce a strict Content Security Policy (CSP) to mitigate cross-site scripting attacks.                 |
| R4.2| **The system shall** sanitize all data before it is injected into the DOM.                                                               |
| R4.3| **The system shall not** use insecure functions like `eval()` or `element.innerHTML`.                                                    |
| R5.1| (Removed) No API keys are collected or stored. |
