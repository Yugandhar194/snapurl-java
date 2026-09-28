(function(){
const $=s=>document.querySelector(s);
const toast=(m,type)=>{const t=$("#toast");if(!t)return;type=type||(/failed|invalid|choose|error|enter|must|unable|cannot/i.test(m)?"error":/done|downloaded|created|converted|saved|success|complete/i.test(m)?"success":"info");t.textContent=m;t.className="toast "+type+" show";clearTimeout(window.__advancedToast);window.__advancedToast=setTimeout(()=>t.classList.remove("show"),2800)};
const dl=(blob,name)=>{const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(a.href),1200)};
const loadScript=(u,k)=>new Promise((r,j)=>{if(window[k])return r(window[k]);const s=document.createElement("script");s.src=u;s.onload=()=>window[k]?r(window[k]):j(Error(k+" failed to load"));s.onerror=()=>j(Error("Could not load "+k));document.head.appendChild(s)});
const theme=()=>{const k="snapurl.theme",s=localStorage.getItem(k)||((matchMedia("(prefers-color-scheme: dark)").matches)?"dark":"light");document.documentElement.dataset.theme=s};

function initExcel(){
 let wb=null;
 const input=$("#excelInput"), status=$("#excelStatus"), preview=$("#excelPreview"), sheet=$("#sheetSelect");
 const esc=v=>String(v??"").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;");
 input.addEventListener("change",async()=>{
  const f=input.files[0]; if(!f)return;
  try{wb=XLSX.read(await f.arrayBuffer(),{type:"array",cellDates:true});
   sheet.innerHTML='<option value="__all">All Sheets</option>'+wb.SheetNames.map((n,i)=>'<option value="'+i+'">'+esc(n)+'</option>').join("");
   status.textContent=f.name+" · "+wb.SheetNames.length+" sheet(s)";
   renderPreview();
  }catch(e){wb=null;status.textContent="Could not read this spreadsheet.";toast("Excel file could not be read")}
 });
 ["sheetSelect","orientation","paper","margins","scaling"].forEach(id=>$("#"+id).addEventListener("change",()=>{if(id==="margins")$("#customMarginWrap").style.display=$("#margins").value==="custom"?"block":"none";renderPreview()}));
 function rowsFor(name){const ws=wb.Sheets[name];return XLSX.utils.sheet_to_json(ws,{header:1,defval:"",raw:false});}
 function renderPreview(){
  if(!wb){preview.textContent="Upload an Excel file to preview a sheet.";return}
  const names=wb.SheetNames, idx=sheet.value==="__all"?0:Number(sheet.value), rows=rowsFor(names[idx]||names[0]).slice(0,12);
  if(!rows.length){preview.textContent="The selected sheet is empty.";return}
  let h='<div class="muted" style="margin-bottom:8px">Preview: '+esc(names[idx])+(sheet.value==="__all"?" · first sheet shown":"")+'</div><table class="preview-table"><tbody>';
  rows.forEach((r,i)=>{h+="<tr>"+r.slice(0,10).map(c=>i===0?"<th>"+esc(c)+"</th>":"<td>"+esc(c)+"</td>").join("")+"</tr>"});h+="</tbody></table>";
  preview.innerHTML=h;
 }
 $("#excelConvert").onclick=async()=>{
  if(!wb)return toast("Choose an Excel file first");
  const {jsPDF}=window.jspdf; const orient=$("#orientation").value,paper=$("#paper").value;
  const marginMode=$("#margins").value, m=marginMode==="normal"?18:marginMode==="narrow"?8:Number($("#customMargin").value||10);
  const scaleMode=$("#scaling").value;
  const doc=new jsPDF({orientation:orient,unit:"mm",format:paper});
  const pageW=doc.internal.pageSize.getWidth(),pageH=doc.internal.pageSize.getHeight();
  const availableW=pageW-2*m, bottom=pageH-m;
  const selected=sheet.value==="__all"?wb.SheetNames:[wb.SheetNames[Number(sheet.value)]];
  let first=true;
  try{
   for(const name of selected){
    if(!first)doc.addPage(undefined,orient); first=false;
    const rows=rowsFor(name); if(!rows.length)continue;
    const maxCols=Math.min(30,Math.max(...rows.map(r=>r.length)));
    const data=rows.map(r=>Array.from({length:maxCols},(_,i)=>String(r[i]??"")));
    let widths=Array(maxCols).fill(12);
    for(let c=0;c<maxCols;c++){widths[c]=Math.min(55,Math.max(12,...data.slice(0,80).map(r=>Math.min(55,String(r[c]||"").length*2.1+4))))}
    const total=widths.reduce((a,b)=>a+b,0);
    const factor=scaleMode==="original"?1:Math.min(1,availableW/total);
    if(scaleMode==="page") widths=widths.map(w=>w*factor);
    else if(scaleMode==="width") widths=widths.map(w=>w*factor);
    let x=m,y=m+7, rowH=7;
    doc.setFontSize(11);doc.setFont(undefined,"bold");doc.text(name,x,y);y+=6;doc.setFont(undefined,"normal");doc.setFontSize(scaleMode==="original"?7.5:8);
    const actualTotal=widths.reduce((a,b)=>a+b,0);
    for(let r=0;r<data.length;r++){
      if(y+rowH>bottom){doc.addPage(undefined,orient);y=m+5}
      let cx=x;
      for(let c=0;c<maxCols;c++){
        const w=widths[c]||12;
        doc.setFillColor(r===0?235:250,r===0?234:250,r===0?255:252);
        doc.setDrawColor(210,212,220);doc.rect(cx,y,w,rowH,"FD");
        const val=data[r][c];doc.setTextColor(25,29,38);doc.text(doc.splitTextToSize(val,Math.max(4,w-2))[0]||"",cx+1,y+4.7);
        cx+=w;
      } y+=rowH;
    }
   }
   doc.save((input.files[0].name.replace(/\.(xlsx|xls|csv)$/i,"")||"spreadsheet")+".pdf");
   $("#excelOutput").textContent="Done — PDF downloaded.";toast("Excel converted to PDF!");
  }catch(e){$("#excelOutput").textContent=e.message||"Conversion failed.";toast("Excel to PDF failed")}
 };
}

function initImageWorkspace(){
 let items=[],stream=null;
 const input=$("#workspaceInput"), list=$("#imageList"), output=$("#imageOutput");
 $("#chooseImages").onclick=()=>input.click();
 $("#imageDrop").onclick=e=>{if(e.target===input)return;input.click()};
 input.onchange=()=>addFiles([...input.files]);
 function addFiles(fs){fs.forEach(f=>{if(!f.type.startsWith("image/"))return;items.push({file:f,name:f.name,template:"original",id:crypto.randomUUID?crypto.randomUUID():String(Date.now()+Math.random())})});render()}
 function render(){
  list.innerHTML="";
  if(!items.length){list.innerHTML='<div class="muted" style="grid-column:1/-1;text-align:center;padding:25px">No images selected yet.</div>';return}
  items.forEach((it,i)=>{
   const row=document.createElement("article");row.className="image-item";
   row.innerHTML='<img src="'+URL.createObjectURL(it.file)+'" alt=""><div class="muted" style="margin-top:7px">'+(i+1)+'. '+it.file.name+'</div><input class="rename" value="'+it.name.replace(/"/g,"&quot;")+'"><select class="template"><option value="original">Original</option><option value="grayscale">Grayscale</option><option value="bw">Black & White</option><option value="contrast">High Contrast</option><option value="document">Document Scan</option><option value="id">ID Photo</option><option value="passport">Passport Photo</option><option value="receipt">Receipt</option><option value="notes">Notes / Document</option></select><div class="mini-actions"><button class="up">↑</button><button class="down">↓</button><button class="remove">Remove</button></div>';
   row.querySelector(".template").value=it.template;row.querySelector(".rename").oninput=e=>it.name=e.target.value||it.file.name;row.querySelector(".template").onchange=e=>it.template=e.target.value;
   row.querySelector(".up").onclick=()=>{if(i){[items[i-1],items[i]]=[items[i],items[i-1]];render()}};row.querySelector(".down").onclick=()=>{if(i<items.length-1){[items[i+1],items[i]]=[items[i],items[i+1]];render()}};row.querySelector(".remove").onclick=()=>{items.splice(i,1);render()};list.appendChild(row);
  });
 }
 $("#sortName").onclick=()=>{items.sort((a,b)=>a.name.localeCompare(b.name));render()};$("#sortDate").onclick=()=>{items.sort((a,b)=>b.file.lastModified-a.file.lastModified);render()};$("#sortSize").onclick=()=>{items.sort((a,b)=>b.file.size-a.file.size);render()};
 function canvasFor(file,template,resize){
  return new Promise((resolve,reject)=>{const u=URL.createObjectURL(file),im=new Image();im.onload=()=>{try{
   let sw=im.naturalWidth,sh=im.naturalHeight,sx=0,sy=0;
   const ratio=template==="id"?1/1.2:template==="passport"?4/5:template==="receipt"?3/4:0;
   if(ratio){const current=sw/sh;if(current>ratio){const nw=sh*ratio;sx=(sw-nw)/2;sw=nw}else{const nh=sw/ratio;sy=(sh-nh)/2;sh=nh}}
   const pct=Number(resize)/100,c=document.createElement("canvas");c.width=Math.max(1,Math.round(sw*pct));c.height=Math.max(1,Math.round(sh*pct));const x=c.getContext("2d");
   x.filter=template==="grayscale"?"grayscale(1)":template==="bw"?"grayscale(1) contrast(2)":template==="contrast"?"contrast(1.45) saturate(1.15)":template==="document"?"grayscale(1) contrast(1.65) brightness(1.05)":template==="notes"?"grayscale(1) contrast(1.25)": "none";
   x.drawImage(im,sx,sy,sw,sh,0,0,c.width,c.height);
   if(template==="bw"){const d=x.getImageData(0,0,c.width,c.height),p=d.data;for(let i=0;i<p.length;i+=4){const v=(.299*p[i]+.587*p[i+1]+.114*p[i+2])>155?255:0;p[i]=p[i+1]=p[i+2]=v}x.putImageData(d,0,0)}
   c.toBlob(b=>{URL.revokeObjectURL(u);b?resolve(b):reject(Error("Could not process image"))},"image/jpeg",.9);
  }catch(e){URL.revokeObjectURL(u);reject(e)}};im.onerror=()=>{URL.revokeObjectURL(u);reject(Error("Invalid image"))};im.src=u})
 }
 $("#downloadImages").onclick=async()=>{
  if(!items.length)return toast("Choose images first");
  try{const zip=new JSZip(),resize=$("#workspaceResize").value,pattern=$("#renamePattern").value||"SnapURL_{number}";
   for(let i=0;i<items.length;i++){const it=items[i],b=await canvasFor(it.file,it.template,resize);let name=it.name.replace(/\.[^.]+$/i,"")+".jpg";if(pattern.includes("{number}"))name=pattern.replaceAll("{number}",String(i+1).padStart(3,"0"))+".jpg";zip.file(name,b)}
   const blob=await zip.generateAsync({type:"blob",compression:"DEFLATE"});dl(blob,"SnapURL-image-workspace.zip");output.textContent=items.length+" image(s) processed and packed.";toast("Image ZIP ready!");
  }catch(e){output.textContent=e.message;toast("Image workspace failed")}
 };
 $("#openCamera").onclick=async()=>{try{stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:"environment"}}});$("#cameraVideo").srcObject=stream;$("#cameraBox").classList.add("show")}catch(e){toast("Camera access was not available")}};
 $("#closeCamera").onclick=closeCam;function closeCam(){if(stream){stream.getTracks().forEach(t=>t.stop());stream=null}$("#cameraBox").classList.remove("show")}
 $("#captureFrame").onclick=()=>{const v=$("#cameraVideo"),c=document.createElement("canvas");c.width=v.videoWidth;c.height=v.videoHeight;c.toBlob(b=>{if(!b)return;addFiles([new File([b],"capture-"+Date.now()+".jpg",{type:"image/jpeg",lastModified:Date.now()})]);closeCam()},"image/jpeg",.94)};
 render();
}

