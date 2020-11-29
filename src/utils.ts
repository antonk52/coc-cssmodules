import {Position, TextDocument} from 'vscode-languageserver-protocol';
import path from 'path';
import os from 'os';
import fs from 'fs';
import _camelCase from 'lodash.camelcase';

import postcss from 'postcss';
import type {Node, Parser, ProcessOptions} from 'postcss';

export function getCurrentDirFromDocument(document: TextDocument) {
    return path.dirname(document.uri).replace(/^file:\/\//, '');
}

export type CamelCaseValues = false | true | 'dashes';

export function genImportRegExp(importName: string): RegExp {
    const file = '(.+\\.(styl|sass|scss|less|css))';
    const fromOrRequire = '(?:from\\s+|=\\s+require(?:<any>)?\\()';
    const requireEndOptional = '\\)?';
    const pattern = `${importName}\\s+${fromOrRequire}["']${file}["']${requireEndOptional}`;

    return new RegExp(pattern);
}

export function findImportPath(
    fileContent: string,
    importName: string,
    directoryPath: string,
): string {
    const re = genImportRegExp(importName);
    const results = re.exec(fileContent);

    if (!!results && results.length > 0) {
        return path.resolve(directoryPath, results[1]);
    } else {
        return '';
    }
}

export type StringTransformer = (str: string) => string;
export function getTransformer(
    camelCaseConfig: CamelCaseValues,
): StringTransformer {
    switch (camelCaseConfig) {
        case true:
            /**
             * _camelCase will remove the dots in the string though if the
             * classname starts with a dot we want to preserve it
             */
            return input =>
                `${input.charAt(0) === '.' ? '.' : ''}${_camelCase(input)}`;
        case 'dashes':
            /**
             * only replaces `-` that are followed by letters
             *
             * `.foo__bar--baz` -> `.foo__barBaz`
             */
            return str =>
                str.replace(/-+(\w)/g, (_, firstLetter) =>
                    firstLetter.toUpperCase(),
                );
        default:
            return x => x;
    }
}

export function isImportLineMatch(
    line: string,
    matches: RegExpExecArray,
    current: number,
): boolean {
    if (matches === null) {
        return false;
    }

    const start1 = line.indexOf(matches[1]) + 1;
    const start2 = line.indexOf(matches[2]) + 1;

    // check current character is between match words
    return (
        (current > start2 && current < start2 + matches[2].length) ||
        (current > start1 && current < start1 + matches[1].length)
    );
}

/**
 * Finds the position of the className in filePath
 */
export async function getPosition(
    filePath: string,
    className: string,
    camelCaseConfig: CamelCaseValues,
): Promise<Position | null> {
    const classDict = await filePathToClassnameDict(
        filePath,
        getTransformer(camelCaseConfig),
    );
    const target = classDict[`.${className}`];

    return target ? Position.create(target.line - 1, target.column) : null;
}

export function getWords(line: string, position: Position): string {
    const headText = line.slice(0, position.character);
    const startIndex = headText.search(/[a-z0-9\._]*$/i);
    // not found or not clicking object field
    if (startIndex === -1 || headText.slice(startIndex).indexOf('.') === -1) {
        return '';
    }

    const match = /^([a-z0-9\._]*)/i.exec(line.slice(startIndex));
    if (match === null) {
        return '';
    }

    return match[1];
}

type Classname = {
    line: number;
    column: number;
};

export const log = (...args: unknown[]) => {
    const timestamp = new Date().toLocaleTimeString('en-GB', {hour12: false});
    const msg = args
        .map(x =>
            typeof x === 'object' ? '\n' + JSON.stringify(x, null, 2) : x,
        )
        .join('\n\t');

    fs.writeFileSync('/tmp/log-cssmodules', `\n[${timestamp}] ${msg}`);
};

const sanitizeSelector = (selector: string) =>
    selector
        .replace(/\\n|\\t/g, '')
        .replace(/\s+/, ' ')
        .trim();

type LazyLoadPostcssParser = () => Parser;

const PostcssInst = postcss([]);

const concatSelectors = (
    parentSelectors: string[],
    nodeSelectors: string[],
): string[] => {
    // if parent is AtRule
    if (parentSelectors.length === 0) return nodeSelectors;

    return ([] as string[]).concat(
        ...parentSelectors.map(ps =>
            nodeSelectors.map(
                /**
                 * No need to replace for children separated by spaces
                 *
                 * .parent {
                 *      color: red;
                 *
                 *      & .child {
                 *      ^^^^^^^^ no need to do the replace here,
                 *               since no new classnames are created
                 *          color: pink;
                 *      }
                 * }
                 */
                s => (/&[a-z0-1-_]/i ? s.replace('&', ps) : s),
            ),
        ),
    );
};

function getParentRule(node: Node): undefined | Node {
    const {parent} = node;
    if (!parent) return undefined;
    if (parent.type === 'rule') return parent;

    return getParentRule(parent);
}

/**
 * input `'./path/to/styles.css'`
 *
 * output
 *
 * ```
 * {
 *     '.foo': {
 *         line: 10,
 *         column: 5,
 *     },
 *     '.bar': {
 *         line: 22,
 *         column: 1,
 *     }
 * }
 * ```
 */
export async function filePathToClassnameDict(
    filepath: string,
    classnameTransformer: StringTransformer,
): Promise<Record<string, Classname>> {
    const content = fs.readFileSync(filepath, {encoding: 'utf8'});
    const {ext} = path.parse(filepath);

    /**
     * only load the parses once they are needed
     */
    const parsers = {
        '.less': () => require('postcss-less'),
        '.scss': () => require('postcss-scss'),
        '.sass': () => require('postcss-sass'),
    };

    const getParser = parsers[ext] as void | LazyLoadPostcssParser;

    /**
     * Postcss does not expose this option though typescript types
     * This is why we are doing this naughty thingy
     */
    const hiddenOption = {hideNothingWarning: true} as Record<never, never>;
    const postcssOptions: ProcessOptions = {
        map: false,
        from: filepath,
        ...hiddenOption,
        ...(getParser ? {parser: getParser()} : {}),
    };

    const ast = await PostcssInst.process(content, postcssOptions);
    // TODO: root.walkRules and for each rule gather info about parents
    const dict: Record<string, Classname> = {};

    const visitedNodes = new Map<Node, {selectors: string[]}>([]);
    const stack = [...ast.root.nodes];

    while (stack.length) {
        const node = stack.shift();
        if (node?.type === 'atrule' && node.name.toLowerCase() === 'media') {
            stack.unshift(...node.nodes);
            continue;
        }
        if (node?.type !== 'rule') continue;

        const selectors = node.selector.split(',').map(sanitizeSelector);

        selectors.forEach(sels => {
            const classNameRe = /\.([-0-9a-z_\p{Emoji_Presentation}])+/giu;
            if (node.parent === ast.root) {
                const match = sels.match(classNameRe);
                match?.forEach(name => {
                    if (name in dict) return;

                    if (node.source === undefined) return;

                    const column = node.source.start?.column || 0;
                    const line = node.source.start?.line || 0;

                    const diff = node.selector.indexOf(name);
                    const diffStr = node.selector.slice(0, diff);
                    const lines = diffStr.split(os.EOL);
                    const lastLine = lines[lines.length - 1];

                    dict[classnameTransformer(name)] = {
                        column: column + lastLine.length,
                        line: line + lines.length - 1,
                    };
                });

                visitedNodes.set(node, {selectors});
            } else {
                if (node.parent === undefined) return;

                const parent = getParentRule(node);
                const knownParent = parent && visitedNodes.get(parent);

                const finishedSelectors: string[] = knownParent
                    ? concatSelectors(knownParent.selectors, selectors)
                    : selectors;

                const finishedSelectorsAndClassNames = finishedSelectors.map(
                    finsihedSel => finsihedSel.match(classNameRe),
                );

                finishedSelectorsAndClassNames.forEach(fscl =>
                    fscl?.forEach(classname => {
                        if (classname in dict) return;
                        if (node.source === undefined) return;

                        const column = node.source.start?.column || 0;
                        const line = node.source.start?.line || 0;

                        // TODO: refine location to specific line by the classname's last characters
                        dict[classnameTransformer(classname)] = {
                            column: column,
                            line: line,
                        };
                    }),
                );

                visitedNodes.set(node, {selectors: finishedSelectors});
            }
        });

        stack.push(...node.nodes);
    }

    return dict;
}

/**
 * Get all classnames from the file contents
 */
export async function getAllClassNames(
    filePath: string,
    keyword: string,
    classnameTransformer: StringTransformer,
): Promise<string[]> {
    const classes = await filePathToClassnameDict(
        filePath,
        classnameTransformer,
    );
    const classList = Object.keys(classes).map(x => x.slice(1));

    return keyword !== ''
        ? classList.filter(item => item.includes(keyword))
        : classList;
}
