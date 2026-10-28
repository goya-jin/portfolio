// Shared by saved pages and previews; changes only layout classes, never copy.
export function normalizeProjectLayout($){
 $('main column-set').each((_,el)=>{
  const row=$(el),cols=row.children('column-unit');row.removeClass('reading-row copy-columns');cols.removeClass('readable-copy empty-copy-column');
  if(cols.length<2||row.find('img,video,iframe,audio,figure,a[href="index.html"]').length)return;
  const meaningful=cols.toArray().filter(c=>$(c).text().replace(/\s/g,'').length);
  cols.each((_,c)=>{if(!$(c).text().replace(/\s/g,'').length)$(c).addClass('empty-copy-column')});
  if(meaningful.length===1&&meaningful[0]===cols[0]&&$(meaningful[0]).text().trim().length>=100){row.addClass('reading-row');$(meaningful[0]).addClass('readable-copy')}
  else if(cols.toArray().some(c=>$(c).text().trim().length>=180))row.addClass('copy-columns');
 });
 $('main column-unit,main [data-project-group-caption],main [data-project-block-id]').each((_,el)=>{const n=$(el);n.removeClass('project-prose');if(n.text().trim().length>=180&&!n.find('img,video,iframe,audio,column-set').length)n.addClass('project-prose')});
}
