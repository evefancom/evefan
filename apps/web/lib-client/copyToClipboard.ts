export async function copyToClipboard(content: string) {
  console.debug('Will save to clipboard', content)

  // Workaround https://stackoverflow.com/questions/51805395/navigator-clipboard-is-undefined
  if (typeof navigator.clipboard === 'undefined') {
    console.debug('Will use textarea hack to copy text')
    const textarea = document.createElement('textarea')
    textarea.value = content
    textarea.style.position = 'fixed' // avoid scrolling to bottom
    document.body.append(textarea)
    textarea.focus()
    textarea.select()
    try {
      document.execCommand('copy')
    } catch {
      console.warn('Unable to use textarea hack to copy')
    }
    textarea.remove()
  } else {
    await navigator.clipboard.writeText(content)
  }
}
