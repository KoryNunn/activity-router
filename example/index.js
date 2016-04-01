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