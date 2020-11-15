import {filePathToClassnameDict, findImportPath} from '../utils';
import * as path from 'path';

describe('filePathToClassnameDict', () => {
    it('gets a dictionory of classnames and their location', async () => {
        const filepath = path.join(__dirname, 'styles', 'regular.css');
        const result = await filePathToClassnameDict(filepath);
        const expected = {
            '.single': {
                loc: {
                    line: 1,
                    column: 1,
                }},
            '.one': {loc: {
                line: 5,
                column: 1,
            }},
            '.two': {loc: {
                line: 5,
                column: 5,
            }},
            '.block--element__mod': {loc: {
                line: 9,
                column: 1,

            }},
            '.m-9': {loc: {
                line: 13,
                column: 1,
            }},
            ".💩": {
                "loc": {
                    "column": 1,
                    "line": 17,
                },
            },
            ".🔥🚒": {
                "loc": {
                    "column": 1,
                    "line": 21,
                },
            },
            ".🤢-_-😷": {
                "loc": {
                    "column": 1,
                    "line": 25,
                },
            },
        };

        expect(result).toEqual(expected)
    });

    it('gets a dictionory of nested classnames', async () => {
        const filepath = path.join(__dirname, 'styles', 'nested.css');
        const result = await filePathToClassnameDict(filepath);
        const expected = {
            '.single': {
                loc: {
                    line: 1,
                    column: 1,
                }},
            '.parent': {
                loc: {
                    line: 5,
                    column: 1,
                }},
            '.child': {
                loc: {
                line: 6,
                // TODO: targets the first element from the selector
                // instead of the actual classname
                column: 5,
            }},
            '.parent--aa': {loc: {
                line: 25,
                column: 5,
            }},
            '.parent--bb': {loc: {
                line: 25,
                // TODO: same errro as for `.child`
                column: 5,
            }},
            '.parent--mod': {loc: {
                line: 10,
                column: 5,
            }},
            '.parent--mod--addon': {loc: {
                line: 13,
                column: 9,
            }},
        };

        expect(result).toEqual(expected)
    });

    it('gets a dictionory of nested classnames from less files', async () => {
        const filepath = path.join(__dirname, 'styles', 'nested.less');
        const result = await filePathToClassnameDict(filepath);
        const expected = {
            '.single': {
                loc: {
                    line: 10,
                    column: 1,
                }},
            ".button": {
                "loc": {
                    "column": 1,
                    "line": 14,
                },
            },
            ".button-cancel": {
                "loc": {
                    "column": 5,
                    "line": 18,
                },
            },
            ".button-custom": {
                "loc": {
                    "column": 5,
                    "line": 22,
                },
            },
            ".button-ok": {
                "loc": {
                    "column": 5,
                    "line": 15,
                },
            },
            ".class": {
                "loc": {
                    "column": 1,
                    "line": 52,
                },
            },
            ".element": {
                "loc": {
                    "column": 5,
                    "line": 74,
                },
            },
            ".inner": {
                "loc": {
                    "column": 5,
                    "line": 98,
                },
            },
            ".inside-the-css-guard": {
                "loc": {
                    "column": 5,
                    "line": 105,
                },
            },
            ".link": {
                "loc": {
                    "column": 1,
                    "line": 27,
                },
            },
            ".linkish": {
                "loc": {
                    "column": 5,
                    "line": 40,
                },
            },
            ".math": {
                "loc": {
                    "column": 1,
                    "line": 45,
                },
            },
            ".mixin": {
                "loc": {
                    "column": 1,
                    "line": 88,
                },
            },
            ".my-optional-style": {
                "loc": {
                    "column": 1,
                    "line": 104,
                },
            },
            ".myclass": {
                "loc": {
                    "column": 1,
                    "line": 91,
                },
            },
            ".section": {
                "loc": {
                    "column": 1,
                    "line": 71,
                },
            },
        };

        expect(result).toEqual(expected)
    });

    it('gets a dictionory of nested classnames from scss files', async () => {
        const filepath = path.join(__dirname, 'styles', 'nested.scss');
        const result = await filePathToClassnameDict(filepath);
        const expected = {
            ".accordion": {
                "loc": {
                    "column": 1,
                    "line": 69,
                },
            },
            ".accordion__copy": {
                "loc": {
                    "column": 5,
                    "line": 76,
                },
            },
            ".accordion__copy--open": {
                "loc": {
                    "column": 9,
                    "line": 84,
                },
            },
            ".alert": {
                "loc": {
                    "column": 1,
                    "line": 58,
                },
            },
            ".pulse": {
                "loc": {
                    "column": 1,
                    "line": 46,
                },
            },

        };

        expect(result).toEqual(expected)
    });

    it('gets a dictionory of nested classnames from sass files', async () => {
        const filepath = path.join(__dirname, 'styles', 'nested.sass');
        const result = await filePathToClassnameDict(filepath);
        const expected = {
            ".accordion": {
                "loc": {
                    "column": 1,
                    "line": 55,
                },
            },
            ".accordion__copy": {
                "loc": {
                    "column": 5,
                    "line": 62,
                },
            },
            ".accordion__copy--open": {
                "loc": {
                    "column": 9,
                    "line": 70,
                },
            },
            ".alert": {
                "loc": {
                    "column": 1,
                    "line": 48,
                },
            },
            ".pulse": {
                "loc": {
                    "column": 1,
                    "line": 35,
                },
            },

        };

        expect(result).toEqual(expected)
    });
});

const fileContent = `
import React from 'react'

import css from './style.css'
import style from './style.css'
import styles from './styles.css'
import lCss from './styles.less'
import sCss from './styles.scss'
import sass from './styles.sass'
import styl from './styles.styl'

const rCss = require('./style.css')
const rStyle = require('./style.css')
const rStyles = require('./styles.css')
const rLCss = require('./styles.less')
const rSCss = require('./styles.scss')
const rSass = require('./styles.sass')
const rStyl = require('./styles.styl')
`.trim();

describe('findImportPath', () => {
    const dirPath = '/User/me/project/Component';

    [
        ['css', path.join(dirPath, 'style.css')],
        ['style', path.join(dirPath, 'style.css')],
        ['styles', path.join(dirPath, 'styles.css')],
        ['lCss', path.join(dirPath, 'styles.less')],
        ['sCss', path.join(dirPath, 'styles.scss')],
        ['sass', path.join(dirPath, 'styles.sass')],
        ['styl', path.join(dirPath, 'styles.styl')],

        ['rCss', path.join(dirPath, './style.css')],
        ['rStyle', path.join(dirPath, './style.css')],
        ['rStyles', path.join(dirPath, './styles.css')],
        ['rLCss', path.join(dirPath, './styles.less')],
        ['rSCss', path.join(dirPath, './styles.scss')],
        ['rSass', path.join(dirPath, './styles.sass')],
        ['rStyl', path.join(dirPath, './styles.styl')],
    ].forEach(([importName, expected]) => it(
        `finds the correct import path for ${importName}`,
        () => {
            const result = findImportPath(
                fileContent,
                importName,
                dirPath,
            );
            expect(result).toBe(expected);
        }
    ));

    it('returns an empty string when there is no import', () => {
        const simpleComponentFile = [
            'import React from \'react\'',
            'export () => <h1>hello world</h1>'
        ].join('\n');

        const result = findImportPath(
            simpleComponentFile,
            'css',
            dirPath,
        );
        const expected = '';

        expect(result).toEqual(expected);
    });
});
