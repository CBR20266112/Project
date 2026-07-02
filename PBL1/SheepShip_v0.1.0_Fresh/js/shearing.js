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