const beforeSheep=document.getElementById("beforeSheep");
const afterSheep=document.getElementById("afterSheep");

const canvas=document.getElementById("eraseCanvas");
const ctx=canvas.getContext("2d",{willReadFrequently:true});

const clipper=document.getElementById("clipper");

const timerText=document.getElementById("time");
const woolCount=document.getElementById("woolCount");

const progressFill=document.getElementById("progressFill");
const percentText=document.getElementById("percent");

const finishButton=document.getElementById("finishButton");

const BRUSH_RADIUS=36;
const GAME_TIME=60;
const COMPLETE_PERCENT=95;

let timer=null;
let remainTime=GAME_TIME;

let drawing=false;
let completed=false;

let woolPixels=0;
let totalPixels=1;

let rect=null;

function resizeCanvas(){

    rect=beforeSheep.getBoundingClientRect();

    canvas.width=rect.width;
    canvas.height=rect.height;

    canvas.style.width=rect.width+"px";
    canvas.style.height=rect.height+"px";

}

function createWoolLayer(){

    ctx.clearRect(
        0,
        0,
        canvas.width,
        canvas.height
    );

    ctx.fillStyle="#ffffff";

    for(let y=0;y<canvas.height;y+=8){

        for(let x=0;x<canvas.width;x+=8){

            ctx.beginPath();

            ctx.arc(

                x+Math.random()*8,

                y+Math.random()*8,

                4+Math.random()*3,

                0,

                Math.PI*2

            );

            ctx.fill();

        }

    }

    totalPixels=
        canvas.width*
        canvas.height;

}
function updateProgress(){

    const data=ctx.getImageData(

        0,
        0,
        canvas.width,
        canvas.height

    ).data;

    let transparent=0;

    for(let i=3;i<data.length;i+=4){

        if(data[i]===0){

            transparent++;

        }

    }

    woolPixels=transparent;

    const percent=Math.min(

        100,

        (transparent/totalPixels)*100

    );

    progressFill.style.width=
        percent+"%";

    percentText.textContent=
        Math.floor(percent);

    woolCount.textContent=
        Math.floor(percent);

    if(

        percent>=COMPLETE_PERCENT &&

        !completed

    ){

        completed=true;

        finishButton.disabled=false;

    }

}

function erase(x,y){

    ctx.save();

    ctx.globalCompositeOperation=

        "destination-out";

    ctx.beginPath();

    ctx.arc(

        x,

        y,

        BRUSH_RADIUS,

        0,

        Math.PI*2

    );

    ctx.fill();

    ctx.restore();

    updateProgress();

}
function moveClipper(clientX,clientY){

    if(!rect){

        rect=canvas.getBoundingClientRect();

    }

    const x=clientX-rect.left;
    const y=clientY-rect.top;

    clipper.style.left=clientX+"px";
    clipper.style.top=clientY+"px";

    if(drawing){

        erase(x,y);

    }

}

canvas.addEventListener("pointerdown",(e)=>{

    drawing=true;

    moveClipper(

        e.clientX,

        e.clientY

    );

});

canvas.addEventListener("pointermove",(e)=>{

    moveClipper(

        e.clientX,

        e.clientY

    );

});

window.addEventListener("pointerup",()=>{

    drawing=false;

});

window.addEventListener("pointerleave",()=>{

    drawing=false;

});
function startTimer(){

    stopTimer();

    remainTime=GAME_TIME;

    timerText.textContent=remainTime;

    timer=setInterval(()=>{

        remainTime--;

        if(remainTime<0){

            remainTime=0;

        }

        timerText.textContent=remainTime;

        if(remainTime===0){

            stopTimer();

            drawing=false;

            finishButton.disabled=true;

            alert("시간 종료!");

            location.href="../index.html";

        }

    },1000);

}

function stopTimer(){

    if(timer){

        clearInterval(timer);

        timer=null;

    }

}
function finishGame(){

    stopTimer();

    completed=true;

    drawing=false;

    beforeSheep.style.opacity="0";

    canvas.style.opacity="0";

    setTimeout(()=>{

        beforeSheep.style.display="none";

        canvas.style.display="none";

        afterSheep.style.display="block";

        afterSheep.style.opacity="1";

    },300);

    localStorage.setItem(

        "sheepSheared",

        "true"

    );

    localStorage.setItem(

        "sheepXP",

        "0"

    );

    finishButton.disabled=false;

    finishButton.textContent="메인으로";

}

finishButton.addEventListener("click",()=>{

    if(!completed){

        return;

    }

    location.href="../index.html";

});
function resetGame(){

    completed=false;

    drawing=false;

    woolPixels=0;

    beforeSheep.style.display="block";
    beforeSheep.style.opacity="1";

    afterSheep.style.display="none";
    afterSheep.style.opacity="0";

    canvas.style.display="block";
    canvas.style.opacity="1";

    finishButton.disabled=true;
    finishButton.textContent="완료";

    progressFill.style.width="0%";

    percentText.textContent="0";

    woolCount.textContent="0";

    resizeCanvas();

    createWoolLayer();

    startTimer();

}

window.addEventListener("resize",()=>{

    resizeCanvas();

    createWoolLayer();

    updateProgress();

});
function startGame(){

    resetGame();

    clipper.style.display="block";

    canvas.style.pointerEvents="auto";

}

function moveCursor(e){

    clipper.style.left=e.clientX+"px";

    clipper.style.top=e.clientY+"px";

}

window.addEventListener("pointermove",moveCursor);

window.addEventListener("blur",()=>{

    drawing=false;

});

canvas.addEventListener("contextmenu",(e)=>{

    e.preventDefault();

});

canvas.addEventListener("dragstart",(e)=>{

    e.preventDefault();

});

afterSheep.style.display="none";

finishButton.disabled=true;
window.addEventListener("load",()=>{

    resizeCanvas();

    createWoolLayer();

    updateProgress();

    startGame();

});

window.addEventListener("beforeunload",()=>{

    stopTimer();

});

canvas.addEventListener("pointerup",()=>{

    drawing=false;

});

canvas.addEventListener("pointercancel",()=>{

    drawing=false;

});

canvas.addEventListener("mouseleave",()=>{

    drawing=false;

});

canvas.addEventListener("mouseenter",()=>{

    clipper.style.display="block";

});

finishButton.addEventListener("mouseenter",()=>{

    if(completed){

        finishButton.style.transform="scale(1.04)";

    }

});

finishButton.addEventListener("mouseleave",()=>{

    finishButton.style.transform="scale(1)";

});

updateProgress();