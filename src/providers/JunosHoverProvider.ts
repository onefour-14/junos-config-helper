import * as vscode from 'vscode';
import { JunosParser } from '../parsers/JunosParser';

export class JunosHoverProvider implements vscode.HoverProvider {
    private parser: JunosParser;

    constructor() {
        this.parser = new JunosParser();
    }

    public provideHover(
        document: vscode.TextDocument,
        position: vscode.Position,
        token: vscode.CancellationToken
    ): vscode.ProviderResult<vscode.Hover> {

        const range = document.getWordRangeAtPosition(position);
        if (!range) { return undefined; }

        const word = document.getText(range);
        
        // 定義場所を探す
        const location = this.parser.findDefinitionLocation(document, word);
        
        if (location) {
            // 定義の内容（ブロック）を取得
            const blockContent = this.parser.getDefinitionBlock(document, location);
            
            // Markdown形式で表示
            const md = new vscode.MarkdownString();
            md.appendCodeblock(blockContent, 'junos');
            
            return new vscode.Hover(md);
        }

        return undefined;
    }
}