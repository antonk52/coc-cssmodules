import {Position, TextDocument} from 'vscode-languageserver-protocol';
import path from 'path';
import os from 'os';
import fs from 'fs';
import _camelCase from 'lodash.camelcase';

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

export function getPosition(
    filePath: string,
    className: string,
    camelCaseConfig: CamelCaseValues,
): Position {
    const content = fs.readFileSync(filePath, {encoding: 'utf8'});
    const lines = content.split(os.EOL);

    let lineNumber = -1;
    let character = -1;
    const keyWord =
        camelCaseConfig !== true
            ? // is false or 'dashes'
              `.${className}`
            : className;
    const classTransformer = getTransformer(camelCaseConfig);

    for (let i = 0; i < lines.length; i++) {
        const originalLine = lines[i];
        /**
         * The only way to guarantee that a position will be returned for a camelized class
         * is to check after camelizing the source line.
         * Doing the opposite -- uncamelizing the used classname -- would not always give
         * correct result, as camelization is lossy.
         * i.e. `.button--disabled`, `.button-disabled` both give same
         * final class: `css.buttonDisabled`, and going back from this to that is not possble.
         *
         * But this has a drawback - camelization of a line may change the final
         * positions of classes. But as of now, I don't see a better way, and getting this
         * working is more important, also putting this functionality out there would help
         * get more eyeballs and hopefully a better way.
         */
        const line = !classTransformer
            ? originalLine
            : classTransformer(originalLine);
        character = line.indexOf(keyWord);

        if (character === -1 && !!classTransformer) {
            // if camelized match fails, and transformer is there
            // try matching the un-camelized classnames too!
            character = originalLine.indexOf(keyWord);
        }

        if (character !== -1) {
            lineNumber = i;
            break;
        }
    }

    return lineNumber === -1
        ? null
        : Position.create(lineNumber, character + 1);
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

function uniq(arr: string[]): string[] {
    return Array.from(new Set(arr));
}

export function getAllClassNames(filePath: string, keyword: string): string[] {
    const content = fs.readFileSync(filePath, {encoding: 'utf8'});
    const lines = content.match(/.*[,{]/g);
    if (lines === null) {
        return [];
    }

    const classNames = lines.join(' ').match(/\.[_a-z0-9\-]+/gi);
    if (classNames === null) {
        return [];
    }

    const uniqNames = uniq(classNames).map(item => item.slice(1));
    return keyword !== ''
        ? uniqNames.filter(item => item.includes(keyword))
        : uniqNames;
}
