import {filePathToClassnameDict} from '../utils';
import * as path from 'path';

describe('filePathToClassnameDict', () => {
    it('gets a dictionory of classnames and their location', async () => {
        const filepath = path.join(__dirname, 'styles', 'regular.css');
        const result = await filePathToClassnameDict(filepath);
        const expected = {
            '.single': {
                name: '.single', loc: {
                    line: 1,
                    column: 1,
                }},
            '.one': {name: '.one', loc: {
                line: 5,
                column: 1,
            }},
            '.two': {name: '.two', loc: {
                line: 5,
                column: 5,
            }},
            '.block--element__mod': {name: '.block--element__mod', loc: {
                line: 9,
                column: 1,

            }},
            '.m-9': {name: '.m-9', loc: {
                line: 13,
                column: 1,
            }},
        }

        expect(result).toEqual(expected)
    });

    it('gets a dictionory of nested classnames', async () => {
        const filepath = path.join(__dirname, 'styles', 'nested.css');
        const result = await filePathToClassnameDict(filepath);
        const expected = {
            '.single': {
                name: '.single', loc: {
                    line: 1,
                    column: 1,
                }},
            '.parent': {
                name: '.parent', loc: {
                    line: 5,
                    column: 1,
                }},
            '.child': {name: '.child', loc: {
                line: 6,
                // TODO: targets the first element from the selector
                // instead of the actual classname
                column: 5,
            }},
            '.parent--aa': {name: '.parent--aa', loc: {
                line: 25,
                column: 5,
            }},
            '.parent--bb': {name: '.parent--bb', loc: {
                line: 25,
                // TODO: same errro as for `.child`
                column: 5,
            }},
            '.parent--mod': {name: '.parent--mod', loc: {
                line: 10,
                column: 5,
            }},
            '.parent--mod--addon': {name: '.parent--mod--addon', loc: {
                line: 13,
                column: 9,
            }},
        }

        expect(result).toEqual(expected)
    });
});
