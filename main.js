import './src/styles/style.css';
import './src/styles/responsive.css';
import './src/styles/settings.css';
import './src/styles/chat-features.css';
import { appHtml, initApp } from './app.js';

document.getElementById('app').innerHTML = appHtml;

async function start(){
  const ctx = initApp();
  let remoteState = null;
  try {
    const response = await fetch('/api/state');
    if (response.ok) remoteState = await response.json();
  } catch (error) {
    console.warn('Remote state is unavailable', error);
  }

  if (remoteState) {
    ctx.charsApi.load(remoteState);
    ctx.chatsApi.load(remoteState);
  }

  let saveTimer;
  function saveState(){
    clearTimeout(saveTimer);
    saveTimer = setTimeout(async function(){
      try {
        await fetch('/api/state', {
          method: 'PUT',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({...ctx.charsApi.snapshot(), ...ctx.chatsApi.snapshot()})
        });
      } catch (error) {
        console.warn('Remote state could not be saved', error);
      }
    }, 250);
  }

  ctx.charsApi.subscribe(saveState);
  ctx.chatsApi.subscribe(saveState);
  if (!remoteState) saveState();
}

start();

