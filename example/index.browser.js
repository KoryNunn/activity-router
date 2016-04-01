(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

function EventEmitter() {
  this._events = this._events || {};
  this._maxListeners = this._maxListeners || undefined;
}
module.exports = EventEmitter;

// Backwards-compat with node 0.10.x
EventEmitter.EventEmitter = EventEmitter;

EventEmitter.prototype._events = undefined;
EventEmitter.prototype._maxListeners = undefined;

// By default EventEmitters will print a warning if more than 10 listeners are
// added to it. This is a useful default which helps finding memory leaks.
EventEmitter.defaultMaxListeners = 10;

// Obviously not all Emitters should be limited to 10. This function allows
// that to be increased. Set to zero for unlimited.
EventEmitter.prototype.setMaxListeners = function(n) {
  if (!isNumber(n) || n < 0 || isNaN(n))
    throw TypeError('n must be a positive number');
  this._maxListeners = n;
  return this;
};

EventEmitter.prototype.emit = function(type) {
  var er, handler, len, args, i, listeners;

  if (!this._events)
    this._events = {};

  // If there is no 'error' event listener then throw.
  if (type === 'error') {
    if (!this._events.error ||
        (isObject(this._events.error) && !this._events.error.length)) {
      er = arguments[1];
      if (er instanceof Error) {
        throw er; // Unhandled 'error' event
      }
      throw TypeError('Uncaught, unspecified "error" event.');
    }
  }

  handler = this._events[type];

  if (isUndefined(handler))
    return false;

  if (isFunction(handler)) {
    switch (arguments.length) {
      // fast cases
      case 1:
        handler.call(this);
        break;
      case 2:
        handler.call(this, arguments[1]);
        break;
      case 3:
        handler.call(this, arguments[1], arguments[2]);
        break;
      // slower
      default:
        args = Array.prototype.slice.call(arguments, 1);
        handler.apply(this, args);
    }
  } else if (isObject(handler)) {
    args = Array.prototype.slice.call(arguments, 1);
    listeners = handler.slice();
    len = listeners.length;
    for (i = 0; i < len; i++)
      listeners[i].apply(this, args);
  }

  return true;
};

EventEmitter.prototype.addListener = function(type, listener) {
  var m;

  if (!isFunction(listener))
    throw TypeError('listener must be a function');

  if (!this._events)
    this._events = {};

  // To avoid recursion in the case that type === "newListener"! Before
  // adding it to the listeners, first emit "newListener".
  if (this._events.newListener)
    this.emit('newListener', type,
              isFunction(listener.listener) ?
              listener.listener : listener);

  if (!this._events[type])
    // Optimize the case of one listener. Don't need the extra array object.
    this._events[type] = listener;
  else if (isObject(this._events[type]))
    // If we've already got an array, just append.
    this._events[type].push(listener);
  else
    // Adding the second element, need to change to array.
    this._events[type] = [this._events[type], listener];

  // Check for listener leak
  if (isObject(this._events[type]) && !this._events[type].warned) {
    if (!isUndefined(this._maxListeners)) {
      m = this._maxListeners;
    } else {
      m = EventEmitter.defaultMaxListeners;
    }

    if (m && m > 0 && this._events[type].length > m) {
      this._events[type].warned = true;
      console.error('(node) warning: possible EventEmitter memory ' +
                    'leak detected. %d listeners added. ' +
                    'Use emitter.setMaxListeners() to increase limit.',
                    this._events[type].length);
      if (typeof console.trace === 'function') {
        // not supported in IE 10
        console.trace();
      }
    }
  }

  return this;
};

EventEmitter.prototype.on = EventEmitter.prototype.addListener;

EventEmitter.prototype.once = function(type, listener) {
  if (!isFunction(listener))
    throw TypeError('listener must be a function');

  var fired = false;

  function g() {
    this.removeListener(type, g);

    if (!fired) {
      fired = true;
      listener.apply(this, arguments);
    }
  }

  g.listener = listener;
  this.on(type, g);

  return this;
};

// emits a 'removeListener' event iff the listener was removed
EventEmitter.prototype.removeListener = function(type, listener) {
  var list, position, length, i;

  if (!isFunction(listener))
    throw TypeError('listener must be a function');

  if (!this._events || !this._events[type])
    return this;

  list = this._events[type];
  length = list.length;
  position = -1;

  if (list === listener ||
      (isFunction(list.listener) && list.listener === listener)) {
    delete this._events[type];
    if (this._events.removeListener)
      this.emit('removeListener', type, listener);

  } else if (isObject(list)) {
    for (i = length; i-- > 0;) {
      if (list[i] === listener ||
          (list[i].listener && list[i].listener === listener)) {
        position = i;
        break;
      }
    }

    if (position < 0)
      return this;

    if (list.length === 1) {
      list.length = 0;
      delete this._events[type];
    } else {
      list.splice(position, 1);
    }

    if (this._events.removeListener)
      this.emit('removeListener', type, listener);
  }

  return this;
};

EventEmitter.prototype.removeAllListeners = function(type) {
  var key, listeners;

  if (!this._events)
    return this;

  // not listening for removeListener, no need to emit
  if (!this._events.removeListener) {
    if (arguments.length === 0)
      this._events = {};
    else if (this._events[type])
      delete this._events[type];
    return this;
  }

  // emit removeListener for all listeners on all events
  if (arguments.length === 0) {
    for (key in this._events) {
      if (key === 'removeListener') continue;
      this.removeAllListeners(key);
    }
    this.removeAllListeners('removeListener');
    this._events = {};
    return this;
  }

  listeners = this._events[type];

  if (isFunction(listeners)) {
    this.removeListener(type, listeners);
  } else if (listeners) {
    // LIFO order
    while (listeners.length)
      this.removeListener(type, listeners[listeners.length - 1]);
  }
  delete this._events[type];

  return this;
};

EventEmitter.prototype.listeners = function(type) {
  var ret;
  if (!this._events || !this._events[type])
    ret = [];
  else if (isFunction(this._events[type]))
    ret = [this._events[type]];
  else
    ret = this._events[type].slice();
  return ret;
};

EventEmitter.prototype.listenerCount = function(type) {
  if (this._events) {
    var evlistener = this._events[type];

    if (isFunction(evlistener))
      return 1;
    else if (evlistener)
      return evlistener.length;
  }
  return 0;
};

EventEmitter.listenerCount = function(emitter, type) {
  return emitter.listenerCount(type);
};

function isFunction(arg) {
  return typeof arg === 'function';
}

function isNumber(arg) {
  return typeof arg === 'number';
}

function isObject(arg) {
  return typeof arg === 'object' && arg !== null;
}

function isUndefined(arg) {
  return arg === void 0;
}

},{}],2:[function(require,module,exports){
var activityRouter = require('../'),
    crel = require('crel');

var router = activityRouter({
        home: {
            _url: '/'
        },
        foo: {
            _url: ['/foo', '/foo/{bar}']
        }
    });

var logElement = crel('div');

function logChange(type){
    return function(activity, index){
        logElement.innerHTML +=
            '<br>' + [
                type,
                activity.name,
                JSON.stringify(activity.values),
                index
            ].join(' ');
    };
}

router.on('add', logChange('add'));
router.on('update', logChange('update'));
router.on('replace', logChange('replace'));
router.on('remove', logChange('remove'));

window.addEventListener('load', function(){

    router.init();

    var pushActivity = crel('button', 'Add "foo" activity');
    pushActivity.addEventListener('click', function(){
        router.add('foo', {
            bar: Math.floor(Math.random() * 100)
        });
    });

    var resetActivities = crel('button', 'Reset to home');
    resetActivities.addEventListener('click', function(){
        router.reset('home');
    });

    crel(document.body,
        logElement,
        pushActivity,
        resetActivities
    );
});
},{"../":3,"crel":4}],3:[function(require,module,exports){
(function (global){
var Router = require('route-tree'),
    EventEmitter = require('events').EventEmitter,
    debounce = require('debounce');

module.exports = function(routes, location){
    if(!location){
        location = global.location;
    }

    var activityRouter = new EventEmitter(),
        activities = [],
        router = new Router(routes, location);

    router.basePath = location.href.match(/(^[^?#]*)\/.*$/)[1] + '/';

    function addActivity(activity){
        activities.push(activity);

        updateHash();

        activityRouter.emit('add', activity, activities.length - 1);
    }

    function updateActivity(activity, index){
        if(activities.length <= index){
            return addActivity(activity);
        }

        activities[index].values = activity.values;

        updateHash();

        activityRouter.emit('update', activities[index], index);
    }

    function replaceActivity(activity, index){
        if(activities.length <= index){
            return addActivity(activity);
        }

        if(activities[index].name === activity.name){
            return updateActivity(activity, index);
        }

        activities[index] = activity;

        updateHash();

        activityRouter.emit('replace', activity, index);
    }

    function removeActivity(index){
        if(!activities[index]){
            return;
        }

        var activity = activities[index];

        activities.splice(index, 1);

        updateHash();

        activityRouter.emit('remove', activity, index);
    }

    function getPaths(){
        return location.hash.split('#').slice(1);
    }

    function buildPath(){
        var path = '';
        if(!activities.length){
            return '#/';
        }
        for(var i = 0; i < activities.length; i++){
            var route = activities[i],
                href = router.get(route.name, route.values);

            if(!href){
                console.error('No route was found named "' + route.name + '"');
                continue;
            }

            path += '#' + href.replace(router.basePath, '');
        }

        return path;
    }

    var updateHash = debounce(function(){
        var path = buildPath();

        if(router.basePath + path !== location.href){
            location.hash = path;
        }
    });

    var routeCounter = 0;

    function buildRoutes(){
        var paths = getPaths();

        if(paths.length === 0){
            paths.push('/');
        }

        for(var i = 0; i < paths.length; i++){
            var path = router.resolve(router.basePath, paths[i]),
                activity = activities[i];

            if(!activity){
                activity = {
                    id: routeCounter++,
                    name: router.find(path),
                    values: router.values(path)
                };
                addActivity(activity);
            }else{
                var newName = router.find(path),
                    newValues = router.values(path);

                replaceActivity({
                    name: newName,
                    values: newValues
                }, i);
            }

        }

        while(activities.length > i){
            removeActivity(activities.length - 1);
        }
    }

    var updateRoutes = debounce(function(){
        if(activities.length && buildPath() === location.hash){
            return;
        }
        buildRoutes();
    },10);

    window.addEventListener('hashchange', updateRoutes);
    window.addEventListener('popstate', updateRoutes);

    activityRouter.router = router,

    activityRouter.add = function(name, values){
        addActivity({
            name: name,
            values: values
        });
    };

    activityRouter.replace = function(name, values, index){
        replaceActivity({
            name: name,
            values: values
        }, index);
    };

    activityRouter.top = function(name, values){
        replaceActivity({
            name: name,
            values: values
        }, activities.length - 1);
    };

    activityRouter.pop = function(){
        removeActivity(activities.length - 1);
    };

    activityRouter.reset = function(name, values){
        while(activities.length > 1){
            removeActivity(activities.length - 1);
        }

        replaceActivity({
            name: name,
            values: values
        }, 0);
    };

    activityRouter.init = updateRoutes;

    return activityRouter;
}
}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"debounce":5,"events":1,"route-tree":8}],4:[function(require,module,exports){
//Copyright (C) 2012 Kory Nunn

//Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

//The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

//THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

/*

    This code is not formatted for readability, but rather run-speed and to assist compilers.

    However, the code's intention should be transparent.

    *** IE SUPPORT ***

    If you require this library to work in IE7, add the following after declaring crel.

    var testDiv = document.createElement('div'),
        testLabel = document.createElement('label');

    testDiv.setAttribute('class', 'a');
    testDiv['className'] !== 'a' ? crel.attrMap['class'] = 'className':undefined;
    testDiv.setAttribute('name','a');
    testDiv['name'] !== 'a' ? crel.attrMap['name'] = function(element, value){
        element.id = value;
    }:undefined;


    testLabel.setAttribute('for', 'a');
    testLabel['htmlFor'] !== 'a' ? crel.attrMap['for'] = 'htmlFor':undefined;



*/

(function (root, factory) {
    if (typeof exports === 'object') {
        module.exports = factory();
    } else if (typeof define === 'function' && define.amd) {
        define(factory);
    } else {
        root.crel = factory();
    }
}(this, function () {
    var fn = 'function',
        obj = 'object',
        nodeType = 'nodeType',
        textContent = 'textContent',
        setAttribute = 'setAttribute',
        attrMapString = 'attrMap',
        isNodeString = 'isNode',
        isElementString = 'isElement',
        d = typeof document === obj ? document : {},
        isType = function(a, type){
            return typeof a === type;
        },
        isNode = typeof Node === fn ? function (object) {
            return object instanceof Node;
        } :
        // in IE <= 8 Node is an object, obviously..
        function(object){
            return object &&
                isType(object, obj) &&
                (nodeType in object) &&
                isType(object.ownerDocument,obj);
        },
        isElement = function (object) {
            return crel[isNodeString](object) && object[nodeType] === 1;
        },
        isArray = function(a){
            return a instanceof Array;
        },
        appendChild = function(element, child) {
          if(!crel[isNodeString](child)){
              child = d.createTextNode(child);
          }
          element.appendChild(child);
        };


    function crel(){
        var args = arguments, //Note: assigned to a variable to assist compilers. Saves about 40 bytes in closure compiler. Has negligable effect on performance.
            element = args[0],
            child,
            settings = args[1],
            childIndex = 2,
            argumentsLength = args.length,
            attributeMap = crel[attrMapString];

        element = crel[isElementString](element) ? element : d.createElement(element);
        // shortcut
        if(argumentsLength === 1){
            return element;
        }

        if(!isType(settings,obj) || crel[isNodeString](settings) || isArray(settings)) {
            --childIndex;
            settings = null;
        }

        // shortcut if there is only one child that is a string
        if((argumentsLength - childIndex) === 1 && isType(args[childIndex], 'string') && element[textContent] !== undefined){
            element[textContent] = args[childIndex];
        }else{
            for(; childIndex < argumentsLength; ++childIndex){
                child = args[childIndex];

                if(child == null){
                    continue;
                }

                if (isArray(child)) {
                  for (var i=0; i < child.length; ++i) {
                    appendChild(element, child[i]);
                  }
                } else {
                  appendChild(element, child);
                }
            }
        }

        for(var key in settings){
            if(!attributeMap[key]){
                element[setAttribute](key, settings[key]);
            }else{
                var attr = attributeMap[key];
                if(typeof attr === fn){
                    attr(element, settings[key]);
                }else{
                    element[setAttribute](attr, settings[key]);
                }
            }
        }

        return element;
    }

    // Used for mapping one kind of attribute to the supported version of that in bad browsers.
    crel[attrMapString] = {};

    crel[isElementString] = isElement;

    crel[isNodeString] = isNode;

    if(typeof Proxy !== 'undefined'){
        return new Proxy(crel, {
            get: function(target, key){
                !(key in crel) && (crel[key] = crel.bind(null, key));
                return crel[key];
            }
        });
    }

    return crel;
}));

},{}],5:[function(require,module,exports){

/**
 * Module dependencies.
 */

var now = require('date-now');

/**
 * Returns a function, that, as long as it continues to be invoked, will not
 * be triggered. The function will be called after it stops being called for
 * N milliseconds. If `immediate` is passed, trigger the function on the
 * leading edge, instead of the trailing.
 *
 * @source underscore.js
 * @see http://unscriptable.com/2009/03/20/debouncing-javascript-methods/
 * @param {Function} function to wrap
 * @param {Number} timeout in ms (`100`)
 * @param {Boolean} whether to execute at the beginning (`false`)
 * @api public
 */

module.exports = function debounce(func, wait, immediate){
  var timeout, args, context, timestamp, result;
  if (null == wait) wait = 100;

  function later() {
    var last = now() - timestamp;

    if (last < wait && last > 0) {
      timeout = setTimeout(later, wait - last);
    } else {
      timeout = null;
      if (!immediate) {
        result = func.apply(context, args);
        if (!timeout) context = args = null;
      }
    }
  };

  return function debounced() {
    context = this;
    args = arguments;
    timestamp = now();
    var callNow = immediate && !timeout;
    if (!timeout) timeout = setTimeout(later, wait);
    if (callNow) {
      result = func.apply(context, args);
      context = args = null;
    }

    return result;
  };
};

},{"date-now":6}],6:[function(require,module,exports){
module.exports = Date.now || now

function now() {
    return new Date().getTime()
}

},{}],7:[function(require,module,exports){
module.exports = function intersect(arrayA, arrayB, intersector){
    var results = [];

    function innerCheck(aItem){
        for (var i = 0; i < arrayB.length; i++) {
            if(
                (intersector && intersector(aItem, arrayB[i])) ||
                (!intersector && aItem === arrayB[i])
            ){
                results.push(aItem);
            }
        }
    }

    for (var i = 0; i < arrayA.length; i++) {
        innerCheck(arrayA[i]);
    }

    return results;
};
},{}],8:[function(require,module,exports){
var intersect = require('./intersect'),
    arrayProto = [],
    absolutePath = /^.+?\:\/\//g,
    formatRegex = /\{.*?\}/g,
    keysRegex = /\{(.*?)\}/g,
    nonNameKey = /^_(.*)$/,
    sanitiseRegex = /[#-.\[\]-^?]/g;

function sanitise(string){
    return string.replace(sanitiseRegex, '\\$&');
}

function isRestKey(key){
    return key.match(/^.*?\.\.\.$/);
}

function isRestToken(token){
    return token.match(/^{.*?(?:\.\.\.)|(?:\\\.\\\.\\\.)}$/);
}

function formatString(string, values) {
    values || (values = {});

    return string.replace(/{(.+?)}/g, function (match, key) {
        if(isRestKey(key)){
            key = key.slice(0,-3);
        }
        return (values[key] === undefined || values[key] === null) ? '' : values[key];
    });
}

function resolve(rootPath, path){
    if(!path){
        return rootPath;
    }
    if(path.match(absolutePath)){
        return path;
    }
    return rootPath + path;
}

function Router(routes, location){
    if(!location){
        location = window.location;
    }

    this.location = location;
    this.basePath  = location.protocol + '//' + location.host;
    this.routes = routes;
    this.homeRoute = 'home';
}

function scanRoutes(routes, fn){
    var route,
        routeKey,
        result;

    for(var key in routes){
        if(key.charAt(0) === '_'){
            continue;
        }

        // Scan children first
        result = scanRoutes(routes[key], fn);
        if(result != null){
            return result;
        }
        // Scan current route
        result = fn(routes[key], key);
        if(result != null){
            return result;
        }
    }
}

Router.prototype.currentPath = function(){
    return this.location.href;
};

Router.prototype.details = function(url){
    var router = this;

    if(url == null){
        url = this.currentPath();
    }

    return scanRoutes(this.routes, function(route, routeName){
        var urls = Array.isArray(route._url) ? route._url : [route._url],
            bestMatch,
            mostMatches = 0;

        for(var i = 0; i < urls.length; i++){
            var routeKey = router.resolve(router.basePath, urls[i]),
                regex = '^' + sanitise(routeKey).replace(formatRegex, function(item){
                    if(isRestToken(item)){
                        return '(.*?)';
                    }
                    return '([^/]*?)';
                }) + '$',
                match = url.match(regex);

            if(match && match.length > mostMatches){
                mostMatches = match.length;
                bestMatch = routeKey;
            }
        }

        if(bestMatch == null){
            return;
        }

        return {
            path: url,
            name: routeName,
            template: bestMatch
        };
    });
};

Router.prototype.info = function(name){
    var router = this;

    return scanRoutes(this.routes, function(route, routeName){
        if(routeName !== name){
            return;
        }

        var info = {
            name: routeName
        };

        for(var key in route){
            var keyNameMatch = key.match(nonNameKey);
            if(keyNameMatch){
                info[keyNameMatch[1]] = route[key];
            }
        }

        return info;
    });
};

Router.prototype.find = function(url){
    var details = this.details(url);

    return details && details.name;
};

Router.prototype.upOneName = function(name){
    if(!name){
        return;
    }

    return scanRoutes(this.routes, function(route, routeName){
        if(name in route){
            return routeName;
        }
    }) || this.homeRoute;
};

Router.prototype.upOne = function(path){
    if(path === undefined){
        path = this.currentPath();
    }

    return this.drill(path, this.upOneName(this.find(path)));
};

function cleanTokens(token){
    return token.slice(1,-1);
}

Router.prototype.getRouteTemplate = function(name, values){
    var keys = values && typeof values === 'object' && Object.keys(values) || [],
        routeTemplate = scanRoutes(this.routes, function(route, routeName){
        if(name === routeName){
            var result = {
                route: route
            };

            if(!Array.isArray(route._url)){
                result.template = route._url;
                return result;
            }

            var urlsByDistance = route._url.slice().sort(function(urlA, urlB){
                var keysA = (urlA.match(keysRegex) || []).map(cleanTokens),
                    keysB = (urlB.match(keysRegex) || []).map(cleanTokens),
                    commonAKeys = intersect(keysA, keys),
                    commonBKeys = intersect(keysB, keys),
                    aDistance = Math.abs(commonAKeys.length - keys.length),
                    bDistance = Math.abs(commonBKeys.length - keys.length);

                return aDistance - bDistance;
            });

            result.template = urlsByDistance[0] || route._url[0];

            return result;
        }
    });

    if(!routeTemplate){
        return;
    }

    routeTemplate.template = this.resolve(this.basePath, routeTemplate.template);

    return routeTemplate;
};

Router.prototype.getTemplate = function(name, values){
    return this.getRouteTemplate(name, values).template;
};

function getDefaults(defaults, result){
    for(var key in defaults){
        var defaultValue = defaults[key];

        if(typeof defaultValue === 'function'){
            defaultValue = defaultValue();
        }

        result[key] || (result[key] = defaultValue);
    }

    return result;
}

Router.prototype.get = function(name, values){
    var routeTemplate = this.getRouteTemplate(name, values);

    if(!routeTemplate){
        return null;
    }

    values || (values = {});

    if(routeTemplate.route._defaults){
        getDefaults(routeTemplate.route._defaults, values);
    }

    var serialise = routeTemplate.route._serialise;

    var resolvedValues = {};

    for(var valuesKey in values) {
        var value = values[valuesKey];
        resolvedValues[valuesKey] = serialise ?
            serialise(valuesKey, value) :
            value;
    }

    return formatString(routeTemplate.template, resolvedValues);
};

Router.prototype.isIn = function(childName, parentName){
    var currentRoute = childName,
        lastRoute;

    while(currentRoute !== lastRoute && currentRoute !== parentName){
        lastRoute = currentRoute;
        currentRoute = this.upOneName(currentRoute);
    }

    return currentRoute === parentName;
};

Router.prototype.isRoot = function(name){
    return name in this.routes;
};

Router.prototype.values = function(path){
    var details = this.details.apply(this, arguments),
        result = {},
        keys,
        values;

    if(details == null || details.template == null){
        return;
    }

    keys = details.template.match(keysRegex);
    values = details.path.match('^' + sanitise(details.template).replace(formatRegex, '(.*?)') + '$');

    var info = this.info(details.name);

    if(keys && values){
        keys = keys.map(function(key){
            if(isRestToken(key)){
                return key.slice(1,-4);
            }
            return key.slice(1,-1);
        });

        values = values.slice(1);

        for(var i = 0; i < keys.length; i++){
            var value = values[i];

            if(info.deserialise) {
                value = info.deserialise(keys[i], value);
            }
            result[keys[i]] = value;
        }

        getDefaults(info.defaults, result);
    }

    return result;
};

Router.prototype.drill = function(url, route, newValues){
    if(url == null){
        url = this.currentPath();
    }


    var getArguments = this.values(url);

    if(newValues){
        for(var key in newValues){
            getArguments[key] = newValues[key];
        }
    }

    return this.get(route, getArguments);
};

Router.prototype.resolve = resolve;

module.exports = Router;

},{"./intersect":7}]},{},[2]);
