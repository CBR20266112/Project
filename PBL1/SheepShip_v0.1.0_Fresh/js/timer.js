let timerValue=60;

let timerInterval=null;

let timerElement=
document.getElementById("timer");

let timerCallback=null;

function initTimer(seconds,callback){

    timerValue=seconds;

    timerCallback=callback;

    updateTimerUI();

}

function updateTimerUI(){

    if(timerElement){

        timerElement.textContent=timerValue;

    }

}

function startTimer(){

    stopTimer();

    timerInterval=setInterval(()=>{

        timerValue--;

        if(timerValue<0){

            timerValue=0;

        }

        updateTimerUI();

        if(timerValue===0){

            stopTimer();

            if(typeof timerCallback==="function"){

                timerCallback();

            }

        }

    },1000);

}

function stopTimer(){

    if(timerInterval){

        clearInterval(timerInterval);

        timerInterval=null;

    }

}
function resetTimer(seconds=60){

    stopTimer();

    timerValue=seconds;

    updateTimerUI();

}

function getTimeLeft(){

    return timerValue;

}

function isTimerRunning(){

    return timerInterval!==null;

}

window.initTimer=initTimer;
window.startTimer=startTimer;
window.stopTimer=stopTimer;
window.resetTimer=resetTimer;
window.getTimeLeft=getTimeLeft;
window.isTimerRunning=isTimerRunning;

window.addEventListener("beforeunload",()=>{

    stopTimer();

});