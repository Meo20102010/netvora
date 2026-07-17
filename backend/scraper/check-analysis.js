const d = require('./deep-analysis.json');
d.forEach(r => {
  console.log(r.slug + ': scxFound=' + r.scxFound + ' keys=' + JSON.stringify(r.scxKeys) + ' scxGlobal=' + (r.scxGlobal ? 'yes' : 'no') + ' scxInline=' + (r.scxInline ? 'yes' : 'no'));
  if (r.allInlineScripts) {
    const withScx = r.allInlineScripts.filter(s => s.hasScx === 'yes');
    console.log('  scripts with scx: ' + withScx.length);
    if (withScx.length > 0) {
      withScx.forEach(s => console.log('  len=' + s.textLength + ' preview="' + s.preview.substring(0, 80) + '"'));
    }
  }
});
