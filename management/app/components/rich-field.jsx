'use client';
import {useState} from 'react';
import RichEditor,{plainText,textHTML} from './rich-editor';
export default function RichField({value='',html,onChange,onMessage,label='내용',images=true}){const [message,setMessage]=useState('');return <div className="rich-field"><RichEditor compact label={label} value={html??textHTML(value)} images={images} onChange={next=>onChange(plainText(next),next)} onMessage={text=>{setMessage(text);onMessage?.(text)}}/>{message&&<small role="status">{message}</small>}</div>}
