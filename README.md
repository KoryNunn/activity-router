# activity-router

application router that supports multiple activities.

## What

activity-router handles routing in your application if you want to have 'layers' or `activities`, similar to how activities work in android applications.

activities look like this:

```
{
    name: 'namedActivity',
    values: {key: value} // flat key: String(value) map.
}
```

and are displayed in the hash like this:

```
https://mySite.com/#/namedActivity#/anotherActivity/value
```

## Usage

activity-router uses [route-tree](https://github.com/KoryNunn/route-tree) under the covers.

Set up a router by passing in your routes just like route-tree:

```
var activityRouter = require('activity-router');

var router = activitiyRouter({
    routeName: {
        _url: '/routeurl/{routeValue}/{routeValue}'
    }
})

// initialise
router.init();
```

## API

### activityRouter.add(name, values)

add an activity.

### activityRouter.replace(name, values, index)

replace an activity at `index` with a new activity

### activityRouter.top(name, values)

replace the top activity with a new activity

### activityRouter.pop()

remove the top activity

### activityRouter.reset(name, values)

remove all activities except the first, and replace it with a new activity.

### activityRouter.init()

initialise activity-router from the hash in the URL.

## Events

activity will raise events when an activity is added/changed/removed

### router.on('add', function(newActivity, index){});

Emitted when a new activity is added

### router.on('update', function(newActivity, index){});

Emitted an existing activity is updated

### router.on('replace', function(newActivity, index){});

Emitted an existing activity is replaced

### router.on('remove', function(removedActivity, index){});

Emitted an existing activity is removed