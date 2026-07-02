/*
========================================
 SheepShip State
========================================
*/

export const state = {

    sheep: {

        name: "음매",

        level: 1,

        exp: 0,

        happiness: 82,

        hunger: 61,

        wool: 40,

        point: 1250,

        mood: "happy",

        image: "assets/sheep/idle.png"

    },



    sleep: {

        bedtime: null,

        wakeup: null,

        duration: 0,

        quality: 0,

        memo: ""

    },



    inventory: {

        food: 3,

        ribbon: 0,

        dye: 0

    },



    settings: {

        sound: true,

        music: true,

        vibration: true,

        darkMode: true

    }

};



/*
========================================
 Sheep
========================================
*/

export function updateSheep(data){

    Object.assign(state.sheep,data);

}



/*
========================================
 Sleep
========================================
*/

export function updateSleep(data){

    Object.assign(state.sleep,data);

}



/*
========================================
 Inventory
========================================
*/

export function updateInventory(data){

    Object.assign(state.inventory,data);

}



/*
========================================
 Point
========================================
*/

export function addPoint(value){

    state.sheep.point+=value;

}



export function usePoint(value){

    state.sheep.point=

        Math.max(

            0,

            state.sheep.point-value

        );

}



/*
========================================
 Happiness
========================================
*/

export function changeHappiness(value){

    state.sheep.happiness=

        Math.max(

            0,

            Math.min(

                100,

                state.sheep.happiness+value

            )

        );

}



/*
========================================
 Hunger
========================================
*/

export function changeHunger(value){

    state.sheep.hunger=

        Math.max(

            0,

            Math.min(

                100,

                state.sheep.hunger+value

            )

        );

}



/*
========================================
 Wool
========================================
*/

export function changeWool(value){

    state.sheep.wool=

        Math.max(

            0,

            Math.min(

                100,

                state.sheep.wool+value

            )

        );

}