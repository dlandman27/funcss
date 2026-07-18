'use strict';
// One-time seed: load historical GA pageviews (export of 2026-07-18, "Pages
// and screens" by page title) into the Upstash `plays` hash so the homepage
// play counts don't start from zero. Replaces the whole hash (DEL + HSET).
//
// Skipped GA rows: the homepage titles ("Random Sites On The Web...", "My
// Websites" + localized variants), "(not set)", translated per-site
// duplicates (1-2 views each), and titles with no identifiable catalog slug.
//
// Usage: node scripts/seed-plays-from-ga.js   (reads .env for Upstash creds)

require('dotenv').config();
const catalog = require('../catalog.json');

// [catalog slug, GA views]
const SEED = [
  ['visitcounter', 4908],
  ['randomcolor', 4509],
  ['happybirthday', 972],
  ['meme-soundboard', 804],
  ['largestnumber', 788],
  ['do-you-like-me', 784],
  ['colorle', 747],
  ['randomphotos', 741],
  ['welcomeback', 726],
  ['fallingkeys', 715],
  ['snake', 703],
  ['dvd', 685],
  ['morse-code', 682],
  ['dontpressthebutton', 661],
  ['chatgptwithanattitude', 619],
  ['marble-race', 595],
  ['brainrotengine', 592],
  ['magic8ball', 543],
  ['im-sorry', 542],
  ['countthedrinks', 541],
  ['hobbyfinder', 532],
  ['writemeastory', 527],
  ['scrollympics', 521],
  ['cursors', 515],
  ['balancethestick', 510],
  ['infinitenumbercasino', 510],
  ['eyesonme', 505],
  ['nicecursor', 504],
  ['redlightgreenlight', 503],
  ['wreckroom', 502],
  ['piano', 502],
  ['psychadelics', 492],
  ['pi', 488],
  ['localstorage-terminal', 488],
  ['coolloaders', 487],
  ['shakespeareinsultmaker', 483],
  ['colortheory', 482],
  ['asciikeyboard', 471],
  ['infinitetictactoe', 471],
  ['dailydoodle', 469],
  ['pong', 466],
  ['unmotivationalquotes', 456],
  ['puzzle', 453],
  ['nameashape', 450],
  ['spinthebottle', 449],
  ['binaryticker', 448],
  ['library-of-everything', 448],
  ['randommazegenerator', 448],
  ['comicmoves', 445],
  ['christmaseve', 439],
  ['passwordsecurity', 435],
  ['interdimensionaldvr', 432],
  ['drips', 432],
  ['whyamilate', 432],
  ['parallel_lines', 430],
  ['checkboxgrid', 425],
  ['fractal', 424],
  ['wow', 423],
  ['namesinahat', 415],
  ['passwordgenerator', 412],
  ['meditation', 405],
  ['timezones', 382],
  ['for-michelle', 346],
  ['hatchtheegg', 129],
  ['emojiprophunt', 101],
  ['csstest', 88],
  ['reactiontime', 69],
  ['fontninja', 59],
  ['doomscroll', 58],
  ['metadata', 57],
  ['static', 51],
  ['thelastsurvivors', 50],
  ['whatsmyresolution', 48],
  ['growyourgarden', 46],
  ['what-to-do', 43],
  ['roman-numerals', 42],
  ['affirmations', 36],
  ['themap', 36],
  ['leapyear', 35],
  ['confession', 35],
  ['howlonghaveyoubeenstaring', 32],
  ['translatetolegalese', 28],
  ['shapematch', 24],
  ['404', 7],
  ['thousandballs', 5],
  ['kaleidoscope', 4],
  ['murmuration', 4],
  ['gravitysearch', 4],
  ['infinitepainting', 4],
  ['binary-sudoku', 3],
  ['fireflies', 3],
  ['inkdrop', 3],
  ['voicepaint', 3],
  ['board-game-generator', 2],
  ['camouflage', 2],
  ['chaosgame', 2],
  ['clap-o-meter', 2],
  ['infinitemaze', 2],
  ['mirror', 2],
  ['bad-art-museum', 2],
  ['noise-machine', 2],
  ['paint-by-number', 2],
  ['rothkomachine', 2],
  ['scoreboard', 2],
  ['tessellation', 2],
  ['typewriter', 2],
  ['weaver', 2],
  ['youarebeingwatched', 2],
  ['coastline', 1],
  ['rubegoldberg', 1],
  ['slowtv', 1],
  ['the-last-time', 1],
  ['quietest', 1],
  ['timemeters', 1],
  ['wetpaint', 1],
];

async function main() {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) throw new Error('UPSTASH env vars missing (see .env)');

  const valid = new Set(catalog.sites.map((s) => s.slug.toLowerCase()));
  const bad = SEED.filter(([slug]) => !valid.has(slug));
  if (bad.length) throw new Error('slugs not in catalog: ' + bad.map(([s]) => s).join(', '));
  const seen = new Set();
  for (const [slug] of SEED) {
    if (seen.has(slug)) throw new Error('duplicate slug in SEED: ' + slug);
    seen.add(slug);
  }

  const hset = ['HSET', 'plays'];
  for (const [slug, views] of SEED) hset.push(slug, String(views));

  const res = await fetch(url.replace(/\/$/, '') + '/pipeline', {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
    body: JSON.stringify([['DEL', 'plays'], hset]),
  });
  if (!res.ok) throw new Error('Upstash pipeline failed: ' + res.status);
  const results = await res.json();
  console.log('DEL plays ->', JSON.stringify(results[0]));
  console.log('HSET plays ->', JSON.stringify(results[1]), `(${SEED.length} sites seeded)`);
}

main().catch((err) => { console.error(err.message); process.exit(1); });
