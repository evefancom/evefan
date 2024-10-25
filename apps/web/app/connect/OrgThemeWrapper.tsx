// TODO: Get values from DB

export function OrgThemeWrapper({children}: {children: React.ReactNode}) {
  // TODO: we need to sanitize the theme value as they are from user
  // however it should affect only one's own account so damage scope is limited
  const themeVariables = {
    // '--background': 'transparent',
    // '--body-background': 'transparent',
    // Temp workaround for not having a --body-background variable just yet...
    // '--inner-background': '0 0% 100%',
    // '--foreground': '192 5.32% 31.57%',
    // '--card-foreground': '192 5.32% 31.57%',
  }

  return (
    // is org-theme-wrapper the right way to achieve scoped style?
    // eslint-disable-next-line tailwindcss/no-custom-classname
    <div className="org-theme-wrapper h-screen w-screen">
      <style
        dangerouslySetInnerHTML={{
          __html: `
          :root {
            ${Object.entries(themeVariables)
              .map(([key, value]) => `${key}: ${value};`)
              .join('\n')}
          }
          .org-theme-wrapper {

          }
        `,
        }}
      />

      {children}
    </div>
  )
}
