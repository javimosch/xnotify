/*
Titulo: Notificaciones Minimalistas
Author: Jav
objeto: xnotify
uso:
-xnotify(parametros)
  ej:
  xnotify({body:'This is an info',type:'info',delay:1,duration:10});
-xnotify.setMainEasing = function(easingName)
  ej:
  'animated pulse infinite' (check animate.css library)
-xnotify.setMessageStyle = function(cssText)
  ej:
  'width:300px;border:4px solid black';
-xnotify.setTypes = function(arr)
  formato ej:
    {name:'warning',cssText:'background:orange;color:black;'}
-xnotify.settings(newSettings)
  campos:
    maxMessages (default 5)
*/
var xnotify = new (function(){
    var main = {};
    main.VERSION = 0.1  //Version actual
    main.enableVersionControl = false; //(OPCIONAL) Desactiva el contro de version
    function scriptUpdateRequired(){
      return typeof top.window.xnotify !== 'undefined' && main.VERSION != top.window.xnotify.version;
    }
    //Version check
    if(main.enableVersionControl && !scriptUpdateRequired()){
      return top.window.xnotify; //Restrict redefinitions when calling the scripts multiple times (eg: sistema clarity).
    }
    //-------------------------------------------------------------------
    function inyectCSS(cssAsString){
      var css = cssAsString,
      head = document.head || document.getElementsByTagName('head')[0],
      style = document.createElement('style');
      style.type = 'text/css';
      if (style.styleSheet)
          style.styleSheet.cssText = css;
      else
          style.appendChild(document.createTextNode(css));
      head.appendChild(style);
    }
    function loadDefaultStyles(){

      inyectCSS('body.xnotify-active{overflow-x:hidden;}');
      fn.setMessageStyle('min-width:200px;');
      fn.setTypes([
        {name:'info',cssText:'background:blue;color:white;'}
        ,{name:'error',cssText:'background:red;color:white;'}
        ,{name:'warning',cssText:'background:orange;color:white;'}
      ]);
    }
    function getContainer(){
        var c = document.getElementById('xnotify-container') || null;
        if(!c){
          c = document.createElement('div');
          c.id = 'xnotify-container';
          var nonselectable = '-moz-user-select:none;-khtml-user-select: none;-webkit-user-select: none;-o-user-select: none;';
          inyectCSS('#xnotify-container{position:absolute; right: 10px; bottom: 10px;'+nonselectable+'}');

          document.body.insertBefore(c,document.body.firstChild); //Inserts the container first in <body> tag
        }
        applySettings();
        return c;
    }
    function updateChildAttributes(child){
      child.element.innerHTML = child.body;
      child.element.className = 'xnotify-message '+child.type + ' animated '+child.easing;
    }
    function createChildEventBinding(child){
      child.element.onclick = function(){
        closeChild(child);
      };
    }
    function createChild(p){
      var e = document.createElement('div');
      e.id = 'xnm' + new Date().getTime().toString();
      return e;
    }
    function deleteChild(obj){
      clearInterval(obj._intervalTracker||{});
      for(var x in obj){
        delete obj[x];
      }
    }
    function getChild(p){
      var child = p;
      for(var x in childs){
        var c = childs[x];
        if(c.pool == true){
          child.element = c.element;
          child.pool = false;
          childs[c.id] = child; //replaces the object in the array of childs
          deleteChild(c);
          //console.log('xnotify reutilize a child');
        }
      }
      if(!child.element){
        child.element = createChild(p);
      }
      updateChildAttributes(child);
      createChildEventBinding(child);
      child.id = child.element.id;
      return child;
    }
    function pushMessage(container,child){
        //container.appendChild(child.element);
        container.insertBefore(child.element,container.firstChild);
    }
    function storeChild(child){
        for(var x in childs){
          var c = childs[x];
          if(c.id == child.id){
              return; // alredy stored.
          }
        }
        childs[child.id] = child;
    }
    function onMessageStart(child){
      if(document.body.className == bodyClassName){
        document.body.className  = bodyClassName + 'xnotify-active';
      }
    }
    function anyActive(){
      for(var x in childs){
        if(childs[x].pool == false) {
          //console.log('xnotify '+childs[x].body+' active');
          return true;
        }
      }
    //  console.log('xnotify anyActive false');
      return false;
    }
    function onMessageEnds(child){
        if(!anyActive()){
          document.body.className = bodyClassName;
        }
    }
    function closeChild(child,cb){
      if(child.animating) return; //alredy being closed.
      child.element.className = 'xnotify-message '+child.type + ' animated '+child.easingEnd;
      child.animating = true;
      setTimeout(function(){
        getContainer().removeChild(child.element);
        child.pool = true;
        child.animating = false;
        cb && cb(child);
        //console.log('xnotify closes '+child.id);
        onMessageEnds(child);
      },400);
      //console.log('xnotify removing '+child.id);
      if(typeof child !== 'undefined' && child._intervalTracker != null) clearInterval(child._intervalTracker);
    }
    function trackChild(container,child){
      var startDateTime = new Date().getTime();
      clearInterval(child._intervalTracker);
      child._intervalTracker = setInterval(function(){
          if(child.pool == true){
            clearInterval(child._intervalTracker);
            return;
          }
          var diff = Math.abs((startDateTime -  (new Date().getTime())) / 1000);
          if(diff > child.duration){
              closeChild(child);
          }
          //console.log('xnotify tracking '+child.id+' diff:'+diff);
      },1000);
    }
    function loadDefaults(p){
      p = p || {};
      p.title = p.title || 'My Title';
      p.body = p.body || 'My Body';
      p.width = p.width || '60';
      p.height = p.height || '60';
      p.type = p.type || 'info';
      p.delay =  p.delay || 0;
      p.element =  p.element || null;
      p.duration =  p.duration || 5;
      p.easing =  p.easing || 'bounceInRight';
      p.easingEnd =  p.easingEnd || 'bounceOutRight';
      p.pool = false;
      return p;
    }
    function nroActiveChilds(){
      var c = 0;
      for(var x in childs){
        if(childs[x].pool == false)
          c++;
      }
      return c;
    }
    function removeLastChildIfNecessary(){
      var promiseThenFn = null;
      var promiseThenReady = false;
      if(nroActiveChilds()>=settings.maxMessages) {
        closeChild(childs[getContainer().lastChild.id],function(){
          promiseThenFn && promiseThenFn();
          promiseThenReady = true;
        });
      }else{
        promiseThenReady = true;
      }
      return {then:function(thenFn){
        if(promiseThenReady){
          thenFn && thenFn();
        }else{
          promiseThenFn = thenFn;
        }

      }}
    }


    var bodyClassName = document.body && document.body.className || "";
    var childs = {};
    var settingsFirstUpdate = false;
    var settings = {
      maxMessages : 5,
      mainEasing:'animated pulse infinite'
    };
    function applySettings(force){
      force = force || false;
      if(settingsFirstUpdate && !force) return;
      settingsFirstUpdate = true;
      fn.setMainEasing(settings.mainEasing);
    }
    //-------------------------------------------------------------MAIN FUNCTION
    var fn = function(parameters){
      parameters =  loadDefaults(parameters);
      setTimeout(function(){
        removeLastChildIfNecessary().then(function(){
          var container = getContainer();
          var child = getChild(parameters);
          onMessageStart(child);
          storeChild(child);
          pushMessage(container,child);
          trackChild(container,child);
          //console.log('xnotify pushed  '+child.id);
        });

      },parameters.delay*1000);
    };
    //Public accessors
    fn.nroActiveChilds  = nroActiveChilds;
    fn.childs = childs;
    fn.settings = function(s){
      for(var x in s){
        if(typeof settings[x] !== 'undefined')
          settings[x] = s[x];
      }
      applySettings();
    };
    fn.setMainEasing = function(easingName){
      getContainer().className = easingName; //'animated pulse infinite';
    };
    fn.setMessageStyle = function(cssText){
        inyectCSS('.xnotify-message{'+cssText+'}.xnotify-message:hover{cursor:pointer}');
    };
    fn.setTypes = function(arr){
      for(var x in arr){
        var t = arr[x];
        inyectCSS('.xnotify-message.'+t.name+'{'+t.cssText+'}');
      }
    };
    loadDefaultStyles();
    return fn;
})();
