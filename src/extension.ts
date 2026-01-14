import * as vscode from 'vscode';
import { JunosDefinitionProvider } from './providers/JunosDefinitionProvider';
import { JunosHoverProvider } from './providers/JunosHoverProvider';

export function activate(context: vscode.ExtensionContext) {
    console.log('Junos extension is now active!');

    const selector = { language: 'junos', scheme: 'file' };

    // Definition Provider (Go to Definition / Ctrl+Click / F12)
    const definitionProvider = vscode.languages.registerDefinitionProvider(
        selector, 
        new JunosDefinitionProvider()
    );

    // Hover Provider (Mouse over popup)
    const hoverProvider = vscode.languages.registerHoverProvider(
        selector,
        new JunosHoverProvider()
    );

    context.subscriptions.push(definitionProvider, hoverProvider);
}

export function deactivate() {}