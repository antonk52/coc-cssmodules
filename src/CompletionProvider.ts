import {CompletionItemProvider, workspace} from 'coc.nvim';
import {
    TextDocument,
    Position,
    CompletionItem,
    // CompletionItemKind,
} from 'vscode-languageserver-protocol';
import path from 'path';
import _camelCase from 'lodash.camelcase';
import {findImportPath, getAllClassNames, getCurrentDirFromDocument} from './utils';
import {dashesCamelCase, CamelCaseValues} from './utils';

// check if current character or last character is .
function isTrigger(line: string, position: Position): boolean {
    const i = position.character - 1;
    return line[i] === '.' || (i > 1 && line[i - 1] === '.');
}

function getWords(line: string, position: Position): string {
    const text = line.slice(0, position.character);
    const index = text.search(/[a-zA-Z0-9\._]*$/);
    if (index === -1) {
        return '';
    }

    return text.slice(index);
}

export class CSSModulesCompletionProvider implements CompletionItemProvider {
    _classTransformer = null;

    constructor(...args /*camelCaseConfig?: CamelCaseValues*/) {
        const [camelCaseConfig] = args;
        // throw new Error(`*** constructor args ${JSON.stringify(Array.from(args))}`)
        switch (camelCaseConfig) {
            case true:
                this._classTransformer = _camelCase;
                break;
            case 'dashes':
                this._classTransformer = dashesCamelCase;
                break;
            default:
                break;
        }
    }

    async provideCompletionItems(
        document: TextDocument,
        position: Position,
    ): Promise<CompletionItem[]> {
        const {nvim} = workspace;
        const currentLine = await nvim.eval('getline(".")'); //getCurrentLine(document, position);
        if (typeof currentLine !== 'string') return null;
        // const currentDir = path.dirname(document.uri);
        const currentDir = getCurrentDirFromDocument(document);

        if (!isTrigger(currentLine, position)) {
            return Promise.resolve([]);
        }

        const words = getWords(currentLine, position);
        if (words === '' || words.indexOf('.') === -1) {
            throw new Error(`*** no words found, words ${words}`);
            return Promise.resolve([]);
        }

        const [obj, field] = words.split('.');

        // throw new Error(`*** importPath args ${JSON.stringify(obj)}, ${currentDir}`)
        const importPath = findImportPath(document.getText(), obj, currentDir);
        if (importPath === '') {
            throw new Error(
                `*** no import path found, importPath ${importPath}`,
            );
            return Promise.resolve([]);
        }

        const classNames = getAllClassNames(importPath, field);

        return classNames.map(_class => {
            let name = _class;
            if (!!this._classTransformer) {
                name = this._classTransformer(name);
            }
            return CompletionItem.create(
                name /*, CompletionItemKind.Variable*/,
            );
        });
    }
}
