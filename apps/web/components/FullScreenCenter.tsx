export function FullScreenCenter(props: {children: React.ReactNode}) {
  return (
    <div className="flex h-screen w-screen flex-col items-center justify-center">
      {props.children}
    </div>
  )
}
