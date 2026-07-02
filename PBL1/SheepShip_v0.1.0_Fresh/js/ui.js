/*
========================================
 SheepShip UI
========================================
*/

import { state } from "./state.js";
import { sheepMessages } from "./data.js";

/*
========================================
 Render
========================================
*/

export function renderHome(){

    renderPoint();

    renderSheep();

    renderStatus();

    renderSleep();

}

/*
========================================
 Point
========================================
*/

function renderPoint(){

    const point=document.getElementById("point");

    if(!point) return;

    point.textContent=state.sheep.point.toLocaleString();

}

/*
========================================
 Sheep
========================================
*/

function renderSheep(){

    const name=document.getElementById("sheep-name");

    const image=document.getElementById("sheep");

    const message=document.querySelector(".hero-card p");

    if(name){

        name.textContent=state.sheep.name;

    }

    if(image){

        image.src=state.sheep.image;

    }

    if(message){

        const random=Math.floor(

            Math.random()*sheepMessages.length

        );

        message.textContent=sheepMessages[random];

    }

}

/*
========================================
 Status
========================================
*/

function renderStatus(){

    setBar(

        "happy-bar",

        state.sheep.happiness

    );

    setBar(

        "hunger-bar",

        state.sheep.hunger

    );

    setBar(

        "wool-bar",

        state.sheep.wool

    );

}

function setBar(id,value){

    const bar=document.getElementById(id);

    if(!bar) return;

    bar.style.width=value+"%";

}

/*
========================================
 Sleep
========================================
*/

function renderSleep(){

    const text=document.getElementById("sleep-time");

    if(!text) return;

    if(state.sleep.duration===0){

        text.textContent="아직 기록이 없습니다.";

        return;

    }

    text.textContent=

        `${state.sleep.duration}시간 수면`;

}

/*
========================================
 Refresh
========================================
*/

export function refreshUI(){

    renderHome();

}