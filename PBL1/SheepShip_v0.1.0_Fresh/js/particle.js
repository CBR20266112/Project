const particles=[];

function spawnParticles(x,y,count=10){

    for(let i=0;i<count;i++){

        particles.push({

            x:x,

            y:y,

            vx:(Math.random()-0.5)*5,

            vy:(Math.random()-0.5)*5,

            size:3+Math.random()*4,

            life:40,

            alpha:1

        });

    }

}

function updateParticles(ctx){

    for(let i=particles.length-1;i>=0;i--){

        const p=particles[i];

        p.x+=p.vx;
        p.y+=p.vy;

        p.vx*=0.98;
        p.vy*=0.98;

        p.life--;

        p.alpha=p.life/40;

        if(p.life<=0){

            particles.splice(i,1);

            continue;

        }

        ctx.save();

        ctx.globalAlpha=p.alpha;

        ctx.beginPath();

        ctx.arc(

            p.x,

            p.y,

            p.size,

            0,

            Math.PI*2

        );

        ctx.fillStyle="#ffffff";

        ctx.fill();

        ctx.restore();

    }

}
function clearParticles(){

    particles.length=0;

}

function particleCount(){

    return particles.length;

}

window.spawnParticles=spawnParticles;
window.updateParticles=updateParticles;
window.clearParticles=clearParticles;
window.particleCount=particleCount;

window.addEventListener("blur",()=>{

    clearParticles();

});