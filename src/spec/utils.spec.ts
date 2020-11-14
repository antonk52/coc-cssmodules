import {filePathToClassnameDict} from '../utils';
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
});
