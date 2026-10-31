# yarnity_nest — single page app

Plain HTML, CSS and JavaScript. No build step, no dependencies.

## Structure
```
index.html        page shell (header, footer, order dialog)
css/styles.css    all styling, light + dark theme tokens
js/catalog.js     categories and products — edit this to update the shop
js/app.js         hash router, views, order dialog
images/           put product photos here
```

## Routes
`#home` `#shop` `#about` `#order` plus one per category id (`#flowers`, `#bag-charms`, ...).

## Update products
Open `js/catalog.js`. An item can be a string or an object:
```js
{name:"Tulip bouquet", price:"₹350", image:"images/tulip.jpg"}
```
Add `image:"images/flowers.jpg"` to a category to show a photo on its card.

## Run locally
```
python3 -m http.server 8000
```
then open http://localhost:8000

## Deploy on GitHub Pages
Push these files to the repo root (replacing the old files), then Settings → Pages → deploy from the `main` branch, `/ (root)`. Hash routing needs no server rewrites.
