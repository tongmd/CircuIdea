import {emptyWorkspace,validateWorkspace,updateWorkspace,createIdea,STATUSES} from './model.js';
const $=s=>document.querySelector(s),KEY='circuidea.workspace.v1';let w=emptyWorkspace(),selected='',query='',blocked=false;
try{const value=localStorage.getItem(KEY);if(value)w=validateWorkspace(JSON.parse(value));}catch(e){blocked=true;showError('已有记录暂时无法读取，请保留此浏览器数据，不要清理。');}
function showError(message){$('#error').hidden=false;$('#error').textContent=message;$('#save-state').textContent='未保存';}
function save(label,mutate,id=''){
 if(blocked){showError('已有记录无法读取，暂不能写入。');return false;}
 const next=updateWorkspace(w,label,mutate,id);
 try{localStorage.setItem(KEY,JSON.stringify(next));w=next;$('#error').hidden=true;$('#save-state').textContent='已保存在此浏览器';return true;}catch(e){showError('未能保存，请先保留正在编辑的文字。');return false;}
}
function node(tag,text,cls){const n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(cls)n.className=cls;return n;}
function render(){
 $('#capture').hidden=!!selected;$('#ideas').hidden=!!selected;$('#editor').hidden=!selected;
 const list=$('#idea-list');list.replaceChildren();$('#search').hidden=w.ideas.length<6&&!query;
 const items=w.ideas.filter(i=>(i.title+' '+i.summary+' '+i.body).toLowerCase().includes(query.toLowerCase()));
 for(const i of items){const b=node('button',undefined,'idea-row');b.type='button';b.append(node('span',i.title,'row-title'));const excerpt=i.summary||i.body.split('\n').find(x=>x.trim())||'';if(excerpt)b.append(node('span',excerpt,'excerpt'));b.append(node('span',i.status==='done'?'已完成':i.status==='active'?'推进中':'','state'));b.onclick=()=>open(i.id);list.append(b);}
 if(!items.length&&query)list.append(node('p','没有找到这个想法。','empty'));
}
function open(id){selected=id;const i=w.ideas.find(x=>x.id===id);render();$('#idea-title').value=i.title;$('#idea-body').value=i.body;$('#summary').textContent=i.summary;$('#summary').hidden=!i.summary;setStatus(i);const records=$('#existing-records');records.replaceChildren();
 if(i.reviews.length||i.resources.length){const d=node('details');d.append(node('summary','已有讨论与投入'));for(const r of i.reviews)d.append(node('p',`${r.author} · ${r.decision}\n${r.body}`));for(const r of i.resources)d.append(node('p',`${r.contributor} · ${r.value} ${r.unit}\n${r.description}`));records.append(d);}
}
function setStatus(i){$('#toggle-status').textContent=i.status==='done'?'继续推进':'完成';}
$('#capture').onsubmit=e=>{e.preventDefault();const value=$('#thought').value.trim();if(!value)return;const lines=value.split('\n');const idea=createIdea({title:lines[0].slice(0,160),body:[lines[0].slice(160),...lines.slice(1)].filter(Boolean).join('\n'),status:'draft'},w.profile.name);if(save('记下想法',x=>x.ideas.unshift(idea),idea.id)){$('#thought').value='';render();$('#thought').focus();}};
function edit(){if(!selected)return;const title=$('#idea-title').value.trim();if(!title){showError('标题还没有写完，暂未保存。');return;}save('更新想法',x=>{const i=x.ideas.find(i=>i.id===selected);i.title=title;i.body=$('#idea-body').value;i.updatedAt=new Date().toISOString();},selected);}
$('#idea-title').oninput=edit;$('#idea-body').oninput=edit;
$('#toggle-status').onclick=()=>{if(!selected)return;edit();if(!$('#error').hidden)return;save('更新进展',x=>{const i=x.ideas.find(i=>i.id===selected);i.status=i.status==='done'?'active':'done';i.updatedAt=new Date().toISOString();},selected);setStatus(w.ideas.find(i=>i.id===selected));};
$('#back').onclick=()=>{edit();if(!$('#error').hidden)return;selected='';render();};$('#search').oninput=e=>{query=e.target.value;render();};render();
