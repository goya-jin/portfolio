export function photoWidth(value){
 const width=Number.parseFloat(value);
 return Number.isFinite(width)?Math.round(Math.max(1,Math.min(100,width))*10)/10:100;
}
export function draggedPhotoWidth(startPixels,deltaPixels,containerPixels){
 return containerPixels>0?photoWidth((startPixels+deltaPixels)/containerPixels*100):100;
}
