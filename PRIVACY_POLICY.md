# DialogDrive Privacy Policy

*Last updated: August 4, 2025*

## Overview

DialogDrive is a browser extension that helps you manage and organize AI prompts for use with ChatGPT. We are committed to protecting your privacy and being transparent about how we handle your data.

## Data Collection and Storage

### What We Collect
- **Prompts and Text**: Content you create, save, or import through the extension
- **Chat Bookmarks**: URLs and metadata from conversations you choose to save
- **Usage Statistics**: Anonymous usage counts for prompts (locally stored)
- **Settings and Preferences**: Your extension configuration and customizations

### What We Don't Collect
- **Personal Information**: No names, emails, or personal identifiers
- **Chat Content**: We don't automatically read or store your conversations
- **Browsing History**: We don't track your general web browsing
- **Analytics**: No third-party analytics or tracking services

## Data Storage

### Where Your Data Lives
- DialogDrive stores the prompts, chat bookmarks, workspaces, tags, and usage counters you create inside Chrome's `chrome.storage.local` area, on the device where you install the extension.
- **No API Keys Stored**: DialogDrive does not collect, store, or transmit any API keys.
- **Preferences**: Lightweight settings (for example, text-cleaner defaults or layout choices) are saved via Chrome's `chrome.storage.sync` namespace. If you have Chrome Sync enabled, Google may replicate those preferences to other profiles signed into your Google account. We do not receive or manage that synced copy.
- **Clear Local Data**: The in-product "Clear Local Data" control deletes the local dataset and, where available, issues a delete request for the synced preferences so Chrome can remove them from your account backup.

### No Cloud Storage
- We do not store your data on DialogDrive-operated servers.
- We do not have routine access to your prompts, bookmarks, or settings.
- Apart from optional Chrome Sync behaviour described above, DialogDrive does not intentionally transmit your data elsewhere. Future cloud or backup features would be strictly opt-in and accompanied by an updated policy.

## Data Usage

### How We Use Your Data
- Display and organize your prompts and bookmarks
- Provide search and filtering functionality
- Remember your preferences and settings
- Enable export/import features for backup purposes

## Permissions Explained

### Required Permissions
- **storage**: Save your prompts, bookmarks, and settings locally
- **tabs**: Query the active tab to send paste/capture messages (no broad page access)
- **clipboardWrite**: Copy prompts to your clipboard
- **contextMenus**: Provide right-click capture & paste actions
- **notifications**: Show confirmations after save actions
- **sidePanel**: Offer persistent workspace panel

### Limited Host Permissions
- **chatgpt.com**: Only to enable prompt pasting and chat capture
- We do not access or inject into any other domains

## Data Security

### Security Measures
- **Minimal Permissions**: We request only the minimum permissions necessary.
- **No DialogDrive Cloud**: We do not operate servers that store your prompts or bookmarks.
- **Defensive Coding**: We implement input-handling safeguards to reduce risk, but we cannot guarantee that every possible input will be sanitized.

### API Key Security
Not applicable. DialogDrive does not collect or store API keys.

## Your Rights and Controls

### Data Control
- **Export**: Download all your data in JSON format at any time
- **Delete**: Remove individual prompts, bookmarks, or all data
- **Modify**: Edit or update any stored content
- **Disable**: Turn off features or uninstall the extension completely

### Transparency
- All data storage is local and inspectable
- Extension source code follows open-source principles
- No hidden data collection or transmission

## Third-Party Services

### No Other Third Parties
- No analytics services
- No advertising networks
- No data brokers or processors

## Data Retention

- **Your Control**: Data is retained as long as you choose to keep it
- **Uninstall**: All local data is removed when you uninstall the extension
- **Browser Reset**: Data may be cleared if you reset browser storage
- **Export Recommended**: Regular exports ensure you have backups

## Children's Privacy

This extension is not intended for children under 13. We do not knowingly collect data from children. If you believe a child has provided data through this extension, please contact us.

## Changes to This Policy

We may update this privacy policy to reflect changes in our practices or for legal, operational, or regulatory reasons. Material changes will be communicated through:
- Extension update notes
- Notification within the extension interface
- Updated "last modified" date on this policy

## Contact Information

If you have questions about this privacy policy or our data practices:

- **GitHub Issues**: [DialogDrive Repository](https://github.com/Nikolai-E/DialogDrive/issues)
- **Email**: support@dialogdrive.app

## Legal Compliance

We build DialogDrive to align with:
- Chrome Web Store Developer Program Policies
- California Consumer Privacy Act (CCPA), where applicable
- General data protection principles such as data minimisation and user control

For GDPR purposes, the content you save never leaves your browser unless you enable Chrome Sync or export it. That means you remain the controller of your data. DialogDrive acts as a local tool and does not act as a processor for your prompts. If we introduce an optional cloud feature in the future, we will provide an updated policy and obtain consent before enabling it.

---

**Summary**: DialogDrive keeps your content on the device where you save it. We don't collect personal information, track your browsing, or run our own storage servers. Chrome Sync may copy lightweight preferences if you enable it, and you can clear everything anytime from the Settings panel.
