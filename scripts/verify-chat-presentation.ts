import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { NextIntlClientProvider } from 'next-intl';
import ts from 'typescript';
import ChatMessageContent from '../src/components/astro-chat/message-content';
import ChatCitySelector from '../src/components/astro-chat/city-selector';
import { getFollowUpPrompt } from '../src/lib/chat-follow-up';
import { cityLineDistanceKm, formatSelectedCityEvidence } from '../src/lib/chat-city-context';
import { calculatePlanetaryLines } from '../src/lib/astrocartography-lines';

const render = (content: string) => renderToStaticMarkup(createElement(ChatMessageContent, {content}));
for (const [locale,title] of Object.entries({en:'Choose a city',zh:'选择城市',de:'Stadt auswählen',pt:'Escolher cidade',es:'Elegir ciudad',it:'Scegli una città'})) {
  const selector = (cities: Array<{name:string;country:string;lat:number;lng:number}>) => renderToStaticMarkup(createElement(NextIntlClientProvider, {
    locale, timeZone:'UTC', messages:{},
    children:createElement(ChatCitySelector,{cities,locale,onChange:()=>{},disabled:false}),
  }));
  const closed = selector([]);
  assert.ok(closed.includes(title) && closed.includes('aria-expanded="false"'), locale);
  assert.ok(!closed.includes('<input'), 'search must start collapsed: '+locale);
  const selected = selector([{name:'Haifa',country:'Israel',lat:32.794,lng:34.9896}]);
  assert.ok(selected.includes('Haifa, Israel'));
  assert.ok(!selected.includes('<input'), 'selected chip must not require an open search');
}
const html = render('# Haifa\n\n**Pluto DS** — approximately 106 km.\n\n- **Sun MC**\n- Saturn AS\n\n*Symbolic*, not guaranteed.');
assert.ok(html.includes('<h3') && html.includes('Haifa</h3>'));
assert.ok(html.includes('<strong') && html.includes('Pluto DS</strong>'));
assert.ok(html.includes('<ul') && html.includes('<li'));
assert.ok(html.includes('<em'));
assert.ok(!html.includes('**Pluto') && !html.includes('# Haifa'));
assert.ok(!html.includes('<h1'));
assert.ok(render('**Pluto').includes('Pluto'), 'partial stream must remain renderable');
const unsafe = render('<script>alert(1)</script>\n<svg onload=alert(1)></svg>\n![map](https://example.com/pixel.png)\n[click](javascript:alert(1))\n[site](https://example.com)');
assert.ok(!/<(?:script|svg|img|iframe|a)\b/i.test(unsafe));
assert.ok(!unsafe.includes('href=') && !unsafe.includes('src='));
assert.ok(unsafe.includes('&lt;script&gt;'), 'raw HTML must be escaped, not executed');
assert.ok(render('`<img src=x>`\n\n```html\n<script>x</script>\n```').includes('<pre'));

for (const language of ['英文','中文','德文','葡萄牙文','西班牙文','意大利文']) {
  const prompt = getFollowUpPrompt('Haifa?', 'Select Haifa first; local evidence is missing.', language);
  assert.ok(prompt.includes('return NONE'));
  assert.ok(prompt.includes('return fewer'));
  assert.ok(prompt.includes('No mandatory alternative-city slot'));
  assert.ok(!prompt.includes('EXACTLY 3'));
}
assert.ok(getFollowUpPrompt('Bitte auf Deutsch', 'Pluto DS: 106 km', '德文').includes('entirely in German'));
assert.ok(getFollowUpPrompt('Em português', 'Pluto DS: 106 km', '葡萄牙文').includes('entirely in Portuguese'));

for (const locale of ['en','zh','de','pt','es','it']) {
  const messages = JSON.parse(readFileSync(new URL(`../src/i18n/messages/${locale}.json`, import.meta.url), 'utf8')).astro_chat;
  for (const key of ['continue_title','continue_description','sign_in_continue','sign_in_notice','sign_in_placeholder','question_placeholder','generic_error','disclaimer']) {
    assert.equal(typeof messages[key], 'string', `${locale}: ${key}`);
    assert.ok(messages[key].length > 0, `${locale}: ${key} must not be empty`);
  }
}

// Execute only Check City's existing pure geometry helpers, extracted by exact
// boundaries, so this test compares against its actual implementation without
// importing the UI or changing that production calculation code.
const source = readFileSync(new URL('../src/components/astrocartography-map/city-tools.tsx', import.meta.url), 'utf8');
const start = source.indexOf('function toRadians(');
const end = source.indexOf('function cityKey(');
assert.ok(start >= 0 && end > start, 'Check City helper boundaries must still exist');
const compiled = ts.transpileModule(`${source.slice(start,end)}\nglobalThis.checkCity = analyzeCity;`, {compilerOptions:{target:ts.ScriptTarget.ES2020}}).outputText;
const context: {checkCity?: (city: unknown, lines: unknown[]) => Array<{line:{planet:string;type:string;coordinates:[number,number][];color:string};distanceKm:number}>} = {};
runInNewContext(compiled, context, {timeout:1000});
const lines = calculatePlanetaryLines({birthDate:'1982-10-04',birthTime:'22:33',timezone:'Europe/Stockholm'});
for (const city of [
  {name:'Haifa',country:'Israel',lat:32.794,lng:34.9896},
  {name:'Milan',country:'Italy',lat:45.4642,lng:9.19},
  {name:'Sydney',country:'Australia',lat:-33.8688,lng:151.2093},
]) {
  const expected = context.checkCity!(city,lines);
  const actual = JSON.parse(formatSelectedCityEvidence([city],lines).split('\n')[3])[0].nearbyLines;
  assert.equal(actual.length, expected.length, city.name);
  for (let i=0; i<expected.length; i++) {
    assert.equal(actual[i].planet, expected[i].line.planet);
    assert.equal(actual[i].angle, expected[i].line.type);
    assert.equal(actual[i].distanceKm, Math.round(expected[i].distanceKm));
    assert.ok(Math.abs(cityLineDistanceKm(city,expected[i].line as typeof lines[number])-expected[i].distanceKm)<0.000001);
  }
}
console.log('PASS: safe chat formatting, partial streams, no HTML/images/links, evidence-only optional follow-ups, and Haifa/Milan/Sydney distance parity against actual Check City helpers on a generated fixture map. No network or customer data.');
