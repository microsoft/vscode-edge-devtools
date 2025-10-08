import js from '@eslint/js';
import typescript from '@typescript-eslint/eslint-plugin';
import typescriptParser from '@typescript-eslint/parser';
import jsdoc from 'eslint-plugin-jsdoc';
import preferArrow from 'eslint-plugin-prefer-arrow';
import importPlugin from 'eslint-plugin-import';
import globals from 'globals';

export default [
  js.configs.recommended,
  {
    files: ['**/*.{js,ts,tsx}'],
    ignores: [
      '**/*.test*',
      '**/test/**/*'
    ],
    languageOptions: {
      parser: typescriptParser,
      parserOptions: {
        project: 'tsconfig.json',
        sourceType: 'module'
      },
      globals: {
        ...globals.browser,
        ...globals.node,
        ...globals.es2022,
      }
    },
    plugins: {
      '@typescript-eslint': typescript,
      'jsdoc': jsdoc,
      'prefer-arrow': preferArrow,
      'import': importPlugin
    },
    rules: {
      // Apply TypeScript recommended rules manually
      ...typescript.configs.recommended.rules,
      ...typescript.configs['recommended-requiring-type-checking'].rules,

      // Let TypeScript handle undefined variables
      'no-undef': 'off',

      // syntax preferences
      'quotes': ['error', 'single', {'avoidEscape': true, 'allowTemplateLiterals': true}],
      'semi': 'error',
      'no-extra-semi': 'error',
      'comma-style': ['error', 'last'],
      'wrap-iife': ['error', 'inside'],
      'spaced-comment': ['error', 'always', {'markers': ['*']}],
      'eqeqeq': ['error'],
      'accessor-pairs': ['error', {'getWithoutSet': false, 'setWithoutGet': false}],
      'curly': 'error',
      'new-parens': 'error',
      'func-call-spacing': 'error',
      'arrow-parens': ['error', 'as-needed'],
      'eol-last': 'error',

      // anti-patterns
      'no-caller': 'error',
      'no-cond-assign': 'error',
      'no-console': ['error', {'allow': ['assert', 'context', 'error', 'timeStamp', 'time', 'timeEnd', 'warn']}],
      'no-debugger': 'error',
      'no-dupe-keys': 'error',
      'no-duplicate-case': 'error',
      'no-else-return': ['error', {'allowElseIf': false}],
      'no-empty-character-class': 'error',
      'no-global-assign': 'error',
      'no-implied-eval': 'error',
      'no-labels': 'error',
      'no-multi-str': 'error',
      'no-new-object': 'error',
      'no-octal-escape': 'error',
      'no-self-compare': 'error',
      'no-shadow-restricted-names': 'error',
      'no-unreachable': 'error',
      'no-unsafe-negation': 'error',
      'no-var': 'error',
      'no-with': 'error',
      'prefer-const': 'error',
      'radix': 'error',
      'valid-typeof': 'error',
      'no-return-assign': ['error', 'always'],

      // es2015 features
      'require-yield': 'error',
      'template-curly-spacing': ['error', 'never'],

      // spacing details
      'space-infix-ops': 'error',
      'space-in-parens': ['error', 'never'],
      'space-before-function-paren': ['error', {'anonymous': 'never', 'named': 'never', 'asyncArrow': 'always'}],
      'no-whitespace-before-property': 'error',
      'keyword-spacing': [
        'error', {
          'overrides': {
            'if': {'after': true},
            'else': {'after': true},
            'for': {'after': true},
            'while': {'after': true},
            'do': {'after': true},
            'switch': {'after': true},
            'return': {'after': true}
          }
        }
      ],
      'arrow-spacing': ['error', {'after': true, 'before': true}],

      // file whitespace
      'no-multiple-empty-lines': ['error', {'max': 2}],
      'no-mixed-spaces-and-tabs': 'error',
      'no-trailing-spaces': 'error',
      'linebreak-style': ['error', process.platform === 'win32' ? 'windows' : 'unix'],

      // Disabled rules
      'indent': 'off',
      'brace-style': 'off',
      'key-spacing': 'off',
      'quote-props': 'off',
      'no-implicit-globals': 'off',

      // TypeScript rules (overrides to the recommended configs)
      '@typescript-eslint/explicit-member-accessibility': 'off',
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/restrict-template-expressions': 'off',
      '@typescript-eslint/no-unsafe-call': 'off',

      // skiping variables that start with underscore
      'no-unused-vars': 'off', // Turn off for TypeScript files
      '@typescript-eslint/no-unused-vars': ['error', {'argsIgnorePattern': '^_', 'varsIgnorePattern': '^_'}],

      // Import rules
      'import/no-default-export': 'error'
    }
  }
];