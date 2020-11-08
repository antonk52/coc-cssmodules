import path from 'path';
import {workspace, Uri, DefinitionProvider} from 'coc.nvim';
import {
    CancellationToken,
    Location,
    Position,
    Range,
    TextDocument,
} from 'vscode-languageserver-protocol';
import {
    CamelCaseValues,
    findImportPath,
    genImportRegExp,
    getCurrentDirFromDocument,
    getPosition,
    getWords,
    isImportLineMatch,
} from './utils';

export class CSSModulesDefinitionProvider implements DefinitionProvider {
    _camelCaseConfig: CamelCaseValues = false;

    constructor(camelCaseConfig?: CamelCaseValues) {
        this._camelCaseConfig = camelCaseConfig;
    }

    async provideDefinition(
        document: TextDocument,
        position: Position,
        _: CancellationToken,
    ): Promise<Location> {
        const {nvim} = workspace;

        const currentDir = getCurrentDirFromDocument(document);
        const currentLine = await nvim.eval('getline(".")');
        if (typeof currentLine !== 'string') {
            return null;
        }

        const matches = genImportRegExp('(\\S+)').exec(currentLine);
        if (isImportLineMatch(currentLine, matches, position.character)) {
            const filePath: string = Uri.file(
                path.resolve(currentDir, matches[2]),
            ).toString();
            const targetRange: Range = Range.create(
                Position.create(0, 0),
                Position.create(0, 0),
            );
            return Location.create(filePath, targetRange);
        }

        const words = getWords(currentLine, position);
        if (words === '' || words.indexOf('.') === -1) {
            return null;
        }

        const [obj, field] = words.split('.');
        const importPath = findImportPath(document.getText(), obj, currentDir);
        if (importPath === '') {
            return null;
        }

        const targetPosition = await getPosition(
            importPath,
            field,
            this._camelCaseConfig,
        );

        if (targetPosition === null) {
            return null;
        } else {
            const filePath = Uri.file(importPath).toString();
            const targetRange: Range = {
                start: targetPosition,
                end: targetPosition,
            };
            return Location.create(filePath, targetRange);
        }
    }
}
