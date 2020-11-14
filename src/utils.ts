import {Position, TextDocument} from 'vscode-languageserver-protocol';
import path from 'path';
import os from 'os';
import fs from 'fs';
import _camelCase from 'lodash.camelcase';

import {parse as postcssParse} from 'postcss';
import type {Node} from 'postcss';

/**
 * TODO find better way to get a file path not starting with `file:///`
 */
export function getCurrentDirFromDocument(document: TextDocument) {
    return path.dirname(document.uri).replace(/^file:\/\//, '');
}

export type CamelCaseValues = false | true | 'dashes';

export function genImportRegExp(key: string): RegExp {
    const file = '(.+\\.\\S{1,2}ss)';
    const fromOrRequire = '(?:from\\s+|=\\s+require(?:<any>)?\\()';
    const requireEndOptional = '\\)?';
    const pattern = `${key}\\s+${fromOrRequire}["']${file}["']${requireEndOptional}`;
    return new RegExp(pattern);
}

export function findImportPath(
    text: string,
    key: string,
    parentPath: string,
): string {
    const re = genImportRegExp(key);
    const results = re.exec(text);

    if (!!results && results.length > 0) {
        return path.resolve(parentPath, results[1]);
    } else {
        return '';
    }
}

export function dashesCamelCase(str: string): string {
    return str.replace(/-(\w)/g, (_, firstLetter) => firstLetter.toUpperCase());
}

type StringTransformer = (str: string) => string;

export function getTransformer(
    camelCaseConfig: CamelCaseValues,
): StringTransformer {
    switch (camelCaseConfig) {
        case true:
            return _camelCase;
        case 'dashes':
            return dashesCamelCase;
        default:
            return null;
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
): Promise<Position> {
    const classDict = await filePathToClassnameDict(filePath);
    const target = classDict[`.${className}`];

    return target
        ? Position.create(target.loc.line - 1, target.loc.column)
        : null;
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
    name: string,
    loc: {
        line: number,
        column: number,
    }
}

export const log = (...args: any[]) => {
    const timestamp = new Date().toLocaleTimeString('en-GB', {hour12: false});
    const msg = args.map(
        x => typeof x === 'object' ? '\n' + JSON.stringify(x, null, 2) : x
    ).join('\n\t');

    fs.writeFileSync(
        '/tmp/log-cssmodules',
        `\n[${timestamp}] ${msg}`,
    );
}

const sanitizeSelector = (selector: string) => selector
    .replace(/\\n|\\t/g, '')
    .replace(/\s+/, ' ')
    .trim();

export async function filePathToClassnameDict(filepath: string): Promise<Record<string, Classname>> {
    const content = fs.readFileSync(filepath, {encoding: 'utf8'});
    const root = postcssParse(content, {map: false, from: filepath});
    // TODO: root.walkRules and for each rule gather info about parents
    const dict: Record<string, Classname> = {};

    const visitedNodes = new Map<Node, {selectors: string[]}>([]);
    const stack = [...root.nodes];

    while (stack.length) {
        const node = stack.shift();
        if (node.type !== 'rule') continue;
        log('---------', {selector: node.selector, isSubParent: node.parent === root});
        const selectors = node.selector
            .split(',')
            .map(sanitizeSelector)

        selectors.forEach(sels => {
            const classNameRe = /\.\w*([-0-9a-z_])*/gi;
            if (node.parent === root) {
                const match = sels.match(classNameRe);
                match?.forEach(name => {
                    if (name in dict) return;

                    const {column, line} = node.source.start;

                    const diff = node.selector.indexOf(name);
                    const diffStr = node.selector.slice(0, diff)
                    const lines = diffStr.split(os.EOL);
                    const lastLine = lines[lines.length - 1];

                    dict[name] = {
                        name,
                        loc: {
                            column: column + lastLine.length,
                            line: line + lines.length - 1,
                        }
                    }
                });

                visitedNodes.set(node, {selectors});
            } else {
                const knownParent = visitedNodes.get(node.parent);
                if (!knownParent) {
                    log('WE ARE IN TROUBLE');
                    return;
                }

                const finishedSelectors: string[] = [].concat(
                    ...knownParent.selectors.map(
                        ps => selectors.map(
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
                            s => /&[a-z0-1-_]/i ? s.replace('&', ps) : s
                        )
                    )
                );

                log({finishedSelectors})
                const finishedSelectorsAndClassNames = finishedSelectors
                    .map(finsihedSel => finsihedSel.match(classNameRe))

                log({finishedSelectorsAndClassNames})

                finishedSelectorsAndClassNames.forEach(fscl => fscl?.forEach(classname => {
                    if (classname in dict) return;

                    const {column, line} = node.source.start;

                    // TODO: refine location to specific line by the classname's last characteds
                    dict[classname] = {
                        name: classname,
                        loc: {
                            column: column + 0,
                            line: line,
                        },
                    };
                }));

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
export async function getAllClassNames(filePath: string, keyword: string): Promise<string[]> {
    const classes = await filePathToClassnameDict(filePath);
    const classList = Object.keys(classes);

    return keyword !== ''
        ? classList.filter(item => item.includes(keyword))
        : classList;
}
