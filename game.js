"use strict";
const translations="comunidad|especial|pueblo|juntos|mercado|zona residencial a las afueras|centro de la ciudad|antiguo|moderno|asombroso|estrecho|enorme|delicioso|perfecto|puerto|transbordador|multitud|cable|automóvil|dormir|nadar|pregunta|deporte|investigación|sonrisa|hambriento|serio|llorar|enorme|analizar|emocionado|reír|explorar|enojado|con miedo|amigos|béisbol|ciudad|juegos|comida|energía|alimentación habitual|grasa|nutritivo|sabroso|proteína|poco saludable|horarios de comida|baloncesto|navegación a vela|carrera|entrenamiento|cascada|rescatar|recuerdo de un viaje|fogata|cultura|galería|feo|colorido|pintura|contaminación|selva tropical|calabaza|palomitas|mantequilla|limón|hipótesis|azul|flor|rana|miel|océano|hielo|niño|aceite|brillar|tormenta|vidrio|ventana|nieve|nido|vaca|plástico|cuidadoso|círculo|propósito|materiales|jungla|tenedor|caballo|procedimiento|conclusión|lunes|junio|domingo|octubre|martes|resultado|viernes|hija|casco|malteada|pirata|minuto|opinión|predicción|museo|pingüino|montaña".split("|");
const tips={community:"Fíjate en la doble m.",unhealthy:"Se construye con un + healthy: un cambia el significado.",basketball:"Dos partes: basket + ball. Al final hay doble l.",rainforest:"Dos partes: rain + forest.",waterfall:"Dos partes: water + fall. Al final hay doble l.",campfire:"Dos partes: camp + fire.",milkshake:"Dos partes: milk + shake.",popcorn:"Dos partes: pop + corn.",snow:"Al final va ow.",flower:"Recuerda el grupo ow.",prediction:"Observa la terminación tion.",pollution:"Hay doble l y termina en tion.",question:"Observa la terminación tion.",conclusion:"Observa la terminación sion.",hypothesis:"Mira con calma la y y el grupo th.",daughter:"Recuerda el grupo gh.",friends:"Fíjate en el orden: i antes de e.",protein:"Fíjate en el orden: e antes de i."};
const words=raw.map((w,i)=>({id:i+1,word:w[0].toLowerCase(),display:w[0],hint:w[1],icon:w[2],meaning:translations[i]}));
const KEY="bee-family-v1",LEGACY="riky-spelling-v2",DAY=86400000;
const $=id=>document.getElementById(id);
const esc=s=>String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const dateKey=(t=Date.now())=>{const d=new Date(t);return `${d.getFullYear()}-${d.getMonth()+1}-${d.getDate()}`};
const uid=()=>crypto.randomUUID();
const blankProfile=(name)=>({id:uid(),name:name.trim().slice(0,24),xp:0,records:{},history:[],onboarded:false,created:Date.now()});
function migrate(old){const p=blankProfile("Riky");p.xp=Number(old.xp)||0;for(const [id,r] of Object.entries(old.learning||{})){if(!words.some(w=>w.id===+id))continue;p.records[id]={exposed:0,due:Date.now(),streak:0,historyDays:[],practices:r.practices||0,needsReview:!!old.mistakes?.[id]}}return p}
function readStore(){try{const data=JSON.parse(localStorage.getItem(KEY)||"null");if(data?.version===1&&Array.isArray(data.profiles))return data;
const old=JSON.parse(localStorage.getItem(LEGACY)||"null");if(old){const p=migrate(old);return {version:1,active:p.id,profiles:[p]}}}catch{}return {version:1,active:null,profiles:[]}}
let db=readStore(),screen="home",round=null,attempt=null,oral=null,noticeTimer,utteranceId=0;
const profile=()=>db.profiles.find(p=>p.id===db.active)||null;
function save(){try{localStorage.setItem(KEY,JSON.stringify(db));return true}catch{notice("No pudimos guardar. Descarga una copia desde Para papás.");return false}}
function record(p,id){return p.records[id]||(p.records[id]={exposed:0,due:Date.now(),streak:0,historyDays:[],practices:0,needsReview:false})}
function mastered(p){return Object.values(p.records).filter(r=>r.streak>=2&&!r.needsReview).length}
function status(p,id){const r=p.records[id];return !r?"Nueva":r.needsReview?"Necesita repaso":r.streak>=2?"Recordada en varios días":r.streak===1?"Recordada sin ayuda":"En práctica"}
function shuffle(a){const b=[...a];for(let i=b.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[b[i],b[j]]=[b[j],b[i]]}return b}
function plan(p,now=Date.now()){
  const due=words.filter(w=>p.records[w.id]&&p.records[w.id].due<=now).sort((a,b)=>p.records[a.id].due-p.records[b.id].due).slice(0,5);
  const fresh=words.filter(w=>!p.records[w.id]||p.records[w.id].practices===0).filter(w=>!due.some(d=>d.id===w.id)).slice(0,3);
  const queue=[...due.map(w=>({id:w.id,type:p.records[w.id].practices?"dict":"learn"})),...fresh.map(w=>({id:w.id,type:"learn"}))];
  if(!queue.length){const upcoming=words.filter(w=>p.records[w.id]).sort((a,b)=>p.records[a.id].due-p.records[b.id].due).slice(0,3);return upcoming.map(w=>({id:w.id,type:"dict"}))}
  return queue;
}
function stopAudio(){utteranceId++;if(window.speechSynthesis)window.speechSynthesis.cancel()}
let instructionVoice="";
try{instructionVoice=localStorage.getItem("bee-instruction-voice")||""}catch{}
function spanishVoices(){return (window.speechSynthesis?.getVoices()||[]).filter(v=>/^es(?:[-_]|$)/i.test(v.lang))}
function voiceRank(v){
 const feminine=/paulina|m[oó]nica|marisol|angelica|ang[eé]lica|dalia|sabina|helena|elvira|laura|lucia|lucía|female|mujer/i.test(v.name);
 return (feminine?100:0)+(/natural|neural|premium|enhanced/i.test(v.name)?40:0)+(/^es[-_]MX$/i.test(v.lang)?20:0)+(!v.localService?5:0);
}
function selectedInstructionVoice(){
 const voices=spanishVoices();
 return voices.find(v=>v.voiceURI===instructionVoice)||voices.sort((a,b)=>voiceRank(b)-voiceRank(a))[0];
}
function voiceSettings(){return `<section class="card"><h2>La voz de las instrucciones</h2><p>Buscamos primero una voz femenina. Escucha las opciones y elige la que más te guste.</p><label for="instructionVoice">Voz en español</label><select id="instructionVoice" class="wide"></select><div class="row" style="margin-top:12px"><button class="audio" data-action="preview-voice">🔊 Probar voz</button><button class="quiet" data-action="stop-audio">Detener</button></div><p class="small">Las voces y su calidad dependen del celular o tablet. Tu elección se guarda en este navegador.</p></section>`}
function refreshVoiceOptions(){
 const select=$("instructionVoice");if(!select)return;
 const voices=spanishVoices().sort((a,b)=>voiceRank(b)-voiceRank(a)),chosen=selectedInstructionVoice();
 select.innerHTML=`<option value="">Automática${chosen?" · "+esc(chosen.name):""}</option>`+voices.map(v=>`<option value="${esc(v.voiceURI)}">${esc(v.name)} · ${esc(v.lang)}</option>`).join("");
 select.value=voices.some(v=>v.voiceURI===instructionVoice)?instructionVoice:"";
}
if(window.speechSynthesis?.addEventListener)window.speechSynthesis.addEventListener("voiceschanged",refreshVoiceOptions);
function say(text,lang="es-MX",spell=false){
  stopAudio();if(!window.speechSynthesis||!window.SpeechSynthesisUtterance){notice("No hay voz disponible. Las instrucciones también están escritas.");return}
  const u=new SpeechSynthesisUtterance(text),id=utteranceId;u.lang=lang;u.rate=spell?.65:lang.startsWith("es")?1:.85;u.pitch=1;
  const voices=window.speechSynthesis.getVoices(),v=lang.startsWith("es")?selectedInstructionVoice():voices.find(v=>v.lang===lang)||voices.find(v=>v.lang.startsWith(lang.slice(0,2)));if(v){u.voice=v;u.lang=v.lang}
  u.onerror=e=>{if(id===utteranceId&&!["canceled","interrupted"].includes(e.error))notice("No se pudo escuchar. Revisa el volumen o prueba otro navegador.")};
  window.speechSynthesis.speak(u);
}
function notice(t){clearTimeout(noticeTimer);$("notice").textContent=t;noticeTimer=setTimeout(()=>$("notice").textContent="",6000)}
const instructions={
  start:"Hola. Vamos a aprender juntos. Primero escucha y conoce una palabra. Después inténtala sin mirar. Si te equivocas, te enseñamos cómo se escribe. Otro día volverá para que recuerdes. Pide a un adulto que te acompañe al principio.",
  learn:"Toca escuchar palabra. Mira cómo se escribe y qué significa. Observa la parte amarilla. Cuando estés listo, toca ocultar y practicar. No tienes que hacerlo rápido.",
  dict:"Toca escuchar palabra. Escribe en inglés lo que escuchas y toca comprobar. Puedes volver a escuchar. Si necesitas ayuda, toca primera letra. Los errores sirven para aprender.",
  complete:"Escucha la palabra. Toca la letra que falta en el primer signo de interrogación. Puedes usar una letra más de una vez. Continúa hasta completar la palabra.",
  correction:"Mira tu respuesta y la palabra correcta. Revisa qué letra falta, sobra o cambió. Toca ocultar y reintentar para volver a escribirla sin mirar.",
  oral:"Necesitas a un adulto. Escucha la palabra y di sus letras en inglés sin mirar la pantalla. Después pasa el dispositivo a tu tutor. El adulto revisará la respuesta y registrará cómo te fue. La aplicación no está escuchando tu voz.",
  parents:"Acompaña sin dar la respuesta. Deja que tu hijo escuche y lo intente. Si se equivoca, lean la corrección juntos. Los puntos son por practicar. Recordar una palabra días después es otra medida. En práctica oral, tú revisas el deletreo.",
};
const audioButton=(key)=>`<button class="audio" data-audio="${key}">🔊 Escuchar instrucciones</button>`;
function setContent(html){$("content").innerHTML=html;$("profileButton").textContent=profile()?`🧢 ${profile().name}`:"Elegir perfil";document.querySelectorAll(".bottom button").forEach(b=>b.classList.toggle("active",b.dataset.screen===screen))}
function go(dest){
  if(round&&screen==="practice"&&dest!=="practice"&&!confirm("¿Salir de la sesión? Tus respuestas ya registradas se conservan."))return;
  stopAudio();screen=dest;round=null;attempt=null;oral=null;render();window.scrollTo(0,0);
}
function render(){if(screen==="home")home();if(screen==="parents")parents();if(screen==="library")library();if(screen==="help")help()}
function home(){
 const p=profile();
 if(!p){setContent(`<section class="card welcome"><div class="eyebrow">Spelling Bee · En familia</div><h1>Una palabra a la vez 🐝</h1><p>Aprende las 110 palabras con ayuda de tu familia.</p><button class="primary wide" data-action="profiles">Crear mi perfil</button></section>${intro()}`);return}
 const queue=plan(p),done=new Set(p.history.filter(h=>dateKey(h.at)===dateKey()).map(h=>h.wordId)).size;
 setContent(`<section class="card welcome"><div class="eyebrow">Tu práctica de hoy</div><h1>¡Hola, ${esc(p.name)}!</h1><p>Escucha, aprende e inténtalo. Aquí puedes equivocarte y volver a probar.</p><div class="chips"><span class="chip">🐝 ${queue.length} palabras</span><span class="chip">⏱️ A tu ritmo</span><span class="chip">⭐ ${p.xp} XP</span></div><button class="primary wide" data-action="start">Empezar mi práctica →</button><p class="small">Unos 10 minutos. Puedes parar antes.</p></section>${!p.onboarded?intro():`<div class="row">${audioButton("start")}<button class="quiet" data-action="guide">¿Cómo se juega?</button></div>`}
 <section class="card"><h2>Pequeños pasos, gran avance</h2><p>${done} palabras practicadas hoy · ${mastered(p)} recordadas en varios días</p><div class="progress"><i style="width:${mastered(p)/110*100}%"></i></div><p class="small">Practicar con pistas también ayuda. El recuerdo se comprueba después, sin pistas.</p><div class="badges">${p.history.length?"<span>🌱 Primeros pasos</span>":""}${p.xp>=100?"<span>⭐ 100 XP</span>":""}${mastered(p)>=10?"<span>🍯 10 palabras recordadas</span>":""}</div></section>
 <section class="card"><h2>También pueden practicar juntos</h2><p>Un adulto escucha el deletreo y revisa la respuesta.</p><button class="secondary wide" data-action="oral-start">🎤 Deletrear con mi tutor</button></section>`);
}
function intro(){return `<section class="card"><h2>Así de sencillo</h2><ol class="steps"><li><strong>Escucha y conoce</strong>Mira la palabra y descubre qué significa.</li><li><strong>Inténtala sin mirar</strong>Escríbela. Si te equivocas, revisa y vuelve a intentar.</li><li><strong>Recuerda otro día</strong>La app te propone cuándo repasarla.</li></ol>${audioButton("start")}<p class="tip">Papás: acompañen la primera sesión. El botón azul lee las instrucciones en español; “Escuchar palabra” usa inglés.</p></section>`}
function begin(kind="daily",id=null){
 if(!profile()){showProfiles();return}
 const p=profile();p.onboarded=true;save();screen="practice";stopAudio();
 if(kind==="oral"){const candidates=shuffle(words.filter(w=>p.records[w.id]?.practices));round={queue:(candidates.length?candidates:words.slice(0,5)).slice(0,5).map(w=>({id:w.id,type:"oral"})),index:0,results:[]};}
 else round={queue:id?[{id,type:kind==="complete"?"complete":"learn"}]:plan(p),index:0,results:[]};
 task();
}
function currentWord(){return words.find(w=>w.id===round.queue[round.index].id)}
function task(){
 stopAudio();const item=round.queue[round.index],p=profile(),w=currentWord(),r=record(p,w.id);
 attempt={token:uid(),type:item.type,help:item.type!=="dict",errors:0,solved:false,phase:"answer",independent:!r.exposed||Date.now()-r.exposed>=DAY,blanks:[],at:0};
 oral=null;
 if(item.type==="learn"){r.exposed=Date.now();save();learn(w)}
 if(item.type==="dict")dict(w);
 if(item.type==="complete")complete(w);
 if(item.type==="oral")oralTask(w);
 window.scrollTo(0,0);
}
function shell(title,content,key){return `<section class="card task"><div class="row spread"><span class="chip">${round.index+1} de ${round.queue.length}</span><button class="quiet" data-screen="home">Salir</button></div><h1>${title}</h1>${audioButton(key)}${content}</section>`}
function wordAudio(){return `<button class="primary" data-action="word-audio">🔊 Escuchar palabra</button>`}
function tip(w){return tips[w.word]||(/^[A-Z]/.test(w.display)?"Los días, meses y nombres propios se escriben con mayúscula en inglés.":`Observa todas las letras en orden: ${w.display.split("").join(" · ")}.`)}
function learn(w){setContent(shell("Conoce la palabra",`<div class="taskIcon">${w.icon}</div><div class="word">${w.display}</div><p><strong>${w.meaning}</strong></p>${wordAudio()}<p class="small">${w.hint}</p><div class="word-parts"><strong>Fíjate en esto</strong><br>${tip(w)}</div><div class="row actions" style="margin-top:16px"><button class="primary" data-action="hide-learn">Ocultar y practicar →</button><button class="secondary" data-action="spell-audio">Escuchar el deletreo</button></div><button class="quiet" data-action="complete-help">Necesito ayuda: completar letras</button>`,"learn"))}
function dict(w){setContent(shell("Escucha y escribe",`<div class="taskIcon">🎧</div><p>Escucha la palabra en inglés y escribe lo que oyes.</p>${wordAudio()}<label for="answer" class="small">Mi respuesta</label><input class="task-input" id="answer" autocomplete="off" autocapitalize="none" autocorrect="off" spellcheck="false" maxlength="40" enterkeyhint="done"><div class="feedback" id="feedback" role="status" aria-live="polite"></div><div class="row actions"><button class="primary" id="check" data-action="check">Comprobar ✓</button><button id="hint" data-action="hint">Primera letra</button><button class="quiet" data-action="skip">Pasar por ahora</button></div>`,"dict"))}
function difference(a,b){
 const d=Array.from({length:a.length+1},()=>Array(b.length+1).fill(0));for(let i=0;i<=a.length;i++)d[i][0]=i;for(let j=0;j<=b.length;j++)d[0][j]=j;
 for(let i=1;i<=a.length;i++)for(let j=1;j<=b.length;j++)d[i][j]=Math.min(d[i-1][j]+1,d[i][j-1]+1,d[i-1][j-1]+(a[i-1]===b[j-1]?0:1));
 let i=a.length,j=b.length,out=[];while(i||j){if(i&&j&&a[i-1]===b[j-1]){i--;j--}else if(j&&d[i][j]===d[i][j-1]+1){out.push(`Falta ${b[j-1].toUpperCase()} en la posición ${j}.`);j--}else if(i&&d[i][j]===d[i-1][j]+1){out.push(`Sobra ${a[i-1].toUpperCase()} en tu respuesta.`);i--}else{out.push(`En la posición ${j} va ${b[j-1].toUpperCase()}, en lugar de ${a[i-1].toUpperCase()}.`);i--;j--}}
 return out.reverse().slice(0,3).join(" ");
}
function logResult(p,w,kind,clean,errors,now=Date.now()){
 const r=record(p,w.id);r.practices++;p.xp+=clean?15:5;
 if(kind==="dict"&&clean){const dk=dateKey(now);if(!r.historyDays.includes(dk)){r.historyDays.push(dk);r.streak++}r.needsReview=false;r.due=now+(r.streak===1?1:r.streak===2?3:7)*DAY;}
 else if(kind!=="oral"){r.due=now+DAY;if(errors)r.needsReview=true}
 else if(!clean){r.needsReview=true;r.streak=0;r.due=now+DAY}
 r.exposed=now;p.history.push({at:now,wordId:w.id,kind,clean,errors});
}
function completeAttempt(kind,clean){
 if(attempt.solved)return;attempt.solved=true;logResult(profile(),currentWord(),kind,clean,attempt.errors);save();
 round.results.push({id:currentWord().id,kind,clean});return true;
}
function markMistake(){const r=record(profile(),currentWord().id);r.needsReview=true;r.streak=0;r.due=Date.now();r.exposed=Date.now();save()}
function check(){
 if(!round||attempt.type==="oral"||attempt.solved)return;
 const w=currentWord();
 if(attempt.phase==="correction"){attempt.phase="answer";$("answer").disabled=false;$("answer").value="";$("feedback").textContent="Ahora inténtala sin mirar.";$("check").textContent="Comprobar ✓";$("answer").focus();return}
 const typed=$("answer").value.trim().toLowerCase();if(!typed){$("feedback").textContent="Escribe tu respuesta primero.";return}
 if(typed===w.word){
  const clean=attempt.type==="dict"&&attempt.independent&&!attempt.help&&!attempt.errors;
  completeAttempt("dict",clean);$("answer").disabled=true;$("hint").disabled=true;$("check").disabled=true;
  $("feedback").className="feedback good";$("feedback").innerHTML=`<strong>¡Bien hecho! +${clean?15:5} XP</strong><p>${clean?"Lo recordaste sin ayuda.":"Buen entrenamiento. Otro día comprobaremos si la recuerdas."}</p><button class="primary wide" data-action="next">Continuar →</button>`;
 }else{
  attempt.errors++;attempt.help=true;attempt.phase="correction";markMistake();$("answer").disabled=true;$("hint").disabled=true;
  $("feedback").innerHTML=`<strong>Vamos a revisarla juntos</strong><p>Tu respuesta: ${esc(typed)}</p><div class="answer">${w.display}</div><p>${esc(difference(typed,w.word))}</p><button class="audio" data-audio="correction">🔊 Escuchar cómo continuar</button>`;
  $("check").textContent="Ocultar y reintentar";
 }
}
function complete(w){
 record(profile(),w.id).exposed=Date.now();save();attempt.help=true;
 attempt.blanks=shuffle([...w.word].map((_,i)=>i).filter(i=>i>0)).slice(0,w.word.length>5?3:1).sort((a,b)=>a-b);
 const options=new Set(attempt.blanks.map(i=>w.word[i]));for(const c of shuffle("abcdefghijklmnopqrstuvwxyz".split(""))){if(options.size>=7)break;options.add(c)}
 setContent(shell("Completa las letras",`<div class="taskIcon">${w.icon}</div>${wordAudio()}<div class="slots">${w.word.split("").map((c,i)=>`<span id="slot-${i}" class="slot ${attempt.blanks.includes(i)?"blank":""}">${attempt.blanks.includes(i)?"?":c.toUpperCase()}</span>`).join("")}</div><div class="letters">${shuffle([...options]).map(c=>`<button class="letter" data-letter="${c}">${c.toUpperCase()}</button>`).join("")}</div><div class="feedback" id="feedback" role="status"></div><button class="quiet" data-action="skip">Pasar por ahora</button>`,"complete"));
}
function choose(letter){
 if(!attempt||attempt.type!=="complete"||attempt.solved)return;const w=currentWord(),pos=attempt.blanks[attempt.at];
 if(w.word[pos]!==letter){attempt.errors++;markMistake();$("feedback").textContent="Vuelve a escuchar y prueba otra letra.";return}
 $("slot-"+pos).textContent=letter.toUpperCase();$("slot-"+pos).className="slot done";attempt.at++;
 if(attempt.at===attempt.blanks.length){completeAttempt("complete",false);$("feedback").className="feedback good";$("feedback").innerHTML='<strong>¡Completada! +5 XP de práctica.</strong><p>Después prueba la palabra completa en dictado.</p><button class="primary wide" data-action="next">Continuar →</button>'}
}
function oralTask(w){
 oral={revealed:false};setContent(shell("Deletrea con tu tutor",`<div class="taskIcon">🎤</div><p>Escucha y di las letras en inglés. Mantén la respuesta oculta.</p>${wordAudio()}<div class="callout">No usamos el micrófono. Tu tutor escucha y revisa.</div><button class="secondary wide" data-action="oral-reveal">Pasar al tutor para revisar</button><button class="quiet" data-action="skip">Pasar por ahora</button>`,"oral"))
}
function oralReveal(){
 if(!oral||oral.revealed)return;oral.revealed=true;record(profile(),currentWord().id).exposed=Date.now();save();const w=currentWord();
 setContent(shell("Ahora revisa el tutor",`<p>Antes de mostrar la respuesta, el niño debe haber terminado de deletrear.</p><div class="word">${w.display}</div><p class="answer">${w.word.toUpperCase().split("").join(" · ")}</p><button class="audio" data-action="spell-audio">Escuchar deletreo</button><p>¿Cómo lo hizo?</p><div class="row actions"><button class="primary" data-action="oral-good">Correcto sin ayuda</button><button class="secondary" data-action="oral-help">Con ayuda / por practicar</button></div><p class="tip">Se guardará como revisión del tutor, separada del dictado automático.</p>`,"parents"))
}
function oralResult(clean){if(!round||!attempt||!oral?.revealed||attempt.solved)return;completeAttempt("oral",clean);next()}
function skip(){if(!round)return;if(attempt.solved){next();return}const r=record(profile(),currentWord().id);r.needsReview=true;r.due=Date.now();save();round.results.push({id:currentWord().id,kind:"skip",clean:false});next()}
function next(){
 if(!round)return;stopAudio();round.index++;if(round.index>=round.queue.length){const results=round.results;round=null;attempt=null;screen="summary";const practiced=results.filter(r=>r.kind!=="skip").length;
 setContent(`<section class="card task"><div class="taskIcon">🎉</div><h1>¡Terminaste tu ronda!</h1><p>Practicaste ${practiced} de ${results.length} palabras.</p><p>${results.filter(r=>r.clean&&r.kind==="dict").length} recordadas sin ayuda en dictado · ${results.filter(r=>r.kind==="oral").length} revisadas por tu tutor.</p><div class="callout">Volver otro día ayuda a recordar. ¡Por hoy puedes descansar!</div><button class="primary wide" data-screen="home">Volver al inicio</button><button class="quiet" data-screen="parents">Ver avance con mi tutor</button></section>`);return}task();
}
function parents(){
 const p=profile();if(!p){setContent('<section class="card"><h1>Para papás</h1><p>Crea un perfil para comenzar.</p><button data-action="profiles">Crear perfil</button></section>');return}
 const auto=p.history.filter(h=>h.kind==="dict"),clean=auto.filter(h=>h.clean).length,oralCount=p.history.filter(h=>h.kind==="oral").length,helpCount=p.history.filter(h=>!h.clean).length;
 const trouble=words.filter(w=>p.records[w.id]?.needsReview).slice(0,15);
 setContent(`<section class="card"><div class="eyebrow">Acompañamiento familiar</div><h1>El avance de ${esc(p.name)}</h1>${audioButton("parents")}<p>Los puntos celebran la práctica. El recuerdo sin ayuda y la revisión oral se muestran por separado.</p><div class="summary-stats"><div><b>${clean}</b><span>dictados recordados sin ayuda</span></div><div><b>${helpCount}</b><span>prácticas con apoyo</span></div><div><b>${oralCount}</b><span>revisiones del tutor</span></div></div><p class="small">Son intentos, no palabras distintas. ${mastered(p)} palabras recordadas en al menos dos días, con separación mínima de 24 horas desde la exposición anterior.</p></section>
 <section class="card"><h2>¿Cómo lo acompaño?</h2><ol class="steps"><li>Deja que escuche y responda antes de ayudar.</li><li>Si se equivoca, lean la corrección sin regaños ni prisa.</li><li>Si le cuesta el teclado, usa el modo oral contigo.</li><li>Cierren cuando esté cansado. Una sesión corta está bien.</li></ol><button class="primary wide" data-action="oral-start">Deletrear juntos</button></section>
 <section class="card"><h2>Palabras para acompañar</h2><p class="small">Aquí no mostramos la respuesta para preparar un dictado sin verla antes.</p><div class="grid">${trouble.length?trouble.map(w=>`<button class="tile" data-review="${w.id}">Palabra #${w.id}<small>Escuchar y practicar</small></button>`).join(""):"<p>No hay retos pendientes.</p>"}</div><details><summary>¿Cómo se decide el repaso?</summary><p>Primero van los pendientes más antiguos. Después se agregan hasta tres palabras nuevas. Tras recordar una palabra sin ayuda, se propone repasarla en 1, 3 y luego 7 días. Un error programa más práctica, pero conserva el historial.</p></details></section>
 <section class="card"><h2>Conservar el avance</h2><p>Este piloto guarda perfiles en este navegador. No se sincronizan automáticamente. Descarga una copia para conservarla o llevarla a otra tablet.</p><button data-action="export">Descargar copia de ${esc(p.name)}</button><label for="importFile">Importar una copia</label><input id="importFile" type="file" accept=".json,application/json"><p class="small">Se agrega como otro perfil; no reemplaza los existentes. La copia contiene el apodo y el historial de práctica.</p></section>`);
}
const faqs=[
 ["¿Qué hacemos el primer día?","Crea un perfil con un apodo. Acompaña al niño y toca Empezar mi práctica. Escuchen las instrucciones en español. No necesita conocer los botones de antemano."],
 ["¿Por qué hay dos botones de audio?","Escuchar instrucciones explica la tarea en español. Escuchar palabra dice la palabra en inglés. Puedes repetir ambos las veces que necesites."],
 ["¿Qué pasa si se equivoca?","La app muestra la palabra correcta y qué letra falta, sobra o cambia. Lean juntos y luego oculten la respuesta para reintentar. No se pierden vidas."],
 ["¿Por qué acertó pero no cuenta como recordada?","Si recibió pistas, vio la palabra hace menos de 24 horas o corrigió un error, cuenta como práctica. Para comprobar recuerdo se necesita un dictado correcto al primer intento, sin ayuda y después de ese intervalo."],
 ["¿La app escucha la voz del niño?","Todavía no. En Deletrear con mi tutor, el adulto escucha y revisa. Esos resultados se registran aparte de los dictados."],
 ["¿Cuánto tiempo practicamos?","Empiecen con unos 10 minutos y ajusten según el niño. Pueden terminar antes si está cansado. No hay cronómetro ni obligación de acabar todas las palabras."],
 ["No escucho nada. ¿Qué hago?","Toca un botón de audio, sube el volumen multimedia y revisa audífonos o Bluetooth. Las voces dependen del navegador y del dispositivo. Si falla, prueba otro navegador; las instrucciones también se pueden leer."],
 ["¿Pueden usarlo dos hermanos?","Sí. Toca el apodo de arriba y crea otro perfil. Cada perfil guarda su avance por separado. En un dispositivo compartido, recuerda elegir el perfil correcto."],
 ["¿Podemos pasar del celular a la tablet?","Sí, con una copia manual. En Para papás descarga el avance y abre ese archivo desde Importar una copia en el otro dispositivo. No hay sincronización automática."],
 ["¿Los demás papás ven nuestros resultados?","No se envían a un panel del salón. Se guardan en este navegador. Cualquier persona que use este mismo navegador puede cambiar de perfil; no es un acceso con contraseña."],
];
function help(){setContent(voiceSettings()+`<section class="card"><div class="eyebrow">Una mano cuando la necesiten</div><h1>¿Tienen dudas?</h1><p>Abran una pregunta para leerla o escucharla.</p>${faqs.map(([q,a],i)=>`<details><summary>${q}</summary><p>${a}</p><button class="audio" data-faq="${i}">🔊 Escuchar respuesta</button></details>`).join("")}<button class="quiet" data-action="stop-audio">Detener audio</button></section>`);refreshVoiceOptions()}
function library(query=""){
 const p=profile();setContent(`<section class="card"><h1>Las 110 palabras</h1><p>Elige una para conocerla y practicar. Abrir esta lista no cambia tu avance.</p><label for="searchWords">Buscar palabra</label><input class="wide" id="searchWords" type="search" value="${esc(query)}" placeholder="Escribe una palabra"><div class="grid library" id="wordGrid" style="margin-top:16px">${libraryTiles(query,p)}</div></section>`);
}
function libraryTiles(q,p){return words.filter(w=>w.word.includes(q.trim().toLowerCase())).map(w=>`<button class="tile" data-word="${w.id}"><small>#${w.id} · ${p?status(p,w.id):"Nueva"}</small>${w.display}</button>`).join("")||"<p>No encontramos esa palabra.</p>"}
function showProfiles(){stopAudio();$("profileList").innerHTML=db.profiles.map(p=>`<button class="tile" data-profile="${p.id}">🧢 ${esc(p.name)}${p.id===db.active?" · seleccionado":""}</button>`).join("");$("profiles").showModal()}
function selectProfile(id){if(!db.profiles.some(p=>p.id===id))return;stopAudio();db.active=id;round=null;attempt=null;oral=null;screen="home";save();$("profiles").close();home()}
function exportProfile(){const p=profile();if(!p)return;const blob=new Blob([JSON.stringify({format:"bee-family",version:1,profile:p},null,2)],{type:"application/json"}),url=URL.createObjectURL(blob),a=document.createElement("a");a.href=url;a.download="spelling-bee-avance.json";a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)}
function validateImport(data){
 if(data?.format!=="bee-family"||data.version!==1||!data.profile||typeof data.profile.name!=="string")throw Error("Formato no reconocido.");
 const src=data.profile,p=blankProfile(src.name);if(!p.name)throw Error("Falta el apodo.");
 p.xp=Number.isFinite(src.xp)?Math.max(0,Math.min(1000000,src.xp)):0;p.onboarded=!!src.onboarded;
 if(!Array.isArray(src.history)||src.history.length>100000)throw Error("Historial inválido.");
 p.history=src.history.map(h=>{if(!Number.isFinite(h.at)||h.at<0||!Number.isInteger(h.wordId)||h.wordId<1||h.wordId>110||!["dict","oral","complete"].includes(h.kind)||typeof h.clean!=="boolean")throw Error("Intento inválido.");return {at:h.at,wordId:h.wordId,kind:h.kind,clean:h.clean,errors:Number.isFinite(h.errors)?Math.max(0,h.errors):0}});
 for(const w of words){const r=src.records?.[w.id];if(!r)continue;if(!Array.isArray(r.historyDays)||r.historyDays.length>10000)throw Error("Progreso inválido.");p.records[w.id]={exposed:Number.isFinite(r.exposed)?Math.max(0,r.exposed):0,due:Number.isFinite(r.due)?Math.max(0,r.due):Date.now(),streak:Number.isFinite(r.streak)?Math.max(0,r.streak):0,practices:Number.isFinite(r.practices)?Math.max(0,r.practices):0,historyDays:[...new Set(r.historyDays.filter(d=>typeof d==="string"&&d.length<20))],needsReview:!!r.needsReview}}
 return p;
}
async function importFile(file){if(!file)return;try{if(file.size>5000000)throw Error("La copia supera 5 MB.");const p=validateImport(JSON.parse(await file.text()));db.profiles.push(p);selectProfile(p.id);notice("Copia importada como perfil nuevo.")}catch(e){notice("No se importó: "+e.message)}}
document.addEventListener("click",e=>{
 const b=e.target.closest("button,a");if(!b)return;
 if(b.dataset.screen){e.preventDefault();go(b.dataset.screen);return}
 if(b.dataset.profile){selectProfile(b.dataset.profile);return}
 if(b.dataset.audio){say(instructions[b.dataset.audio]);return}
 if(b.dataset.faq!==undefined){say(faqs[+b.dataset.faq].join(". "));return}
 if(b.dataset.word){begin("learn",+b.dataset.word);return}
 if(b.dataset.review){if(!profile())return;screen="practice";round={queue:[{id:+b.dataset.review,type:"dict"}],index:0,results:[]};task();return}
 if(b.dataset.letter){choose(b.dataset.letter);return}
 switch(b.dataset.action){
 case "profiles":showProfiles();break;
 case "start":begin();break;
 case "guide":stopAudio();setContent(`<button class="secondary" data-screen="home" style="margin-bottom:16px">← Volver al inicio</button>`+intro()+`<button class="primary wide" data-action="start">Empezar mi práctica</button><button class="quiet wide" data-screen="home" style="margin-top:12px">Volver al inicio</button>`);window.scrollTo(0,0);break;
 case "oral-start":begin("oral");break;
 case "word-audio":if(round)say(currentWord().word,"en-US");break;
 case "spell-audio":if(round)say(currentWord().word.split("").join(". ") + ".","en-US",true);break;
 case "hide-learn":attempt.help=true;attempt.type="dict";attempt.independent=false;dict(currentWord());break;
 case "complete-help":attempt.type="complete";complete(currentWord());break;
 case "check":check();break;
 case "hint":if(attempt&&!attempt.solved){attempt.help=true;record(profile(),currentWord().id).exposed=Date.now();save();$("feedback").textContent=`Empieza con ${currentWord().word[0].toUpperCase()}. Esto cuenta como práctica con ayuda.`}break;
 case "next":if(attempt?.solved)next();break;
 case "skip":skip();break;
 case "oral-reveal":oralReveal();break;
 case "oral-good":oralResult(true);break;
 case "oral-help":oralResult(false);break;
 case "export":exportProfile();break;
 case "stop-audio":stopAudio();break;
 case "preview-voice":say("¡Hola! Vamos a aprender juntos. Escucha la palabra, inténtalo con calma y recuerda: equivocarse también es aprender.");break;
 }
});
$("profileButton").onclick=showProfiles;$("closeProfiles").onclick=()=>$("profiles").close();
$("profileForm").onsubmit=e=>{e.preventDefault();const name=$("nickname").value.trim();if(!name)return;const p=blankProfile(name);db.profiles.push(p);$("nickname").value="";selectProfile(p.id)};
document.addEventListener("keydown",e=>{if(e.key==="Enter"&&e.target.id==="answer"&&!e.repeat){e.preventDefault();check()}});
document.addEventListener("input",e=>{if(e.target.id==="searchWords")$("wordGrid").innerHTML=libraryTiles(e.target.value,profile())});
document.addEventListener("change",e=>{if(e.target.id==="importFile")importFile(e.target.files[0]);if(e.target.id==="instructionVoice"){instructionVoice=e.target.value;stopAudio();try{localStorage.setItem("bee-instruction-voice",instructionVoice)}catch{notice("La voz se usará esta sesión, pero no se pudo guardar.")}}});
document.addEventListener("visibilitychange",()=>{if(document.hidden)stopAudio()});
home();
