export function groupContent(post,group='first'){
 return group==='second'?{body:'<p></p>',css:'',format:'html',canvas:true,...(post.secondGroup||{})}:post;
}
export function withGroupContent(post,group,content){
 return group==='second'?{...post,secondGroup:{...groupContent(post,'second'),...content,format:'html',canvas:true}}:{...post,...content};
}
export function prepareEditorPost(post){
 return {...post,body:post.canvasHtml||post.editorHtml||post.body||'<p></p>',...(post.secondGroup?{secondGroup:{...post.secondGroup,body:post.secondGroup.canvasHtml||post.secondGroup.editorHtml||post.secondGroup.body||'<p></p>'}}:{})};
}
