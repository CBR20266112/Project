/* ===========================
   Dreamy Animation
=========================== */

#sheep{

    animation:float 3s ease-in-out infinite;

    transition:
    transform .3s,
    filter .3s;

    cursor:pointer;

}

#sheep:hover{

    transform:scale(1.06);

    filter:brightness(1.08);

}

#sheep:active{

    transform:scale(.92);

}

/* 말풍선 */

.speech{

    animation:fadeIn .5s;

}

/* 버튼 */

.action-button{

    transition:
    .25s;

}

.action-button:hover{

    transform:translateY(-3px);

}

.action-button:active{

    transform:scale(.95);

}

/* 카드 */

.glass{

    transition:.3s;

}

.glass:hover{

    transform:translateY(-4px);

}

/* 떠다니기 */

@keyframes float{

0%{

transform:translateY(0px);

}

25%{

transform:translateY(-6px);

}

50%{

transform:translateY(-12px);

}

75%{

transform:translateY(-6px);

}

100%{

transform:translateY(0px);

}

}

/* 등장 */

@keyframes fadeIn{

from{

opacity:0;

transform:translateY(10px);

}

to{

opacity:1;

transform:translateY(0);

}

}

/* 통통 */

@keyframes bounce{

0%{

transform:scale(1);

}

30%{

transform:scale(1.15);

}

60%{

transform:scale(.95);

}

100%{

transform:scale(1);

}

}