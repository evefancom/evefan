import type {Monaco, OnChange, OnMount} from '@monaco-editor/react'
import MonacoEditor from '@monaco-editor/react'
import React from 'react'
import {format} from 'sql-formatter'

interface EditorProps {
  language: string
  onChange: OnChange
  value?: string

  // This only works on mount i.e. the subsequent updates do not reflex
  // via fast refresh (dev time) - requires full-page reload.
  setKeybindings?: (monaco: Monaco) => Array<{
    key: number
    run: () => void
  }>
}

export type Editor = Parameters<OnMount>[0]

// TODO: support adding validation rules so we can disable execute/download
// for invalid queries.
export const CodeEditor = React.forwardRef(function CodeEditor(
  props: EditorProps,
  ref: React.ForwardedRef<Editor | null>,
) {
  const {language, onChange, value, setKeybindings = () => []} = props
  return (
    <MonacoEditor
      language={language}
      value={value}
      // theme="openint"
      beforeMount={(monaco) => {
        monaco.editor.defineTheme('openint', openintEditorTheme)
        // @see https://stackoverflow.com/questions/66325637/how-to-format-format-a-piece-of-codes/66344338#66344338
        // define a document formatting provider
        // then you contextmenu will add an "Format Document" action
        monaco.languages.registerDocumentFormattingEditProvider('sql', {
          provideDocumentFormattingEdits(model, opts) {
            const text = format(model.getValue(), {tabWidth: opts.tabSize})
            return [{range: model.getFullModelRange(), text}]
          },
        })
        // define a range formatting provider
        // select some codes and right click those codes
        // you contextmenu will have an "Format Selection" action
        monaco.languages.registerDocumentRangeFormattingEditProvider('sql', {
          provideDocumentRangeFormattingEdits(model, range, options) {
            const currentText = model.getValueInRange(range)
            const text = format(currentText, {tabWidth: options.tabSize})
            return [{range, text}]
          },
        })
      }}
      onMount={(editor, monaco) => {
        if (typeof ref === 'function') {
          ref(editor)
        } else if (ref) {
          ref.current = editor
        }
        for (const {key, run} of setKeybindings(monaco)) {
          editor.addCommand(key, run)
        }
        editor.addCommand(
          monaco.KeyMod.Alt | monaco.KeyMod.Shift | monaco.KeyCode.KeyF,
          () => {
            void editor.getAction('editor.action.formatDocument')?.run()
          },
        )
      }}
      // TODO: handle scrollbar better
      options={{
        // https://stackoverflow.com/questions/53448735/is-there-a-way-to-completely-hide-the-gutter-of-monaco-editor
        // folding: false,
        // fontSize: 14,
        // // fontFamily: '',
        // lineDecorationsWidth: 0,
        // // lineNumbers: 'off',
        minimap: {enabled: false},
        // overviewRulerLanes: 0,
        // renderLineHighlight: 'none',
        // roundedSelection: true,
        // scrollbar: {
        //   vertical: 'hidden',
        //   horizontal: 'hidden',
        //   handleMouseWheel: false,
        // },
        // wordWrap: 'on',
      }}
      onChange={onChange}
    />
  )
})

/** TODO: Figure out how to get the typing without such convolution */
type IStandaloneThemeData = Parameters<Monaco['editor']['defineTheme']>[1]

// TODO:
// - font-family
// - tokens: *, number
// - selectionBackground
// - pass theme via context
const openintEditorTheme: IStandaloneThemeData = {
  base: 'vs-dark',
  inherit: true,
  rules: [
    {
      // offwhite
      foreground: 'e9e9e9',
      token: '',
    },
    // {
    //   background: '272822',
    //   token: '',
    // },
    {
      // venice-gray-muted
      foreground: '7d7d7d',
      token: 'comment',
    },
    // {
    //   foreground: 'e6db74',
    //   token: 'string',
    // },
    // {
    //   foreground: 'ae81ff',
    //   token: 'constant.numeric',
    // },
    // {
    //   foreground: 'ae81ff',
    //   token: 'constant.language',
    // },
    // {
    //   foreground: 'ae81ff',
    //   token: 'constant.character',
    // },
    // {
    //   foreground: 'ae81ff',
    //   token: 'constant.other',
    // },
    {
      // venice-green
      foreground: '12b886',
      token: 'keyword',
    },
    // {
    //   foreground: 'f92672',
    //   token: 'storage',
    // },
    // {
    //   foreground: '66d9ef',
    //   fontStyle: 'italic',
    //   token: 'storage.type',
    // },
    // {
    //   foreground: 'a6e22e',
    //   fontStyle: 'underline',
    //   token: 'entity.name.class',
    // },
    // {
    //   foreground: 'a6e22e',
    //   fontStyle: 'italic underline',
    //   token: 'entity.other.inherited-class',
    // },
    // {
    //   foreground: 'a6e22e',
    //   token: 'entity.name.function',
    // },
    // {
    //   foreground: 'fd971f',
    //   fontStyle: 'italic',
    //   token: 'variable.parameter',
    // },
    // {
    //   foreground: 'f92672',
    //   token: 'entity.name.tag',
    // },
    // {
    //   foreground: 'a6e22e',
    //   token: 'entity.other.attribute-name',
    // },
    // {
    //   foreground: '66d9ef',
    //   token: 'support.function',
    // },
    // {
    //   foreground: '66d9ef',
    //   token: 'support.constant',
    // },
    // {
    //   foreground: '66d9ef',
    //   fontStyle: 'italic',
    //   token: 'support.type',
    // },
    // {
    //   foreground: '66d9ef',
    //   fontStyle: 'italic',
    //   token: 'support.class',
    // },
    // {
    //   foreground: 'f8f8f0',
    //   background: 'f92672',
    //   token: 'invalid',
    // },
    // {
    //   foreground: 'f8f8f0',
    //   background: 'ae81ff',
    //   token: 'invalid.deprecated',
    // },
    // {
    //   foreground: 'cfcfc2',
    //   token: 'meta.structure.dictionary.json string.quoted.double.json',
    // },
    // {
    //   foreground: '75715e',
    //   token: 'meta.diff',
    // },
    // {
    //   foreground: '75715e',
    //   token: 'meta.diff.header',
    // },
    // {
    //   foreground: 'f92672',
    //   token: 'markup.deleted',
    // },
    // {
    //   foreground: 'a6e22e',
    //   token: 'markup.inserted',
    // },
    // {
    //   foreground: 'e6db74',
    //   token: 'markup.changed',
    // },
    // {
    //   foreground: 'ae81ffa0',
    //   token: 'constant.numeric.line-number.find-in-files - match',
    // },
    // {
    //   foreground: 'e6db74',
    //   token: 'entity.name.filename.find-in-files',
    // },
  ],
  colors: {
    'editor.foreground': '#e9e9e9',
    'editor.background': '#2e2e2e',
    'editor.lineHighlightBackground': '#3e3e3e',

    // 'editor.foreground': '#F8F8F2',
    // 'editor.background': '#272822',
    // 'editor.selectionBackground': '#49483E',
    // 'editor.lineHighlightBackground': '#3E3D32',
    // 'editorCursor.foreground': '#F8F8F0',
    // 'editorWhitespace.foreground': '#3B3A32',
    // 'editorIndentGuide.activeBackground': '#9D550FB0',
    // 'editor.selectionHighlightBorder': '#222218',
  },
}
