const sheep = document.getElementById("sheep");

if(sheep){

const faces = [

"idle.png",
"happy.png",
"wink.png",
"smug.png",
"worried.png"

];

sheep.src =
`assets/sheep/${
faces[Math.floor(Math.random()*faces.length)]
}`;

}