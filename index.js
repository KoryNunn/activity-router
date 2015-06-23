var Router = require('route-tree'),
    EventEmitter = require('events').EventEmitter,
    debounce = require('debounce');

module.exports = function(routes, getActivities, updateRoute){
    var activityRouter = new EventEmitter(),
        activities = [],
        router = new Router(routes);

    router.basePath = window.location.href.match(/(^[^?#]*)\/.*$/)[1] + '/';

    function addActivity(activity){
        activities.push(activity);

        updateHash();

        activityRouter.emit('add', activity, activities.length - 1);
    }
    
    function updateActivity(activity, index){
        activities[index] = activity;

        updateHash();

        activityRouter.emit('update', activity, index);
    }
    
    function replaceActivity(activity, index){
        if(activities[index].name === activity.name){
            return updateActivity(activity, index);
        }

        activities[index] = activity;

        updateHash();

        activityRouter.emit('replace', activity, index);
    }
    
    function removeActivity(index){
        var activity = activities[index];

        activities.splice(index, 1);

        updateHash();

        activityRouter.emit('remove', activity, index);
    }

    function getPaths(){
        return window.location.hash.split('#').slice(1);
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

        if(router.basePath + '#' + path !== window.location.href){
            window.location.hash = path;
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
        if(activities.length && buildPath() === window.location.hash){
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