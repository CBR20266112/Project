const growthImage = document.getElementById("growthImage");

const xpText = document.getElementById("xpText");
const growthText = document.getElementById("growthText");
const woolText = document.getElementById("woolText");

const shearingBtn = document.getElementById("shearingBtn");

const MAX_STEP = 10;
const XP_PER_STEP = 100;
const MAX_XP = XP_PER_STEP * (MAX_STEP - 1);

let sheepXP =
Number(localStorage.getItem("sheepXP")) || 0;

const growthImages = [

"assets/sheep/growth/growth_step_01_raw.png",
"assets/sheep/growth/growth_step_02_raw.png",
"assets/sheep/growth/growth_step_03_raw.png",
"assets/sheep/growth/growth_step_04_raw.png",
"assets/sheep/growth/growth_step_05_raw.png",
"assets/sheep/growth/growth_step_06_raw.png",
"assets/sheep/growth/growth_step_07_raw.png",
"assets/sheep/growth/growth_step_08_raw.png",
"assets/sheep/growth/growth_step_09_raw.png",
"assets/sheep/growth/growth_step_10_raw.png"

];

function save(){

    localStorage.setItem(

        "sheepXP",

        sheepXP

    );

}

function step(){

    return Math.min(

        MAX_STEP-1,

        Math.floor(

            sheepXP / XP_PER_STEP

        )

    );

}

function refresh(){

    const current = step();

    growthImage.src =
    growthImages[current];

    xpText.textContent =
    sheepXP;

    growthText.textContent =
    "STEP " + (current + 1);

    woolText.textContent =
    (current * 100) + "g";

    shearingBtn.disabled =
    current < 9;

}
function addSleepXP(){

    sheepXP += XP_PER_STEP;

    if(sheepXP > MAX_XP){

        sheepXP = MAX_XP;

    }

    save();

    refresh();

}

function resetSheep(){

    sheepXP = 0;

    save();

    refresh();

}

shearingBtn.addEventListener("click",()=>{

    if(step()<9){

        alert("양털이 아직 다 자라지 않았어요.");

        return;

    }

    location.href="pages/shearing.html";

});

window.finishShearing=function(){

    sheepXP = 0;

    save();

    localStorage.setItem(

        "sheepSheared",

        "true"

    );

    refresh();

};

window.resetSheep = resetSheep;
window.addSleepXP = addSleepXP;

if(localStorage.getItem("sheepSheared")==="true"){

    localStorage.removeItem("sheepSheared");

    sheepXP = 0;

    save();

}

refresh();