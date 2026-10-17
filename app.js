import { appHtml } from './app.html.js';

export { appHtml };

function esc(s){return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')}
function avatarMarkup(value,letter){return value?'<img src="'+esc(value)+'" alt="">':esc(letter)}

/* ---------------- charsApi ---------------- */
function createCharsApi(){
  var me={name:'Я',username:'@ya',avatar:'',description:''};
  var chars=[];
  var subs=[];
  function notify(){subs.forEach(function(f){f()})}
  return {
    me:function(){return me.name},
    meUsername:function(){return me.username},
    meAvatar:function(){return me.avatar},
    meDescription:function(){return me.description},
    setMe:function(n){me.name=n;notify()},
    setMeUsername:function(u){me.username=u;notify()},
    setMeAvatar:function(a){me.avatar=a||'';notify()},
    setMeDescription:function(d){me.description=d||'';notify()},
    list:function(){return chars.slice()},
    setAll:function(list){chars=list.slice();notify()},
    snapshot:function(){return {me:{name:me.name,username:me.username,avatar:me.avatar,description:me.description},chars:chars.slice()}},
    load:function(state){
      if(state&&state.me){me.name=state.me.name||me.name;me.username=state.me.username||me.username;me.avatar=state.me.avatar||'';me.description=state.me.description||''}
      if(state&&Array.isArray(state.chars))chars=state.chars.slice();
      notify();
    },
    find:function(name){return chars.filter(function(c){return c[0]===name})[0]},
    count:function(){return chars.length},
    subscribe:function(f){subs.push(f)}
  };
}

/* ---------------- chatsApi ---------------- */
function hm2(){var d=new Date();return ('0'+d.getHours()).slice(-2)+':'+('0'+d.getMinutes()).slice(-2)}
function createChatsApi(){
  var chats=[];
  var cur=-1, subs=[];
  function notify(){subs.forEach(function(f){f()})}
  function lastMsg(c){return c.msgs.length?c.msgs[c.msgs.length-1]:null}
  return {
    list:function(){return chats},
    current:function(){return cur},
    setCurrent:function(i){cur=i;notify()},
    get:function(i){return chats[i]},
    add:function(name,link){
      chats.push({id:'chat-'+Date.now().toString(36),link:link||'',name:name,ava:'?',avatar:'',description:'',folder:'chats',msgs:[]});
      cur=chats.length-1; notify();
    },
    addDirect:function(name,link,avatar,description){
      var existing=chats.findIndex(function(c){return c.direct&&c.contact===name});
      if(existing>=0){cur=existing;notify();return}
      chats.push({id:'direct-'+Date.now().toString(36),link:link||'',name:name,ava:name.charAt(0).toUpperCase(),avatar:avatar||'',description:description||'',folder:'direct',direct:true,contact:name,msgs:[]});
      cur=chats.length-1; notify();
    },
    update:function(i,name,link,avatar,description){
      if(!chats[i])return;
      chats[i].name=name; chats[i].link=link||''; chats[i].avatar=avatar||''; chats[i].description=description||''; notify();
    },
    remove:function(i){
      if(!chats[i])return;
      chats.splice(i,1);
      if(chats.length===0){cur=-1}
      else if(cur>=chats.length)cur=chats.length-1; else if(cur>i)cur--;
      notify();
    },
    push:function(msg){chats[cur].msgs.push(msg);notify()},
    snapshot:function(){return {chats:JSON.parse(JSON.stringify(chats))}},
    load:function(state){if(state&&Array.isArray(state.chats)){chats=state.chats;cur=chats.length?0:-1;notify()}},
    editMsg:function(chatIdx,msgIdx,body){
      if(!chats[chatIdx]||!chats[chatIdx].msgs[msgIdx])return;
      chats[chatIdx].msgs[msgIdx].body=body;chats[chatIdx].msgs[msgIdx].html=1;chats[chatIdx].msgs[msgIdx].edited=1;notify();
    },
    deleteMsgs:function(chatIdx,indices){
      if(!chats[chatIdx])return;
      var set={};indices.forEach(function(i){set[i]=1});
      chats[chatIdx].msgs=chats[chatIdx].msgs.filter(function(_,i){return !set[i]});
      notify();
    },
    getMsg:function(chatIdx,msgIdx){return chats[chatIdx]&&chats[chatIdx].msgs[msgIdx]},
    forwardMsg:function(toChatIdx,msg){
      if(!chats[toChatIdx])return;
      chats[toChatIdx].msgs.push({who:msg.who,real:msg.real,ai:msg.ai,body:msg.body,time:hm2(),html:1,forwarded:1});
      notify();
    },
    lastPreview:function(c){
      var m=lastMsg(c); if(!m)return 'Нет сообщений';
      return m.who+': '+m.body.replace(/<[^>]+>/g,'').slice(0,40);
    },
    lastTime:function(c){var m=lastMsg(c);return m?m.time:''},
    subscribe:function(f){subs.push(f)}
  };
}

/* ---------------- markdown helpers ---------------- */
function fromMd(src){
  function mdInl(s){
    return esc(s).replace(/\*\*(.+?)\*\*/g,'<b>$1</b>').replace(/__(.+?)__/g,'<u>$1</u>')
      .replace(/~~(.+?)~~/g,'<s>$1</s>').replace(/\*([^*\s][^*]*?)\*/g,'<i>$1</i>');
  }
  var L=src.replace(/\r/g,'').split('\n'), h='', i=0, m;
  while(i<L.length){
    var l=L[i];
    if(/^```/.test(l)){
      var buf=[]; i++;
      while(i<L.length&&!/^```/.test(L[i])){buf.push(L[i]);i++}
      i++;
      var code=buf.join('\n');
      h+='<pre>'+(code===''?'<br>':esc(code))+'</pre>';
    }else if(/^-{3,}\s*$/.test(l)){h+='<hr>';i++}
    else if((m=l.match(/^#{1,3} (.*)$/))){h+='<h2>'+(mdInl(m[1])||'<br>')+'</h2>';i++}
    else if((m=l.match(/^> ?(.*)$/))){h+='<blockquote>'+(mdInl(m[1])||'<br>')+'</blockquote>';i++}
    else if(/^[-*] /.test(l)){
      var li='';
      while(i<L.length&&/^[-*] /.test(L[i])){li+='<li>'+mdInl(L[i].slice(2))+'</li>';i++}
      h+='<ul>'+li+'</ul>';
    }else if(/^\d+\. /.test(l)){
      var lo='';
      while(i<L.length&&/^\d+\. /.test(L[i])){lo+='<li>'+mdInl(L[i].replace(/^\d+\. /,''))+'</li>';i++}
      h+='<ol>'+lo+'</ol>';
    }else if(l.trim()===''){h+='<p><br></p>';i++}
    else{h+='<p>'+mdInl(l)+'</p>';i++}
  }
  return h;
}

function toMd(area){
  function escInner(s){return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')}
  function wrapMd(x,m){
    var core=x.trim(); if(!core)return x;
    return x.match(/^\s*/)[0]+m+core+m+x.match(/\s*$/)[0];
  }
  function inl(n){
    var s='';
    n.childNodes.forEach(function(c){
      if(c.nodeType===3){s+=c.nodeValue.replace(/\u200b/g,'').replace(/\u00a0/g,' ');return}
      if(c.nodeType!==1)return;
      var t=c.nodeName, x=inl(c);
      if(t==='BR')s+='\n';
      else if(t==='B'||t==='STRONG')s+=wrapMd(x,'**');
      else if(t==='I'||t==='EM')s+=wrapMd(x,'*');
      else if(t==='U')s+=wrapMd(x,'__');
      else if(t==='S'||t==='STRIKE'||t==='DEL')s+=wrapMd(x,'~~');
      else s+=x;
    });
    return s;
  }
  var out=[], pend='';
  function flush(){ if(pend!==''){out.push(pend.replace(/\n$/,''));pend=''} }
  area.childNodes.forEach(function(n){
    if(n.nodeType===1&&/^(P|DIV|H[1-6]|BLOCKQUOTE|UL|OL|PRE|HR)$/.test(n.nodeName)){
      flush();
      var t=n.nodeName;
      if(t==='HR') out.push('---');
      else if(t==='PRE'){
        out.push('```');
        out.push(n.innerText.replace(/\u200b/g,'').replace(/\n+$/,''));
        out.push('```');
      }else if(t==='UL'||t==='OL'){
        [].forEach.call(n.children,function(li,i){
          out.push((t==='UL'?'- ':(i+1)+'. ')+inl(li).replace(/\n+$/,'').replace(/\n/g,' '));
        });
      }else if(t==='BLOCKQUOTE'){
        inl(n).replace(/\n$/,'').split('\n').forEach(function(l){out.push('> '+l)});
      }else if(/^H/.test(t)){
        out.push('# '+inl(n).replace(/\n+$/,'').replace(/\n/g,' '));
      }else{
        out.push(inl(n).replace(/\n$/,''));
      }
    }else{
      var tmp=document.createElement('div'); tmp.appendChild(n.cloneNode(true));
      pend+=inl(tmp);
    }
  });
  flush();
  return out.join('\n');
}

/* ---------------- editor module ---------------- */
function initEditor(ctx){
  var btn=document.getElementById('edBtn'), wrap=document.getElementById('edWrap'),
      win=document.getElementById('editor'), area=document.getElementById('edArea'),
      tb=document.getElementById('tb'), cnt=document.getElementById('cnt');
  var blocks={h2:1,blockquote:1,pre:1};
  try{document.execCommand('defaultParagraphSeparator',false,'p')}catch(e){}

  function place(){
    var b=btn.getBoundingClientRect(), w=win.getBoundingClientRect();
    var x=Math.max(30,Math.min(w.width-30,b.left+b.width/2-w.left));
    win.style.setProperty('--tx',x+'px');
  }
  var rawArea=document.getElementById('edRawArea'), rbtn=document.getElementById('edRawBtn');
  function toggle(open){
    if(open===undefined) open=wrap.hidden;
    var tt=document.getElementById('t');
    if(open&&wrap.hidden){
      area.innerHTML=fromMd(tt.value); rawArea.value=tt.value;
    }else if(!open&&!wrap.hidden){
      tt.value=rawArea.hidden?toMd(area):rawArea.value;
      area.innerHTML=''; rawArea.value='';
      tt.style.height='46px'; tt.style.height=Math.min(tt.scrollHeight,160)+'px';
      tt.scrollTop=tt.scrollHeight;
      refresh();
    }
    wrap.hidden=!open;
    if(!open)helpToggle(false);
    btn.classList.toggle('on',open);
    btn.setAttribute('aria-expanded',open);
    if(open){place();(rawArea.hidden?area:rawArea).focus()}
  }
  var help=document.getElementById('edHelpPanel'), hbtn=document.getElementById('edHelp');
  function helpToggle(open){
    if(open===undefined) open=help.hidden;
    help.hidden=!open;
    hbtn.classList.toggle('on',open);
    hbtn.setAttribute('aria-expanded',open);
  }
  function blockOf(){
    var s=window.getSelection(); if(!s.rangeCount)return null;
    var n=s.anchorNode; if(n&&n.nodeType===3)n=n.parentNode;
    var el=n&&n.closest?n.closest('h2,blockquote,pre'):null;
    return el&&area.contains(el)?el:null;
  }
  function caretTo(el){
    var r=document.createRange(); r.selectNodeContents(el); r.collapse(el.textContent==='');
    var s=window.getSelection(); s.removeAllRanges(); s.addRange(r);
  }
  function unblock(el){
    var p=document.createElement('p');
    if(el.tagName==='PRE'){
      el.innerText.replace(/\n+$/,'').split('\n').forEach(function(t,i){
        if(i)p.appendChild(document.createElement('br'));
        p.appendChild(document.createTextNode(t));
      });
    }else{
      while(el.firstChild)p.appendChild(el.firstChild);
    }
    if(!p.firstChild)p.appendChild(document.createElement('br'));
    el.parentNode.replaceChild(p,el);
    caretTo(p);
  }
  function setRaw(on){
    if(on===!rawArea.hidden)return;
    if(on){
      rawArea.value=toMd(area);
      area.hidden=true; rawArea.hidden=false;
      tb.classList.add('off'); rbtn.classList.add('on'); rbtn.setAttribute('aria-pressed','true');
      rawArea.focus();
    }else{
      area.innerHTML=fromMd(rawArea.value);
      rawArea.hidden=true; area.hidden=false;
      tb.classList.remove('off'); rbtn.classList.remove('on'); rbtn.setAttribute('aria-pressed','false');
      area.focus(); caretTo(area);
    }
    refresh();
  }
  function newPara(){var p=document.createElement('p');p.appendChild(document.createElement('br'));return p}
  function exitCode(pre){
    var last;
    while((last=pre.lastChild)){
      if(last.nodeType===3){
        last.nodeValue=last.nodeValue.replace(/\n+$/,'');
        if(last.nodeValue==='')pre.removeChild(last); else break;
      }else if(last.nodeName==='BR'){pre.removeChild(last)}
      else break;
    }
    var p=newPara();
    if(!pre.firstChild) pre.parentNode.replaceChild(p,pre);
    else pre.parentNode.insertBefore(p,pre.nextSibling);
    caretTo(p);
  }
  function codeToggle(pre){
    if(pre){exitCode(pre);return}
    var sel=window.getSelection();
    if(!sel.rangeCount)return;
    if(!sel.isCollapsed){document.execCommand('formatBlock',false,'<pre>');return}
    var n=sel.anchorNode; if(n&&n.nodeType===3)n=n.parentNode;
    var blk=n; while(blk&&blk!==area&&blk.parentNode!==area)blk=blk.parentNode;
    var pr=document.createElement('pre'); pr.appendChild(document.createElement('br'));
    if(!blk||blk===area) area.appendChild(pr);
    else if(blk.innerText.replace(/\n/g,'').trim()==='') area.replaceChild(pr,blk);
    else area.insertBefore(pr,blk.nextSibling);
    caretTo(pr);
  }
  function refresh(){
    cnt.textContent='Символов: '+(rawArea.hidden?area.innerText.replace(/\n$/,'').replace(/\u200b/g,'').length:rawArea.value.length);
    var cur='';
    try{cur=(document.queryCommandValue('formatBlock')||'').toLowerCase().replace(/[<>]/g,'')}catch(e){}
    tb.querySelectorAll('button[data-cmd]').forEach(function(b){
      var c=b.dataset.cmd,on=false;
      try{
        if(c==='formatBlock'){var k=blockOf();on=!!k&&k.tagName.toLowerCase()===b.dataset.val}
        else if(c!=='clean'&&c!=='insertHorizontalRule') on=document.queryCommandState(c);
      }catch(e){}
      b.classList.toggle('on',on);
    });
  }

  ctx.mdApi={
    html:function(){return (rawArea.hidden?area.innerHTML:fromMd(rawArea.value)).replace(/\u200b/g,'')},
    empty:function(){return (rawArea.hidden?area.innerText:rawArea.value).replace(/\u200b/g,'').trim()===''},
    clear:function(){area.innerHTML='';rawArea.value='';refresh()},
    fromMd:fromMd
  };

  btn.addEventListener('click',function(){toggle()});
  hbtn.addEventListener('click',function(){helpToggle()});
  rbtn.addEventListener('click',function(){setRaw(rawArea.hidden)});
  rawArea.addEventListener('input',refresh);
  document.getElementById('edX').addEventListener('click',function(){toggle(false)});
  document.getElementById('edDone').addEventListener('click',function(){toggle(false)});
  document.getElementById('edClear').addEventListener('click',function(){area.innerHTML='';rawArea.value='';(rawArea.hidden?area:rawArea).focus();refresh()});
  document.addEventListener('keydown',function(e){if(e.key==='Escape'&&!wrap.hidden){if(!help.hidden)helpToggle(false);else toggle(false)}});
  window.addEventListener('resize',function(){if(!wrap.hidden)place()});

  tb.addEventListener('mousedown',function(e){if(e.target.closest('button'))e.preventDefault()});
  tb.addEventListener('click',function(e){
    var b=e.target.closest('button[data-cmd]');if(!b)return;
    var c=b.dataset.cmd;
    area.focus();
    if(c==='clean'){
      document.execCommand('removeFormat');
      var cb2=blockOf();
      if(cb2) unblock(cb2); else document.execCommand('formatBlock',false,'<p>');
    }else if(c==='formatBlock'){
      var v=b.dataset.val, cb=blockOf();
      if(v==='pre') codeToggle(cb&&cb.tagName==='PRE'?cb:null);
      else if(cb&&cb.tagName.toLowerCase()===v) unblock(cb);
      else document.execCommand('formatBlock',false,'<'+v+'>');
    }else{
      document.execCommand(c,false,null);
    }
    refresh();
  });
  area.addEventListener('keydown',function(e){
    if(e.key!=='Enter'||e.isComposing)return;
    var sel=window.getSelection();
    if(!sel.rangeCount||!sel.isCollapsed)return;
    var b=blockOf();
    if(!b||b.tagName!=='PRE'){
      if(e.shiftKey)return;
      var n=sel.anchorNode, el=n&&(n.nodeType===3?n.parentNode:n);
      if(!el||el===area||el.closest('li'))return;
      var blk=el; while(blk.parentNode!==area)blk=blk.parentNode;
      if(blk.textContent.trim()==='---'){
        e.preventDefault(); e.stopImmediatePropagation();
        var hr=document.createElement('hr'), p=newPara();
        area.replaceChild(hr,blk); area.insertBefore(p,hr.nextSibling);
        caretTo(p); refresh();
      }
      return;
    }
    e.preventDefault(); e.stopImmediatePropagation();
    var r1=document.createRange(); r1.setStart(b,0); r1.setEnd(sel.anchorNode,sel.anchorOffset);
    var r2=document.createRange(); r2.setStart(sel.anchorNode,sel.anchorOffset); r2.setEnd(b,b.childNodes.length);
    var before=r1.toString(), after=r2.toString().replace(/\n/g,'');

    var rg=sel.getRangeAt(0); rg.deleteContents();
    var tn=document.createTextNode('\n'); rg.insertNode(tn);
    if(after===''&&!/\n\n$/.test(b.textContent)) b.appendChild(document.createTextNode('\n'));
    var rc=document.createRange(); rc.setStartAfter(tn); rc.collapse(true);
    sel.removeAllRanges(); sel.addRange(rc);
    refresh();
  });
  area.addEventListener('keydown',function(e){
    if(e.key!=='Enter'||e.shiftKey||e.isComposing)return;
    var sel=window.getSelection(), b=blockOf();
    if(!b||!sel.isCollapsed)return;
    if(b.tagName==='BLOCKQUOTE'){
      if(b.innerText.replace(/\n/g,'').trim()===''){e.preventDefault();unblock(b)}
      return;
    }
    if(b.tagName!=='PRE')return;
    var r1=document.createRange(); r1.setStart(b,0); r1.setEnd(sel.anchorNode,sel.anchorOffset);
    var r2=document.createRange(); r2.setStart(sel.anchorNode,sel.anchorOffset); r2.setEnd(b,b.childNodes.length);
    var before=r1.toString(), after=r2.toString().replace(/\n/g,'');
    if(after!=='')return;
    if(before===''){e.preventDefault();unblock(b);return}
    if(!/\n$/.test(before))return;
    e.preventDefault();
    var last;
    while((last=b.lastChild)){
      if(last.nodeType===3){
        last.nodeValue=last.nodeValue.replace(/\n+$/,'');
        if(last.nodeValue==='')b.removeChild(last); else break;
      }else if(last.nodeName==='BR'){b.removeChild(last)}
      else break;
    }
    var p=document.createElement('p'); p.appendChild(document.createElement('br'));
    b.parentNode.insertBefore(p,b.nextSibling);
    caretTo(p); refresh();
  });
  area.addEventListener('input',function(e){
    if(e.inputType!=='insertText'||!e.data)return;
    var sel=window.getSelection();
    if(!sel.rangeCount||!sel.isCollapsed)return;
    var node=sel.anchorNode, off=sel.anchorOffset;
    if(!node)return;
    if(node.nodeType===3&&node.parentNode===area){
      var w=document.createElement('p'); area.insertBefore(w,node); w.appendChild(node);
      var r0=document.createRange(); r0.setStart(node,off); r0.collapse(true);
      sel.removeAllRanges(); sel.addRange(r0);
    }
    var cb=blockOf(); if(cb&&cb.tagName==='PRE')return;
    var el=node.nodeType===3?node.parentNode:node;
    if(!el||el===area)return;
    var blk=el; while(blk.parentNode!==area)blk=blk.parentNode;
    if(!el.closest('li')&&(blk.tagName==='P'||blk.tagName==='DIV')){
      var t=blk.textContent.replace(/\u00a0/g,' ');
      var kind=/^#{1,3} $/.test(t)?'h2':/^> $/.test(t)?'blockquote':/^[-*] $/.test(t)?'ul':/^1\. $/.test(t)?'ol':t==='```'?'pre':null;
      if(kind){
        if(kind==='pre'){
          var pr=document.createElement('pre'); pr.appendChild(document.createElement('br'));
          area.replaceChild(pr,blk); caretTo(pr);
        }else{
          blk.innerHTML='<br>'; caretTo(blk);
          if(kind==='ul')document.execCommand('insertUnorderedList');
          else if(kind==='ol')document.execCommand('insertOrderedList');
          else document.execCommand('formatBlock',false,'<'+kind+'>');
        }
        return;
      }
    }
    if(node.nodeType!==3||!node.parentNode)return;
    var txt=node.nodeValue.slice(0,off);
    var rules=[[/\*\*([^*\n]+)\*\*$/,'b'],[/__([^_\n]+)__$/,'u'],[/~~([^~\n]+)~~$/,'s'],[/\*([^*\s][^*\n]*)\*$/,'i']];
    for(var i=0;i<rules.length;i++){
      var m=txt.match(rules[i][0]); if(!m)continue;
      if(rules[i][1]==='i'&&txt.charAt(txt.length-m[0].length-1)==='*')continue;
      var rr=document.createRange(); rr.setStart(node,off-m[0].length); rr.setEnd(node,off);
      sel.removeAllRanges(); sel.addRange(rr);
      document.execCommand('insertHTML',false,'<'+rules[i][1]+'>'+esc(m[1])+'</'+rules[i][1]+'>\u200b');
      return;
    }
  });
  area.addEventListener('input',refresh);
  document.addEventListener('selectionchange',function(){if(document.activeElement===area)refresh()});
}

/* ---------------- sender picker ---------------- */
function initSenderPicker(ctx){
  var btn=document.getElementById('senderBtn'), pk=document.getElementById('picker'), list=document.getElementById('pkList');
  var ava=btn.querySelector('.ava');
  var scrim=document.getElementById('pkScrim'), expB=document.getElementById('pkExp'), colB=document.getElementById('pkCol'), cnt2=document.getElementById('pkCnt');
  function allChars(){return [[ctx.charsApi.me(),ctx.charsApi.meUsername(),0,ctx.charsApi.meAvatar()]].concat(ctx.charsApi.list())}
  function findChar(n){if(n===ctx.charsApi.me())return [n,ctx.charsApi.meUsername()];return ctx.charsApi.find(n)}
  var cur=ctx.charsApi.me(), recent=[ctx.charsApi.me()], big=false;
  ctx.senderApi={
    name:function(){return cur},
    ai:function(){var c=findChar(cur);return !!(c&&c[2])}
  };
  ava.innerHTML=avatarMarkup(ctx.charsApi.meAvatar(),cur.charAt(0).toUpperCase());
  function rowHtml(c){
    var n=c[0],un=c[1]||'';
    return '<button class="pk-row'+(n===cur?' on':'')+'" data-name="'+esc(n)+'" role="option" aria-selected="'+(n===cur)+'"><span class="ava">'+avatarMarkup(c[3],n.charAt(0).toUpperCase())+'</span><span class="pk-info"><span class="pk-n">'+esc(n)+'</span>'+(un?'<span class="pk-un">'+esc(un)+'</span>':'')+'</span>'+(c[2]?'<span class="pk-tag">ИИ</span>':'')+'</button>';
  }
  function render(){
    var src=big?allChars():recent.map(function(n){return findChar(n)}).filter(Boolean);
    list.innerHTML=src.map(rowHtml).join('');
    cnt2.textContent='Персонажей: '+(allChars().length-1);
  }
  function setBig(b){
    big=b; pk.classList.toggle('big',b); scrim.hidden=!b; render();
    if(!pk.hidden){place();var s=list.querySelector('.on');if(s)s.scrollIntoView({block:'nearest'})}
  }
  function place(){
    var b=btn.getBoundingClientRect(), p=pk.getBoundingClientRect();
    pk.style.setProperty('--tx',Math.max(24,Math.min(p.width-24,b.left+b.width/2-p.left))+'px');
  }
  function open(o){
    if(o===undefined)o=pk.hidden;
    if(o&&!document.getElementById('edWrap').hidden)document.getElementById('edBtn').click();
    if(!o)setBig(false); pk.hidden=!o; btn.classList.toggle('on',o); btn.setAttribute('aria-expanded',o);
    if(o){render();place();var s=list.querySelector('.on');if(s)s.scrollIntoView({block:'nearest'})}
  }
  btn.addEventListener('click',function(e){e.stopPropagation();open()});
  expB.addEventListener('click',function(){setBig(true)});
  colB.addEventListener('click',function(){setBig(false)});
  list.addEventListener('click',function(e){
    var r=e.target.closest('.pk-row'); if(!r)return;
    cur=r.dataset.name; recent=[cur].concat(recent.filter(function(x){return x!==cur})).slice(0,5);
    var selected=findChar(cur);ava.innerHTML=avatarMarkup(selected&&selected[3],r.dataset.name.charAt(0).toUpperCase());
    open(false);
  });
  document.addEventListener('click',function(e){if(!pk.hidden&&!pk.contains(e.target))open(false)});
  document.addEventListener('keydown',function(e){if(e.key==='Escape'&&!pk.hidden)open(false)});
  window.addEventListener('resize',function(){if(!pk.hidden)place()});
  ctx.charsApi.subscribe(function(){
    recent=recent.filter(function(n){return findChar(n)});
    if(!findChar(cur)){cur=ctx.charsApi.me()}
    var selected=findChar(cur);ava.innerHTML=avatarMarkup(selected&&selected[3],cur.charAt(0).toUpperCase())
    if(!pk.hidden)render();
  });
}

/* ---------------- profile panel ---------------- */
function initProfile(ctx){
  var btn=document.getElementById('profileBtn'), wrap=document.getElementById('pfWrap');

  var meInput=document.getElementById('pfMeInput'), meUnInput=document.getElementById('pfMeUnInput'), meDescInput=document.getElementById('pfMeDescInput'), meAva=document.getElementById('pfMeAva');
  function avatarHtml(value,letter){return value?'<img src="'+esc(value)+'" alt="">':esc(letter)}
  function readAvatar(file,done){
    if(!file||!file.type.startsWith('image/'))return;
    var reader=new FileReader();
    reader.addEventListener('load',function(){done(String(reader.result))});
    reader.readAsDataURL(file);
  }
  function avatarInput(className,value){return '<input class="avatar-file '+className+'" type="file" accept="image/*" data-avatar="'+esc(value||'')+'">'}
  var charList=document.getElementById('pfCharList'), addBtn=document.getElementById('pfAdd');
  var profAva=document.querySelector('.profile .ava'), profSmall=document.querySelector('.profile small');
  function rowHtml(c){
    return '<div class="pf-row"><label class="avatar-upload" title="Изменить аватар"><span class="ava">'+avatarHtml(c[3],c[0].charAt(0).toUpperCase())+'</span>'+avatarInput('pf-char-file',c[3])+'</label>'+
      '<div class="pf-names"><input class="pf-input pf-name" type="text" value="'+esc(c[0])+'" placeholder="Имя персонажа">'+
      '<input class="pf-input pf-un" type="text" value="'+esc(c[1]||'')+'" placeholder="@username" pattern="@[A-Za-z0-9_]+" autocomplete="off"><span class="field-error pf-un-error"></span><input class="pf-input pf-desc" type="text" value="'+esc(c[4]||'')+'" placeholder="Описание"></div>'+
      '<label class="pf-ai"><input type="checkbox" class="pf-ai-cb"'+(c[2]?' checked':'')+'>ИИ</label>'+
      '<button class="pf-del" title="Удалить" aria-label="Удалить персонажа"><svg viewBox="0 0 24 24"><path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/></svg></button></div>';
  }
  function renderChars(){
    charList.innerHTML=ctx.charsApi.list().map(rowHtml).join('');
  }
  function updateProfile(){
    profAva.innerHTML=avatarMarkup(ctx.charsApi.meAvatar(),ctx.charsApi.me().charAt(0).toUpperCase());
    var n=ctx.charsApi.count();
    profSmall.textContent=n+' персонаж'+(n%10===1&&n%100!==11?'':n%10>=2&&n%10<=4&&(n%100<10||n%100>=20)?'а':'ей');
  }
  function open(o){
    if(o===undefined)o=wrap.hidden;
    if(o){meInput.value=ctx.charsApi.me();meUnInput.value=ctx.charsApi.meUsername();meDescInput.value=ctx.charsApi.meDescription();meAva.innerHTML=avatarHtml(ctx.charsApi.meAvatar(),ctx.charsApi.me().charAt(0).toUpperCase());renderChars()}
    wrap.hidden=!o;
  }
  function validUsername(value){return /^@[A-Za-z0-9_]+$/.test(value)}
  function showUsernameError(input,error){
    var invalid=!validUsername(input.value.trim());
    input.classList.toggle('invalid',invalid);
    error.textContent=invalid?'Формат: @username — латинские буквы, цифры и нижнее подчёркивание, без пробелов.':'';
    return !invalid;
  }
  function saveAll(){
    var meUn=meUnInput.value.trim();
    var meValid=showUsernameError(meUnInput,document.getElementById('pfMeUnError'));
    var allValid=meValid;
    charList.querySelectorAll('.pf-row').forEach(function(row){
      var input=row.querySelector('.pf-un'), error=row.querySelector('.pf-un-error');
      if(!showUsernameError(input,error))allValid=false;
    });
    if(!allValid){return false}
    var me=meInput.value.trim(); if(me)ctx.charsApi.setMe(me);
    ctx.charsApi.setMeUsername(meUn);
    ctx.charsApi.setMeDescription(meDescInput.value.trim());
    var data=[];
    charList.querySelectorAll('.pf-row').forEach(function(row){
      var name=row.querySelector('.pf-name').value.trim();
      var un=row.querySelector('.pf-un').value.trim();
      var ai=row.querySelector('.pf-ai-cb').checked;
      var desc=row.querySelector('.pf-desc').value.trim();
      var image=row.querySelector('.pf-char-file');
      var avatar=image&&image.dataset.avatar||'';
      if(name)data.push([name,un,ai?1:0,avatar,desc]);
    });
    ctx.charsApi.setAll(data);
    updateProfile();
    return true;
  }
  btn.addEventListener('click',function(e){e.stopPropagation();open()});
  wrap.addEventListener('click',function(e){if(e.target===wrap&&saveAll())open(false)});
  document.getElementById('pfX').addEventListener('click',function(){if(saveAll())open(false)});
  document.getElementById('pfDone').addEventListener('click',function(){if(saveAll())open(false)});
  charList.addEventListener('input',function(e){
    var row=e.target.closest('.pf-row'); if(!row)return;
    if(e.target.classList.contains('pf-name'))
      row.querySelector('.ava').textContent=e.target.value.charAt(0).toUpperCase()||'?';
  });
  charList.addEventListener('change',function(e){
    if(!e.target.classList.contains('pf-char-file'))return;
    readAvatar(e.target.files[0],function(value){e.target.dataset.avatar=value;e.target.closest('.avatar-upload').querySelector('.ava').innerHTML=avatarHtml(value,'?')});
  });
  charList.addEventListener('click',function(e){
    var del=e.target.closest('.pf-del');
    if(del)del.closest('.pf-row').remove();
  });
  addBtn.addEventListener('click',function(){
    var div=document.createElement('div');
    div.className='pf-row';
    div.innerHTML='<label class="avatar-upload" title="Изменить аватар"><span class="ava">Н</span>'+avatarInput('pf-char-file','')+'</label><div class="pf-names"><input class="pf-input pf-name" type="text" value="Новый персонаж" placeholder="Имя персонажа"><input class="pf-input pf-un" type="text" value="@newchar" placeholder="@username" pattern="@[A-Za-z0-9_]+" autocomplete="off"><span class="field-error pf-un-error"></span><input class="pf-input pf-desc" type="text" placeholder="Описание"></div><label class="pf-ai"><input type="checkbox" class="pf-ai-cb">ИИ</label><button class="pf-del" title="Удалить" aria-label="Удалить персонажа"><svg viewBox="0 0 24 24"><path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/></svg></button>';
    charList.appendChild(div);
    var inp=div.querySelector('.pf-name'); inp.focus(); inp.select();
  });
  document.getElementById('pfMeFile').addEventListener('change',function(e){
    readAvatar(e.target.files[0],function(value){ctx.charsApi.setMeAvatar(value);meAva.innerHTML=avatarHtml(value,meInput.value.charAt(0).toUpperCase()||'?')});
  });
  meInput.addEventListener('input',function(){if(!ctx.charsApi.meAvatar())meAva.textContent=meInput.value.charAt(0).toUpperCase()||'?'})
  meUnInput.addEventListener('input',function(){showUsernameError(meUnInput,document.getElementById('pfMeUnError'))});
  document.addEventListener('keydown',function(e){if(e.key==='Escape'&&!wrap.hidden&&saveAll())open(false)});
  ctx.charsApi.subscribe(updateProfile);
  updateProfile();
}

/* ---------------- chats UI ---------------- */
function initChats(ctx){
  var chatsList=document.getElementById('chatsList'), chatTitle=document.getElementById('chatTitle');
  var feed=document.querySelector('.feed'), t=document.getElementById('t'), sendBtn=document.querySelector('.send');
  var app=document.querySelector('.app'), mobileBack=document.getElementById('mobileBack');
  var addChatBtn=document.getElementById('addChatBtn');
  function hm(){var d=new Date();return ('0'+d.getHours()).slice(-2)+':'+('0'+d.getMinutes()).slice(-2)}
  function renderSidebar(){
    var list=ctx.chatsApi.list(), cur=ctx.chatsApi.current();
    list.forEach(function(c){if(c.direct){var source=ctx.charsApi.find(c.contact);if(source){c.name=source[0];c.link=source[1];c.avatar=source[3]||'';c.ava=source[0].charAt(0).toUpperCase();c.description=source[4]||''}}});
    if(list.length===0){chatsList.innerHTML='<div class="empty-state">Нет чатов<div class="empty-hint">Нажмите + выше, чтобы создать чат</div></div>';return}
    var groups=[{id:'direct',title:'Личные сообщения'},{id:'chats',title:'Чаты'}];
    chatsList.innerHTML=groups.map(function(group){
      var items=list.map(function(c,i){return {c:c,i:i}}).filter(function(x){return (x.c.folder||'chats')===group.id});
      if(items.length===0)return '';
      return '<section class="chat-group"><button class="group-title" data-group="'+group.id+'"><span>'+group.title+'</span><span class="group-arrow">⌃</span></button><div class="group-items">'+items.map(function(x){var c=x.c,i=x.i;return '<div class="chat'+(i===cur?' active':'')+'" data-i="'+i+'"><button class="chat-open" data-i="'+i+'"><span class="ava">'+avatarMarkup(c.avatar,c.ava)+'</span><span class="t"><div class="n">'+esc(c.name)+'</div><div class="p">'+esc(c.description||ctx.chatsApi.lastPreview(c))+'</div></span></button><button class="chat-edit" data-edit="'+i+'" title="Редактировать чат" aria-label="Редактировать чат"><svg viewBox="0 0 24 24"><path d="M4 20h4L19 9l-4-4L4 16v4M13.5 6.5l4 4"/></svg></button></div>'}).join('')+'</div></section>';
    }).join('');
  }
  function personFor(name){
    if(name===ctx.charsApi.me())return {name:name,username:ctx.charsApi.meUsername(),avatar:ctx.charsApi.meAvatar(),description:ctx.charsApi.meDescription(),own:true};
    var c=ctx.charsApi.find(name);
    return c?{name:c[0],username:c[1],avatar:c[3]||'',description:c[4]||'',own:false}:{name:name,username:'',avatar:'',description:'',own:false};
  }
  function msgHtml(m,showAvatar,idx,chat){
    var body=m.html?m.body:esc(m.body).replace(/\n/g,'<br>'), person=personFor(m.who);
    var replyHtml='';
    if(m.replyTo!=null){
      var orig=chat.msgs[m.replyTo];
      if(orig){
        var origText=orig.body.replace(/<[^>]+>/g,'').slice(0,60);
        replyHtml='<div class="msg-reply"><span class="mr-name">'+esc(orig.who)+'</span><span class="mr-text">'+esc(origText)+'</span></div>';
      }
    }
    var fwdHtml=m.forwarded?'<div class="msg-forwarded">Переслано от '+esc(m.who)+'</div>':'';
    var editedHtml=m.edited?'<span class="msg-edited" title="Изменено" aria-label="Изменено"><svg viewBox="0 0 24 24"><path d="M4 20h4L19 9l-4-4L4 16v4M13.5 6.5l4 4"/></svg></span>':'';
    return '<article class="msg'+(m.ai?' ai':'')+(showAvatar?' has-avatar':'')+(m.replyTo!=null?' has-reply':'')+'" data-msg="'+idx+'">'+(showAvatar?'<button class="msg-ava" data-person="'+esc(person.name)+'" title="Открыть профиль"><span class="ava">'+avatarMarkup(person.avatar,person.name.charAt(0).toUpperCase())+'</span></button>':'')+replyHtml+fwdHtml+'<div class="msg-top"><span class="who">'+esc(m.who)+'</span><span class="real">'+esc(m.real)+'</span></div><div class="body'+(m.html?' rich':'')+'">'+body+'</div><div class="time">'+editedHtml+esc(m.time)+'</div></article>';
  }
  function renderFeed(){
    var curIdx=ctx.chatsApi.current();
    feed.querySelectorAll('.msg,.empty-state').forEach(function(el){el.remove()});
    var picker=feed.querySelector('.pk-scrim'), ed=feed.querySelector('.ed-wrap');
    if(curIdx<0){
      chatTitle.innerHTML='';
      feed.insertBefore(document.createRange().createContextualFragment('<div class="empty-state">Выберите чат<div class="empty-hint">Или создайте новый кнопкой +</div></div>'),picker);
      return;
    }
    var c=ctx.chatsApi.get(curIdx);
    if(!c){
      chatTitle.innerHTML='';
      feed.insertBefore(document.createRange().createContextualFragment('<div class="empty-state">Выберите чат</div>'),picker);
      return;
    }
    chatTitle.innerHTML='<span class="chat-headline">'+(c.direct?'<button class="head-ava" data-person="'+esc(c.name)+'"><span class="ava">'+avatarMarkup(c.avatar,c.ava)+'</span></button>':'')+'<span><b>'+esc(c.name)+'</b><small>'+esc(c.description||c.link||'Без ссылки')+'</small></span></span>';
    if(c.msgs.length===0){
      feed.insertBefore(document.createRange().createContextualFragment('<div class="empty-state">Сообщений пока нет<div class="empty-hint">Напишите первое сообщение ниже</div></div>'),picker);
      return;
    }
    var previousWho='';
    c.msgs.forEach(function(m,idx){
      var showAvatar=m.who!==previousWho;
      feed.insertBefore(document.createRange().createContextualFragment(msgHtml(m,showAvatar,idx,c)),picker);
      previousWho=m.who;
    });
    feed.scrollTop=feed.scrollHeight;
  }
  function render(){
    renderSidebar();
    renderFeed();
    if(ctx.chatsApi.current()<0)app.classList.add('mobile-chats-open');
  }
  var replyToMsg=null, editingMsg=null;
  var replyPreview=document.getElementById('replyPreview'), rqName=document.getElementById('rqName'), rqText=document.getElementById('rqText'), replyCancel=document.getElementById('replyCancel');
  function setReply(msgIdx){
    var c=ctx.chatsApi.get(ctx.chatsApi.current());if(!c)return;var m=c.msgs[msgIdx];if(!m)return;
    replyToMsg=msgIdx;editingMsg=null;
    rqName.textContent=m.who;
    rqText.textContent=m.body.replace(/<[^>]+>/g,'').slice(0,80);
    replyPreview.hidden=false;
    t.focus();
  }
  function setEdit(msgIdx){
    var c=ctx.chatsApi.get(ctx.chatsApi.current());if(!c)return;var m=c.msgs[msgIdx];if(!m)return;
    editingMsg=msgIdx;replyToMsg=null;replyPreview.hidden=true;
    t.value=m.html?m.body.replace(/<[^>]+>/g,''):m.body;
    t.style.height='46px';t.style.height=Math.min(t.scrollHeight,160)+'px';
    t.focus();
  }
  function cancelReplyEdit(){replyToMsg=null;editingMsg=null;replyPreview.hidden=true}
  replyCancel.addEventListener('click',function(){cancelReplyEdit();t.value='';t.style.height='46px'});
  function go(){
    if(ctx.chatsApi.current()<0)return;
    var edOpen=!document.getElementById('edWrap').hidden, src=null;
    if(edOpen){if(ctx.mdApi.empty())return;src='ed'}
    else if(t.value.trim()!=='') src='t';
    else if(!ctx.mdApi.empty()) src='ed';
    else return;
    var html=src==='ed'?ctx.mdApi.html():ctx.mdApi.fromMd(t.value);
    var curIdx=ctx.chatsApi.current();
    if(editingMsg!=null){
      ctx.chatsApi.editMsg(curIdx,editingMsg,html);
      editingMsg=null;
    }else{
      var msg={
        who:ctx.senderApi.name(),
        real:ctx.charsApi.me(),
        ai:ctx.senderApi.ai()?1:0,
        body:html,time:hm(),html:1
      };
      if(replyToMsg!=null)msg.replyTo=replyToMsg;
      ctx.chatsApi.push(msg);
      replyToMsg=null;replyPreview.hidden=true;
    }
    if(src==='ed') ctx.mdApi.clear(); else {t.value='';t.style.height='46px'}
    var mentionBox=document.getElementById('mentionBox');
    mentionBox.hidden=true;
    mentionBox.innerHTML='';
    if(edOpen) document.getElementById('edBtn').click();
  }
  mobileBack.addEventListener('click',function(){app.classList.add('mobile-chats-open')});
  chatsList.addEventListener('click',function(e){
    var group=e.target.closest('.group-title');
    if(group){group.closest('.chat-group').classList.toggle('collapsed');return}
    var edit=e.target.closest('[data-edit]');
    if(edit){e.stopPropagation();openChatModal(parseInt(edit.dataset.edit,10));return}
    var open=e.target.closest('.chat-open');
    if(open){
      ctx.chatsApi.setCurrent(parseInt(open.dataset.i,10));
      app.classList.remove('mobile-chats-open');
    }
  });
  var chatModal=document.getElementById('chatModal');
  var chatModalTitle=document.getElementById('chatModalTitle');
  var chatAvatarPreview=document.getElementById('chatAvatarPreview');
  var chatAvatarFile=document.getElementById('chatAvatarFile');
  var chatDescriptionInput=document.getElementById('chatDescriptionInput');
  var chatAvatar='';
  var chatNameInput=document.getElementById('chatNameInput');
  var chatLinkInput=document.getElementById('chatLinkInput');
  var chatLinkError=document.getElementById('chatLinkError');
  var chatDelete=document.getElementById('chatDelete');
  var personModal=document.getElementById('personModal'), personAva=document.getElementById('personAva'), personName=document.getElementById('personName'), personUsername=document.getElementById('personUsername'), personDescription=document.getElementById('personDescription'), personMessage=document.getElementById('personMessage'), personTarget=null;
  var editingChat=-1;
  function openChatModal(index){
    editingChat=index;
    var c=index<0?null:ctx.chatsApi.get(index);
    chatModalTitle.textContent=c?'Редактировать чат':'Новый чат';
    chatAvatar=c?c.avatar||'':'';
    chatAvatarPreview.innerHTML=avatarMarkup(chatAvatar,c?c.ava:'?');
    chatAvatarFile.value='';
    chatNameInput.value=c?c.name:'';
    chatLinkInput.value=c?c.link:'';
    chatDescriptionInput.value=c?c.description||'':'';
    chatLinkError.textContent='';
    chatLinkInput.classList.remove('invalid');
    chatDelete.hidden=!c;
    chatModal.hidden=false;
    chatNameInput.focus();
  }
  function closeChatModal(){chatModal.hidden=true;editingChat=-1}
  function validChatLink(link){return /^@[A-Za-z0-9_]+$/.test(link)}
  function validateChatLink(){
    var link=chatLinkInput.value.trim();
    var valid=validChatLink(link);
    chatLinkInput.classList.toggle('invalid',link!==''&&!valid);
    chatLinkError.textContent=valid||link===''?'':'Используйте @, латинские буквы, цифры и нижнее подчёркивание, без пробелов.';
    return valid;
  }
  function saveChat(){
    var name=chatNameInput.value.trim();
    if(!name){chatNameInput.focus();return}
    var link=chatLinkInput.value.trim();
    if(!validChatLink(link)){
      chatLinkError.textContent='Введите ссылку в формате @my_chat123: латинские буквы, цифры и нижнее подчёркивание, без пробелов.';
      chatLinkInput.classList.add('invalid');
      chatLinkInput.focus();
      return;
    }
    if(editingChat<0)ctx.chatsApi.add(name,link);
    else ctx.chatsApi.update(editingChat,name,link,chatAvatar,chatDescriptionInput.value.trim());
    closeChatModal();
  }
  addChatBtn.addEventListener('click',function(){openChatModal(-1)});
  document.getElementById('chatSave').addEventListener('click',saveChat);
  document.getElementById('chatCancel').addEventListener('click',closeChatModal);
  document.getElementById('chatModalX').addEventListener('click',closeChatModal);
  chatLinkInput.addEventListener('input',validateChatLink);
  chatAvatarFile.addEventListener('change',function(){var file=chatAvatarFile.files[0];if(!file||!file.type.startsWith('image/'))return;var reader=new FileReader();reader.addEventListener('load',function(){chatAvatar=String(reader.result);chatAvatarPreview.innerHTML=avatarMarkup(chatAvatar,chatNameInput.value.charAt(0).toUpperCase()||'?')});reader.readAsDataURL(file)});
  chatModal.addEventListener('click',function(e){if(e.target===chatModal)closeChatModal()});
  function openPerson(name){
    var person=personFor(name); personTarget=person;
    personAva.innerHTML=avatarMarkup(person.avatar,person.name.charAt(0).toUpperCase());
    personName.textContent=person.name; personUsername.textContent=person.username; personDescription.textContent=person.description||'Описание не добавлено.';
    personMessage.hidden=person.own; personModal.hidden=false;
  }
  function closePerson(){personModal.hidden=true;personTarget=null}
  feed.addEventListener('click',function(e){
    var trigger=e.target.closest('.msg-ava,.head-ava');
    if(trigger)openPerson(trigger.dataset.person);
  });
  personModal.addEventListener('click',function(e){if(e.target===personModal)closePerson()});
  document.getElementById('personClose').addEventListener('click',closePerson);
  personMessage.addEventListener('click',function(){if(personTarget&&!personTarget.own){ctx.chatsApi.addDirect(personTarget.name,personTarget.username,personTarget.avatar,personTarget.description);closePerson()}});
  chatDelete.addEventListener('click',function(){
    if(!confirm('Удалить этот чат? Все сообщения в нём будут удалены.'))return;
    ctx.chatsApi.remove(editingChat);
    closeChatModal();
  });
  sendBtn.addEventListener('click',go);
  var mentionBox=document.getElementById('mentionBox');
  function mentionGroups(){
    var chats=ctx.chatsApi.list().filter(function(c){return c.link});
    var chars=ctx.charsApi.list();
    var users=[{name:ctx.charsApi.me(),handle:ctx.charsApi.meUsername()}];
    return [
      {title:'Чаты',items:chats.map(function(c){return {name:c.name,handle:c.link}})},
      {title:'Пользователи',items:users},
      {title:'ИИ',items:chars.filter(function(c){return c[2]}).map(function(c){return {name:c[0],handle:c[1]}})},
      {title:'Персонажи',items:chars.filter(function(c){return !c[2]}).map(function(c){return {name:c[0],handle:c[1]}})}
    ];
  }
  function closeMentions(){mentionBox.hidden=true;mentionBox.innerHTML=''}
  function insertMention(handle){
    var before=t.value.slice(0,t.selectionStart), at=before.lastIndexOf('@');
    if(at<0)return;
    var after=t.value.slice(t.selectionEnd);
    t.value=before.slice(0,at)+handle+' '+after;
    var pos=at+handle.length+1;
    t.setSelectionRange(pos,pos);
    t.dispatchEvent(new Event('input',{bubbles:true}));
    closeMentions();
    t.focus();
  }
  function renderMentions(){
    var before=t.value.slice(0,t.selectionStart), match=before.match(/@([A-Za-z0-9_]*)$/);
    if(!match){closeMentions();return}
    var query=match[1].toLowerCase(), groups=mentionGroups(), found=0;
    mentionBox.innerHTML='';
    groups.forEach(function(group){
      var items=group.items.filter(function(item){return item.handle.toLowerCase().slice(1).indexOf(query)===0||item.name.toLowerCase().indexOf(query)===0});
      if(!items.length)return;
      var heading=document.createElement('div'); heading.className='mention-heading'; heading.textContent=group.title; mentionBox.appendChild(heading);
      items.forEach(function(item){
        var row=document.createElement('button'); row.type='button'; row.className='mention-row'; row.dataset.handle=item.handle;
        var name=document.createElement('span'); name.textContent=item.name;
        var handle=document.createElement('small'); handle.textContent=item.handle;
        row.append(name,handle); row.addEventListener('click',function(){insertMention(item.handle)});
        mentionBox.appendChild(row); found++;
      });
    });
    mentionBox.hidden=found===0;
  }
  t.addEventListener('input',renderMentions);
  t.addEventListener('keydown',function(e){
    if(e.key==='Escape'&&!mentionBox.hidden){e.preventDefault();closeMentions();return}
    if(e.key==='Enter'&&!e.shiftKey&&!e.isComposing){
      var first=mentionBox.querySelector('.mention-row');
      if(first&&!mentionBox.hidden){e.preventDefault();insertMention(first.dataset.handle);return}
      e.preventDefault();go();
    }
  });
  document.addEventListener('click',function(e){if(!mentionBox.hidden&&!mentionBox.contains(e.target)&&e.target!==t)closeMentions()});
  /* ---------- message context menu ---------- */
  var msgMenu=document.getElementById('msgMenu');
  var menuMsgIdx=-1;
  function closeMsgMenu(){msgMenu.hidden=true;menuMsgIdx=-1}
  function openMsgMenu(msgIdx,x,y){
    menuMsgIdx=msgIdx;
    msgMenu.hidden=false;
    var mw=msgMenu.offsetWidth,mh=msgMenu.offsetHeight;
    msgMenu.style.left=Math.min(x,window.innerWidth-mw-8)+'px';
    msgMenu.style.top=Math.min(y,window.innerHeight-mh-8)+'px';
  }
  msgMenu.addEventListener('click',function(e){
    var b=e.target.closest('button[data-action]');if(!b)return;
    var action=b.dataset.action;
    var idx=menuMsgIdx;closeMsgMenu();
    if(action==='reply'){setReply(idx)}
    else if(action==='edit'){setEdit(idx)}
    else if(action==='forward'){openForwardModal([idx])}
    else if(action==='delete'){
      var ci=ctx.chatsApi.current();
      ctx.chatsApi.deleteMsgs(ci,[idx]);
    }
  });
  document.addEventListener('click',function(e){
    if(!msgMenu.hidden&&!msgMenu.contains(e.target))closeMsgMenu();
  });

  /* ---------- message click / long-press ---------- */
  var pressTimer=null,pressTarget=null,pressMoved=false;
  feed.addEventListener('mousedown',function(e){
    var msgEl=e.target.closest('.msg');if(!msgEl)return;
    if(e.target.closest('.msg-ava'))return;
    pressTarget=msgEl;pressMoved=false;
    var idx=parseInt(msgEl.dataset.msg,10);
    pressTimer=setTimeout(function(){
      pressTimer=null;
      if(!pressMoved){
        e.preventDefault();
        enterSelectMode(idx);
      }
    },500);
  });
  feed.addEventListener('mousemove',function(){
    if(pressTimer){pressMoved=true}
  });
  feed.addEventListener('mouseup',function(){if(pressTimer){clearTimeout(pressTimer);pressTimer=null}});
  feed.addEventListener('mouseleave',function(){if(pressTimer){clearTimeout(pressTimer);pressTimer=null}});
  feed.addEventListener('touchstart',function(e){
    var msgEl=e.target.closest('.msg');if(!msgEl)return;
    if(e.target.closest('.msg-ava'))return;
    pressTarget=msgEl;pressMoved=false;
    var idx=parseInt(msgEl.dataset.msg,10);
    pressTimer=setTimeout(function(){
      pressTimer=null;if(!pressMoved)enterSelectMode(idx);
    },500);
  },{passive:true});
  feed.addEventListener('touchmove',function(){if(pressTimer)pressMoved=true});
  feed.addEventListener('touchend',function(){if(pressTimer){clearTimeout(pressTimer);pressTimer=null}});
  feed.addEventListener('contextmenu',function(e){
    var msgEl=e.target.closest('.msg');
    if(!msgEl||e.target.closest('.msg-ava'))return;
    e.preventDefault();
    if(app.classList.contains('select-mode'))return;
    openMsgMenu(parseInt(msgEl.dataset.msg,10),e.clientX,e.clientY);
  });
  feed.addEventListener('click',function(e){
    if(pressTimer){clearTimeout(pressTimer);pressTimer=null;return}
    var msgEl=e.target.closest('.msg');if(!msgEl)return;
    if(e.target.closest('.msg-ava'))return;
    if(app.classList.contains('select-mode')){
      toggleSelect(parseInt(msgEl.dataset.msg,10));
    }
  });

  /* ---------- selection mode ---------- */
  var selectedMsgs={};
  var selectBar=document.getElementById('selectBar'),selectCount=document.getElementById('selectCount');
  var selectForwardBtn=document.getElementById('selectForward'),selectDeleteBtn=document.getElementById('selectDelete'),selectCancelBtn=document.getElementById('selectCancel');
  function enterSelectMode(idx){
    selectedMsgs={};selectedMsgs[idx]=1;
    app.classList.add('select-mode');
    updateSelectUI();
  }
  function toggleSelect(idx){
    if(selectedMsgs[idx])delete selectedMsgs[idx];else selectedMsgs[idx]=1;
    if(Object.keys(selectedMsgs).length===0)exitSelectMode();
    else updateSelectUI();
  }
  function updateSelectUI(){
    var keys=Object.keys(selectedMsgs);
    selectCount.textContent=keys.length+' выбрано';
    feed.querySelectorAll('.msg').forEach(function(el){
      var i=el.dataset.msg;
      el.classList.toggle('selected',!!selectedMsgs[i]);
    });
  }
  function exitSelectMode(){selectedMsgs={};app.classList.remove('select-mode');updateSelectUI()}
  selectCancelBtn.addEventListener('click',exitSelectMode);
  selectDeleteBtn.addEventListener('click',function(){
    var indices=Object.keys(selectedMsgs).map(Number);
    if(indices.length===0)return;
    if(!confirm('Удалить '+indices.length+' сообщений?'))return;
    ctx.chatsApi.deleteMsgs(ctx.chatsApi.current(),indices);
    exitSelectMode();
  });
  selectForwardBtn.addEventListener('click',function(){
    var indices=Object.keys(selectedMsgs).map(Number);
    if(indices.length===0)return;
    openForwardModal(indices);
  });

  /* ---------- forward modal ---------- */
  var fwdModal=document.getElementById('fwdModal'),fwdList=document.getElementById('fwdList'),fwdX=document.getElementById('fwdX');
  var fwdMsgs=[];
  function openForwardModal(indices){
    var c=ctx.chatsApi.get(ctx.chatsApi.current());if(!c)return;
    fwdMsgs=indices.map(function(i){return c.msgs[i]}).filter(Boolean);
    if(fwdMsgs.length===0)return;
    var list=ctx.chatsApi.list();
    fwdList.innerHTML='';
    list.forEach(function(c,i){
      if(i===ctx.chatsApi.current())return;
      var btn=document.createElement('button');btn.type='button';btn.className='fwd-item';
      btn.innerHTML='<span class="ava">'+avatarMarkup(c.avatar,c.ava)+'</span><span><b>'+esc(c.name)+'</b><small>'+esc(c.link||'')+'</small></span>';
      btn.addEventListener('click',function(){
        fwdMsgs.forEach(function(m){ctx.chatsApi.forwardMsg(i,m)});
        closeForwardModal();exitSelectMode();
      });
      fwdList.appendChild(btn);
    });
    if(fwdList.children.length===0)fwdList.innerHTML='<div style="color:var(--muted);padding:14px;text-align:center">Нет других чатов для пересылки</div>';
    fwdModal.hidden=false;
  }
  function closeForwardModal(){fwdModal.hidden=true;fwdMsgs=[]}
  fwdX.addEventListener('click',closeForwardModal);
  fwdModal.addEventListener('click',function(e){if(e.target===fwdModal)closeForwardModal()});

  ctx.chatsApi.subscribe(render);
  ctx.charsApi.subscribe(render);
  render();
}

/* ---------------- theme switcher & textarea autosize ---------------- */
function initThemeAndAutosize(){
  var t=document.getElementById('t');
  t.addEventListener('input',function(){t.style.height='46px';t.style.height=Math.min(t.scrollHeight,160)+'px'});
  document.getElementById('themes').addEventListener('click',function(e){
    var b=e.target.closest('button');if(!b)return;
    document.documentElement.setAttribute('data-theme',b.dataset.theme);
    this.querySelectorAll('button').forEach(function(x){x.classList.toggle('on',x===b)});
  });
}

/* ---------------- settings ---------------- */
function initSettings(){
  var app=document.querySelector('.app');
  var wrap=document.getElementById('settingsWrap');
  var btn=document.getElementById('settingsBtn');
  var closeBtn=document.getElementById('settingsX');
  var options=wrap.querySelectorAll('.view-option');
  function setView(view){
    var mobile=view==='mobile';
    app.classList.toggle('view-mobile',mobile);
    options.forEach(function(option){
      var active=option.dataset.view===view;
      option.classList.toggle('active',active);
      option.setAttribute('aria-pressed',String(active));
    });
  }
  function close(){wrap.hidden=true}
  btn.addEventListener('click',function(){wrap.hidden=false});
  closeBtn.addEventListener('click',close);
  wrap.addEventListener('click',function(e){if(e.target===wrap)close()});
  options.forEach(function(option){option.addEventListener('click',function(){setView(option.dataset.view)})});
  document.addEventListener('keydown',function(e){if(e.key==='Escape'&&!wrap.hidden)close()});
}

/* ---------------- main init ---------------- */
export function initApp(){
  var ctx={};
  ctx.charsApi=createCharsApi();
  ctx.chatsApi=createChatsApi();
  initThemeAndAutosize();
  initSettings();
  initEditor(ctx);
  initSenderPicker(ctx);
  initProfile(ctx);
  initChats(ctx);
  return ctx;
}

