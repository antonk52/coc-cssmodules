import {CompletionItemProvider, workspace} from 'coc.nvim';
import {
    TextDocument,
    Position,
    CompletionItem,
} from 'vscode-languageserver-protocol';
import _camelCase from 'lodash.camelcase';
import {
    findImportPath,
    getAllClassNames,
    getCurrentDirFromDocument,
    getTransformer,
} from './utils';
import {CamelCaseValues} from './utils';

// check if current character or last character is .
function isTrigger(line: string, position: Position): boolean {
    const i = position.character - 1;
    return line[i] === '.' || (i > 1 && line[i - 1] === '.');
}

function getWords(line: string, position: Position): string {
    const text = line.slice(0, position.character);
    const index = text.search(/[a-z0-9\._]*$/i);
    if (index === -1) {
        return '';
    }

    return text.slice(index);
}

export class CSSModulesCompletionProvider implements CompletionItemProvider {
    _classTransformer = null;

    constructor(camelCaseConfig?: CamelCaseValues) {
        this._classTransformer = getTransformer(camelCaseConfig);
    }

    async provideCompletionItems(
        document: TextDocument,
        position: Position,
    ): Promise<CompletionItem[]> {
        const {nvim} = workspace;
        const currentLine = await nvim.eval('getline(".")');
        if (typeof currentLine !== 'string') return null;
        const currentDir = getCurrentDirFromDocument(document);

        if (!isTrigger(currentLine, position)) {
            return [];
        }

        const words = getWords(currentLine, position);
        if (words === '' || words.indexOf('.') === -1) {
            return [];
        }

        const [obj, field] = words.split('.');

        const importPath = findImportPath(document.getText(), obj, currentDir);
        if (importPath === '') {
            return [];
        }

        const classNames = await getAllClassNames(importPath, field);

        return classNames.map(_class => {
            let name = _class;
            if (!!this._classTransformer) {
                name = this._classTransformer(name);
            }
            return CompletionItem.create(name);
        });
    }
}
