const SHUI_ORIGIN='https://app.shui.stonezhang.com';
export function sendToShui(idea,workspace,onStatus=()=>{}) {
 const payload={ideas:[{id:'circuidea:'+workspace.id+':'+idea.id,title:idea.title,body:idea.body,summary:idea.summary||'',reviews:idea.reviews,resources:idea.resources,tags:idea.tags||[],events:workspace.events.filter(e=>e.ideaId===idea.id)}]};
 if(new TextEncoder().encode(JSON.stringify(payload)).length>90000){onStatus('这个想法的历史记录太长，暂时无法发送。');return;}
 const target=window.open(`${SHUI_ORIGIN}/`,'_blank');
 if(!target){onStatus('请允许打开 Shui! 窗口后重试。');return;}
 const requestId=crypto.randomUUID();let interval,timeout,finished=false;
 const finish=message=>{if(finished)return;finished=true;clearInterval(interval);clearTimeout(timeout);window.removeEventListener('message',receive);onStatus(message);};
 function receive(event){
  if(event.origin!==SHUI_ORIGIN||event.source!==target||event.data?.requestId!==requestId)return;
  if(event.data.type==='shui-idea-ready')target.postMessage({type:'shui-idea-payload',requestId,payload},SHUI_ORIGIN);
  if(event.data.type==='shui-idea-imported')finish('已送到 Shui!，原想法仍保存在此浏览器。');
  if(event.data.type==='shui-idea-cancelled')finish('已取消，原想法未改变。');
 }
 window.addEventListener('message',receive);
 const ping=()=>{if(target.closed){finish('Shui! 窗口已关闭，原想法未改变。');return;}target.postMessage({type:'shui-idea-hello',requestId},SHUI_ORIGIN);};
 interval=setInterval(ping,2000);timeout=setTimeout(()=>finish('发送已过期，请重新打开 Shui!。'),600000);ping();onStatus('请在 Shui! 登录并确认保存到哪个项目。');
}
