function rtt(str) {
  return (str + '').replace(/[a-z]/gi, s => String.fromCharCode(s.charCodeAt(0) + (s.toLowerCase() < 'n' ? 13 : -13)));
}

// Test: what happens when we apply ROT13+Base64 to a plain URL?
const url = 'https://turbo.imgz.me/play/78J4G9CR';

console.log('Original:', url);
console.log('ROT13:', rtt(url));

const rot13d = rtt(url);
const dec = Buffer.from(rot13d, 'base64').toString('utf8');
console.log('Decoded:', dec ? dec.substring(0, 100) : '(empty)');
console.log('Starts with http:', dec && dec.startsWith('http'));

// Also test: what does the Base64 decode of ROT13'd URL produce as raw bytes?
console.log('Base64 raw bytes:', Buffer.from(rot13d, 'base64'));
console.log('length:', rot13d.length);

// Test 2: What does the encoded string look like?
const encoded = 'nUE0pUZ6Yl9mo2WlMJS0p2ImqKyjYzAioF9go3McMF8jMGtjBQV5BTVlMJV0AmR3ZTD4MTV5AQL3AQRjBQuyZv9cMaWuoJH=';
console.log('\nEncoded string test:');
console.log('ROT13:', rtt(encoded));
const dec2 = Buffer.from(rtt(encoded), 'base64').toString('utf8');
console.log('Decoded:', dec2.substring(0, 80));
console.log('Starts with http:', dec2.startsWith('http'));

// Test 3: What does the current code produce for a direct URL?
console.log('\n--- Current code behavior ---');
const arr = [url, encoded];
arr.forEach((enc) => {
  if (!enc) return;
  try {
    const rot13d = rtt(enc);
    const dec = Buffer.from(rot13d, 'base64').toString('utf8');
    if (dec && dec.startsWith('http')) {
      console.log(`  "${enc.substring(0,30)}..." => "${dec.substring(0,80)}"`);
    } else {
      console.log(`  "${enc.substring(0,30)}..." => REJECTED (no http prefix, got "${(dec||'').substring(0,40)}")`);
    }
  } catch (e) {
    console.log(`  "${enc.substring(0,30)}..." => ERROR: ${e.message}`);
  }
});
