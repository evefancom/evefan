await fetch('https://httpbin.org/anything', {
  method: 'POST',
  body: JSON.stringify({foo: 'bar'}),
})