function initPdfResize(){
 const scale=$("#pdfScale"),value=$("#pdfScaleValue"),preset=$("#pdfPreset");scale.oninput=()=>value.textContent=scale.value+"%";preset.onchange=()=>{if(preset.value!=="custom"){scale.value=preset.value;value.textContent=scale.value+"%"}};
 $("#resizePdf").onclick=async()=>{const f=$("#pdfScaleInput").files[0];if(!f)return toast("Choose a PDF first");try{
  const {PDFDocument}=PDFLib,src=await PDFDocument.load(await f.arrayBuffer()),pct=Number(scale.value)/100,out=await PDFDocument.create();
  for(const page of src.getPages()){const w=page.getWidth(),h=page.getHeight(),np=out.addPage([w*pct,h*pct]);const embedded=await out.embedPage(page);np.drawPage(embedded,{x:0,y:0,xScale:pct,yScale:pct})}
  dl(new Blob([await out.save()],{type:"application/pdf"}),f.name.replace(/\.pdf$/i,"")+"-"+scale.value+"pct.pdf");$("#pdfResizeOutput").textContent="Done — resized PDF downloaded.";toast("PDF resized successfully!");
 }catch(e){$("#pdfResizeOutput").textContent=e.message||"Resize failed.";toast("PDF resize failed")}};
}

