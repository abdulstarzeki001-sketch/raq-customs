import fs from "node:fs";
import path from "node:path";
const root=path.resolve(process.argv[2]||"site");
const pages=["index.html","form.html","document.html","traders.html"];
const errors=[];
for(const page of pages){
 const fp=path.join(root,page);
 if(!fs.existsSync(fp)){errors.push("Missing "+page);continue;}
 const html=fs.readFileSync(fp,"utf8");
 if(!/<html/i.test(html))errors.push("Invalid HTML "+page);
 for(const match of html.matchAll(/<(?:script|link|img)\b[^>]*?(?:src|href)=["'](\.\/[^"'?#]+)["']/gi)){
   const p=match[1].replace(/^\.\//,"");
   if(!fs.existsSync(path.join(root,p)))errors.push("Missing "+p+" referenced in "+page);
 }
}
for(const p of ["js/vendor/html2canvas.min.js","css/style.css","data/companies.json","js/core.js","js/sync.js"]){
 if(!fs.existsSync(path.join(root,p)))errors.push("Missing "+p);
}
if(!errors.length){
 const data=JSON.parse(fs.readFileSync(path.join(root,"data/companies.json"),"utf8"));
 if(!Array.isArray(data)||data.length!==839)errors.push("Company catalog invalid");
}
if(errors.length)throw Error(errors.join("\n"));
console.log("All four pages, images/scripts/styles, html2canvas and 839 companies are packaged.");
