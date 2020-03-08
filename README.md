# coc-cssmodules

[coc.nvim](https://github.com/neoclide/coc.nvim) plugin for `autocompletion` and `go-to-definition` functionality for css modules.

<p align="center"><img src="https://user-images.githubusercontent.com/5817809/76164832-0adaf600-6163-11ea-8c8e-548b7aeb1213.gif"></p>

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

## Acknowledgments

This plugin is essentially a port of [vscode-css-modules plugin](https://github.com/clinyong/vscode-css-modules).
