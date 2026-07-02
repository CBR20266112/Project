const woolPool=[];

function addWoolScore(value){

    game.score+=value;

    if(game.score>game.target){

        game.score=game.target;

    }

    updateUI();

}

function createWool(x,y,radius){

    const wool={

        x:x,
        y:y,

        r:radius,

        removed:false,

        alpha:1,

        shrink:0

    };

    woolPool.push(wool);

    return wool;

}

function resetWoolPool(){

    woolPool.length=0;

}

function generateCircleWool(){

    resetWoolPool();

    const count=game.target;

    for(let i=0;i<count;i++){

        const angle=Math.random()*Math.PI*2;

        const distance=
        Math.random()*(sheep.radius-18);

        createWool(

            sheep.x+Math.cos(angle)*distance,

            sheep.y+Math.sin(angle)*distance,

            10+Math.random()*7

        );

    }

    return woolPool;

}
function updateWoolPool(){

    for(const wool of woolPool){

        if(!wool.removed) continue;

        wool.shrink+=0.8;

        wool.alpha-=0.04;

        if(wool.alpha<0){

            wool.alpha=0;

        }

    }

}

function drawWoolPool(ctx){

    for(const wool of woolPool){

        if(wool.alpha<=0) continue;

        ctx.save();

        ctx.globalAlpha=wool.alpha;

        ctx.beginPath();

        ctx.arc(

            wool.x,

            wool.y,

            Math.max(0,wool.r-wool.shrink),

            0,

            Math.PI*2

        );

        ctx.fillStyle="#ffffff";

        ctx.fill();

        ctx.strokeStyle="#dddddd";

        ctx.lineWidth=2;

        ctx.stroke();

        ctx.restore();

    }

}

function clipWoolAt(x,y,radius){

    let clipped=0;

    for(const wool of woolPool){

        if(wool.removed) continue;

        const dx=x-wool.x;

        const dy=y-wool.y;

        if(Math.hypot(dx,dy)<=radius+wool.r){

            wool.removed=true;

            clipped++;

        }

    }

    if(clipped>0){

        addWoolScore(clipped);

    }

    return clipped;

}
function removeHiddenWool(){

    for(let i=woolPool.length-1;i>=0;i--){

        if(woolPool[i].alpha<=0){

            woolPool.splice(i,1);

        }

    }

}

function remainingWool(){

    let remain=0;

    for(const wool of woolPool){

        if(!wool.removed){

            remain++;

        }

    }

    return remain;

}

function allWoolRemoved(){

    return remainingWool()===0;

}

window.generateCircleWool=generateCircleWool;
window.updateWoolPool=updateWoolPool;
window.drawWoolPool=drawWoolPool;
window.clipWoolAt=clipWoolAt;
window.remainingWool=remainingWool;
window.allWoolRemoved=allWoolRemoved;
window.removeHiddenWool=removeHiddenWool;
window.resetWoolPool=resetWoolPool;