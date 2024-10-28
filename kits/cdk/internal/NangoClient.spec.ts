import {parseNangoOauthCallbackPage} from './NangoClient'

test('oauth callback success parsing', () => {
  const result = parseNangoOauthCallbackPage(`
  <!--
Nango OAuth flow callback. Read more about how to use it at: https://github.com/NangoHQ/nango
-->
<html>
  <head>
    <meta charset="utf-8" />
    <title>Authorization callback</title>
  </head>
  <body>
    <noscript>JavaScript is required to proceed with the authentication.</noscript>
    <script type="text/javascript">
      window.providerConfigKey = \`int_qbo_01HCGK0H4FVS1949G5KCKGG2KJ\`;
      window.connectionId = \`reso_qbo_01HDFCAW620Q6GQXQ5VEHH82EF\`;

      const message = {};
      message.eventType = 'AUTHORIZATION_SUCEEDED';
      message.data = { connectionId: window.connectionId, providerConfigKey: window.providerConfigKey };

      // Tell the world what happened
      window.opener && window.opener.postMessage(message, '*');

      // Close the modal
      window.setTimeout(function() {
        window.close()
      }, 300);
    </script>
  </body>
</html>
  `)
  expect(result).toEqual({
    eventType: 'AUTHORIZATION_SUCEEDED',
    data: {
      providerConfigKey: 'int_qbo_01HCGK0H4FVS1949G5KCKGG2KJ',
      connectionId: 'reso_qbo_01HDFCAW620Q6GQXQ5VEHH82EF',
    },
  })
})

test('oauth callback error parsing', () => {
  const result = parseNangoOauthCallbackPage(`
  <!--
  Nango OAuth flow callback. Read more about how to use it at: https://github.com/NangoHQ/nango
  -->
  <html>
    <head>
      <meta charset="utf-8" />
      <title>Authorization callback</title>
    </head>
    <body>
      <noscript>JavaScript is required to proceed with the authentication.</noscript>
      <script type="text/javascript">
        window.authErrorType = 'unknown_err';
        window.authErrorDesc = 'Unkown error during the Oauth flow. {\n  "message": "Response Error: 400 Bad Request",
    "name": "Error"
  }';

        const message = {};
        message.eventType = 'AUTHORIZATION_FAILED';
        message.data = {
          error: {
              type: window.authErrorType,
              message: window.authErrorDesc
          }
        };

        // Tell the world what happened
        window.opener && window.opener.postMessage(message, '*');

        // Close the modal
        window.setTimeout(function() {
          window.close()
        }, 300);
      </script>
    </body>
  </html>
  `)
  expect(result).toEqual({
    eventType: 'AUTHORIZATION_FAILED',
    data: {
      authErrorType: 'unknown_err',
      authErrorDesc: 'Unkown error during the Oauth flow. {',
    },
  })
})
