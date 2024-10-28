/* Venice's Core Theme */

export const VeniceTheme = {
  background: '#1e1e1e',
  black: {
    DEFAULT: '#1e1e1e',
    200: '#7d7d7d',
    300: '#4e4e4e',
    400: '#3e3e3e',
    500: '#2e2e2e',
  },
  dropShadow: '#00000026',
  footerBlack: '#191919',
  githubGray: '#eef1f5',
  gold: '#ecac4c',
  gray: '#7d7d7d',
  _green: '#12b886',
  green: {
    DEFAULT: '#12b886',
    darkened: '#099f72',
  },
  greenGlow: '#12b88626',
  innerBevel: '#0000001a',
  inputBackground: '#292929',
  inputBorder: '#00000080',
  offwhite: '#eaeaea',
  primary: '#eaeaea',
  red: '#DB3E5A',
  secondary: '#12b886',
  primaryUIControl: '#ffffff14',
  white: '#ffffff',
}

/* Data Grid Theme */

/* *** IMPORTANT *** */
/* Glide's data grid DOES NOT SUPPORT RGBA VALUES */
/* You must use HEX values for the data grid theme */
/* See https://github.com/glideapps/glide-data-grid/discussions/612 */
export const dataGridThemeColors = {
  cellBackground: '#1E1E1E',
  accent: '#12B886',
  accentLight: '#031C14',

  cellText: '#ffffff99',
  textMedium: '#ffffff99',
  textLight: '#ffffff99',

  groupHeader: '#ffffff14',

  bgCellMedium: '#191919',
  bgHeader: '#262626',
  bgHeaderHovered: '#3D3D3D',
  bgHeaderHasFocus: '#4E4E4E',

  bgBubble: '#ffffff14',
  bgSearchResult: '#031C14',

  borderColor: '#ffffff14',
  drillDownBorder: '#00000000',
}

export const VeniceDataGridTheme = {
  accentColor: dataGridThemeColors.accent,
  accentFg: dataGridThemeColors.cellBackground,
  accentLight: dataGridThemeColors.accentLight,

  textDark: dataGridThemeColors.cellText,
  textMedium: dataGridThemeColors.textMedium,
  textLight: dataGridThemeColors.textLight,
  textBubble: dataGridThemeColors.cellText,

  bgIconHeader: dataGridThemeColors.textMedium,
  fgIconHeader: dataGridThemeColors.cellBackground,

  textHeader: dataGridThemeColors.cellText,
  textGroupHeader: dataGridThemeColors.groupHeader,
  textHeaderSelected: dataGridThemeColors.cellBackground,

  bgCell: dataGridThemeColors.cellBackground,
  bgCellMedium: dataGridThemeColors.bgCellMedium,
  bgHeader: dataGridThemeColors.bgHeader,
  bgHeaderHasFocus: dataGridThemeColors.bgHeaderHasFocus,
  bgHeaderHovered: dataGridThemeColors.bgHeaderHovered,

  bgBubble: dataGridThemeColors.bgBubble,
  bgBubbleSelected: dataGridThemeColors.cellBackground,

  bgSearchResult: dataGridThemeColors.bgSearchResult,

  borderColor: dataGridThemeColors.borderColor,
  drilldownBorder: dataGridThemeColors.drillDownBorder,

  linkColor: dataGridThemeColors.accent,

  cellHorizontalPadding: 8,
  cellVerticalPadding: 3,

  headerIconSize: 18,

  headerFontStyle: '500 13px',
  baseFontStyle: '13px',
  fontFamily:
    'Inter, Roboto, -apple-system, BlinkMacSystemFont, avenir next, avenir, segoe ui, helvetica neue, helvetica, Ubuntu, noto, arial, sans-serif',
  editorFontSize: '13px',
  lineHeight: 1.4, // unitless scaler, depends on your font
}

