import test from 'node:test';
import assert from 'node:assert/strict';
import {load} from 'cheerio';
import {normalizeProjectLayout} from '../lib/project-layout.mjs';
test('layout normalization expands empty reading columns and preserves intentional media and right-hand copy',()=>{
 const prose='A long project description. '.repeat(12);
 const $=load(`<main><column-set id="reading"><column-unit span="7">${prose}</column-unit><column-unit span="5"></column-unit></column-set><column-set id="facts"><column-unit>Role</column-unit><column-unit>${prose}</column-unit></column-set><column-set id="media"><column-unit><img src="photo.jpg"></column-unit><column-unit>${prose}</column-unit></column-set><column-set id="right"><column-unit></column-unit><column-unit>${prose}</column-unit></column-set></main>`);
 const text=$('main').text();normalizeProjectLayout($);
 assert.equal($('main').text(),text);assert.ok($('#reading').hasClass('reading-row'));assert.ok($('#facts').hasClass('copy-columns'));assert.ok(!$('#media').hasClass('copy-columns'));assert.ok(!$('#right').hasClass('reading-row'));assert.equal($('img').attr('src'),'photo.jpg');const once=$.html();normalizeProjectLayout($);assert.equal($.html(),once);
});
