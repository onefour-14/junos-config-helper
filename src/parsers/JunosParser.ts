import * as vscode from 'vscode';

// 検索対象の種別定義
type DefinitionType = 
    | 'groups' | 'firewall' | 'policy-statement' 
    | 'community' | 'as-path' | 'prefix-list' 
    | 'pool' | 'lsp' | 'path'; 
    // interfaceはロジックが特殊なため個別関数で処理

interface SearchPattern {
    type: DefinitionType;
    regexHierarchy: RegExp; 
    regexSet: RegExp;       
}

export class JunosParser {

    // 汎用的な定義パターン（インターフェース以外）
    private patterns: SearchPattern[] = [
        { type: 'groups', regexHierarchy: /^\s*groups\s+([\w-]+)\s*\{/, regexSet: /^set\s+groups\s+([\w-]+)/ },
        { type: 'firewall', regexHierarchy: /^\s*filter\s+([\w-]+)\s*\{/, regexSet: /^set\s+firewall\s+family\s+\w+\s+filter\s+([\w-]+)/ },
        { type: 'policy-statement', regexHierarchy: /^\s*policy-statement\s+([\w-]+)\s*\{/, regexSet: /^set\s+policy-options\s+policy-statement\s+([\w-]+)/ },
        { type: 'community', regexHierarchy: /^\s*community\s+([\w-]+)\s+members/, regexSet: /^set\s+policy-options\s+community\s+([\w-]+)/ },
        { type: 'as-path', regexHierarchy: /^\s*as-path\s+([\w-]+)\s+/, regexSet: /^set\s+policy-options\s+as-path\s+([\w-]+)/ },
        { type: 'prefix-list', regexHierarchy: /^\s*prefix-list\s+([\w-]+)\s*\{/, regexSet: /^set\s+policy-options\s+prefix-list\s+([\w-]+)/ },
        { type: 'pool', regexHierarchy: /^\s*(source|destination)-pool\s+([\w-]+)\s*\{/, regexSet: /^set\s+services\s+nat\s+(source|destination)\s+pool\s+([\w-]+)/ },
        { type: 'lsp', regexHierarchy: /^\s*label-switched-path\s+([\w-]+)\s*\{/, regexSet: /^set\s+protocols\s+mpls\s+label-switched-path\s+([\w-]+)/ },
        { type: 'path', regexHierarchy: /^\s*path\s+([\w-]+)\s*\{/, regexSet: /^set\s+protocols\s+mpls\s+path\s+([\w-]+)/ }
    ];

    /**
     * ドキュメント全体を走査して、対象ワードの定義位置を特定する
     */
    public findDefinitionLocation(document: vscode.TextDocument, targetWord: string): vscode.Location | undefined {
        
        // 1. インターフェース検索（Unit対応の特別ロジック）
        // 例: ge-0/0/0, ge-0/0/0.0, ae0, ae0.100, irb.10
        if (this.isInterfaceLike(targetWord)) {
            const loc = this.findInterfaceLocation(document, targetWord);
            if (loc) { return loc; }
        }

        // 2. その他の汎用パターン検索
        const lineCount = document.lineCount;
        for (let i = 0; i < lineCount; i++) {
            const lineText = document.lineAt(i).text;

            for (const pattern of this.patterns) {
                // 階層型のチェック
                const matchH = lineText.match(pattern.regexHierarchy);
                if (matchH && this.isExactMatch(matchH, targetWord)) {
                    return new vscode.Location(document.uri, new vscode.Position(i, 0));
                }

                // set型のチェック
                const matchS = lineText.match(pattern.regexSet);
                if (matchS && this.isExactMatch(matchS, targetWord)) {
                    return new vscode.Location(document.uri, new vscode.Position(i, 0));
                }
            }
        }
        return undefined;
    }

    /**
     * インターフェース定義を検索する（Unit対応版）
     */
    private findInterfaceLocation(document: vscode.TextDocument, targetWord: string): vscode.Location | undefined {
        // 親IFとUnit番号に分割する
        // 例: "ge-0/0/0.100" -> parent="ge-0/0/0", unit="100"
        // 例: "ge-0/0/0"     -> parent="ge-0/0/0", unit=undefined
        const parts = targetWord.split('.');
        const parentIf = parts[0]; 
        const unitNum = parts.length > 1 ? parts[1] : undefined;

        // ステート管理用変数
        let inInterfacesBlock = false; // "interfaces {" の中にいるか
        let currentInterface = "";     // 現在処理中のインターフェース名 (例: "ge-0/0/0")
        let braceDepth = 0;            // ブレースの深さ

        for (let i = 0; i < document.lineCount; i++) {
            const line = document.lineAt(i).text;
            const trimmed = line.trim();

            // --- A. Set形式のチェック ---
            if (trimmed.startsWith('set interfaces')) {
                // set interfaces ge-0/0/0 unit 0 ...
                if (unitNum !== undefined) {
                    // Unitまで指定がある場合
                    // 正規表現: set interfaces ge-0/0/0 unit 0 (前後にスペース考慮)
                    const setRegex = new RegExp(`^set\\s+interfaces\\s+${this.escapeRegExp(parentIf)}\\s+unit\\s+${unitNum}\\b`);
                    if (setRegex.test(trimmed)) {
                        return new vscode.Location(document.uri, new vscode.Position(i, 0));
                    }
                } else {
                    // 親IFのみの場合
                    const setRegex = new RegExp(`^set\\s+interfaces\\s+${this.escapeRegExp(parentIf)}\\b`);
                    if (setRegex.test(trimmed)) {
                        return new vscode.Location(document.uri, new vscode.Position(i, 0));
                    }
                }
                continue; // Set行なら階層チェックは不要
            }

            // --- B. 階層形式のチェック ---
            
            // ブロック開始/終了の判定（簡易的）
            // コメント行は無視すべきだが、ここでは簡易実装として省略
            if (trimmed.includes('{')) {
                
                // 1. "interfaces {" ブロックへの突入チェック
                if (/^interfaces\s*\{/.test(trimmed)) {
                    inInterfacesBlock = true;
                }
                
                // 2. 個別インターフェースブロックへの突入チェック (interfacesブロック内にいる場合)
                else if (inInterfacesBlock && braceDepth === 1) { // depth 1 means inside "interfaces {"
                    // "ge-0/0/0 {" などを検出
                    const match = trimmed.match(/^([\w\-\/\.]+)\s*\{/);
                    if (match) {
                        currentInterface = match[1];
                        
                        // 親IFのみを探していて、かつ一致した場合 -> 発見
                        if (unitNum === undefined && currentInterface === parentIf) {
                            return new vscode.Location(document.uri, new vscode.Position(i, 0));
                        }
                    }
                }

                // 3. Unitブロックへの突入チェック
                else if (inInterfacesBlock && currentInterface === parentIf && unitNum !== undefined) {
                    // "unit 0 {" などを検出
                    const unitMatch = trimmed.match(/^unit\s+(\d+)\s*\{/);
                    if (unitMatch && unitMatch[1] === unitNum) {
                        return new vscode.Location(document.uri, new vscode.Position(i, 0));
                    }
                }

                braceDepth++;
            }

            if (trimmed.includes('}')) {
                braceDepth--;
                
                // 階層を抜けたときの状態リセット
                if (braceDepth === 0) {
                    inInterfacesBlock = false;
                }
                if (braceDepth === 1 && inInterfacesBlock) {
                    // interface個別のブロックを抜けた
                    currentInterface = ""; 
                }
            }
        }

        return undefined;
    }

    /**
     * 文字列がインターフェースっぽいか判定
     */
    private isInterfaceLike(word: string): boolean {
        // 一般的な物理/論理IFパターン
        // ge-0/0/0, xe-0/0/0.0, ae0, lo0, irb.100, vlan.100 など
        // ドットが含まれるか、または特定のプレフィックスで始まるか
        return /^([a-z]+-?\d+(\/\d+)*(\.\d+)?)$/.test(word);
    }

    private escapeRegExp(string: string): string {
        return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); 
    }

    private isExactMatch(matchArray: RegExpMatchArray, target: string): boolean {
        for (let i = 1; i < matchArray.length; i++) {
            if (matchArray[i] === target) {
                return true;
            }
        }
        return false;
    }

    /**
     * 定義ブロック全体を取得する（Popup表示用）
     */
    public getDefinitionBlock(document: vscode.TextDocument, location: vscode.Location): string {
        const startLine = location.range.start.line;
        const startText = document.lineAt(startLine).text;
        
        if (startText.trim().startsWith('set ')) {
            return startText.trim();
        }

        let result = "";
        let braceCount = 0;
        let started = false;

        for (let i = startLine; i < document.lineCount; i++) {
            const line = document.lineAt(i).text;
            result += line + "\n";
            
            braceCount += (line.match(/\{/g) || []).length;
            braceCount -= (line.match(/\}/g) || []).length;

            if (braceCount > 0) {
                started = true;
            }
            if (started && braceCount === 0) {
                break;
            }
            if (i - startLine > 100) {
                result += "\n... (truncated)";
                break;
            }
        }
        return result;
    }
}