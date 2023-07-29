//for instrument control


var instruments = document.querySelectorAll(".instrument");
for(var i=0; i<instruments.length;i++){
  instruments[i].addEventListener("click",handleclick);
}
function handleclick(){
  for(var i=0;i<instruments.length;i++){
    var instrumentsClassList=instruments[i].classList;
    for(var j=0;j<instrumentsClassList.length;j++){
      if(instrumentsClassList[j]==="btn-dark"){
        instruments[i].classList.remove("btn-dark");
      }
    }
  }
  this.classList.add("btn-dark");
}



// for key presses

document.addEventListener("keydown",function(event){
  makeSound(event.key);
})



// for clicks


var sitar =document.querySelectorAll(".sitar");
for (var i=0;i<7;i++){
  sitar[i].addEventListener("click",function(){ragToWord(this.innerHTML);});
}

var fluteButtons =document.querySelectorAll(".flute");
for (var i=0;i<7;i++){
  fluteButtons[i].addEventListener("click",function(){ragToWord(this.innerHTML);});
}

var tabla =document.querySelectorAll(".tabla");
for (var i=0;i<7;i++){
  tabla[i].addEventListener("click",function(){ragToWord(this.innerHTML);});
}

var violin =document.querySelectorAll(".violin");
for (var i=0;i<7;i++){
  violin[i].addEventListener("click",function(){ragToWord(this.innerHTML);});
}

  var harmonium =document.querySelectorAll(".harmonium");
for (var i=0;i<7;i++){
  harmonium[i].addEventListener("click",function(){ragToWord(this.innerHTML);});
}


var sarod =document.querySelectorAll(".sarod");
for (var i=0;i<7;i++){
  sarod[i].addEventListener("click",function(){ragToWord(this.innerHTML);});
}
 


function ragToWord(rag){
  var word;
  switch(rag){
    case("Sa"):
    word="a";
    break;

    case("Re"):
    word="s";
    break;

    case("Ga"):
    word="d";
    break;

    case("Ma"):
    word="f";
    break;

    case("Pa"):
    word="j";
    break;

    case("Dha"):
    word="k";
    break;

    case("Ni"):
    word="l";
    break;

    default:word="n";
  }
  makeSound(word)

}


