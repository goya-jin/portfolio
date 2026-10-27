export const previewLanguages=['en','ko','bilingual'];
export function validateKorean(text,approved){if(text!==undefined&&(typeof text!=='string'||text.length>30000)||approved!==undefined&&typeof approved!=='boolean')throw Error('한국어 문구와 검수 상태를 확인해 주세요.')}
export function writeKorean($,node,text,approved){validateKorean(text,approved);if(text!==undefined){if(text.trim())node.attr('data-project-ko',text);else node.removeAttr('data-project-ko data-project-ko-approved')}if(approved!==undefined&&node.attr('data-project-ko'))node.attr('data-project-ko-approved',approved?'true':'false')}
export function languagePreview($,language='en'){
 if(!previewLanguages.includes(language))throw Error('미리보기 언어를 확인해 주세요.');if(language==='en')return;
 $('[data-project-caption-ko]').each((_,el)=>{const node=$(el),ko=node.attr('data-project-caption-ko');if(!ko?.trim())return;let caption=node.children('[data-project-group-caption]').first();if(!caption.length){caption=$('<p data-project-group-caption="true" style="white-space:pre-wrap;grid-column:1 / -1;margin:1rem 0"></p>');const content=node.children('[data-project-group-content]').first();if(content.length)content.before(caption);else node.append(caption)}caption.attr('data-project-ko',ko)});
 $('[data-project-ko]').each((_,el)=>{const node=$(el),ko=node.attr('data-project-ko');if(!ko?.trim())return;const translated=$('<span></span>').text(ko).css({'white-space':'pre-wrap','overflow-wrap':'anywhere'});if(language==='ko')node.empty().append(translated);else{translated.css({display:'block','margin-top':'.8em'});node.append(translated)}});
 $('html').attr('lang',language==='ko'?'ko':'en');
}
