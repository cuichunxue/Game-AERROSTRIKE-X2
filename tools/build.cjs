// Builds the single-file game (index.html) from src/ and refreshes the downloadable zip.
// Usage: node tools/build.cjs [--no-zip]
const fs=require('fs'),path=require('path'),{execFileSync}=require('child_process');
const root=path.join(__dirname,'..'),src=path.join(root,'src');
const JS_ORDER=['00-core.js','10-audio.js','20-assets.js','30-world.js','40-game.js','50-ui.js'];
const bundleJs=()=>JS_ORDER.map(f=>fs.readFileSync(path.join(src,'js',f),'utf8')).join('\n');
function build(){
 let html=fs.readFileSync(path.join(src,'index.html'),'utf8');
 const css=fs.readFileSync(path.join(src,'style.css'),'utf8');
 html=html.replace('<link rel="stylesheet" href="style.css">',()=>`<style>${css}</style>`);
 html=html.replace(/(<script src="js\/[^"]+"><\/script>)+/,()=>`<script>\n${bundleJs()}\n</script>`);
 if(html.includes('src="js/')||html.includes('href="style.css"'))throw new Error('inlining failed');
 fs.writeFileSync(path.join(root,'index.html'),html);
 return html;
}
module.exports={bundleJs,JS_ORDER};
if(require.main===module){
 const html=build();console.log(`index.html ${(html.length/1024).toFixed(1)} KB`);
 if(!process.argv.includes('--no-zip')){
  const tmp=fs.mkdtempSync(path.join(require('os').tmpdir(),'ax-'));const dir=path.join(tmp,'AERROSTRIKE-X');fs.mkdirSync(dir);
  fs.writeFileSync(path.join(dir,'AERROSTRIKE-X.html'),html);fs.cpSync(src,path.join(dir,'src'),{recursive:true});fs.cpSync(path.join(root,'tests'),path.join(dir,'tests'),{recursive:true});fs.cpSync(path.join(root,'tools'),path.join(dir,'tools'),{recursive:true});
  for(const f of ['README.md','ORIGIN.md','LICENSE'])if(fs.existsSync(path.join(root,f)))fs.copyFileSync(path.join(root,f),path.join(dir,f));
  const out=path.join(root,'AERROSTRIKE-X.zip');fs.rmSync(out,{force:true});execFileSync('zip',['-qr',out,'.'],{cwd:dir});fs.rmSync(tmp,{recursive:true,force:true});console.log('AERROSTRIKE-X.zip refreshed');
 }
}