function makeSound(key) {

  if(document.querySelectorAll(".instrument")[0].classList.contains("btn-dark")){
  

  switch (key) {
    case "a":
      var Sa = new Audio("./sounds/sitar1.mp3");
      Sa.play();
      break;
    case "s":
      var Re = new Audio("./sounds/sitar2.mp3");
      Re.play();
      break;
    case "d":
      var Ga = new Audio("./sounds/sitar3.mp3");
      Ga.play();
      break;
    case "f":
      var Ma = new Audio("./sounds/sitar4.mp3");
      Ma.play();
      break;
    case "j":
      var Pa = new Audio("./sounds/sitar5.mp3");
      Pa.play();
      break;
    case "k":
      
      var Dha = new Audio("./sounds/sitar6.mp3");
      Dha.play();
      break;
    case "l":
      var Ni = new Audio("./sounds/sitar7.mp3");
      Ni.play();
      break;
    default:
      console.log(key);
  }
 } 
 
 else if(document.querySelectorAll(".instrument")[1].classList.contains("btn-dark")){
  

  switch (key) {
    case "a":
      var Sa = new Audio("./sounds/flute1.mp3");
      Sa.play();
      break;
    case "s":
      var Re = new Audio("./sounds/flute2.mp3");
      Re.play();
      break;
    case "d":
      var Ga = new Audio("./sounds/flute3.mp3");
      Ga.play();
      break;
    case "f":
      var Ma = new Audio("./sounds/flute4.mp3");
      Ma.play();
      break;
    case "j":
      var Pa = new Audio("./sounds/flute5.mp3");
      Pa.play();
      break;
    case "k":
      
      var Dha = new Audio("./sounds/flute6.mp3");
      Dha.play();
      break;
    case "l":
      var Ni = new Audio("./sounds/flute7.mp3");
      Ni.play();
      break;
    default:
      console.log(key);
  }
 }





 else if(document.querySelectorAll(".instrument")[2].classList.contains("btn-dark")){
  

  switch (key) {
    case "a":
      var Sa = new Audio("./sounds/tabla1.mp3");
      Sa.play();
      break;
    case "s":
      var Re = new Audio("./sounds/tabla2.mp3");
      Re.play();
      break;
    case "d":
      var Ga = new Audio("./sounds/tabla3.mp3");
      Ga.play();
      break;
    case "f":
      var Ma = new Audio("./sounds/tabla4.mp3");
      Ma.play();
      break;
    case "j":
      var Pa = new Audio("./sounds/tabla5.mp3");
      Pa.play();
      break;
    case "k":
      
      var Dha = new Audio("./sounds/tabla6.mp3");
      Dha.play();
      break;
    case "l":
      var Ni = new Audio("./sounds/tabla7.mp3");
      Ni.play();
      break;
    default:
      console.log(key);
  }
 }



 else if(document.querySelectorAll(".instrument")[3].classList.contains("btn-dark")){
  

  switch (key) {
    case "a":
      var Sa = new Audio("./sounds/harmonium1.mp3");
      Sa.play();
      break;
    case "s":
      var Re = new Audio("./sounds/harmonium2.mp3");
      Re.play();
      break;
    case "d":
      var Ga = new Audio("./sounds/harmonium3.mp3");
      Ga.play();
      break;
    case "f":
      var Ma = new Audio("./sounds/harmonium4.mp3");
      Ma.play();
      break;
    case "j":
      var Pa = new Audio("./sounds/harmonium5.mp3");
      Pa.play();
      break;
    case "k":
      
      var Dha = new Audio("./sounds/harmonium6.mp3");
      Dha.play();
      break;
    case "l":
      var Ni = new Audio("./sounds/harmonium7.mp3");
      Ni.play();
      break;
    default:
      console.log(key);
  }
 }



 else if(document.querySelectorAll(".instrument")[4].classList.contains("btn-dark")){
  

  switch (key) {
    case "a":
      var Sa = new Audio("./sounds/violin1.mp3");
      Sa.play();
      break;
    case "s":
      var Re = new Audio("./sounds/violin2.mp3");
      Re.play();
      break;
    case "d":
      var Ga = new Audio("./sounds/violin3.mp3");
      Ga.play();
      break;
    case "f":
      var Ma = new Audio("./sounds/violin4.mp3");
      Ma.play();
      break;
    case "j":
      var Pa = new Audio("./sounds/violin5.mp3");
      Pa.play();
      break;
    case "k":
      
      var Dha = new Audio("./sounds/violin6.mp3");
      Dha.play();
      break;
    case "l":
      var Ni = new Audio("./sounds/violin7.mp3");
      Ni.play();
      break;
    default:
      console.log(key);
  }
 }

 else if(document.querySelectorAll(".instrument")[5].classList.contains("btn-dark")){
  

  switch (key) {
    case "a":
      var Sa = new Audio("./sounds/sarod1.mp3");
      Sa.play();
      break;
    case "s":
      var Re = new Audio("./sounds/sarod2.mp3");
      Re.play();
      break;
    case "d":
      var Ga = new Audio("./sounds/sarod3.mp3");
      Ga.play();
      break;
    case "f":
      var Ma = new Audio("./sounds/sarod4.mp3");
      Ma.play();
      break;
    case "j":
      var Pa = new Audio("./sounds/sarod5.mp3");
      Pa.play();
      break;
    case "k":
      
      var Dha = new Audio("./sounds/sarod6.mp3");
      Dha.play();
      break;
    case "l":
      var Ni = new Audio("./sounds/sarod7.mp3");
      Ni.play();
      break;
    default:
      console.log(key);
  }
 }





}



