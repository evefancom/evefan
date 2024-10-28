import React from 'react'
import type {GetIFrameProps} from './common'
import {getIFrameUrl} from './common'

export interface OpenIntConnectEmbedProps
  extends GetIFrameProps,
    React.IframeHTMLAttributes<HTMLIFrameElement> {
  onReady?: () => void
}

const DEFAULT_HEIGHT = 700

export const OpenIntConnectEmbed = React.forwardRef(
  (
    {baseUrl, params, onReady, ...iframeProps}: OpenIntConnectEmbedProps,
    forwardedRef: React.ForwardedRef<HTMLIFrameElement>,
  ) => {
    const url = getIFrameUrl({baseUrl, params})
    const [loading, setLoading] = React.useState(true)
    if (
      typeof iframeProps.height === 'number' &&
      iframeProps.height < DEFAULT_HEIGHT
    ) {
      console.warn('Optimal height for Connect is 700px. Using 700px instead.')
    }
    const height =
      typeof iframeProps.height === 'number'
        ? iframeProps.height > DEFAULT_HEIGHT
          ? iframeProps.height
          : DEFAULT_HEIGHT
        : iframeProps.height

    // Add a more reliable way to know iframe has fully finished loading
    // by sending message from iframe to parent when ready
    return (
      <>
        {loading && (
          <div className="spinner-container">
            <svg className="spinner" viewBox="0 0 50 50">
              <circle
                className="path"
                cx="25"
                cy="25"
                r="20"
                fill="none"
                strokeWidth="5"></circle>
            </svg>
          </div>
        )}
        <iframe
          width="100%"
          style={{minWidth: '800px'}}
          {...iframeProps}
          ref={forwardedRef}
          onLoad={() => {
            setLoading(false)
            onReady?.()
          }}
          src={url}
          height={height}
          // Using style for minWidth since iframe props don't accept it.
        />

        <style>{`
        .spinner-container {
          display: flex;
          justify-content: center;
          align-items: center;
          height: 100%;
        }
        .spinner {
          animation: rotate 2s linear infinite;
          width: 50px;
          height: 50px;
        }
        .path {
          stroke: #5652BF;
          stroke-linecap: round;
          animation: dash 1.5s ease-in-out infinite;
        }
        @keyframes rotate {
          100% {
            transform: rotate(360deg);
          }
        }
        @keyframes dash {
          0% {
            stroke-dasharray: 1, 150;
            stroke-dashoffset: 0;
          }
          50% {
            stroke-dasharray: 90, 150;
            stroke-dashoffset: -35;
          }
          100% {
            stroke-dasharray: 90, 150;
            stroke-dashoffset: -124;
          }
        }
      `}</style>
      </>
    )
  },
)
OpenIntConnectEmbed.displayName = 'OpenIntConnectEmbed'
