import { load } from 'cheerio';
import { validateCredit } from './policy.mjs';
export const escapeHTML = s => String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
function lines($,node){const copy=node.clone();copy.find('br').replaceWith('\n');copy.find('ul,li').each((_,el)=>{$(el).prepend('\n')});return copy.text().split('\n').map(s=>s.trim()).filter(Boolean).join('\n')}
function parts(html){const $=load(html);const columns=$('main > column-set');if(columns.length<5)throw Error('프로필 페이지 구조가 변경되어 자동 편집을 중단했습니다.');return {$,intro:columns.eq(1).children('column-unit'),education:columns.eq(2).children('column-unit').eq(1),employment:columns.eq(3).children('column-unit').eq(1),freelance:columns.eq(4).children('column-unit').eq(1)}}
export function readProfile(html){
 const {$,intro,education,employment,freelance}=parts(html);
 const credits=[];freelance.find('ul').each((_,el)=>{const match=/^(.*?) — <(.*?)>\((.*?)\), (.*)$/.exec($(el).text().trim());if(match)credits.push({role:match[1],title:match[2],year:match[3],category:match[4]})});
 const name=intro.eq(0).find('b').first().text();const location=lines($,intro.eq(0)).split('\n').filter(s=>s!==name).join('\n');
 if(!name||!credits.length)throw Error('프로필 항목을 확인하지 못했습니다.');
 return {name,location,bio:lines($,intro.eq(1)),education:lines($,education),employment:lines($,employment),credits};
}
export function validateProfile(p){
 if(!p||!['name','location','bio','education','employment'].every(k=>typeof p[k]==='string'&&p[k].length<=20000)||!p.name.trim())throw Error('소개 항목을 확인해 주세요.');
 if(!Array.isArray(p.credits)||p.credits.length>100||!p.credits.every(validateCredit))throw Error('작품마다 역할·제목·연도·카테고리를 입력해 주세요.');
}
export function applyProfile(html,p){
 validateProfile(p);const {$,intro,education,employment,freelance}=parts(html);
 const multiline=s=>escapeHTML(s.trim()).replaceAll('\n','<br>');
 intro.eq(0).html(`<b>${escapeHTML(p.name.trim())}</b><br><br>${multiline(p.location)}`);intro.eq(1).html(multiline(p.bio));education.html(multiline(p.education));employment.html(multiline(p.employment));
 const existing=[];freelance.find('ul').each((_,el)=>{if(/ — <.*>\(.*\), /.test($(el).text()))existing.push(el)});
 const credits=p.credits.map(c=>`<ul><span style="letter-spacing: 0em;">${escapeHTML(c.role.trim())} — &lt;${escapeHTML(c.title.trim())}&gt;(${escapeHTML(c.year)}), ${escapeHTML(c.category.trim())}</span></ul>`).join('');
 if(!existing.length)throw Error('경력 목록이 변경되었습니다. 다시 불러와 주세요.');
 $(existing[0]).before(credits);for(const el of existing)$(el).remove();
 const stamp=new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Seoul'}).format(new Date()).replaceAll('-','. ');
 $('main span').filter((_,el)=>$(el).text().startsWith('Last Updated')).last().text(`Last Updated  ${stamp}`);
 return $.html();
}
