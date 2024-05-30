# Color pick into sheet (front-end)

## Installing dependencies

```bash
$ npm i -D
```

### Build for production

```bash
$ npm run build
```

### Environment
During development `.env.development` will be loaded. All environment variables should be prefixed with `VITE_` for them to be accessible from the front-end code. For production build, `.env.production` file will be used.


### Remove chrome extension cookies

```js
// clear extension cookie during development mode
// run inside chrome extension inspect console
chrome.cookies
  .remove({ name: "auth.user", url: "http://localhost:3000" })
  .then(() => console.log("deleted"))
```