import test from 'node:test';
import assert from 'node:assert/strict';
import {appendAttachments} from '../lib/attachments.mjs';
import {serializePost} from '../lib/posts.mjs';
const file=(name,size=100,lastModified=1)=>({name,size,lastModified});
test('successive selections retain existing attachments and marker order',()=>{
 const first=file('first.jpg'),second=file('second.jpg');
 const files=appendAttachments([first],[second]);
 assert.deepEqual(files,[first,second]);
 const text=serializePost({slug:'example',title:'Example',date:'2026-11-04',body:'[첨부 1]\n[첨부 2]'},files.map((f,i)=>({...f,id:String(i+1),marker:`[첨부 ${i+1}]`})));
 assert.ok(text.indexOf('first.jpg')<text.indexOf('second.jpg'));
 assert.ok(text.includes('/1.jpg')&&text.includes('/2.jpg'));
});
test('duplicate or cancelled selection does not clear earlier files',()=>{
 const first=file('first.jpg');
 assert.deepEqual(appendAttachments([first],[file('first.jpg')]),[first]);
 assert.deepEqual(appendAttachments([first],[]),[first]);
});
test('combined size and count limits reject without mutating existing files',()=>{
 const existing=[file('first.jpg',2*1024*1024)];
 assert.throws(()=>appendAttachments(existing,[file('second.jpg',2*1024*1024)]),/3MB/);
 assert.equal(existing.length,1);
 assert.throws(()=>appendAttachments(Array.from({length:8},(_,i)=>file(i+'.jpg')),[file('ninth.jpg')]),/8개/);
});
