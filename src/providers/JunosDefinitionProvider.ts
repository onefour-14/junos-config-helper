import * as vscode from 'vscode';
import { JunosParser } from '../parsers/JunosParser';

export class JunosDefinitionProvider implements vscode.DefinitionProvider {
    private parser: JunosParser;

    constructor() {
        this.parser = new JunosParser();
    }

    public provideDefinition(
        document: vscode.TextDocument,
        position: vscode.Position,
        token: vscode.CancellationToken
    ): vscode.ProviderResult<vscode.Definition> {
        
        // カーソル位置の単語を取得
        const range = document.getWordRangeAtPosition(position);
        if (!range) { return undefined; }
        
        const word = document.getText(range);
        
        // パースして定義場所を探す
        const location = this.parser.findDefinitionLocation(document, word);
        
        return location;
    }
}