function initQr(){
 const type=$("#qrType"),fields=$("#qrFields"),preview=$("#qrPreview"),history=$("#qrHistory");let lastPayload="";
 const field=(id,label,type="text",ph="")=>'<label style="margin-top:10px">'+label+'<input id="'+id+'" type="'+type+'" placeholder="'+ph+'"></label>';
 const configs={
 url:field("q","URL","url","https://example.com"),
 pdf:field("q","Public PDF / document URL","url","https://example.com/document.pdf"),
 text:'<label>Plain text<textarea id="q" placeholder="Write anything..."></textarea></label>',
 contact:field("name","Full name","text","Yugandhar Deshmukh")+field("phone","Phone","tel","+91...")+field("email","Email","email","name@example.com")+field("org","Organization")+field("web","Website","url","https://..."),
 app:field("android","Google Play URL","url","https://play.google.com/...")+field("ios","App Store URL","url","https://apps.apple.com/..."),
 sms:field("phone","Phone","tel","+91...")+field("message","Message","text","Hello!"),
 gmail:field("to","Gmail recipient","email","name@example.com")+field("subject","Subject")+field("message","Message"),
 gmap:field("q","Google Maps URL","url","https://maps.google.com/..."),
 location:field("lat","Latitude","number","19.0760")+field("lng","Longitude","number","72.8777")+field("label","Place label"),
 phone:field("phone","Phone","tel","+91..."),
 instagram:field("handle","Instagram handle","text","username"),
 youtube:field("handle","YouTube handle / channel","text","@channel"),
 snapchat:field("handle","Snapchat handle","text","username"),
 whatsapp:field("phone","WhatsApp number","tel","+91...")+field("message","Prefilled message"),
 linkedin:field("handle","LinkedIn handle / profile slug","text","in/username"),
 github:field("handle","GitHub username","text","username")
 };
 function renderFields(){fields.innerHTML=configs[type.value]||configs.url}
 function val(id){return ($("#"+id)?.value||"").trim()}
 function payload(){
  const t=type.value;
  if(t==="url"||t==="pdf"||t==="text"||t==="gmap")return val("q");
  if(t==="contact")return "BEGIN:VCARD\nVERSION:3.0\nFN:"+val("name")+"\nTEL:"+val("phone")+"\nEMAIL:"+val("email")+"\nORG:"+val("org")+"\nURL:"+val("web")+"\nEND:VCARD";
  if(t==="app")return val("android")||val("ios");
  if(t==="sms")return "SMSTO:"+val("phone")+":"+val("message");
  if(t==="gmail")return "https://mail.google.com/mail/?view=cm&fs=1&to="+encodeURIComponent(val("to"))+"&su="+encodeURIComponent(val("subject"))+"&body="+encodeURIComponent(val("message"));
  if(t==="location")return "https://www.google.com/maps/search/?api=1&query="+encodeURIComponent(val("lat")+","+val("lng")+" "+val("label"));
  if(t==="phone")return "tel:"+val("phone");
  if(t==="instagram")return "https://instagram.com/"+val("handle").replace(/^@/,"");
  if(t==="youtube")return "https://youtube.com/"+val("handle");
  if(t==="snapchat")return "https://www.snapchat.com/add/"+val("handle").replace(/^@/,"");
  if(t==="whatsapp")return "https://wa.me/"+val("phone").replace(/\D/g,"")+"?text="+encodeURIComponent(val("message"));
  if(t==="linkedin")return "https://www.linkedin.com/"+val("handle").replace(/^\//,"");
  if(t==="github")return "https://github.com/"+val("handle");
  return "";
 }
 function make(){if(!window.QRCode)return toast("QR library did not load");lastPayload=payload();if(!lastPayload)return toast("Enter the QR content first");preview.innerHTML="";new QRCode(preview,{text:lastPayload,width:Number($("#qrSize").value),height:Number($("#qrSize").value),colorDark:$("#qrDark").value,colorLight:$("#qrLight").value,correctLevel:QRCode.CorrectLevel[$("#qrLevel").value]||QRCode.CorrectLevel.M});localStorage.setItem("snapurl.qr.last",JSON.stringify({type:type.value,payload:lastPayload,created:new Date().toISOString()}));renderHistory();$("#qrOutput").textContent="QR generated. Scan it to test the payload."}
 function renderHistory(){const h=JSON.parse(localStorage.getItem("snapurl.qr.history")||"[]");history.innerHTML=h.length?h.slice(0,8).map((x,i)=>'<div class="history-item"><span><b>'+x.type+'</b><br><span class="muted">'+x.payload.slice(0,70).replaceAll("<","&lt;")+'</span></span><button class="small-btn" data-i="'+i+'">Reuse</button></div>').join(""):'<span class="muted">Generated QR codes will appear here on this device.</span>';history.querySelectorAll("button").forEach(b=>b.onclick=()=>{const x=h[Number(b.dataset.i)];type.value=x.type;renderFields();setTimeout(()=>{const q=$("#q");if(q)q.value=x.payload;make()},0)})}
 function saveHistory(){const h=JSON.parse(localStorage.getItem("snapurl.qr.history")||"[]");h.unshift({type:type.value,payload:lastPayload,created:new Date().toISOString()});localStorage.setItem("snapurl.qr.history",JSON.stringify(h.slice(0,12)));renderHistory()}
 type.onchange=()=>{renderFields();preview.innerHTML='<span class="muted">Fill the fields and generate.</span>'};$("#qrDark").oninput=()=>lastPayload&&make();$("#qrLight").oninput=()=>lastPayload&&make();$("#qrLevel").onchange=()=>lastPayload&&make();$("#qrSize").onchange=()=>lastPayload&&make();
 $("#qrFields").addEventListener("input",()=>{clearTimeout(window.__qrTimer);window.__qrTimer=setTimeout(()=>{if(payload())make()},450)});
 $("#downloadQr").onclick=()=>{const canvas=preview.querySelector("canvas");if(!canvas)return toast("Generate a QR code first");canvas.toBlob(b=>dl(b,"snapurl-qr.png")) ;saveHistory();toast("QR downloaded!")};
 $("#copyQrPayload").onclick=async()=>{if(!lastPayload)return toast("Generate a QR code first");try{await navigator.clipboard.writeText(lastPayload);toast("Payload copied!")}catch{toast("Copy failed")}};
 renderFields();renderHistory();
}

function initPdfToolbox(){
 const api=async()=>PDFLib;
 $("#mergePdf").onclick=async()=>{const fs=[...$("#mergeInput").files];if(fs.length<2)return toast("Choose at least two PDFs");try{const {PDFDocument}=await api(),out=await PDFDocument.create();for(const f of fs){const src=await PDFDocument.load(await f.arrayBuffer()),pages=await out.copyPages(src,src.getPageIndices());pages.forEach(p=>out.addPage(p))}dl(new Blob([await out.save()],{type:"application/pdf"}),"merged-snapurl.pdf");$("#mergeOutput").textContent="Merged "+fs.length+" PDFs.";toast("PDFs merged!")}catch(e){toast("Merge failed")}};
 function parsePages(s,max){const set=new Set();for(const part of s.split(",").map(x=>x.trim()).filter(Boolean)){if(part.includes("-")){let[a,b]=part.split("-").map(Number);a=Math.max(1,a);b=Math.min(max,b);for(let i=a;i<=b;i++)set.add(i-1)}else{const n=Number(part);if(n>=1&&n<=max)set.add(n-1)}}return [...set].sort((a,b)=>a-b)}
 $("#extractPdf").onclick=async()=>{const f=$("#extractInput").files[0];if(!f)return toast("Choose a PDF first");try{const {PDFDocument}=await api(),src=await PDFDocument.load(await f.arrayBuffer()),ids=parsePages($("#extractPages").value,src.getPageCount());if(!ids.length)return toast("Enter pages like 1,3,5-7");const out=await PDFDocument.create();const pages=await out.copyPages(src,ids);pages.forEach(p=>out.addPage(p));dl(new Blob([await out.save()],{type:"application/pdf"}),"extracted-pages.pdf");$("#extractOutput").textContent="Extracted "+ids.length+" page(s).";toast("Pages extracted!")}catch(e){toast("Page extraction failed")}};
 $("#rotatePdf").onclick=async()=>{const f=$("#rotateInput").files[0];if(!f)return toast("Choose a PDF first");try{const {PDFDocument,degrees}=await api(),d=await PDFDocument.load(await f.arrayBuffer()),deg=Number($("#rotateDegrees").value);d.getPages().forEach(p=>p.setRotation(degrees(deg)));dl(new Blob([await d.save()],{type:"application/pdf"}),"rotated-snapurl.pdf");$("#rotateOutput").textContent="All pages rotated "+deg+"°.";toast("PDF rotated!")}catch(e){toast("Rotation failed")}};
 $("#pdfToJpg").onclick=async()=>{const f=$("#pdfJpgInput").files[0];if(!f)return toast("Choose a PDF first");try{const pdf=window.pdfjsLib;pdf.GlobalWorkerOptions.workerSrc="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";const d=await pdf.getDocument({data:await f.arrayBuffer()}).promise,p=await d.getPage(1),v=p.getViewport({scale:1.7}),c=document.createElement("canvas");c.width=v.width;c.height=v.height;await p.render({canvasContext:c.getContext("2d"),viewport:v}).promise;c.toBlob(b=>dl(b,f.name.replace(/\.pdf$/i,"")+"-page-1.jpg"),"image/jpeg",.92);$("#pdfJpgOutput").textContent="First page exported as JPG.";toast("PDF page exported!") }catch(e){toast("PDF to JPG failed")}};
}

theme();
const path=location.pathname;
if(path.endsWith("/excel-to-pdf"))initExcel();
else if(path.endsWith("/image-workspace"))initImageWorkspace();
else if(path.endsWith("/pdf-resize"))initPdfResize();
else if(path.endsWith("/qr-generator"))initQr();
else if(path.endsWith("/pdf-toolbox"))initPdfToolbox();
})();