/*
========================================
 SheepShip App
========================================
*/

import { renderHome, refreshUI } from "./ui.js";

import {

    changeHappiness

} from "./state.js";

import {

    petMessages

} from "./data.js";

const App = {

    init(){

        console.log("SheepShip Start");

        renderHome();

        this.bindEvents();

    },



    bindEvents(){

        this.bindNavigation();

        this.bindSheep();

    },



    bindNavigation(){

        const buttons=document.querySelectorAll(

            ".bottom-nav button"

        );

        buttons.forEach((button,index)=>{

            button.addEventListener("click",()=>{

                console.log(

                    "Navigation :",

                    index

                );

            });

        });

    },



    bindSheep(){

    const sheep=document.getElementById("sheep");

    if(!sheep) return;

    let cooldown=false;

    sheep.addEventListener("click",()=>{

        if(cooldown) return;

        cooldown=true;

        changeHappiness(1);

        refreshUI();

        sheep.classList.add("pet");

        const message=

            petMessages[

                Math.floor(

                    Math.random()*

                    petMessages.length

                )

            ];

        console.log(message);

        setTimeout(()=>{

            sheep.classList.remove("pet");

        },300);

        setTimeout(()=>{

            cooldown=false;

        },500);

    });

}

};

export default App;