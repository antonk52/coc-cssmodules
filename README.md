# coc-cssmodules

[coc.nvim](https://github.com/neoclide/coc.nvim) plugin for `autocompletion` and `go-to-definition` functionality for css modules.

<p align="center"><img src="https://user-images.githubusercontent.com/5817809/76164832-0adaf600-6163-11ea-8c8e-548b7aeb1213.gif"></p>

The supported languages are `css`(postcss), `sass` and `scss`. `styl` files are parsed as regular `css`.

## Installation

```
:CocInstall coc-cssmodules
```

## Settings

### Camel cased css class names

If you write kebab-case classes in css files, but want to get camelCase complete items, set following to true.

```json
{
   "cssmodules.camelCase": true
}
```

### Options and transformation

You can set the `cssmodules.camelCase` option to `true`, `"dashes"` or `false`(default).

| Classname in css file | `true`            | `dashes`        | `false`(default)  |
| --------------------- | ----------------- | --------------- | ----------------- |
| `.button`             | `.button`         | `.button`       | `.button`         |
| `.btn__icon--mod`     | `.btnIconMod`     | `.btn__iconMod` | `.btn__icon--mod` |


### hintName setting

You can change the hint name by setting it in the `coc-setting.json` file. Default is `cssmodules`

example

```json
{
   "cssmodules.hintName": "cssmodules"
}
```

<p align="center"><img src="https://user-images.githubusercontent.com/5817809/99907239-bc6b8880-2cec-11eb-87ab-9c51730340ab.png"></p>

## Acknowledgments

This plugin was based on [vscode-css-modules plugin](https://github.com/clinyong/vscode-css-modules).
