import {languages, ExtensionContext, workspace} from 'coc.nvim';
import {DocumentFilter} from 'vscode-languageserver-protocol';

import {CSSModulesDefinitionProvider} from './DefinitionProvider';
import {CSSModulesCompletionProvider} from './CompletionProvider';

import {CamelCaseValues} from './utils';

const extName = 'cssmodules';

export async function activate(context: ExtensionContext) {
    const mode: DocumentFilter[] = [
        {language: 'typescriptreact', scheme: 'file'},
        {language: 'javascriptreact', scheme: 'file'},
        {language: 'javascript', scheme: 'file'},
    ];

    const configuration = workspace.getConfiguration(extName);
    const camelCaseConfig: CamelCaseValues = configuration.get('camelCase', false);

    context.subscriptions.push(
        languages.registerDefinitionProvider(
            mode,
            new CSSModulesDefinitionProvider(camelCaseConfig),
        ),
    );

    const langs = mode.map(x => x.language).filter(Boolean) as string[];

    context.subscriptions.push(
        languages.registerCompletionItemProvider(
            'coc-cssmodules',
            'cssmodules',
            langs,
            new CSSModulesCompletionProvider(camelCaseConfig),
            ['.'],
            undefined,
            100
        ),
    );
}
