const sheep=document.getElementById("sheep");
const message=document.getElementById("message");
const statusText=document.getElementById("statusText");

const woolBar=document.getElementById("wool");

let sheepXP=Number(localStorage.getItem("sheepXP"))||0;

const growthImages=[
"../assets/sheep/growth/growth_step_01_raw.png",
"../assets/sheep/growth/growth_step_02_raw.png",
"../assets/sheep/growth/growth_step_03_raw.png",
"../assets/sheep/growth/growth_step_04_raw.png",
"../assets/sheep/growth/growth_step_05_raw.png",
"../assets/sheep/growth/growth_step_06_raw.png",
"../assets/sheep/growth/growth_step_07_raw.png",
"../assets/sheep/growth/growth_step_08_raw.png",
"../assets/sheep/growth/growth_step_09_raw.png",
"../assets/sheep/growth/growth_step_10_raw.png"
];

function saveXP(){

    localStorage.setItem("sheepXP",sheepXP);

}

function updateGrowth(){

    let step=Math.floor(sheepXP/100);

    if(step>9) step=9;

    sheep.src=growthImages[step];

    woolBar.style.width=((step+1)*10)+"%";

}

updateGrowth();

function petSheep(){

    sheep.src="../assets/sheep/actions/pet1.png";

    message.textContent="메에~";

    statusText.textContent="행복해하고 있어요.";

    setTimeout(updateGrowth,1000);

}

function feedSheep(){

    sheep.src="../assets/sheep/actions/eat.png";

    message.textContent="냠냠...";

    statusText.textContent="배가 불러졌어요.";

    setTimeout(updateGrowth,1200);

}

function sleepSheep(){

    sheep.src="../assets/sheep/actions/sleep.png";

    message.textContent="드르렁...";

    statusText.textContent="잘 자는 중...";

    sheepXP+=100;

    if(sheepXP>900){

        sheepXP=900;

    }

    saveXP();

    setTimeout(()=>{

        updateGrowth();

        message.textContent="푹 잤어요!";

        statusText.textContent="양털이 자랐어요.";

    },1800);

}

function shearSheep(){

    if(sheepXP<900){

        alert(
            "양털이 아직 덜 자랐어요.\n\n현재 성장 : "
            +(Math.floor(sheepXP/100)+1)
            +"/10 단계"
        );

        return;

    }

    const ok=confirm(
        "양털이 가득 자랐어요!\n\n양털깎기 미니게임을 시작할까요?"
    );

    if(ok){

        location.href="shearing.html";

    }

}

if(localStorage.getItem("sheepSheared")==="true"){

    sheep.src="../assets/sheep/shearing/after.png";

    woolBar.style.width="0%";

    message.textContent="시원해졌어요!";

    statusText.textContent="양털을 모두 깎았어요.";

    localStorage.removeItem("sheepSheared");

    sheepXP=0;

    saveXP();

}

sheep.addEventListener("click",()=>{

    sheep.style.animation="bounce .5s";

    setTimeout(()=>{

        sheep.style.animation="float 3s ease-in-out infinite";

    },500);

});