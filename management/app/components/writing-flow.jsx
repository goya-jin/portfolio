'use client';
import React from 'react';
import RichEditor from './rich-editor';
export default function WritingFlow(props){
 return <RichEditor {...props} key={props.editorKey} layout previewStyle={{'--editor-font-size':(props.settings?.fontSize||11)+'px','--editor-line-height':props.settings?.lineHeight||1.4,'--editor-paragraph-gap':(props.settings?.paragraphGap||1.2)+'em'}}/>;
}
