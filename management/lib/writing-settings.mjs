export const DEFAULT_WRITING_SETTINGS={fontSize:13,lineHeight:1.6,paragraphGap:1.2};
export const WRITING_SETTINGS_PATH='content/writing-settings.json';
export function validateWritingSettings(v){if(!v||!Number.isInteger(v.fontSize)||v.fontSize<12||v.fontSize>24||!Number.isFinite(v.lineHeight)||v.lineHeight<1.3||v.lineHeight>2.2||!Number.isFinite(v.paragraphGap)||v.paragraphGap<.5||v.paragraphGap>2.5)throw Error('글자 크기는 12–24px, 줄 간격은 1.3–2.2, 문단 간격은 0.5–2.5 범위로 선택해 주세요.');return {fontSize:v.fontSize,lineHeight:v.lineHeight,paragraphGap:v.paragraphGap}}
