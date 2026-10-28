export const themes = [
 {id:'dark',name:'經典深色',description:'柔和紫色與深灰背景',bg:'#0e0d15',surface:'#1c1927',text:'#f0ebfb',accent:'#8062d4'},
 {id:'light',name:'晨光淺色',description:'明亮白色與清晰文字',bg:'#f4f5fa',surface:'#ffffff',text:'#222437',accent:'#6550bb'},
 {id:'ocean',name:'海洋藍',description:'清透海藍與淡色面板',bg:'#edf6fc',surface:'#ffffff',text:'#17354a',accent:'#12668c'},
 {id:'forest',name:'森林綠',description:'寧靜森林與綠色重點',bg:'#0d1c18',surface:'#172d25',text:'#e1f0e7',accent:'#28775b'},
 {id:'rose',name:'玫瑰粉',description:'溫暖粉色與柔白背景',bg:'#fff2f5',surface:'#ffffff',text:'#4b2333',accent:'#a93662'},
 {id:'amber',name:'暖陽琥珀',description:'米色紙感與琥珀色調',bg:'#faf3e5',surface:'#fffdf7',text:'#44321c',accent:'#946014'},
 {id:'midnight',name:'午夜靛藍',description:'深藍夜色與靛紫光感',bg:'#0b1327',surface:'#17223d',text:'#e7edff',accent:'#615aca'},
];
export function applyTheme(id){document.documentElement.dataset.theme=themes.some(theme=>theme.id===id)?id:'dark';}
export async function prepareAvatar(file){
 if(!['image/png','image/jpeg','image/webp'].includes(file.type))throw new Error('請選擇 PNG、JPEG 或 WebP 圖片');
 if(file.size>5*1024*1024)throw new Error('請選擇 5 MB 以內的圖片');
 let bitmap;
 try{bitmap=await createImageBitmap(file);}catch{throw new Error('無法讀取圖片，請重新選擇');}
 const canvas=document.createElement('canvas');canvas.width=256;canvas.height=256;
 const context=canvas.getContext('2d'),side=Math.min(bitmap.width,bitmap.height);
 context.drawImage(bitmap,(bitmap.width-side)/2,(bitmap.height-side)/2,side,side,0,0,256,256);bitmap.close();
 const result=canvas.toDataURL('image/webp',0.85);
 if(result.length>210000)throw new Error('圖片壓縮後仍過大，請換一張圖片');
 return result;
}
